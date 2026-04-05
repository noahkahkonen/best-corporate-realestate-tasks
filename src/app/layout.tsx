import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Best Corporate Real Estate — Tasks",
  description:
    "Work task board for Best Corporate Real Estate: projects, priorities, and due dates.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100/80 via-zinc-50 to-zinc-100 text-zinc-900 dark:from-zinc-900 dark:via-zinc-950 dark:to-black dark:text-zinc-50">
        <header className="border-b border-zinc-200/80 bg-white/70 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/70">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6 lg:px-8">
            <div>
              <p className="text-xs font-semibold tracking-widest text-indigo-600 uppercase dark:text-indigo-400">
                Best Corporate Real Estate
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
                Task manager
              </h1>
              <p className="mt-1 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
                Track work in projects, drag tasks between columns, and keep
                priorities and due dates in one place.
              </p>
            </div>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
