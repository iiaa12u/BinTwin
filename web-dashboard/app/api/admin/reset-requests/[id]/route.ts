import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Missing request id" },
        { status: 400 }
      );
    }

    const updated = await prisma.passwordResetRequest.update({
      where: { id },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
      },
    });

    return NextResponse.json({ updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to update request" },
      { status: 500 }
    );
  }
}