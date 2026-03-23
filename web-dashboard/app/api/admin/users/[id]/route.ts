import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

function isAuthorized(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret");
  return secret && process.env.ADMIN_SECRET && secret === process.env.ADMIN_SECRET;
}

const ALLOWED_ROLES = new Set(Object.values(UserRole));
const ALLOWED_STATUS = new Set(["ACTIVE", "INACTIVE", "PENDING"]);

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

  if (role !== undefined) {
    const normalizedRole = String(role).trim().toUpperCase();
    if (!ALLOWED_ROLES.has(normalizedRole as UserRole)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    data.role = normalizedRole as UserRole;
  }

  if (status !== undefined) {
    const normalizedStatus = String(status).trim().toUpperCase();
    if (!ALLOWED_STATUS.has(normalizedStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    data.status = normalizedStatus;
  }

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
    return NextResponse.json({ error: e?.message || "Update failed" }, { status: 400 });
  }
}

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