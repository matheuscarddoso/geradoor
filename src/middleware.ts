import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/admin/login") return NextResponse.next();

  const adminToken = process.env.ADMIN_TOKEN;
  const token = req.cookies.get("admin_token")?.value;

  if (!adminToken || !token || token !== adminToken) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/qrcode/:path*"],
};
