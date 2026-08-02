import type { PhotoStatus, Role } from "@prisma/client";

/**
 * Pin and badge treatment per photo status. A listing with no drone photo is
 * deliberately grey — the map should read at a glance as "colour means shot".
 */
export const PHOTO_STATUS_META: Record<
  PhotoStatus,
  { label: string; short: string; pin: string; glyph: string; badge: string }
> = {
  NO_PHOTOS: {
    label: "No drone photos",
    short: "No photos",
    pin: "#9ca3af",
    glyph: "#e5e7eb",
    badge: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  },
  NEEDS_MORE: {
    label: "Needs more photos",
    short: "Needs more",
    pin: "#f59e0b",
    glyph: "#ffffff",
    badge: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  },
  HAS_PHOTOS: {
    label: "Has drone photos",
    short: "Has photos",
    pin: "#059669",
    glyph: "#ffffff",
    badge:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  },
};

export const PHOTO_STATUS_ORDER: PhotoStatus[] = [
  "NO_PHOTOS",
  "NEEDS_MORE",
  "HAS_PHOTOS",
];

/** Only admins and managers rule on whether a listing's photos are usable. */
export function canSetPhotoStatus(role: Role): boolean {
  return role === "ADMIN" || role === "MANAGER";
}

/** Who added a listing is manager/admin information, not agent-facing. */
export function canSeeAddedBy(role: Role): boolean {
  return role === "MANAGER" || role === "ADMIN";
}

/** Route planning, weather, and sun times belong to whoever flies the drone. */
export function canPlanRoutes(role: Role): boolean {
  return role === "ADMIN" || role === "MANAGER";
}

/** Managers clean up listings entered by mistake. */
export function canArchiveListing(role: Role): boolean {
  return role === "MANAGER";
}

/** Admins and managers can drag a mislocated pin to the right parcel. */
export function canMovePin(role: Role): boolean {
  return role === "ADMIN" || role === "MANAGER";
}

/** Display name for a listing — the nickname if it has one, else the address. */
export function listingLabel(listing: {
  name: string | null;
  address: string;
}): string {
  return listing.name?.trim() || listing.address;
}

/** "Columbus, OH 43215" from whichever parts we actually have. */
export function listingLocality(listing: {
  city: string | null;
  state: string | null;
  postalCode: string | null;
}): string {
  const cityState = [listing.city, listing.state].filter(Boolean).join(", ");
  return [cityState, listing.postalCode].filter(Boolean).join(" ");
}

/**
 * Home base: downtown Columbus.
 *
 * Everything in the tab is anchored here rather than to whatever happens to be
 * on screen — the map opens on it, flights depart from and return to it,
 * conditions are reported for it, and address search is biased around it.
 * The overrides carry the NEXT_PUBLIC_ prefix because the route planner and the
 * map read this in the browser while the conditions panel reads it on the
 * server; an unprefixed variable would be undefined on one side and silently
 * split the two apart.
 */
export const HOME_BASE = {
  lat: Number(process.env.NEXT_PUBLIC_DRONE_HOME_LAT ?? 39.9612),
  lng: Number(process.env.NEXT_PUBLIC_DRONE_HOME_LNG ?? -82.9988),
  label: process.env.NEXT_PUBLIC_DRONE_HOME_LABEL || "Columbus, OH",
};

/** How far around home base address search stays useful, in metres. */
export const SEARCH_BIAS_RADIUS_M = 60_000;

export const DEFAULT_MAP_CENTER = { lat: HOME_BASE.lat, lng: HOME_BASE.lng };
export const DEFAULT_MAP_ZOOM = 10;

/**
 * The timezone sunrise, sunset, and the forecast are shown in.
 *
 * Deliberately explicit rather than the server's clock: Vercel runs in UTC, so
 * a bare toLocaleTimeString would put sunrise at half ten in the morning. It is
 * also formatted the same on the server and in the browser, which keeps the
 * markup stable through hydration.
 */
export const DISPLAY_TIMEZONE = process.env.DRONE_TIMEZONE || "America/New_York";

/** The driving-time ceiling for one route, in seconds. */
export const ROUTE_DRIVE_CAP_SECONDS = 2 * 60 * 60;

/** Google's Directions API caps a single request at 25 waypoints. */
export const MAX_ROUTE_STOPS = 23;
