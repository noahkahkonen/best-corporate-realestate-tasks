import { requireRole } from "@/lib/auth-helpers";
import { loadListings } from "@/lib/drone-shots-data";
import { HOME_BASE } from "@/lib/drone-shots";
import { DroneShotsMap } from "@/components/drone-shots-map";
import { DroneConditions } from "@/components/drone-conditions";

export const dynamic = "force-dynamic";

export default async function ManagerDroneShotsPage() {
  await requireRole(["MANAGER"]);
  const listings = await loadListings();

  return (
    <div className="space-y-4">
      <DroneConditions
        latitude={HOME_BASE.lat}
        longitude={HOME_BASE.lng}
        placeLabel={HOME_BASE.label}
      />
      <DroneShotsMap
        listings={listings}
        role="MANAGER"
        apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? null}
        mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID"}
      />
    </div>
  );
}
