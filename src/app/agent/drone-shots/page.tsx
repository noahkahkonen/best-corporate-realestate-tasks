import { requireRole } from "@/lib/auth-helpers";
import { loadListings } from "@/lib/drone-shots-data";
import { DroneShotsMap } from "@/components/drone-shots-map";
import { DroneAddListing } from "@/components/drone-add-listing";

export const dynamic = "force-dynamic";

export default async function AgentDroneShotsPage() {
  await requireRole(["AGENT"]);
  const listings = await loadListings();

  return (
    <div className="space-y-4">
      <DroneAddListing accent="indigo" />
      <DroneShotsMap
        listings={listings}
        role="AGENT"
        apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? null}
        mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID"}
      />
    </div>
  );
}
