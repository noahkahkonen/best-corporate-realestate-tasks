"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Role } from "@prisma/client";
import type { ListingView } from "@/lib/drone-shots-data";
import { listingHasLiveRequest } from "@/lib/drone-shots-data";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  HOME_BASE,
  SEARCH_BIAS_RADIUS_M,
  PHOTO_STATUS_META,
  PHOTO_STATUS_ORDER,
  canArchiveListing,
  canMovePin,
  canPlanRoutes,
  canSeeAddedBy,
  canSetPhotoStatus,
  listingLabel,
  listingLocality,
} from "@/lib/drone-shots";
import { loadGoogleMaps } from "@/lib/google-maps-loader";
import { moveListing } from "@/server/drone-shots-actions";
import {
  ArchiveListingForm,
  PhotoStatusForm,
  PlacePinForm,
  RequestDroneShotForm,
} from "@/components/drone-shots-forms";
import { DroneRoutePlanner } from "@/components/drone-route-planner";

export type SearchHit = {
  address: string;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  latitude: number;
  longitude: number;
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function addressComponent(
  components: google.maps.places.AddressComponent[] | null | undefined,
  type: string,
  short = false,
): string | null {
  const hit = components?.find((c) => c.types.includes(type));
  if (!hit) return null;
  return short ? hit.shortText : hit.longText;
}

export function DroneShotsMap({
  listings,
  role,
  apiKey,
  mapId,
}: {
  listings: ListingView[];
  role: Role;
  apiKey: string | null;
  mapId: string;
}) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchHit, setSearchHit] = useState<SearchHit | null>(null);
  const [filter, setFilter] = useState<"ALL" | (typeof PHOTO_STATUS_ORDER)[number]>(
    "ALL",
  );
  // Click-to-place: "new" drops a fresh pin, "move" relocates an existing one.
  const [placing, setPlacing] = useState<
    null | { mode: "new" } | { mode: "move"; listing: ListingView }
  >(null);
  const [draftPin, setDraftPin] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [placeNotice, setPlaceNotice] = useState<string | null>(null);

  const mapNode = useRef<HTMLDivElement | null>(null);
  const searchNode = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef(
    new Map<string, google.maps.marker.AdvancedMarkerElement>(),
  );
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const searchMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(
    null,
  );
  const draftMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(
    null,
  );
  // Mirrors `placing` for marker click handlers, which are bound once per pin.
  const placingRef = useRef<typeof placing>(null);
  useEffect(() => {
    placingRef.current = placing;
  }, [placing]);
  const didFitRef = useRef(false);

  // The InfoWindow gets a plain container that React portals its content into,
  // so the popup can host real forms and server actions.
  const [popupHost] = useState(() =>
    typeof document === "undefined" ? null : document.createElement("div"),
  );

  const visible = useMemo(
    () => (filter === "ALL" ? listings : listings.filter((l) => l.photoStatus === filter)),
    [listings, filter],
  );

  const selected = useMemo(
    () => listings.find((l) => l.id === selectedId) ?? null,
    [listings, selectedId],
  );

  const counts = useMemo(() => {
    const base = { NO_PHOTOS: 0, NEEDS_MORE: 0, HAS_PHOTOS: 0 };
    for (const l of listings) base[l.photoStatus] += 1;
    return base;
  }, [listings]);

  const closePopup = useCallback(() => {
    infoWindowRef.current?.close();
    setSelectedId(null);
  }, []);

  /* ---------------------------------------------------------------- boot */

  useEffect(() => {
    if (!apiKey || !mapNode.current || mapRef.current) return;
    let cancelled = false;

    loadGoogleMaps(apiKey)
      .then((maps) => {
        if (cancelled || !mapNode.current) return;
        const instance = new maps.Map(mapNode.current, {
          center: DEFAULT_MAP_CENTER,
          zoom: DEFAULT_MAP_ZOOM,
          mapId,
          mapTypeId: "hybrid",
          streetViewControl: false,
          mapTypeControl: true,
          fullscreenControl: true,
        });
        infoWindowRef.current = new maps.InfoWindow({ maxWidth: 340 });
        infoWindowRef.current.addListener("closeclick", () => setSelectedId(null));
        mapRef.current = instance;
        setMap(instance);
      })
      .catch((err: Error) => {
        if (!cancelled) setMapError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [apiKey, mapId]);

  /* ------------------------------------------------------ places search */

  useEffect(() => {
    if (!map || !searchNode.current || searchNode.current.childElementCount > 0) {
      return;
    }

    const { PlaceAutocompleteElement } = google.maps.places;
    // Biased, not restricted: central Ohio addresses surface first, but a
    // listing outside the metro can still be found by typing it out.
    const element = new PlaceAutocompleteElement({
      includedRegionCodes: ["us"],
      locationBias: new google.maps.Circle({
        center: { lat: HOME_BASE.lat, lng: HOME_BASE.lng },
        radius: SEARCH_BIAS_RADIUS_M,
      }),
      origin: { lat: HOME_BASE.lat, lng: HOME_BASE.lng },
    });
    element.style.width = "100%";
    searchNode.current.appendChild(element);

    const onSelect = async (event: Event) => {
      const { placePrediction } = event as google.maps.places.PlacePredictionSelectEvent;
      const place = placePrediction.toPlace();
      await place.fetchFields({
        fields: ["formattedAddress", "location", "addressComponents", "displayName"],
      });

      const location = place.location;
      if (!location) return;

      const components = place.addressComponents;
      const streetNumber = addressComponent(components, "street_number");
      const route = addressComponent(components, "route");
      const street = [streetNumber, route].filter(Boolean).join(" ");

      const hit: SearchHit = {
        address: street || place.formattedAddress || place.displayName || "",
        city:
          addressComponent(components, "locality") ??
          addressComponent(components, "sublocality"),
        state: addressComponent(components, "administrative_area_level_1", true),
        postalCode: addressComponent(components, "postal_code"),
        latitude: location.lat(),
        longitude: location.lng(),
      };

      setSearchHit(hit);
      setSelectedId(null);
      infoWindowRef.current?.close();

      map.panTo({ lat: hit.latitude, lng: hit.longitude });
      map.setZoom(17);
    };

    element.addEventListener("gmp-select", onSelect as EventListener);
    return () => element.removeEventListener("gmp-select", onSelect as EventListener);
  }, [map]);

  // A distinct pin marks the searched address until it becomes a listing.
  useEffect(() => {
    if (!map) return;

    if (searchMarkerRef.current) {
      searchMarkerRef.current.map = null;
      searchMarkerRef.current = null;
    }
    if (!searchHit) return;

    const { AdvancedMarkerElement, PinElement } = google.maps.marker;
    const pin = new PinElement({
      background: "#4f46e5",
      borderColor: "#312e81",
      glyphColor: "#ffffff",
      scale: 1.2,
    });
    searchMarkerRef.current = new AdvancedMarkerElement({
      map,
      position: { lat: searchHit.latitude, lng: searchHit.longitude },
      content: pin.element,
      title: searchHit.address,
      zIndex: 20,
    });
  }, [map, searchHit]);

  /* ---------------------------------------------------- click-to-place */

  useEffect(() => {
    if (!map || !placing) return;

    map.setOptions({ draggableCursor: "crosshair" });
    const listener = map.addListener(
      "click",
      async (e: google.maps.MapMouseEvent) => {
        const ll = e.latLng;
        if (!ll) return;

        if (placing.mode === "new") {
          setDraftPin({ lat: ll.lat(), lng: ll.lng() });
          return;
        }

        setPlaceNotice(`Moving ${listingLabel(placing.listing)}…`);
        const result = await moveListing(placing.listing.id, ll.lat(), ll.lng());
        setPlacing(null);
        setPlaceNotice(result.error ?? result.ok ?? null);
      },
    );

    return () => {
      listener.remove();
      map.setOptions({ draggableCursor: null });
    };
  }, [map, placing]);

  // The violet draft pin marks where the new parcel will go.
  useEffect(() => {
    if (!map) return;

    if (draftMarkerRef.current) {
      draftMarkerRef.current.map = null;
      draftMarkerRef.current = null;
    }
    if (!draftPin) return;

    const { AdvancedMarkerElement, PinElement } = google.maps.marker;
    const pin = new PinElement({
      background: "#7c3aed",
      borderColor: "#4c1d95",
      glyphColor: "#ffffff",
      scale: 1.2,
    });
    draftMarkerRef.current = new AdvancedMarkerElement({
      map,
      position: draftPin,
      content: pin.element,
      title: "New parcel pin",
      zIndex: 25,
    });
  }, [map, draftPin]);

  const cancelPlacing = useCallback(() => {
    setPlacing(null);
    setDraftPin(null);
    setPlaceNotice(null);
  }, []);

  const beginMove = useCallback(
    (listing: ListingView) => {
      infoWindowRef.current?.close();
      setSelectedId(null);
      setSearchHit(null);
      setDraftPin(null);
      setPlaceNotice(null);
      setPlacing({ mode: "move", listing });
    },
    [],
  );

  /* ------------------------------------------------------------- pins */

  useEffect(() => {
    if (!map) return;

    const { AdvancedMarkerElement, PinElement } = google.maps.marker;
    const markers = markersRef.current;
    const wanted = new Set(visible.map((l) => l.id));

    for (const [id, marker] of markers) {
      if (!wanted.has(id)) {
        marker.map = null;
        markers.delete(id);
      }
    }

    for (const listing of visible) {
      const meta = PHOTO_STATUS_META[listing.photoStatus];
      const isSelected = listing.id === selectedId;
      const pin = new PinElement({
        background: meta.pin,
        borderColor: isSelected ? "#111827" : meta.pin,
        glyphColor: meta.glyph,
        scale: isSelected ? 1.3 : 1,
      });

      const existing = markers.get(listing.id);
      if (existing) {
        existing.content = pin.element;
        existing.position = { lat: listing.latitude, lng: listing.longitude };
        existing.zIndex = isSelected ? 15 : 1;
        continue;
      }

      const marker = new AdvancedMarkerElement({
        map,
        position: { lat: listing.latitude, lng: listing.longitude },
        title: listingLabel(listing),
        content: pin.element,
      });
      marker.addListener("click", () => {
        if (placingRef.current) return;
        setSearchHit(null);
        setSelectedId(listing.id);
      });
      markers.set(listing.id, marker);
    }

    if (!didFitRef.current && visible.length > 0) {
      didFitRef.current = true;
      if (visible.length === 1) {
        map.setCenter({ lat: visible[0].latitude, lng: visible[0].longitude });
        map.setZoom(15);
      } else {
        const bounds = new google.maps.LatLngBounds();
        for (const l of visible) bounds.extend({ lat: l.latitude, lng: l.longitude });
        map.fitBounds(bounds, 64);
      }
    }
  }, [map, visible, selectedId]);

  // Anchor the popup to whichever pin is selected.
  useEffect(() => {
    const info = infoWindowRef.current;
    if (!info || !map || !popupHost) return;

    if (!selected) {
      info.close();
      return;
    }
    const marker = markersRef.current.get(selected.id);
    if (!marker) return;

    info.setContent(popupHost);
    info.open({ map, anchor: marker });
  }, [map, selected, popupHost]);

  const focus = useCallback(
    (listing: ListingView) => {
      setSearchHit(null);
      setSelectedId(listing.id);
      if (!map) return;
      map.panTo({ lat: listing.latitude, lng: listing.longitude });
      if ((map.getZoom() ?? 0) < 15) map.setZoom(15);
    },
    [map],
  );

  const filters = [
    { key: "ALL" as const, label: "All", count: listings.length },
    ...PHOTO_STATUS_ORDER.map((s) => ({
      key: s,
      label: PHOTO_STATUS_META[s].short,
      count: counts[s],
    })),
  ];

  return (
    // Full-bleed: the map spans the viewport while the rest of the portal stays
    // in its column. Panels float over the map on desktop and stack around it
    // on small screens.
    <div className="relative left-1/2 w-screen -translate-x-1/2">
      <div className="relative">
        <div className="px-4 pb-3 sm:px-6 lg:absolute lg:top-4 lg:left-4 lg:z-10 lg:w-96 lg:p-0">
          <div className="rounded-2xl border border-zinc-200 bg-white/95 p-4 shadow-lg backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Search an address
          <div
            ref={searchNode}
            className="mt-1 [&_gmp-place-autocomplete]:w-full"
          />
        </label>
        <p className="mt-1.5 text-xs text-zinc-500">
          {`Results near ${HOME_BASE.label} come up first. You can request a drone photo for any address, even one that isn't pinned yet.`}
        </p>

        {searchHit ? (
          <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50/60 p-3 dark:border-indigo-900 dark:bg-indigo-950/40">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">
                  {searchHit.address}
                </p>
                <p className="truncate text-xs text-zinc-500">
                  {listingLocality(searchHit) || "—"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSearchHit(null)}
                className="shrink-0 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              >
                Clear
              </button>
            </div>
            <div className="mt-3">
              <RequestDroneShotForm
                target={{ kind: "address", ...searchHit }}
                onDone={() => setSearchHit(null)}
              />
            </div>
          </div>
        ) : null}

        <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          {placing?.mode === "move" ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-violet-700 dark:text-violet-300">
                Click the map where {listingLabel(placing.listing)} actually
                sits.
              </p>
              <button
                type="button"
                onClick={cancelPlacing}
                className="text-xs text-zinc-500 underline underline-offset-2 hover:text-zinc-900 dark:hover:text-white"
              >
                Cancel
              </button>
            </div>
          ) : draftPin ? (
            <PlacePinForm
              latitude={draftPin.lat}
              longitude={draftPin.lng}
              onDone={cancelPlacing}
              onCancel={cancelPlacing}
            />
          ) : placing?.mode === "new" ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-violet-700 dark:text-violet-300">
                Click the map where the parcel sits.
              </p>
              <button
                type="button"
                onClick={cancelPlacing}
                className="text-xs text-zinc-500 underline underline-offset-2 hover:text-zinc-900 dark:hover:text-white"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-zinc-500">
                Parcel without a street number?
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchHit(null);
                  setSelectedId(null);
                  infoWindowRef.current?.close();
                  setPlaceNotice(null);
                  setPlacing({ mode: "new" });
                }}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Drop a pin instead
              </button>
            </div>
          )}
          {placeNotice && !placing && !draftPin ? (
            <button
              type="button"
              onClick={() => setPlaceNotice(null)}
              className="mt-2 block text-left text-xs font-medium text-emerald-600 dark:text-emerald-400"
            >
              {placeNotice} (dismiss)
            </button>
          ) : null}
        </div>
          </div>
        </div>

        {!apiKey ? (
          <MapSetupNotice />
        ) : mapError ? (
          <div className="flex h-[55vh] min-h-[24rem] items-center justify-center p-8 text-center lg:h-[78vh]">
            <p className="text-sm text-rose-600 dark:text-rose-400">{mapError}</p>
          </div>
        ) : (
          <div
            ref={mapNode}
            className="h-[55vh] min-h-[24rem] w-full bg-zinc-100 lg:h-[78vh] dark:bg-zinc-900"
          />
        )}

        <div className="space-y-3 px-4 pt-3 sm:px-6 lg:pointer-events-none lg:absolute lg:top-4 lg:right-4 lg:bottom-4 lg:z-10 lg:w-80 lg:overflow-y-auto lg:p-0">
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200 bg-white/95 p-3 shadow-lg backdrop-blur lg:pointer-events-auto dark:border-zinc-800 dark:bg-zinc-950/95">
            {filters.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={
                  filter === f.key
                    ? "inline-flex items-center gap-2 rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white dark:bg-white dark:text-zinc-900"
                    : "inline-flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }
              >
                {f.key !== "ALL" ? (
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: PHOTO_STATUS_META[f.key].pin }}
                  />
                ) : null}
                {f.label}
                <span className="tabular-nums opacity-70">{f.count}</span>
              </button>
            ))}
          </div>

          {canPlanRoutes(role) ? (
            <div className="lg:pointer-events-auto">
              <DroneRoutePlanner listings={listings} map={map} onFocus={focus} />
            </div>
          ) : null}

          <div className="rounded-2xl border border-zinc-200 bg-white/95 shadow-lg backdrop-blur lg:pointer-events-auto dark:border-zinc-800 dark:bg-zinc-950/95">
            <p className="border-b border-zinc-100 px-4 py-3 text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:border-zinc-800">
              {visible.length} listing{visible.length === 1 ? "" : "s"}
            </p>
            {visible.length === 0 ? (
              <p className="px-4 py-6 text-sm text-zinc-500">
                {listings.length === 0
                  ? "No listings pinned yet. Search an address above, or add one."
                  : "Nothing matches this filter."}
              </p>
            ) : (
              <ul className="max-h-[24rem] divide-y divide-zinc-100 overflow-y-auto lg:max-h-none dark:divide-zinc-800">
                {visible.map((l) => (
                  <li key={l.id}>
                    <button
                      type="button"
                      onClick={() => focus(l)}
                      className={
                        l.id === selectedId
                          ? "flex w-full items-start gap-3 bg-zinc-50 px-4 py-3 text-left dark:bg-zinc-900"
                          : "flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900"
                      }
                    >
                      <span
                        className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: PHOTO_STATUS_META[l.photoStatus].pin }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-zinc-900 dark:text-white">
                          {listingLabel(l)}
                        </span>
                        <span className="block truncate text-xs text-zinc-500">
                          {l.name ? `${l.address} · ` : ""}
                          {listingLocality(l) || "—"}
                        </span>
                      </span>
                      {listingHasLiveRequest(l) ? (
                        <span className="shrink-0 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800 dark:bg-sky-950 dark:text-sky-200">
                          Requested
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {popupHost && selected
        ? createPortal(
            <ListingPopup
              listing={selected}
              role={role}
              onClose={closePopup}
              onMove={beginMove}
            />,
            popupHost,
          )
        : null}
    </div>
  );
}

function MapSetupNotice() {
  return (
    <div className="flex h-[34rem] flex-col items-center justify-center gap-2 p-8 text-center">
      <p className="text-sm font-medium text-zinc-900 dark:text-white">
        The map needs a Google Maps API key
      </p>
      <p className="max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
        Set{" "}
        <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
          NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
        </code>{" "}
        for the map and search, and{" "}
        <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
          GOOGLE_MAPS_API_KEY
        </code>{" "}
        for server-side geocoding.
      </p>
    </div>
  );
}

/** The pin popup: address first, then status, history, and actions. */
function ListingPopup({
  listing,
  role,
  onClose,
  onMove,
}: {
  listing: ListingView;
  role: Role;
  onClose: () => void;
  onMove: (listing: ListingView) => void;
}) {
  const meta = PHOTO_STATUS_META[listing.photoStatus];
  const live = listing.droneTasks.find(
    (t) => t.reviewStatus !== "DENIED" && t.executionStatus !== "DONE",
  );

  return (
    <div className="w-[19rem] space-y-3 p-1 text-zinc-900">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{listing.address}</p>
          <p className="text-xs text-zinc-500">
            {listingLocality(listing) || "—"}
          </p>
          {listing.name ? (
            <p className="text-xs text-zinc-500">{listing.name}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 text-xs text-zinc-500 hover:text-zinc-900"
        >
          Close
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${meta.badge}`}
        >
          {meta.label}
        </span>
        {listing.propertyType ? (
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
            {listing.propertyType}
          </span>
        ) : null}
        {listing.dealType ? (
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
            For {listing.dealType}
          </span>
        ) : null}
        {listing.agent ? (
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
            Agent {listing.agent}
          </span>
        ) : null}
      </div>

      {listing.lastShotAt ? (
        <p className="text-xs text-zinc-500">
          Last flown {formatDate(listing.lastShotAt)}
        </p>
      ) : null}
      {listing.photoNote ? (
        <p className="rounded-lg bg-zinc-50 px-2.5 py-2 text-xs text-zinc-600">
          {listing.photoNote}
        </p>
      ) : null}

      {canSeeAddedBy(role) ? (
        <p className="text-xs text-zinc-500">
          Added by {listing.addedByName ?? "someone"} on{" "}
          {formatDate(listing.addedAt)}
        </p>
      ) : null}

      <div className="space-y-3 border-t border-zinc-100 pt-3">
        {canSetPhotoStatus(role) ? (
          <PhotoStatusForm
            listingId={listing.id}
            current={listing.photoStatus}
            note={listing.photoNote}
          />
        ) : null}

        <RequestDroneShotForm
          target={{ kind: "listing", listingId: listing.id }}
          blockedReason={
            live
              ? `Drone shoot already requested by ${live.requestedByName ?? "a teammate"} on ${formatDate(live.createdAt)} — ${live.reviewStatus === "PENDING_REVIEW" ? "waiting on manager approval" : "approved and in the queue"}.`
              : null
          }
        />

        {canMovePin(role) || canArchiveListing(role) ? (
          <div className="flex flex-wrap items-center gap-3 border-t border-zinc-100 pt-2">
            {canMovePin(role) ? (
              <button
                type="button"
                onClick={() => onMove(listing)}
                className="text-xs font-medium text-zinc-500 underline underline-offset-2 hover:text-violet-700"
              >
                Move pin
              </button>
            ) : null}
            {canArchiveListing(role) ? (
              <ArchiveListingForm listingId={listing.id} />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
