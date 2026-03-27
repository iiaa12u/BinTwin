import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = body?.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Optional: check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // IMPORTANT: do NOT reveal user existence (security best practice)
      return NextResponse.json({ ok: true });
    }

    // Create reset request
    await prisma.passwordResetRequest.create({
      data: {
        email,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Failed to submit request" },
      { status: 500 }
    );
  }
}