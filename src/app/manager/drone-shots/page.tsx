import { requireRole } from "@/lib/auth-helpers";
import { loadListings } from "@/lib/drone-shots-data";
import { DEFAULT_MAP_CENTER } from "@/lib/drone-shots";
import { DroneShotsMap } from "@/components/drone-shots-map";
import { DroneAddListing } from "@/components/drone-add-listing";
import { DroneConditions } from "@/components/drone-conditions";

export const dynamic = "force-dynamic";

export default async function ManagerDroneShotsPage() {
  await requireRole(["MANAGER"]);
  const listings = await loadListings();

  // Centre the forecast on the portfolio rather than a fixed office address.
  const centre = listings.length
    ? {
        lat: listings.reduce((s, l) => s + l.latitude, 0) / listings.length,
        lng: listings.reduce((s, l) => s + l.longitude, 0) / listings.length,
      }
    : DEFAULT_MAP_CENTER;

  return (
    <div className="space-y-4">
      <DroneConditions
        latitude={centre.lat}
        longitude={centre.lng}
        placeLabel={
          listings.length ? "Centre of the pinned listings" : "Columbus, OH"
        }
      />
      <DroneAddListing accent="amber" />
      <DroneShotsMap
        listings={listings}
        role="MANAGER"
        apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? null}
        mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID"}
      />
    </div>
  );
}
