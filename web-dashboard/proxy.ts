import { NextRequest, NextResponse } from "next/server";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const userId = req.cookies.get("userId")?.value;
  const userRole = req.cookies.get("userRole")?.value;
  const isLoggedIn = !!userId;

  if (pathname === "/") {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    if (userRole === "ADMINISTRATOR") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    if (userRole === "OPERATIONS_PLANNER") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    if (userRole === "TRUCK_DRIVER") {
      return NextResponse.redirect(new URL("/driver", req.url));
    }
  }

  if (!isLoggedIn && pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isLoggedIn && pathname === "/login") {
    if (userRole === "ADMINISTRATOR") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    if (userRole === "OPERATIONS_PLANNER") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    if (userRole === "TRUCK_DRIVER") {
      return NextResponse.redirect(new URL("/driver", req.url));
    }
  }

  if (
    (pathname === "/admin" || pathname.startsWith("/admin/")) &&
    userRole !== "ADMINISTRATOR"
  ) {
    if (userRole === "TRUCK_DRIVER") {
      return NextResponse.redirect(new URL("/driver", req.url));
    }
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (
    (pathname === "/driver" || pathname.startsWith("/driver/")) &&
    userRole !== "TRUCK_DRIVER"
  ) {
    if (userRole === "ADMINISTRATOR") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (
    (pathname.startsWith("/dashboard") ||
      pathname.startsWith("/bins") ||
      pathname.startsWith("/routes") ||
      pathname.startsWith("/scenarios") ||
      pathname.startsWith("/reports")) &&
    userRole === "TRUCK_DRIVER"
  ) {
    return NextResponse.redirect(new URL("/driver", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/admin/:path*",
    "/driver/:path*",
    "/dashboard/:path*",
    "/bins/:path*",
    "/routes/:path*",
    "/scenarios/:path*",
    "/reports/:path*",
  ],
};