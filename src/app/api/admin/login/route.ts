import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/app/utils/rateLimit";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  timingSafeEqual,
} from "@/lib/session";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  // Sem isto, ADMIN_PASS fica exposto a brute force irrestrito.
  const { allowed } = rateLimit(`admin-login:${ip}`, {
    limit: 10,
    windowMs: 15 * 60_000,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas. Tente novamente em alguns minutos." },
      { status: 429 }
    );
  }

  let user: unknown;
  let pass: unknown;
  try {
    ({ user, pass } = await req.json());
  } catch {
    return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
  }

  const expectedUser = process.env.ADMIN_USER;
  const expectedPass = process.env.ADMIN_PASS;
  const secret = process.env.ADMIN_TOKEN;

  if (!expectedUser || !expectedPass || !secret) {
    console.error(
      "[admin/login] ADMIN_USER, ADMIN_PASS ou ADMIN_TOKEN ausente no ambiente"
    );
    return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
  }

  // Os dois lados são avaliados sempre, sem short-circuit, para que o tempo
  // de resposta não revele qual dos campos estava correto.
  const userOk = typeof user === "string" && timingSafeEqual(user, expectedUser);
  const passOk = typeof pass === "string" && timingSafeEqual(pass, expectedPass);

  if (!userOk || !passOk) {
    return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });

  res.cookies.set(SESSION_COOKIE, await createSessionToken(secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
