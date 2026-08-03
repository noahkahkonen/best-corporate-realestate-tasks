import { prisma } from "@/lib/prisma";
import type { ExecutionStatus, PhotoStatus, ReviewStatus } from "@prisma/client";

export type DroneTaskView = {
  id: string;
  title: string;
  notes: string | null;
  dueAt: string | null;
  reviewStatus: ReviewStatus;
  executionStatus: ExecutionStatus;
  requestedByName: string | null;
  assigneeName: string | null;
  createdAt: string;
};

export type ListingView = {
  id: string;
  name: string | null;
  address: string;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  propertyType: string | null;
  latitude: number;
  longitude: number;
  photoStatus: PhotoStatus;
  photoNote: string | null;
  lastShotAt: string | null;
  agent: string | null;
  dealType: string | null;
  boundary: { lat: number; lng: number }[] | null;
  addedByName: string | null;
  addedAt: string;
  droneTasks: DroneTaskView[];
};

/** A drone task that hasn't been shot yet, from either side of approval. */
function isLive(task: { reviewStatus: ReviewStatus; executionStatus: ExecutionStatus }) {
  if (task.reviewStatus === "DENIED") return false;
  return task.executionStatus !== "DONE";
}

export function listingHasLiveRequest(listing: ListingView): boolean {
  return listing.droneTasks.some(isLive);
}

/**
 * Every listing on the map with its drone-shoot history, serialised for the
 * client component.
 */
export async function loadListings(): Promise<ListingView[]> {
  const listings = await prisma.listing.findMany({
    where: { archived: false },
    orderBy: [{ photoStatus: "asc" }, { createdAt: "desc" }],
    include: {
      createdBy: { select: { name: true } },
      droneTasks: {
        orderBy: { createdAt: "desc" },
        include: {
          creator: { select: { name: true } },
          assignee: { select: { name: true } },
        },
      },
    },
  });

  return listings.map((l) => ({
    id: l.id,
    name: l.name,
    address: l.address,
    city: l.city,
    state: l.state,
    postalCode: l.postalCode,
    propertyType: l.propertyType,
    latitude: l.latitude,
    longitude: l.longitude,
    photoStatus: l.photoStatus,
    photoNote: l.photoNote,
    lastShotAt: l.lastShotAt?.toISOString() ?? null,
    agent: l.agent,
    dealType: l.dealType,
    boundary: Array.isArray(l.boundary)
      ? (l.boundary as { lat: number; lng: number }[])
      : null,
    addedByName: l.createdBy?.name ?? null,
    addedAt: l.createdAt.toISOString(),
    droneTasks: l.droneTasks.map((t) => ({
      id: t.id,
      title: t.title,
      notes: t.notes,
      dueAt: t.dueAt?.toISOString() ?? null,
      reviewStatus: t.reviewStatus,
      executionStatus: t.executionStatus,
      requestedByName: t.creator?.name ?? null,
      assigneeName: t.assignee?.name ?? null,
      createdAt: t.createdAt.toISOString(),
    })),
  }));
}

/** Badge count for the nav: drone shoots requested but not yet flown. */
export function countLiveDroneShoots(): Promise<number> {
  return prisma.task.count({
    where: {
      listingId: { not: null },
      reviewStatus: { not: "DENIED" },
      executionStatus: { not: "DONE" },
    },
  });
}
