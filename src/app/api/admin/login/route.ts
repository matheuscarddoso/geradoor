import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { user, pass } = await req.json();

  if (
    user !== process.env.ADMIN_USER ||
    pass !== process.env.ADMIN_PASS
  ) {
    return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });

  res.cookies.set("admin_token", process.env.ADMIN_TOKEN!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 horas
  });

  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("admin_token");
  return res;
}
