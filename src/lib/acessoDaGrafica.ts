/**
 * Acesso ao gerador de código de barras.
 *
 * A ferramenta é de uso de uma gráfica, não do público do site: quem monta a
 * folha, define a faixa e imprime a tiragem é uma pessoa conhecida, numa
 * máquina conhecida. Então ela fica atrás de senha, e sai do menu, da busca e
 * do sitemap.
 *
 * É uma credencial própria, e não a do painel de admin, por dois motivos. O
 * primeiro é privilégio mínimo: esta senha abre o gerador e nada mais — não o
 * painel de QR Codes, nem o banco. O segundo é prazo: a sessão de admin dura
 * oito horas, e mandar o operador digitar senha toda manhã é o caminho mais
 * curto para a senha virar um papel colado no monitor.
 *
 * A assinatura e a comparação em tempo constante são as mesmas do admin, em
 * `session.ts`. Duas implementações de cookie assinado no mesmo projeto seria
 * uma a mais para revisar — e a segunda é sempre a que fica sem revisão.
 */

export const ACESSO_COOKIE = "acesso_grafica";

/**
 * Noventa dias, renovados a cada visita com sessão válida.
 *
 * Quem usa todo dia nunca vê a tela de senha; quem parou de usar perde o
 * acesso sozinho, sem ninguém precisar lembrar de revogar.
 */
export const ACESSO_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;

/** Onde a senha é pedida. Fora do portão, por definição. */
export const ROTA_DE_ENTRADA = "/codigo-de-barras/entrar";

/** A rota que POSTa a senha e recebe o cookie. Também fora do portão. */
export const ROTA_DA_API = "/api/acesso-grafica";

/** O que o portão protege. */
export const ROTA_PROTEGIDA = "/codigo-de-barras";

/**
 * Pista de interface: diz ao menu que esta máquina tem acesso ao gerador.
 *
 * **Não é credencial.** Quem forjar este cookie ganha um item no menu, e ao
 * clicar cai na tela de senha como qualquer outro. Quem autoriza é o
 * `ACESSO_COOKIE`, que é assinado e `HttpOnly` — e é justamente por ser
 * `HttpOnly` que o menu não consegue lê-lo, daí esta segunda marca, legível e
 * sem valor nenhum.
 *
 * Existe porque esconder a ferramenta do público não devia esconder dela quem
 * a usa todo dia: sem isto, o operador precisa guardar o endereço em algum
 * lugar, e o menu do site mente para ele sobre o que ele pode abrir.
 */
export const PISTA_COOKIE = "grafica_liberada";
