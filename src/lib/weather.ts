/**
 * Flight conditions from Open-Meteo — free, keyless, no attribution burden.
 *
 * The fields are chosen for whether a drone can fly, not for a general forecast:
 * wind and gusts ground the aircraft, precipitation and cloud cover ruin the
 * shot, and visibility decides whether it is worth the drive.
 */

export type HourlyConditions = {
  time: string;
  temperatureF: number;
  windMph: number;
  gustMph: number;
  precipChance: number;
  cloudCover: number;
  visibilityMiles: number;
  code: number;
};

export type Conditions = {
  latitude: number;
  longitude: number;
  current: HourlyConditions;
  hourly: HourlyConditions[];
};

/** Open-Meteo WMO weather codes, collapsed to what a pilot cares about. */
export function weatherLabel(code: number): string {
  if (code === 0) return "Clear";
  if (code <= 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code <= 48) return "Fog";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Showers";
  if (code <= 86) return "Snow showers";
  return "Thunderstorms";
}

/**
 * A rough go/no-go read. Deliberately conservative: consumer drones are rated
 * around 22–24 mph of wind, so gusts near that are a hard no.
 */
export function flightVerdict(c: HourlyConditions): {
  verdict: "GO" | "MARGINAL" | "NO_GO";
  reason: string;
} {
  if (c.gustMph >= 22) {
    return { verdict: "NO_GO", reason: `Gusts to ${Math.round(c.gustMph)} mph` };
  }
  if (c.precipChance >= 60) {
    return { verdict: "NO_GO", reason: `${c.precipChance}% chance of precipitation` };
  }
  if (c.gustMph >= 16) {
    return { verdict: "MARGINAL", reason: `Gusts to ${Math.round(c.gustMph)} mph` };
  }
  if (c.precipChance >= 30) {
    return { verdict: "MARGINAL", reason: `${c.precipChance}% chance of precipitation` };
  }
  if (c.visibilityMiles < 3) {
    return { verdict: "MARGINAL", reason: `Visibility ${c.visibilityMiles.toFixed(1)} mi` };
  }
  return { verdict: "GO", reason: `${Math.round(c.windMph)} mph wind` };
}

type OpenMeteoResponse = {
  latitude: number;
  longitude: number;
  current?: Record<string, number | string>;
  hourly?: Record<string, Array<number | string>>;
};

const HOURLY_FIELDS = [
  "temperature_2m",
  "precipitation_probability",
  "cloud_cover",
  "visibility",
  "wind_speed_10m",
  "wind_gusts_10m",
  "weather_code",
];

function hourAt(
  hourly: Record<string, Array<number | string>>,
  i: number,
): HourlyConditions {
  const num = (key: string) => Number(hourly[key]?.[i] ?? 0);
  return {
    time: String(hourly.time?.[i] ?? ""),
    temperatureF: num("temperature_2m"),
    windMph: num("wind_speed_10m"),
    gustMph: num("wind_gusts_10m"),
    precipChance: num("precipitation_probability"),
    cloudCover: num("cloud_cover"),
    // Open-Meteo reports visibility in feet when imperial units are requested.
    visibilityMiles: num("visibility") / 5280,
    code: num("weather_code"),
  };
}

/** Current conditions plus the next 12 hours. Returns null if the API is down. */
export async function fetchConditions(
  latitude: number,
  longitude: number,
): Promise<Conditions | null> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", latitude.toFixed(4));
  url.searchParams.set("longitude", longitude.toFixed(4));
  url.searchParams.set("hourly", HOURLY_FIELDS.join(","));
  url.searchParams.set(
    "current",
    "temperature_2m,wind_speed_10m,wind_gusts_10m,cloud_cover,precipitation,weather_code",
  );
  url.searchParams.set("temperature_unit", "fahrenheit");
  url.searchParams.set("wind_speed_unit", "mph");
  url.searchParams.set("precipitation_unit", "inch");
  url.searchParams.set("length_unit", "imperial");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "2");

  let data: OpenMeteoResponse;
  try {
    const res = await fetch(url, { next: { revalidate: 900 } });
    if (!res.ok) return null;
    data = (await res.json()) as OpenMeteoResponse;
  } catch {
    return null;
  }

  const hourly = data.hourly;
  if (!hourly?.time) return null;

  // Line the forecast up with the current hour rather than the start of the day.
  const nowIso = new Date().toISOString().slice(0, 13);
  const startIndex = Math.max(
    0,
    hourly.time.findIndex((t) => String(t).slice(0, 13) >= nowIso),
  );

  const upcoming: HourlyConditions[] = [];
  for (let i = startIndex; i < Math.min(startIndex + 12, hourly.time.length); i++) {
    upcoming.push(hourAt(hourly, i));
  }

  const cur = data.current;
  const current: HourlyConditions = cur
    ? {
        time: String(cur.time ?? ""),
        temperatureF: Number(cur.temperature_2m ?? 0),
        windMph: Number(cur.wind_speed_10m ?? 0),
        gustMph: Number(cur.wind_gusts_10m ?? 0),
        precipChance: upcoming[0]?.precipChance ?? 0,
        cloudCover: Number(cur.cloud_cover ?? 0),
        visibilityMiles: upcoming[0]?.visibilityMiles ?? 10,
        code: Number(cur.weather_code ?? 0),
      }
    : (upcoming[0] ?? hourAt(hourly, 0));

  return {
    latitude: data.latitude,
    longitude: data.longitude,
    current,
    hourly: upcoming,
  };
}
