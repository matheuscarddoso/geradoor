import { NextRequest, NextResponse } from "next/server";
import {
  ACESSO_COOKIE,
  ACESSO_MAX_AGE_SECONDS,
  ROTA_DE_ENTRADA,
  ROTA_PROTEGIDA,
} from "@/lib/acessoDaGrafica";
import { SESSION_COOKIE, createSessionToken, verifySessionToken } from "@/lib/session";

const naoIndexar = (res: NextResponse) => {
  res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return res;
};

const endurecer = (res: NextResponse) => {
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
};

/**
 * Portão do painel de admin: sessão de turno, credencial de dono.
 */
async function guardarAdmin(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;
  if (pathname === "/admin/login") return naoIndexar(NextResponse.next());

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!(await verifySessionToken(process.env.ADMIN_TOKEN, token))) {
    const login = req.nextUrl.clone();
    login.pathname = "/admin/login";
    const res = naoIndexar(NextResponse.redirect(login));
    if (token) res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  return endurecer(naoIndexar(NextResponse.next()));
}

/**
 * Portão do gerador de código de barras: sessão longa, credencial só dele.
 *
 * A verificação é no middleware, e não na página, porque a página é um
 * componente de cliente: checar lá dentro entregaria o HTML e o JavaScript
 * antes de perguntar a senha, o que não é portão, é aviso.
 *
 * A sessão válida é reemitida a cada visita. Assim quem usa a ferramenta
 * semana após semana nunca cai na tela de senha, e quem parou de usar perde o
 * acesso por conta própria depois de noventa dias.
 */
async function guardarGrafica(req: NextRequest): Promise<NextResponse> {
  if (req.nextUrl.pathname === ROTA_DE_ENTRADA) {
    return naoIndexar(NextResponse.next());
  }

  const token = req.cookies.get(ACESSO_COOKIE)?.value;
  const segredo = process.env.GRAFICA_TOKEN;

  if (!(await verifySessionToken(segredo, token))) {
    const entrada = req.nextUrl.clone();
    entrada.pathname = ROTA_DE_ENTRADA;
    // Sem `?de=`: a única coisa atrás do portão é o gerador, então guardar de
    // onde a pessoa veio só abriria um parâmetro para alguém devolver um
    // destino que não é nosso.
    entrada.search = "";
    const res = naoIndexar(NextResponse.redirect(entrada));
    if (token) res.cookies.delete(ACESSO_COOKIE);
    return res;
  }

  const res = endurecer(naoIndexar(NextResponse.next()));
  if (segredo) {
    res.cookies.set(ACESSO_COOKIE, await createSessionToken(segredo, ACESSO_MAX_AGE_SECONDS), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: ROTA_PROTEGIDA,
      maxAge: ACESSO_MAX_AGE_SECONDS,
    });
  }
  return res;
}

export async function middleware(req: NextRequest) {
  return req.nextUrl.pathname.startsWith(ROTA_PROTEGIDA)
    ? guardarGrafica(req)
    : guardarAdmin(req);
}

export const config = {
  // A rota exata e as filhas, listadas em separado: `/:path*` sozinho é
  // ambíguo quanto ao segmento vazio, e aqui errar para o lado permissivo
  // deixaria o gerador aberto.
  matcher: [
    "/admin/:path*",
    "/api/admin/qrcode/:path*",
    "/codigo-de-barras",
    "/codigo-de-barras/:path*",
  ],
};
