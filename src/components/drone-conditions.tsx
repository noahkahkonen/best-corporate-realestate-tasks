import { fetchConditions, flightVerdict, weatherLabel } from "@/lib/weather";
import { sunPosition, sunTimes } from "@/lib/sun";
import { DISPLAY_TIMEZONE } from "@/lib/drone-shots";

const VERDICT_STYLE = {
  GO: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  MARGINAL: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  NO_GO: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
} as const;

const VERDICT_LABEL = {
  GO: "Good to fly",
  MARGINAL: "Marginal",
  NO_GO: "Don't fly",
} as const;

function time(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: DISPLAY_TIMEZONE,
  });
}

/**
 * Open-Meteo returns local wall-clock stamps with no offset when timezone=auto,
 * so these are read as-is rather than shifted into the display zone again.
 */
function hourLabel(iso: string): string {
  const hour = Number(iso.slice(11, 13));
  if (!Number.isFinite(hour)) return "—";
  const suffix = hour < 12 ? "AM" : "PM";
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve} ${suffix}`;
}

/**
 * One slim strip: go/no-go, the numbers that ground a drone, and the day's
 * light windows. The hourly forecast tucks behind a disclosure so the map
 * stays the star of the page.
 */
export async function DroneConditions({
  latitude,
  longitude,
  placeLabel,
}: {
  latitude: number;
  longitude: number;
  placeLabel: string;
}) {
  const now = new Date();
  const conditions = await fetchConditions(latitude, longitude);
  const sun = sunTimes(now, latitude, longitude);
  const position = sunPosition(now, latitude, longitude);
  const verdict = conditions ? flightVerdict(conditions.current) : null;

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white/80 px-4 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {conditions && verdict ? (
          <>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${VERDICT_STYLE[verdict.verdict]}`}
            >
              {VERDICT_LABEL[verdict.verdict]}
            </span>
            <span className="text-xl font-semibold tabular-nums text-zinc-900 dark:text-white">
              {Math.round(conditions.current.temperatureF)}°
            </span>
            <span className="text-sm text-zinc-700 dark:text-zinc-300">
              {weatherLabel(conditions.current.code)}
            </span>
            <span className="text-xs text-zinc-500">
              Wind {Math.round(conditions.current.windMph)} · gusts{" "}
              {Math.round(conditions.current.gustMph)} mph
            </span>
          </>
        ) : (
          <span className="text-xs text-zinc-500">
            Weather is unavailable right now.
          </span>
        )}

        <span
          className="hidden h-6 w-px bg-zinc-200 sm:block dark:bg-zinc-800"
          aria-hidden
        />

        <SunArc altitude={position.altitude} azimuth={position.azimuth} />
        <span className="text-xs text-zinc-500">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            ☀ {time(sun.sunrise)} – {time(sun.sunset)}
          </span>
          {" · "}golden {time(sun.sunrise)}–{time(sun.morningGoldenEnd)} &amp;{" "}
          {time(sun.eveningGoldenStart)}–{time(sun.sunset)}
        </span>

        <span className="ml-auto hidden text-[0.7rem] text-zinc-400 md:block">
          {placeLabel}
        </span>
      </div>

      {conditions ? (
        <details className="mt-1.5">
          <summary className="cursor-pointer text-xs text-zinc-500 select-none">
            12-hour forecast
          </summary>
          <ul className="mt-2 flex gap-1 overflow-x-auto pb-1">
            {conditions.hourly.map((h) => {
              const hv = flightVerdict(h);
              return (
                <li
                  key={h.time}
                  className="flex min-w-[3.25rem] shrink-0 flex-col items-center gap-1 rounded-lg bg-zinc-50 px-1.5 py-2 dark:bg-zinc-900"
                >
                  <span className="text-[0.65rem] text-zinc-500">
                    {hourLabel(h.time)}
                  </span>
                  <span
                    className={`h-1.5 w-full rounded-full ${
                      hv.verdict === "GO"
                        ? "bg-emerald-500"
                        : hv.verdict === "MARGINAL"
                          ? "bg-amber-500"
                          : "bg-rose-500"
                    }`}
                  />
                  <span className="text-xs font-medium tabular-nums text-zinc-900 dark:text-white">
                    {Math.round(h.temperatureF)}°
                  </span>
                  <span className="text-[0.65rem] text-zinc-500 tabular-nums">
                    {Math.round(h.gustMph)}g
                  </span>
                </li>
              );
            })}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

/** A palm-sized horizon arc showing where the sun sits right now. */
function SunArc({ altitude, azimuth }: { altitude: number; azimuth: number }) {
  const width = 120;
  const height = 40;
  const horizon = height - 8;
  const radius = width / 2 - 8;

  // Map the sun's compass bearing onto the arc: east on the left, west right.
  const t = Math.min(1, Math.max(0, (azimuth - 60) / 240));
  const clampedAltitude = Math.min(90, Math.max(-6, altitude));
  const x = 8 + t * (width - 16);
  const y = horizon - (clampedAltitude / 90) * radius;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-10 w-[7.5rem] shrink-0"
      role="img"
      aria-label={`Sun ${Math.round(altitude)} degrees above the horizon`}
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#fcd34d" stopOpacity="0.25" />
        </linearGradient>
      </defs>
      <path
        d={`M 8 ${horizon} A ${radius} ${radius} 0 0 1 ${width - 8} ${horizon} Z`}
        fill="url(#sky)"
      />
      <line
        x1="2"
        y1={horizon}
        x2={width - 2}
        y2={horizon}
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="1"
      />
      {altitude > -6 ? (
        <circle
          cx={x}
          cy={y}
          r="4"
          fill={altitude > 6 ? "#fbbf24" : "#fb923c"}
          stroke="#ffffff"
          strokeOpacity="0.7"
          strokeWidth="1"
        />
      ) : null}
    </svg>
  );
}
