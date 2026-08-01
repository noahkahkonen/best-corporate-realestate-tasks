"use client";

import { useRef, useState } from "react";
import type { ListingView } from "@/lib/drone-shots-data";
import {
  formatDuration,
  formatMiles,
  planRoute,
  type RoutePlan,
} from "@/lib/route-planner";
import { HOME_BASE, ROUTE_DRIVE_CAP_SECONDS, listingLabel } from "@/lib/drone-shots";

/**
 * Builds the day's flight run: the shortest round trip that hits the most
 * listings still missing photos, capped at two hours of driving.
 */
export function DroneRoutePlanner({
  listings,
  map,
  onFocus,
}: {
  listings: ListingView[];
  map: google.maps.Map | null;
  onFocus: (listing: ListingView) => void;
}) {
  const [plan, setPlan] = useState<RoutePlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string>("");
  const rendererRef = useRef<google.maps.DirectionsRenderer | null>(null);

  const needsPhotos = listings.filter((l) => l.photoStatus !== "HAS_PHOTOS");

  async function calculate() {
    if (!map) {
      setError("The map is still loading.");
      return;
    }
    setBusy(true);
    setError(null);

    try {
      // Always out and back from home base — a route measured from wherever the
      // map happens to be panned isn't a drive anyone actually makes.
      const result = await planRoute({
        origin: { lat: HOME_BASE.lat, lng: HOME_BASE.lng },
        candidates: needsPhotos,
        pinnedId: pinnedId || null,
      });

      rendererRef.current ??= new google.maps.DirectionsRenderer({
        suppressMarkers: true,
        preserveViewport: false,
        polylineOptions: { strokeColor: "#4f46e5", strokeWeight: 5, strokeOpacity: 0.8 },
      });
      rendererRef.current.setMap(map);
      rendererRef.current.setDirections(result.directions);

      setPlan(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not calculate a route.",
      );
    } finally {
      setBusy(false);
    }
  }

  function clear() {
    rendererRef.current?.setMap(null);
    setPlan(null);
    setError(null);
  }

  const overCap = plan ? plan.totalSeconds > ROUTE_DRIVE_CAP_SECONDS : false;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white/95 p-4 shadow-lg backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
            Route planner
          </h3>
          <p className="text-xs text-zinc-500">
            Round trip from {HOME_BASE.label}, capped at 2 hours driving.
          </p>
        </div>
        {plan ? (
          <button
            type="button"
            onClick={clear}
            className="text-xs text-zinc-500 underline underline-offset-2 hover:text-zinc-900 dark:hover:text-white"
          >
            Clear
          </button>
        ) : null}
      </div>

      <label className="mt-3 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
        Must include (optional)
        <select
          value={pinnedId}
          onChange={(e) => setPinnedId(e.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">No particular listing</option>
          {needsPhotos.map((l) => (
            <option key={l.id} value={l.id}>
              {listingLabel(l)}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        onClick={calculate}
        disabled={busy || needsPhotos.length === 0}
        className="mt-3 w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
      >
        {busy ? "Calculating…" : "Calculate route"}
      </button>

      {needsPhotos.length === 0 ? (
        <p className="mt-2 text-xs text-zinc-500">
          Every pinned listing already has drone photos.
        </p>
      ) : null}

      {error ? (
        <p className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400">
          {error}
        </p>
      ) : null}

      {plan ? (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-lg bg-zinc-50 px-3 py-2 text-xs dark:bg-zinc-900">
            <span className="font-medium text-zinc-900 dark:text-white">
              {plan.stops.length} stop{plan.stops.length === 1 ? "" : "s"}
            </span>
            <span
              className={
                overCap
                  ? "font-medium text-amber-600 dark:text-amber-400"
                  : "text-zinc-600 dark:text-zinc-400"
              }
            >
              {formatDuration(plan.totalSeconds)} driving
            </span>
            <span className="text-zinc-600 dark:text-zinc-400">
              {formatMiles(plan.totalMeters)}
            </span>
          </div>

          {overCap ? (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              This is over the 2-hour cap — the must-include listing is too far
              out to pair with anything else.
            </p>
          ) : null}

          <ol className="space-y-1">
            {plan.stops.map((stop, i) => (
              <li key={stop.listing.id}>
                <button
                  type="button"
                  onClick={() => onFocus(stop.listing)}
                  className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[0.65rem] font-semibold text-white">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-zinc-900 dark:text-white">
                      {listingLabel(stop.listing)}
                    </span>
                    <span className="block text-[0.7rem] text-zinc-500">
                      {formatDuration(stop.legSeconds)} ·{" "}
                      {formatMiles(stop.legMeters)} from previous
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ol>

          {plan.dropped.length > 0 ? (
            <p className="text-[0.7rem] text-zinc-500">
              {plan.dropped.length} listing
              {plan.dropped.length === 1 ? "" : "s"} left out to stay inside the
              driving cap.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
