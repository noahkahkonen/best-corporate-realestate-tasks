"use client";

import { useActionState } from "react";
import type { PhotoStatus } from "@prisma/client";
import {
  archiveListing,
  placeListing,
  requestDroneShot,
  setPhotoStatus,
  type ActionState,
} from "@/server/drone-shots-actions";
import { PHOTO_STATUS_META, PHOTO_STATUS_ORDER } from "@/lib/drone-shots";

const empty: ActionState = {};

const inputClass =
  "mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";

export function Feedback({ state }: { state: ActionState }) {
  if (state.error) {
    return (
      <p className="text-xs font-medium text-rose-600 dark:text-rose-400">
        {state.error}
      </p>
    );
  }
  if (state.ok) {
    return (
      <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
        {state.ok}
      </p>
    );
  }
  return null;
}

export type RequestTarget =
  | { kind: "listing"; listingId: string }
  | {
      kind: "address";
      address: string;
      city: string | null;
      state: string | null;
      postalCode: string | null;
      latitude: number;
      longitude: number;
    };

/**
 * Requests a drone shoot. Fires the normal task workflow, so the copy says so —
 * nobody should expect the photographer to show up before a manager approves.
 */
export function RequestDroneShotForm({
  target,
  blockedReason,
  onDone,
}: {
  target: RequestTarget;
  blockedReason?: string | null;
  onDone?: () => void;
}) {
  const [state, action, pending] = useActionState(requestDroneShot, empty);

  if (blockedReason) {
    return (
      <p className="rounded-lg bg-zinc-100 px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
        {blockedReason}
      </p>
    );
  }

  return (
    <form
      action={async (fd) => {
        await action(fd);
        onDone?.();
      }}
      className="space-y-2"
    >
      {target.kind === "listing" ? (
        <input type="hidden" name="listingId" value={target.listingId} />
      ) : (
        <>
          <input type="hidden" name="address" value={target.address} />
          <input type="hidden" name="city" value={target.city ?? ""} />
          <input type="hidden" name="state" value={target.state ?? ""} />
          <input type="hidden" name="postalCode" value={target.postalCode ?? ""} />
          <input type="hidden" name="latitude" value={target.latitude} />
          <input type="hidden" name="longitude" value={target.longitude} />
        </>
      )}

      <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
        Complete by
        <input type="date" name="dueAt" className={inputClass} />
      </label>
      <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
        Special notes
        <textarea
          name="notes"
          rows={2}
          placeholder="e.g. Aerials of the rear lot, avoid the neighbouring school"
          className={inputClass}
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
      >
        {pending ? "Sending…" : "Request drone photo"}
      </button>
      <p className="text-[0.7rem] text-zinc-500">
        Creates a task and sends it to your manager for approval.
      </p>
      <Feedback state={state} />
    </form>
  );
}

const PLACE_PROPERTY_TYPES = [
  "Land",
  "Commercial",
  "Office",
  "Industrial",
  "Multi-Family",
  "Residential",
];

/**
 * Names a hand-placed pin. The label is the differentiator between sibling
 * parcels on the same road, so it's the one required field.
 */
export function PlacePinForm({
  latitude,
  longitude,
  onDone,
  onCancel,
}: {
  latitude: number;
  longitude: number;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [state, action, pending] = useActionState(
    async (prev: ActionState, fd: FormData) => {
      const result = await placeListing(prev, fd);
      if (result.ok) onDone();
      return result;
    },
    empty,
  );

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="latitude" value={latitude} />
      <input type="hidden" name="longitude" value={longitude} />
      <p className="text-xs text-zinc-500">
        Pin set at {latitude.toFixed(5)}, {longitude.toFixed(5)}. Click the map
        again to adjust it.
      </p>
      <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
        Label
        <input
          name="address"
          required
          placeholder="e.g. 0 Broad Street (3.4 AC)"
          className={inputClass}
        />
      </label>
      <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
        Nickname (optional)
        <input
          name="name"
          placeholder="e.g. corner parcel by the substation"
          className={inputClass}
        />
      </label>
      <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
        Property type
        <select name="propertyType" defaultValue="Land" className={inputClass}>
          {PLACE_PROPERTY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {pending ? "Pinning…" : "Add to map"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Cancel
        </button>
      </div>
      <Feedback state={state} />
    </form>
  );
}

/** Admin/manager verdict on whether a listing's drone photos are usable. */
export function PhotoStatusForm({
  listingId,
  current,
  note,
}: {
  listingId: string;
  current: PhotoStatus;
  note: string | null;
}) {
  const [state, action, pending] = useActionState(setPhotoStatus, empty);

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="listingId" value={listingId} />
      <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
        Photo status
      </p>
      <div className="flex flex-wrap gap-1.5">
        {PHOTO_STATUS_ORDER.map((status) => (
          <button
            key={status}
            type="submit"
            name="photoStatus"
            value={status}
            disabled={pending}
            className={
              status === current
                ? "rounded-lg border-2 px-2.5 py-1 text-xs font-semibold disabled:opacity-60"
                : "rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }
            style={
              status === current
                ? {
                    borderColor: PHOTO_STATUS_META[status].pin,
                    color: PHOTO_STATUS_META[status].pin,
                  }
                : undefined
            }
          >
            {PHOTO_STATUS_META[status].short}
          </button>
        ))}
      </div>
      <input
        name="photoNote"
        defaultValue={note ?? ""}
        placeholder="Note (optional)"
        className={inputClass}
      />
      <Feedback state={state} />
    </form>
  );
}

/**
 * One-click photo status from the listing rail: three dots, grey/amber/green.
 * Skips the note field so a quick set never clobbers an existing note.
 */
export function RailStatusDots({
  listingId,
  current,
}: {
  listingId: string;
  current: PhotoStatus;
}) {
  const [, action, pending] = useActionState(setPhotoStatus, empty);

  return (
    <form action={action} className="flex items-center gap-1">
      <input type="hidden" name="listingId" value={listingId} />
      {PHOTO_STATUS_ORDER.map((status) => (
        <button
          key={status}
          type="submit"
          name="photoStatus"
          value={status}
          disabled={pending || status === current}
          title={PHOTO_STATUS_META[status].label}
          aria-label={`Mark as ${PHOTO_STATUS_META[status].label.toLowerCase()}`}
          className={
            status === current
              ? "h-4 w-4 rounded-full ring-2 ring-zinc-400 ring-offset-1 dark:ring-zinc-500 dark:ring-offset-zinc-950"
              : "h-4 w-4 rounded-full opacity-35 transition hover:scale-110 hover:opacity-100 disabled:opacity-20"
          }
          style={{ background: PHOTO_STATUS_META[status].pin }}
        />
      ))}
    </form>
  );
}

/** Manager-only cleanup for listings entered by mistake. */
export function ArchiveListingForm({ listingId }: { listingId: string }) {
  const [state, action, pending] = useActionState(archiveListing, empty);

  return (
    <form action={action} className="space-y-1">
      <input type="hidden" name="listingId" value={listingId} />
      <button
        type="submit"
        disabled={pending}
        className="text-xs font-medium text-zinc-500 underline underline-offset-2 hover:text-rose-600 disabled:opacity-60 dark:hover:text-rose-400"
      >
        {pending ? "Removing…" : "Remove from map"}
      </button>
      <Feedback state={state} />
    </form>
  );
}
