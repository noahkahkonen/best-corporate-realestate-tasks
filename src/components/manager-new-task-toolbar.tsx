"use client";

import { usePathname } from "next/navigation";
import { ManagerNewTaskPanel } from "@/components/manager-new-task-panel";

type ProjectOption = { id: string; name: string };
type AdminOption = { id: string; name: string };

export function ManagerNewTaskToolbar({
  admins,
  projects,
}: {
  admins: AdminOption[];
  projects: ProjectOption[];
}) {
  const pathname = usePathname();
  const onTasks =
    pathname === "/manager/tasks" || pathname === "/manager";

  if (!onTasks) return null;

  return (
    <div className="flex justify-end pb-3">
      <ManagerNewTaskPanel admins={admins} projects={projects} />
    </div>
  );
}
