import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/admin/login") return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const isValid = await verifySessionToken(process.env.ADMIN_TOKEN, token);

  if (!isValid) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    const res = NextResponse.redirect(loginUrl);
    // Cookie inválido ou expirado não deve sobreviver ao redirect,
    // senão o browser reenvia lixo em toda requisição seguinte.
    if (token) res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  const res = NextResponse.next();
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/qrcode/:path*"],
};
