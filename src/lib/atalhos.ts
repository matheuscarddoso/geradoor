/**
 * Reconhecimento de atalho de teclado.
 *
 * Separado do componente porque é a parte com regra, e regra escondida em
 * `onKeyDown` não se confere. Aqui dá para ler a tabela inteira de uma vez e
 * ver o que cada tecla faz.
 */

/** O modificador de comando da plataforma: ⌘ no Mac, Ctrl no resto. */
function ehModificador(evento: {
  metaKey: boolean;
  ctrlKey: boolean;
}): boolean {
  // Aceita os dois em qualquer plataforma. Detectar o sistema erra com teclado
  // externo e com máquina virtual, e o custo de aceitar Ctrl+Z num Mac é zero:
  // não há ação concorrente nesse par.
  return evento.metaKey || evento.ctrlKey;
}

/**
 * O foco está num campo de texto, onde as teclas pertencem ao campo.
 *
 * É o que impede a seta de mover o código enquanto alguém digita a coordenada,
 * e o que deixa o ⌘Z de dentro de um `input` desfazer a digitação, que é o
 * comportamento nativo e o esperado.
 */
export function focoEmCampo(alvo: EventTarget | null): boolean {
  const elemento = alvo as HTMLElement | null;
  if (!elemento?.tagName) return false;
  if (["INPUT", "TEXTAREA", "SELECT"].includes(elemento.tagName)) return true;
  return elemento.isContentEditable === true;
}

export type Atalho =
  | "desfazer"
  | "refazer"
  | "duplicar"
  | "selecionar-tudo"
  | "copiar"
  | "colar"
  | "cortar"
  | "exportar"
  | "remover"
  | "desmarcar"
  | "mover-esquerda"
  | "mover-direita"
  | "mover-cima"
  | "mover-baixo"
  | "zoom-mais"
  | "zoom-menos"
  | "zoom-encaixar"
  | "modo-mover"
  | "modo-mao"
  | "modo-escala"
  | "modo-medir"
  | "atalhos";

export interface EventoDeTeclado {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  target: EventTarget | null;
}

/**
 * Traduz uma tecla em ação, ou `null` quando não é atalho desta tela.
 *
 * Escape passa mesmo com o foco num campo: é a saída de emergência, e travá-la
 * dentro de um `input` é o tipo de detalhe que faz a tela parecer presa.
 */
export function reconhecerAtalho(evento: EventoDeTeclado): Atalho | null {
  const emCampo = focoEmCampo(evento.target);
  const comando = ehModificador(evento);
  const tecla = evento.key.toLowerCase();

  if (tecla === "escape") return "desmarcar";

  // Com o foco num campo, só Escape e os atalhos de comando com significado
  // global passam. ⌘Z fica com o campo, para desfazer a digitação.
  if (emCampo) return null;

  if (comando) {
    if (tecla === "z") return evento.shiftKey ? "refazer" : "desfazer";
    if (tecla === "y") return "refazer";
    if (tecla === "d") return "duplicar";
    if (tecla === "a") return "selecionar-tudo";
    if (tecla === "c") return "copiar";
    if (tecla === "x") return "cortar";
    if (tecla === "v") return "colar";
    if (tecla === "s") return "exportar";
  }

  if (tecla === "delete" || tecla === "backspace") return "remover";
  if (tecla === "arrowleft") return "mover-esquerda";
  if (tecla === "arrowright") return "mover-direita";
  if (tecla === "arrowup") return "mover-cima";
  if (tecla === "arrowdown") return "mover-baixo";

  // Zoom sem modificador: as combinações com ⌘ ou Ctrl são reservadas pelo
  // navegador e `preventDefault` não as segura em todos eles.
  if (tecla === "+" || tecla === "=") return "zoom-mais";
  if (tecla === "-" || tecla === "_") return "zoom-menos";
  if (tecla === "0") return "zoom-encaixar";
  // A lista de atalhos, no lugar onde todo editor a põe.
  if (tecla === "?" || (evento.shiftKey && tecla === "/")) return "atalhos";

  // As letras das ferramentas, como em qualquer editor de canvas.
  if (tecla === "v") return "modo-mover";
  if (tecla === "h") return "modo-mao";
  if (tecla === "k") return "modo-escala";
  if (tecla === "m") return "modo-medir";

  return null;
}

/** Como o atalho é escrito na dica, com o símbolo da plataforma. */
export function rotuloDoAtalho(teclas: string, ehMac = ehPlataformaMac()): string {
  return ehMac ? teclas.replace(/Ctrl/g, "⌘").replace(/\+/g, "") : teclas;
}

export function ehPlataformaMac(): boolean {
  if (typeof navigator === "undefined") return false;
  return /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent);
}
