import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { updateQRCodeSchema } from "@/lib/validation";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authorized = await verifySessionToken(
    process.env.ADMIN_TOKEN,
    req.cookies.get(SESSION_COOKIE)?.value
  );
  if (!authorized) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = updateQRCodeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const data: Prisma.QRCodeUpdateInput = {};
  if (parsed.data.url !== undefined) data.url = parsed.data.url;
  if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive;
  if (parsed.data.expiresAt !== undefined) {
    data.expiresAt = parsed.data.expiresAt
      ? new Date(parsed.data.expiresAt)
      : null;
  }

  try {
    const updated = await prisma.qRCode.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (error) {
    // P2025 = registro não encontrado. Antes vazava como 500 com stack trace.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "QR Code não encontrado" },
        { status: 404 }
      );
    }
    console.error("Erro ao atualizar QR Code:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar QR Code" },
      { status: 500 }
    );
  }
}
