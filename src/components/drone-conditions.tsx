import { fetchConditions, flightVerdict, weatherLabel } from "@/lib/weather";
import { compassPoint, sunPosition, sunTimes } from "@/lib/sun";

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
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function hourLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: "numeric" });
}

/**
 * Flight conditions for the photographer: whether the drone can go up now, and
 * when the light will be worth the drive.
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
  const isUp = position.altitude > 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <section className="rounded-2xl border border-zinc-200 bg-white/80 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
              Flight conditions
            </h3>
            <p className="text-xs text-zinc-500">{placeLabel}</p>
          </div>
          {conditions ? (
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${VERDICT_STYLE[flightVerdict(conditions.current).verdict]}`}
            >
              {VERDICT_LABEL[flightVerdict(conditions.current).verdict]}
            </span>
          ) : null}
        </div>

        {!conditions ? (
          <p className="mt-4 text-sm text-zinc-500">
            Weather is unavailable right now.
          </p>
        ) : (
          <>
            <div className="mt-4 flex items-end gap-3">
              <p className="text-3xl font-semibold tabular-nums text-zinc-900 dark:text-white">
                {Math.round(conditions.current.temperatureF)}°
              </p>
              <div className="pb-1">
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                  {weatherLabel(conditions.current.code)}
                </p>
                <p className="text-xs text-zinc-500">
                  {flightVerdict(conditions.current).reason}
                </p>
              </div>
            </div>

            <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[
                { k: "Wind", v: `${Math.round(conditions.current.windMph)} mph` },
                { k: "Gusts", v: `${Math.round(conditions.current.gustMph)} mph` },
                { k: "Cloud", v: `${Math.round(conditions.current.cloudCover)}%` },
              ].map(({ k, v }) => (
                <div
                  key={k}
                  className="rounded-lg bg-zinc-50 px-2 py-2 dark:bg-zinc-900"
                >
                  <dt className="text-[0.65rem] tracking-wide text-zinc-500 uppercase">
                    {k}
                  </dt>
                  <dd className="text-sm font-medium tabular-nums text-zinc-900 dark:text-white">
                    {v}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-4">
              <p className="text-[0.65rem] tracking-wide text-zinc-500 uppercase">
                Next 12 hours
              </p>
              <ul className="mt-2 flex gap-1 overflow-x-auto pb-1">
                {conditions.hourly.map((h) => {
                  const { verdict } = flightVerdict(h);
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
                          verdict === "GO"
                            ? "bg-emerald-500"
                            : verdict === "MARGINAL"
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
            </div>
          </>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white/80 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
          Sun &amp; light
        </h3>
        <p className="text-xs text-zinc-500">
          {isUp
            ? `Sun is ${Math.round(position.altitude)}° up, bearing ${Math.round(position.azimuth)}° ${compassPoint(position.azimuth)}`
            : "Sun is below the horizon"}
        </p>

        <SunArc altitude={position.altitude} azimuth={position.azimuth} />

        <dl className="mt-4 space-y-1.5 text-sm">
          {[
            { k: "First light", v: time(sun.dawn) },
            { k: "Sunrise", v: time(sun.sunrise) },
            {
              k: "Morning golden hour",
              v: `${time(sun.sunrise)} – ${time(sun.morningGoldenEnd)}`,
            },
            {
              k: "Evening golden hour",
              v: `${time(sun.eveningGoldenStart)} – ${time(sun.sunset)}`,
            },
            { k: "Sunset", v: time(sun.sunset) },
            { k: "Last light", v: time(sun.dusk) },
          ].map(({ k, v }) => (
            <div key={k} className="flex items-baseline justify-between gap-3">
              <dt className="text-xs text-zinc-500">{k}</dt>
              <dd className="text-xs font-medium tabular-nums text-zinc-900 dark:text-white">
                {v}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

/**
 * The sun's current height drawn on a horizon arc — a quick read on how much
 * usable light is left and from which side it is falling.
 */
function SunArc({ altitude, azimuth }: { altitude: number; azimuth: number }) {
  const width = 240;
  const height = 96;
  const horizon = height - 16;
  const radius = width / 2 - 12;

  // Map the sun's compass bearing onto the arc: east on the left, west right.
  const t = Math.min(1, Math.max(0, (azimuth - 60) / 240));
  const clampedAltitude = Math.min(90, Math.max(-6, altitude));
  const x = 12 + t * (width - 24);
  const y = horizon - (clampedAltitude / 90) * radius;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="mt-3 w-full"
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
        d={`M 12 ${horizon} A ${radius} ${radius} 0 0 1 ${width - 12} ${horizon} Z`}
        fill="url(#sky)"
      />
      <line
        x1="4"
        y1={horizon}
        x2={width - 4}
        y2={horizon}
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="1.5"
      />
      {altitude > -6 ? (
        <circle
          cx={x}
          cy={y}
          r="7"
          fill={altitude > 6 ? "#fbbf24" : "#fb923c"}
          stroke="#ffffff"
          strokeOpacity="0.7"
          strokeWidth="1.5"
        />
      ) : null}
      <text x="12" y={height - 2} className="text-[8px]" fill="currentColor" opacity="0.5">
        E
      </text>
      <text
        x={width - 18}
        y={height - 2}
        className="text-[8px]"
        fill="currentColor"
        opacity="0.5"
      >
        W
      </text>
    </svg>
  );
}
