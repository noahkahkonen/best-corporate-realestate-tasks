"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import type { PhotoStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { geocodeAddress } from "@/lib/geocode";
import {
  canArchiveListing,
  canMovePin,
  canSetPhotoStatus,
} from "@/lib/drone-shots";
import { notifyManagersOfRequest } from "@/lib/notifications";

const paths = [
  "/agent",
  "/agent/drone-shots",
  "/manager",
  "/manager/drone-shots",
  "/admin",
  "/admin/drone-shots",
];

function revalidateAll() {
  for (const p of paths) revalidatePath(p, "layout");
}

export type ActionState = { error?: string; ok?: string };

const ALL_ROLES = ["AGENT", "MANAGER", "ADMIN"] as const;

function str(v: FormDataEntryValue | null): string {
  return String(v ?? "").trim();
}

function optional(v: FormDataEntryValue | null): string | null {
  return str(v) || null;
}

function parseOptionalDate(v: FormDataEntryValue | null): Date | null {
  const s = str(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Parses a coordinate field: null when blank, undefined when out of range. */
function parseCoordinate(
  raw: string,
  min: number,
  max: number,
): number | null | undefined {
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min || n > max) return undefined;
  return n;
}

type ResolvedPlace = {
  address: string;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  latitude: number;
  longitude: number;
};

/**
 * Works out where a submitted address actually is. The browser's Places search
 * already knows the coordinates, so it passes them through; typed-in addresses
 * fall back to server-side geocoding.
 */
async function resolvePlace(formData: FormData): Promise<ResolvedPlace | string> {
  const address = str(formData.get("address"));
  if (!address) return "Street address is required.";

  const lat = parseCoordinate(str(formData.get("latitude")), -90, 90);
  const lng = parseCoordinate(str(formData.get("longitude")), -180, 180);
  if (lat === undefined || lng === undefined) {
    return "Latitude must be between -90 and 90, longitude between -180 and 180.";
  }
  if ((lat === null) !== (lng === null)) {
    return "Enter both latitude and longitude, or neither.";
  }

  let city = optional(formData.get("city"));
  let state = optional(formData.get("state"));
  let postalCode = optional(formData.get("postalCode"));

  if (lat !== null && lng !== null) {
    return { address, city, state, postalCode, latitude: lat, longitude: lng };
  }

  const full = [address, city, state, postalCode].filter(Boolean).join(", ");
  let hit;
  try {
    hit = await geocodeAddress(full);
  } catch (err) {
    return err instanceof Error
      ? err.message
      : "Could not reach the geocoding service.";
  }
  if (!hit) {
    return "Google could not find that address. Check the spelling, or enter latitude and longitude manually.";
  }

  city = city ?? hit.city;
  state = state ?? hit.state;
  postalCode = postalCode ?? hit.postalCode;

  return {
    address,
    city,
    state,
    postalCode,
    latitude: hit.latitude,
    longitude: hit.longitude,
  };
}

/** Reuses a listing at the same spot so searching an existing address doesn't duplicate it. */
async function findNearby(place: ResolvedPlace) {
  const delta = 0.0004; // ~45 m
  return prisma.listing.findFirst({
    where: {
      archived: false,
      latitude: { gte: place.latitude - delta, lte: place.latitude + delta },
      longitude: { gte: place.longitude - delta, lte: place.longitude + delta },
    },
  });
}

/**
 * Pin a parcel by clicking the map — for land with no numbered address, where
 * search can't find it. The label is what tells sibling parcels apart, so it
 * is required. Deliberately no nearby-duplicate check: placing two parcels on
 * the same road is the whole point.
 */
export async function placeListing(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireRole([...ALL_ROLES]);

  const address = str(formData.get("address"));
  if (!address) {
    return { error: "Give the parcel a label, e.g. “0 Broad Street (3.4 AC)”." };
  }

  const lat = Number(str(formData.get("latitude")));
  const lng = Number(str(formData.get("longitude")));
  if (
    !Number.isFinite(lat) || lat < -90 || lat > 90 ||
    !Number.isFinite(lng) || lng < -180 || lng > 180
  ) {
    return { error: "Click the map to choose a spot first." };
  }

  await prisma.listing.create({
    data: {
      address,
      name: optional(formData.get("name")),
      propertyType: optional(formData.get("propertyType")),
      latitude: lat,
      longitude: lng,
      state: "OH",
      createdById: session.user.id,
    },
  });

  revalidateAll();
  return { ok: `Pinned ${address}.` };
}

/** Admin/manager: move a mislocated pin to where the parcel actually is. */
export async function moveListing(
  listingId: string,
  latitude: number,
  longitude: number,
): Promise<ActionState> {
  const session = await requireRole([...ALL_ROLES]);
  if (!canMovePin(session.user.role)) {
    return { error: "Only admins and managers can move pins." };
  }
  if (
    !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
    !Number.isFinite(longitude) || longitude < -180 || longitude > 180
  ) {
    return { error: "That point is not on the map." };
  }

  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.archived) {
    return { error: "That listing is no longer on the map." };
  }

  await prisma.listing.update({
    where: { id: listingId },
    data: { latitude, longitude },
  });

  revalidateAll();
  return { ok: "Pin moved." };
}

/**
 * Request a drone shoot. This creates an ordinary task in PENDING_REVIEW so it
 * lands in the manager's approval queue alongside every other request, and
 * pins the address on the map if it wasn't there already.
 */
export async function requestDroneShot(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireRole([...ALL_ROLES]);

  const listingId = str(formData.get("listingId"));
  let listing = listingId
    ? await prisma.listing.findUnique({ where: { id: listingId } })
    : null;

  // Requesting from the search bar drops a new grey pin as a side effect.
  if (!listing) {
    const place = await resolvePlace(formData);
    if (typeof place === "string") return { error: place };

    listing =
      (await findNearby(place)) ??
      (await prisma.listing.create({
        data: {
          ...place,
          name: optional(formData.get("name")),
          propertyType: optional(formData.get("propertyType")),
          createdById: session.user.id,
        },
      }));
  }

  if (listing.archived) {
    return { error: "That listing has been removed from the map." };
  }

  const live = await prisma.task.findFirst({
    where: {
      listingId: listing.id,
      reviewStatus: { not: "DENIED" },
      executionStatus: { not: "DONE" },
    },
  });
  if (live) {
    return {
      error: "There is already an open drone shoot for this address.",
    };
  }

  const notes = optional(formData.get("notes"));
  const task = await prisma.task.create({
    data: {
      title: `Drone photos — ${listing.address}`,
      notes: notes,
      dueAt: parseOptionalDate(formData.get("dueAt")),
      priority: 5,
      creatorId: session.user.id,
      listingId: listing.id,
      reviewStatus: "PENDING_REVIEW",
      executionStatus: "NOT_STARTED",
    },
  });

  after(() => notifyManagersOfRequest(task.id, "new"));
  revalidateAll();
  return { ok: "Sent to your manager for approval." };
}

/** Admin/manager verdict on whether a listing's drone photos are usable. */
export async function setPhotoStatus(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireRole([...ALL_ROLES]);
  if (!canSetPhotoStatus(session.user.role)) {
    return { error: "Only admins and managers can set photo status." };
  }

  const listingId = str(formData.get("listingId"));
  const status = str(formData.get("photoStatus")) as PhotoStatus;
  if (!listingId) return { error: "Missing listing." };
  if (!["NO_PHOTOS", "NEEDS_MORE", "HAS_PHOTOS"].includes(status)) {
    return { error: "Unknown photo status." };
  }

  await prisma.listing.update({
    where: { id: listingId },
    data: {
      photoStatus: status,
      // The quick-set dots in the listing rail post no note field; only the
      // popup form does. Touch the note only when it was actually submitted.
      ...(formData.has("photoNote")
        ? { photoNote: optional(formData.get("photoNote")) }
        : {}),
      // Stamp the flight date the moment a listing first counts as shot.
      lastShotAt: status === "HAS_PHOTOS" ? new Date() : undefined,
    },
  });

  revalidateAll();
  return { ok: "Photo status updated." };
}

/** Managers hide listings that were entered by mistake or are off the books. */
export async function archiveListing(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireRole([...ALL_ROLES]);
  if (!canArchiveListing(session.user.role)) {
    return { error: "Only managers can remove listings." };
  }

  const listingId = str(formData.get("listingId"));
  if (!listingId) return { error: "Missing listing." };

  await prisma.listing.update({
    where: { id: listingId },
    data: { archived: true },
  });

  revalidateAll();
  return { ok: "Listing removed from the map." };
}
