import { TaskBoard } from "@/components/task-board";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [tasks, projects] = await Promise.all([
    prisma.task.findMany({
      include: { project: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.project.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  return (
    <main className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <TaskBoard initialTasks={tasks} projects={projects} />
    </main>
  );
}
