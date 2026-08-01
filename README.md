This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Drone Shots

A **Drone Shots** tab in all three portals plots every listing on a Google map
so flights get planned instead of improvised.

- **Pins are colour-coded by photo state.** Grey means no drone photos, amber
  means more are needed, green means shot. Grey is the default, so anything
  un-photographed reads as unfinished at a glance.
- **Click a pin** for a popup with the address, status, and — for managers and
  admins — who added the listing and when.
- **Search any address** through Google Places. Requesting photos for an
  address that isn't pinned yet drops a new grey pin as a side effect, so the
  map fills in as people use it.
- **Requesting a drone photo creates a normal task** in `PENDING_REVIEW`, with
  the address in the title, the requested completion date as the due date, and
  special notes in the body. It lands in the manager's approval queue with
  every other request and inherits assignment, help threads, and the completed
  queue for free.
- **Route planner** (admin and manager) builds the shortest round trip that
  fits the most un-photographed listings into two hours of driving. Google
  optimises the order of a fixed set of stops but won't choose which to skip,
  so the selection is ours: seed with the nearest listings, then drop the
  costliest stop until the drive fits. A listing can be pinned so it is never
  dropped.
- **Flight conditions** (admin and manager) show wind, gusts, cloud, and a
  go/marginal/no-go read from [Open-Meteo](https://open-meteo.com) — keyless
  and free — plus sunrise, sunset, both golden hours, and where the sun
  currently sits. The sun maths is computed locally in `src/lib/sun.ts` rather
  than fetched, so it still works when the network doesn't.

### Google Maps setup

Three environment variables, all documented in `.env.example`:

| Variable | Used for |
| --- | --- |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Map, pins, address search (browser) |
| `GOOGLE_MAPS_API_KEY` | Address → coordinates when adding a listing (server) |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` | Required for the coloured advanced markers |

### Home base

The tab is anchored to one place rather than each piece guessing
independently: the map opens there, routes leave from and return to it,
conditions are reported for it, and address search is biased around it. It
defaults to downtown Columbus. To move it, set all three of
`NEXT_PUBLIC_DRONE_HOME_LAT`, `NEXT_PUBLIC_DRONE_HOME_LNG`, and
`NEXT_PUBLIC_DRONE_HOME_LABEL`. `DRONE_TIMEZONE` (default `America/New_York`)
controls how sunrise, sunset, and the forecast strip are formatted — leave it
unset and times render in the server's zone, which on Vercel is UTC.

Enable **Maps JavaScript API**, **Places API**, **Directions API**, and
**Geocoding API** on the project. Restrict the public key by HTTP referrer; the
server key can stay referrer-free but should be limited to Geocoding. Without
the keys the tab still lists listings — only the map itself goes missing.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
