import { requireRole } from "@/lib/auth-helpers";
import { ManagerCreateUser } from "@/components/manager-create-user";

export const dynamic = "force-dynamic";

export default async function ManagerAccountsPage() {
  await requireRole(["MANAGER"]);

  return (
    <div className="space-y-6">
      <ManagerCreateUser />
    </div>
  );
}
