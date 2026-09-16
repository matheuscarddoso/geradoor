import { NextRequest, NextResponse } from "next/server";
import {
  ACESSO_COOKIE,
  ACESSO_MAX_AGE_SECONDS,
  PISTA_COOKIE,
  ROTA_DE_ENTRADA,
  ROTA_PROTEGIDA,
} from "@/lib/acessoDaGrafica";
import { SESSION_COOKIE, createSessionToken, verifySessionToken } from "@/lib/session";
import {
  COOKIE_DO_IDIOMA,
  IDIOMAS,
  PREFIXO,
  VALIDADE_DO_COOKIE,
  idiomaPreferido,
  type Idioma,
} from "@/lib/idioma";

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
    // A pista some junto: menu que oferece o que a pessoa não pode abrir é
    // pior que menu sem o item.
    res.cookies.set(PISTA_COOKIE, "", { path: "/", maxAge: 0 });
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
    // Legível de propósito, e no caminho todo: é o menu, que roda no
    // navegador e em qualquer página, que precisa dela. Ver o comentário em
    // `PISTA_COOKIE` — ela não abre nada.
    res.cookies.set(PISTA_COOKIE, "1", {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: ACESSO_MAX_AGE_SECONDS,
    });
  }
  return res;
}

/** Cabeçalho com o caminho pedido, para o layout raiz saber o idioma da página. */
export const CABECALHO_DO_CAMINHO = "x-caminho";

/**
 * Leva quem chega na raiz para a versão no idioma do navegador.
 *
 * Três regras de contenção, e cada uma existe por um motivo:
 *
 * 1. **Só a raiz redireciona.** Página interna nunca. Se `/cpf` mandasse um
 *    navegador em inglês para `/en/ssn`, o buscador — que rastreia dos Estados
 *    Unidos — receberia o desvio ao pedir `/cpf`, e a página em português
 *    sairia do índice. As duas versões precisam responder no próprio endereço,
 *    sempre.
 * 2. **Uma vez só.** Depois do primeiro desvio fica um cookie, e quem voltar à
 *    raiz de propósito continua onde escolheu ficar.
 * 3. **Sem cabeçalho, sem desvio.** Requisição sem Accept-Language — o caso do
 *    Googlebot — cai no padrão e fica em português.
 */
function levarAoIdioma(req: NextRequest): NextResponse | null {
  if (req.nextUrl.pathname !== "/") return null;

  const guardado = req.cookies.get(COOKIE_DO_IDIOMA)?.value;
  const escolhido = IDIOMAS.includes(guardado as Idioma)
    ? (guardado as Idioma)
    : idiomaPreferido(req.headers.get("accept-language"));

  if (PREFIXO[escolhido] === "") {
    if (guardado) return null;
    // Grava a escolha para não recalcular a cada visita.
    const res = NextResponse.next();
    res.cookies.set(COOKIE_DO_IDIOMA, escolhido, { path: "/", maxAge: VALIDADE_DO_COOKIE, sameSite: "lax" });
    return res;
  }

  const destino = req.nextUrl.clone();
  destino.pathname = PREFIXO[escolhido];
  const res = NextResponse.redirect(destino, 307);
  res.cookies.set(COOKIE_DO_IDIOMA, escolhido, { path: "/", maxAge: VALIDADE_DO_COOKIE, sameSite: "lax" });
  return res;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith(ROTA_PROTEGIDA)) return guardarGrafica(req);
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) return guardarAdmin(req);

  const desvio = levarAoIdioma(req);
  if (desvio) return desvio;

  // O layout raiz precisa do caminho para decidir o `lang` do documento, e
  // componente de servidor não recebe a rota por outro meio.
  const cabecalhos = new Headers(req.headers);
  cabecalhos.set(CABECALHO_DO_CAMINHO, pathname);
  return NextResponse.next({ request: { headers: cabecalhos } });
}

export const config = {
  matcher: [
    /*
     * Tudo que é página. Fica de fora o que não é: arquivo estático, imagem de
     * compartilhamento, modelo, fonte e os arquivos de robô. Rodar o
     * middleware neles só gastaria tempo, e desviar idioma num PNG não faz
     * sentido.
     *
     * As rotas protegidas continuam batendo aqui e são tratadas primeiro, na
     * função acima — trocar a lista exata por este padrão amplo não afrouxa o
     * portão, porque quem decide é o `startsWith`, não o matcher.
     */
    "/((?!_next/static|_next/image|favicon\\.ico|icon\\.svg|robots\\.txt|sitemap\\.xml|llms\\.txt|modelos/|wasm/|fonts/|opengraph-image|twitter-image).*)",
  ],
};
