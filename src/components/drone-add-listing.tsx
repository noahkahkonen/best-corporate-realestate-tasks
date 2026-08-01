"use client";

import { useActionState, useState } from "react";
import { addListing, type ActionState } from "@/server/drone-shots-actions";
import { Feedback } from "@/components/drone-shots-forms";

const inputClass =
  "mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";

const PROPERTY_TYPES = ["Retail", "Office", "Industrial", "Multifamily", "Land"];

/**
 * Pins a listing without requesting a flight — how the existing portfolio gets
 * onto the map in the first place.
 */
export function DroneAddListing({
  accent,
}: {
  accent: "indigo" | "amber" | "emerald";
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(addListing, {} as ActionState);

  const button =
    accent === "amber"
      ? "bg-amber-600 hover:bg-amber-500"
      : accent === "emerald"
        ? "bg-emerald-600 hover:bg-emerald-500"
        : "bg-indigo-600 hover:bg-indigo-500";

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white/80 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {open
            ? "The address is looked up on Google to place the pin."
            : "Add a listing to the map without requesting a flight."}
        </p>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium text-white ${button}`}
        >
          {open ? "Cancel" : "Add listing"}
        </button>
      </div>

      {open ? (
        <form
          action={action}
          className="grid gap-3 border-t border-zinc-100 p-5 sm:grid-cols-2 dark:border-zinc-800"
        >
          <label className="block text-sm font-medium text-zinc-700 sm:col-span-2 dark:text-zinc-300">
            Street address
            <input
              name="address"
              required
              placeholder="3535 E Main St"
              className={inputClass}
            />
          </label>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            City
            <input name="city" placeholder="Columbus" className={inputClass} />
          </label>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            State
            <input name="state" placeholder="OH" className={inputClass} />
          </label>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            ZIP
            <input name="postalCode" placeholder="43213" className={inputClass} />
          </label>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Property type
            <select name="propertyType" defaultValue="" className={inputClass}>
              <option value="">Unspecified</option>
              {PROPERTY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-zinc-700 sm:col-span-2 dark:text-zinc-300">
            Nickname (optional)
            <input
              name="name"
              placeholder="e.g. Eastland pad site"
              className={inputClass}
            />
          </label>

          <details className="sm:col-span-2">
            <summary className="cursor-pointer text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Address won&apos;t geocode? Enter coordinates manually
            </summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Latitude
                <input
                  name="latitude"
                  inputMode="decimal"
                  placeholder="39.9612"
                  className={inputClass}
                />
              </label>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Longitude
                <input
                  name="longitude"
                  inputMode="decimal"
                  placeholder="-82.9988"
                  className={inputClass}
                />
              </label>
              <p className="text-xs text-zinc-500 sm:col-span-2">
                Right-click a point in Google Maps to copy the pair. Leave both
                blank to look the address up instead.
              </p>
            </div>
          </details>

          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <button
              type="submit"
              disabled={pending}
              className={`rounded-lg px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60 ${button}`}
            >
              {pending ? "Locating…" : "Add to map"}
            </button>
            <Feedback state={state} />
          </div>
        </form>
      ) : null}
    </div>
  );
}
