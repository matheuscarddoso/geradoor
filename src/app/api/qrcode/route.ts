import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/app/utils/rateLimit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const { allowed } = rateLimit(`qrcode:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!allowed) {
    return new NextResponse("Limite de requisições atingido", { status: 429 });
  }

  try {
    const { url, shortcode, expiresAt, description } = await req.json();

    try {
      new URL(url);
    } catch {
      return new NextResponse("URL inválida", { status: 400 });
    }

    const newQRCode = await prisma.qRCode.create({
      data: {
        url,
        shortcode,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        description,
      },
    });

    return NextResponse.json(newQRCode);
  } catch (error) {
    console.error("Erro ao criar QR Code:", error);
    return new NextResponse("Erro ao criar QR Code", { status: 500 });
  }
}
