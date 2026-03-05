import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

function isAuthorized(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret");
  return secret && process.env.ADMIN_SECRET && secret === process.env.ADMIN_SECRET;
}

// PATCH /api/admin/users/:id
// body can include: name, email, role, status, password
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const { name, email, role, status, password } = body as {
    name?: string;
    email?: string;
    role?: string;
    status?: string;
    password?: string;
  };

  const data: any = {};

  if (name !== undefined) data.name = String(name).trim();

  if (email !== undefined) data.email = String(email).trim().toLowerCase();

  if (role !== undefined) data.role = String(role);

  if (status !== undefined) data.status = String(status);

  if (password !== undefined) {
    const pw = String(password);
    if (pw.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }
    data.passwordHash = await bcrypt.hash(pw, 12);
  }

  try {
    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        lastActiveAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ user: updated });
  } catch (e: any) {
    // unique email violation etc.
    return NextResponse.json({ error: e?.message || "Update failed" }, { status: 400 });
  }
}

// DELETE /api/admin/users/:id
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;

  try {
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Delete failed" }, { status: 400 });
  }
}