/**
 * Address -> coordinates via the Google Geocoding API.
 *
 * Uses GOOGLE_MAPS_API_KEY (server-only, so it can stay unrestricted) and falls
 * back to the browser key when only one key is configured.
 */

export type GeocodeResult = {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  city: string | null;
  state: string | null;
  postalCode: string | null;
};

function serverKey(): string | null {
  return (
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    null
  );
}

export function geocodingConfigured(): boolean {
  return serverKey() !== null;
}

type GoogleComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

function component(
  components: GoogleComponent[],
  type: string,
  form: "long_name" | "short_name" = "long_name",
): string | null {
  const hit = components.find((c) => c.types.includes(type));
  return hit ? hit[form] : null;
}

/**
 * Returns coordinates for a free-form address, or null when the address can't
 * be resolved. Throws only when the API itself is unusable (missing key, network
 * failure, denied request) so callers can tell "bad address" from "broken setup".
 */
export async function geocodeAddress(
  address: string,
): Promise<GeocodeResult | null> {
  const key = serverKey();
  if (!key) {
    throw new Error(
      "Geocoding is not configured. Set GOOGLE_MAPS_API_KEY in the environment.",
    );
  }

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", address);
  url.searchParams.set("key", key);

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Geocoding request failed (HTTP ${res.status}).`);
  }

  const data = (await res.json()) as {
    status: string;
    error_message?: string;
    results?: Array<{
      geometry: { location: { lat: number; lng: number } };
      formatted_address: string;
      address_components: GoogleComponent[];
    }>;
  };

  if (data.status === "ZERO_RESULTS") return null;
  if (data.status !== "OK") {
    throw new Error(
      data.error_message ?? `Geocoding failed with status ${data.status}.`,
    );
  }

  const top = data.results?.[0];
  if (!top) return null;

  return {
    latitude: top.geometry.location.lat,
    longitude: top.geometry.location.lng,
    formattedAddress: top.formatted_address,
    city:
      component(top.address_components, "locality") ??
      component(top.address_components, "sublocality") ??
      component(top.address_components, "administrative_area_level_3"),
    state: component(
      top.address_components,
      "administrative_area_level_1",
      "short_name",
    ),
    postalCode: component(top.address_components, "postal_code"),
  };
}
