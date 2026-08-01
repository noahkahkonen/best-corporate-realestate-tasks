import type { ListingView } from "@/lib/drone-shots-data";
import { MAX_ROUTE_STOPS, ROUTE_DRIVE_CAP_SECONDS } from "@/lib/drone-shots";

export type PlannedStop = {
  listing: ListingView;
  /** Driving seconds from the previous stop. */
  legSeconds: number;
  legMeters: number;
};

export type RoutePlan = {
  stops: PlannedStop[];
  totalSeconds: number;
  totalMeters: number;
  /** Listings that had to be cut to stay under the driving cap. */
  dropped: ListingView[];
  directions: google.maps.DirectionsResult;
};

export type PlanInput = {
  origin: google.maps.LatLngLiteral;
  /** Listings eligible for the run — normally everything without photos. */
  candidates: ListingView[];
  /** Listing that must appear in the route even if it is far out. */
  pinnedId?: string | null;
  capSeconds?: number;
};

function metersBetween(
  a: google.maps.LatLngLiteral,
  b: google.maps.LatLngLiteral,
): number {
  return google.maps.geometry.spherical.computeDistanceBetween(
    new google.maps.LatLng(a),
    new google.maps.LatLng(b),
  );
}

function requestRoute(
  service: google.maps.DirectionsService,
  origin: google.maps.LatLngLiteral,
  stops: ListingView[],
): Promise<google.maps.DirectionsResult> {
  return service.route({
    origin,
    // Round trip: "two hours of driving" only means something if you get back.
    destination: origin,
    travelMode: google.maps.TravelMode.DRIVING,
    optimizeWaypoints: true,
    waypoints: stops.map((l) => ({
      location: new google.maps.LatLng({ lat: l.latitude, lng: l.longitude }),
      stopover: true,
    })),
  });
}

function totalDuration(result: google.maps.DirectionsResult): {
  seconds: number;
  meters: number;
} {
  const legs = result.routes[0]?.legs ?? [];
  return {
    seconds: legs.reduce((sum, leg) => sum + (leg.duration?.value ?? 0), 0),
    meters: legs.reduce((sum, leg) => sum + (leg.distance?.value ?? 0), 0),
  };
}

/**
 * Builds the shortest round trip that fits the most listings inside the driving
 * cap.
 *
 * Google optimises the order of a fixed set of waypoints but will not tell you
 * which ones to leave behind, so the selection is ours: start from the nearest
 * listings, ask for an optimised route, and keep dropping the stop that costs
 * the most driving until the total fits. A pinned listing is never dropped.
 */
export async function planRoute({
  origin,
  candidates,
  pinnedId,
  capSeconds = ROUTE_DRIVE_CAP_SECONDS,
}: PlanInput): Promise<RoutePlan> {
  if (candidates.length === 0) {
    throw new Error("No listings need drone photos right now.");
  }

  const pinned = pinnedId
    ? (candidates.find((l) => l.id === pinnedId) ?? null)
    : null;

  const byDistance = [...candidates].sort(
    (a, b) =>
      metersBetween(origin, { lat: a.latitude, lng: a.longitude }) -
      metersBetween(origin, { lat: b.latitude, lng: b.longitude }),
  );

  // Seed with the nearest listings, keeping the pinned one regardless of range.
  let selected = byDistance.slice(0, MAX_ROUTE_STOPS);
  if (pinned && !selected.some((l) => l.id === pinned.id)) {
    selected = [pinned, ...selected.slice(0, MAX_ROUTE_STOPS - 1)];
  }

  const dropped: ListingView[] = byDistance.filter(
    (l) => !selected.some((s) => s.id === l.id),
  );

  const service = new google.maps.DirectionsService();
  let result = await requestRoute(service, origin, selected);
  let { seconds, meters } = totalDuration(result);

  while (seconds > capSeconds && selected.length > (pinned ? 1 : 0)) {
    const order = result.routes[0]?.waypoint_order ?? selected.map((_, i) => i);
    const legs = result.routes[0]?.legs ?? [];

    // Cost of a stop = the drive in plus the drive out. Cutting the priciest
    // one buys back the most time per listing lost.
    let worstIndex = -1;
    let worstCost = -1;
    order.forEach((waypointIndex, position) => {
      const listing = selected[waypointIndex];
      if (pinned && listing.id === pinned.id) return;
      const cost =
        (legs[position]?.duration?.value ?? 0) +
        (legs[position + 1]?.duration?.value ?? 0);
      if (cost > worstCost) {
        worstCost = cost;
        worstIndex = waypointIndex;
      }
    });

    if (worstIndex < 0) break;
    dropped.push(selected[worstIndex]);
    selected = selected.filter((_, i) => i !== worstIndex);

    if (selected.length === 0) break;
    result = await requestRoute(service, origin, selected);
    ({ seconds, meters } = totalDuration(result));
  }

  const order = result.routes[0]?.waypoint_order ?? selected.map((_, i) => i);
  const legs = result.routes[0]?.legs ?? [];
  const stops: PlannedStop[] = order.map((waypointIndex, position) => ({
    listing: selected[waypointIndex],
    legSeconds: legs[position]?.duration?.value ?? 0,
    legMeters: legs[position]?.distance?.value ?? 0,
  }));

  return { stops, totalSeconds: seconds, totalMeters: meters, dropped, directions: result };
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

export function formatMiles(meters: number): string {
  return `${(meters / 1609.34).toFixed(1)} mi`;
}
