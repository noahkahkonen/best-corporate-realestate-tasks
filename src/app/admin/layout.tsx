import { logout } from "@/server/logout";
import { AdminNav } from "@/components/admin-nav";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="pb-6">
          <p className="text-xs font-semibold tracking-widest text-emerald-700 uppercase dark:text-emerald-400">
            Admin portal
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
            My assignments
          </h1>
          <p className="mt-1 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
            Update status on active work. Request help if blocked—managers see
            it on Admin support.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 pb-6">
          <form action={logout}>
            <button
              type="submit"
              className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <AdminNav />
      <div className="pt-8">{children}</div>
    </div>
  );
}
