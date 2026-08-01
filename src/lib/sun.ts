/**
 * Sun position and daylight windows for a lat/lng on a given day.
 *
 * Implemented locally rather than called out to an API: it is a closed-form
 * calculation, it has to run per-listing while the photographer pans the map,
 * and the flight planner should still work when the network doesn't.
 *
 * Accuracy is ~1 minute for event times, which is well inside the margin that
 * matters for scheduling a drone flight.
 */

const RAD = Math.PI / 180;
const DAY_MS = 86_400_000;
/** Julian date of the Unix epoch. */
const J1970 = 2_440_588;
const J2000 = 2_451_545;

function toJulian(date: Date): number {
  return date.valueOf() / DAY_MS - 0.5 + J1970;
}

function fromJulian(j: number): Date {
  return new Date((j + 0.5 - J1970) * DAY_MS);
}

function daysSince2000(date: Date): number {
  return toJulian(date) - J2000;
}

/** Earth's axial tilt. */
const OBLIQUITY = 23.4397 * RAD;

function solarMeanAnomaly(d: number): number {
  return RAD * (357.5291 + 0.98560028 * d);
}

function eclipticLongitude(M: number): number {
  // Equation of center plus the longitude of perihelion.
  const C =
    RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const P = RAD * 102.9372;
  return M + C + P + Math.PI;
}

function declination(L: number): number {
  return Math.asin(Math.sin(OBLIQUITY) * Math.sin(L));
}

function rightAscension(L: number): number {
  return Math.atan2(Math.sin(L) * Math.cos(OBLIQUITY), Math.cos(L));
}

function siderealTime(d: number, lw: number): number {
  return RAD * (280.16 + 360.9856235 * d) - lw;
}

export type SunPosition = {
  /** Degrees clockwise from north. */
  azimuth: number;
  /** Degrees above the horizon; negative when the sun is down. */
  altitude: number;
};

/** Where the sun sits in the sky at a moment, as a compass bearing and height. */
export function sunPosition(
  date: Date,
  latitude: number,
  longitude: number,
): SunPosition {
  const lw = RAD * -longitude;
  const phi = RAD * latitude;
  const d = daysSince2000(date);

  const M = solarMeanAnomaly(d);
  const L = eclipticLongitude(M);
  const dec = declination(L);
  const ra = rightAscension(L);
  const H = siderealTime(d, lw) - ra;

  const azimuth = Math.atan2(
    Math.sin(H),
    Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi),
  );
  const altitude = Math.asin(
    Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H),
  );

  return {
    // atan2 above is measured from south; shift so 0° = north.
    azimuth: (azimuth / RAD + 180 + 360) % 360,
    altitude: altitude / RAD,
  };
}

const J0 = 0.0009;

function julianCycle(d: number, lw: number): number {
  return Math.round(d - J0 - lw / (2 * Math.PI));
}

function approxTransit(Ht: number, lw: number, n: number): number {
  return J0 + (Ht + lw) / (2 * Math.PI) + n;
}

function solarTransitJ(ds: number, M: number, L: number): number {
  return J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
}

function hourAngle(h: number, phi: number, dec: number): number {
  const cosH =
    (Math.sin(h) - Math.sin(phi) * Math.sin(dec)) /
    (Math.cos(phi) * Math.cos(dec));
  // Clamped so polar days/nights return the transit rather than NaN.
  return Math.acos(Math.min(1, Math.max(-1, cosH)));
}

export type SunTimes = {
  sunrise: Date | null;
  sunset: Date | null;
  solarNoon: Date;
  /** Warm low-angle light after sunrise and before sunset. */
  morningGoldenEnd: Date | null;
  eveningGoldenStart: Date | null;
  /** Civil twilight — the practical bookends for a legal daylight flight. */
  dawn: Date | null;
  dusk: Date | null;
};

/**
 * Angles below/above the horizon that bound each window, in degrees.
 * -0.833 accounts for refraction and the sun's disc at the horizon.
 */
const ANGLES = {
  sunrise: -0.833,
  golden: 6,
  civil: -6,
} as const;

export function sunTimes(
  date: Date,
  latitude: number,
  longitude: number,
): SunTimes {
  const lw = RAD * -longitude;
  const phi = RAD * latitude;
  const d = daysSince2000(date);

  const n = julianCycle(d, lw);
  const ds = approxTransit(0, lw, n);
  const M = solarMeanAnomaly(ds);
  const L = eclipticLongitude(M);
  const dec = declination(L);
  const Jnoon = solarTransitJ(ds, M, L);

  /** Returns [rise-side, set-side] times for a given sun altitude. */
  function pair(angleDeg: number): [Date | null, Date | null] {
    const h = angleDeg * RAD;
    const cosH =
      (Math.sin(h) - Math.sin(phi) * Math.sin(dec)) /
      (Math.cos(phi) * Math.cos(dec));
    if (cosH > 1 || cosH < -1) return [null, null];

    const w = hourAngle(h, phi, dec);
    const Jset = solarTransitJ(approxTransit(w, lw, n), M, L);
    const Jrise = Jnoon - (Jset - Jnoon);
    return [fromJulian(Jrise), fromJulian(Jset)];
  }

  const [sunrise, sunset] = pair(ANGLES.sunrise);
  const [morningGoldenEnd, eveningGoldenStart] = pair(ANGLES.golden);
  const [dawn, dusk] = pair(ANGLES.civil);

  return {
    sunrise,
    sunset,
    solarNoon: fromJulian(Jnoon),
    morningGoldenEnd,
    eveningGoldenStart,
    dawn,
    dusk,
  };
}

/** Compass label for a bearing, for reading the sun's direction at a glance. */
export function compassPoint(azimuth: number): string {
  const points = [
    "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
  ];
  return points[Math.round(azimuth / 22.5) % 16];
}
