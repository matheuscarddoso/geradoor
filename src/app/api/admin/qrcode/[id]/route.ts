import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function isAuthorized(req: NextRequest) {
  const adminToken = process.env.ADMIN_TOKEN;
  const token = req.cookies.get("admin_token")?.value;
  return !!adminToken && !!token && token === adminToken;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if ("url" in body) data.url = body.url;
  if ("isActive" in body) data.isActive = body.isActive;
  if ("expiresAt" in body) {
    data.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
  }

  const updated = await prisma.qRCode.update({ where: { id }, data });
  return NextResponse.json(updated);
}
