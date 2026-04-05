import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const u = req.auth?.user;

  if (u?.mustChangePassword) {
    if (pathname.startsWith("/api/auth")) {
      return NextResponse.next();
    }
    if (pathname === "/change-password") {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/change-password", req.url));
  }

  if (pathname === "/") {
    if (!u) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    const dest =
      u.role === "AGENT"
        ? "/agent"
        : u.role === "MANAGER"
          ? "/manager"
          : "/admin";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  if (pathname === "/login") {
    if (u) {
      const dest =
        u.role === "AGENT"
          ? "/agent"
          : u.role === "MANAGER"
            ? "/manager"
            : "/admin";
      return NextResponse.redirect(new URL(dest, req.url));
    }
    return NextResponse.next();
  }

  if (!u) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (pathname.startsWith("/agent") && u.role !== "AGENT") {
    return NextResponse.redirect(new URL("/", req.url));
  }
  if (pathname.startsWith("/manager") && u.role !== "MANAGER") {
    return NextResponse.redirect(new URL("/", req.url));
  }
  if (pathname.startsWith("/admin") && u.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/",
    "/login",
    "/change-password",
    "/agent/:path*",
    "/manager/:path*",
    "/admin/:path*",
  ],
};
