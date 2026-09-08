import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/app/utils/rateLimit";
import {
  ACESSO_COOKIE,
  ACESSO_MAX_AGE_SECONDS,
  ROTA_PROTEGIDA,
} from "@/lib/acessoDaGrafica";
import { createSessionToken, timingSafeEqual } from "@/lib/session";

/** Resposta única para todo caso de recusa: o motivo não é da conta de quem tenta. */
const recusar = () =>
  NextResponse.json({ error: "Senha incorreta." }, { status: 401 });

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  // Dez em quinze minutos. Contra senha forte, dez ou cinco dá no mesmo — o
  // que muda é do lado de quem tem a senha e erra de digitação, e ficar quinze
  // minutos trancado por causa disso é pior que a diferença de segurança.
  const { allowed } = rateLimit(`acesso-grafica:${ip}`, {
    limit: 10,
    windowMs: 15 * 60_000,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas. Tente de novo em alguns minutos." },
      { status: 429 }
    );
  }

  let senha: unknown;
  try {
    ({ senha } = await req.json());
  } catch {
    return recusar();
  }

  const esperada = process.env.GRAFICA_PASS;
  const segredo = process.env.GRAFICA_TOKEN;

  if (!esperada || !segredo) {
    // Sem as duas variáveis o portão não abre para ninguém — o que é o lado
    // certo para falhar. O log é para quem publicou saber por quê.
    console.error("[acesso-grafica] GRAFICA_PASS ou GRAFICA_TOKEN ausente no ambiente");
    return recusar();
  }

  if (typeof senha !== "string" || !timingSafeEqual(senha, esperada)) {
    return recusar();
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ACESSO_COOKIE, await createSessionToken(segredo, ACESSO_MAX_AGE_SECONDS), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    // Só o gerador precisa do cookie; o resto do site nunca o recebe.
    path: ROTA_PROTEGIDA,
    maxAge: ACESSO_MAX_AGE_SECONDS,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ACESSO_COOKIE, "", { path: ROTA_PROTEGIDA, maxAge: 0 });
  return res;
}
