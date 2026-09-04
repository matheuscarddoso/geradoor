import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/app/utils/rateLimit";
import { createQRCodeSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const { allowed } = rateLimit(`qrcode:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!allowed) {
    return new NextResponse("Limite de requisições atingido", { status: 429 });
  }

  try {
    const body = await req.json();
    const parsed = createQRCodeSchema.safeParse(body);

    if (!parsed.success) {
      // Mantém a mensagem histórica quando o problema é a URL: era o único
      // 400 que esta rota emitia e integrações podem casar com esse texto.
      const urlFailed = parsed.error.issues.some(
        (issue) => issue.path[0] === "url"
      );
      return new NextResponse(
        urlFailed ? "URL inválida" : "Dados inválidos",
        { status: 400 }
      );
    }

    const { url, shortcode, expiresAt, description } = parsed.data;

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
