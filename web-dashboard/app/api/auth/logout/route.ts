import { NextResponse } from "next/server";

function clearCookies() {
  const response = NextResponse.json({ ok: true });

  response.cookies.set("userId", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    expires: new Date(0),
  });

  response.cookies.set("userRole", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    expires: new Date(0),
  });

  return response;
}

export async function POST() {
  return clearCookies();
}

export async function GET() {
  return clearCookies();
}