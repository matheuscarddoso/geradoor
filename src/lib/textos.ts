import type { Idioma } from "./idioma";

/**
 * O texto da casca — menu, rodapé, busca — nos dois idiomas.
 *
 * Aqui só entra o que se repete em toda página. O texto de cada ferramenta fica
 * junto dela, porque é lá que alguém vai procurá-lo quando precisar mudar.
 *
 * Sem `use client`: componente de servidor também lê daqui. Os ganchos que
 * descobrem o idioma pelo caminho ficam em `useTextos.ts`, que é de cliente.
 *
 * É um dicionário escrito à mão, e não uma biblioteca de internacionalização,
 * por proporção: são dois idiomas e texto estático, sem plural complicado, sem
 * data formatada, sem gênero. Uma dependência resolveria problemas que o site
 * não tem e acrescentaria um passo de build que ele não precisa.
 */

export type Dicionario = {
  /** Grupos do menu. */
  ferramentas: string;
  geradores: string;
  /** Ações da casca. */
  buscar: string;
  buscarFerramenta: string;
  semResultado: string;
  recentes: string;
  limparRecentes: string;
  abrirMenu: string;
  recolherMenu: string;
  trocarTema: string;
  temaClaro: string;
  temaEscuro: string;
  /** Rodapé. */
  privacidade: string;
  termos: string;
  cookies: string;
  contato: string;
  /** Blocos de conteúdo. */
  perguntasFrequentes: string;
  vejaTambem: string;
  nestaPagina: string;
  atualizadoEm: string;
};

export const TEXTOS: Record<Idioma, Dicionario> = {
  "pt-BR": {
    ferramentas: "Ferramentas",
    geradores: "Geradores",
    buscar: "Buscar",
    buscarFerramenta: "Buscar ferramenta",
    semResultado: "Nada encontrado.",
    recentes: "Recentes",
    limparRecentes: "Limpar recentes",
    abrirMenu: "Abrir menu",
    recolherMenu: "Recolher menu",
    trocarTema: "Trocar tema",
    temaClaro: "Ativar tema claro",
    temaEscuro: "Ativar tema escuro",
    privacidade: "Privacidade",
    termos: "Termos de uso",
    cookies: "Cookies",
    contato: "Contato",
    perguntasFrequentes: "Perguntas frequentes",
    vejaTambem: "Veja também",
    nestaPagina: "Nesta página",
    atualizadoEm: "Atualizado em",
  },
  en: {
    ferramentas: "Tools",
    geradores: "Generators",
    buscar: "Search",
    buscarFerramenta: "Search tools",
    semResultado: "No results.",
    recentes: "Recent",
    limparRecentes: "Clear recent",
    abrirMenu: "Open menu",
    recolherMenu: "Collapse menu",
    trocarTema: "Toggle theme",
    temaClaro: "Switch to light theme",
    temaEscuro: "Switch to dark theme",
    privacidade: "Privacy",
    termos: "Terms",
    cookies: "Cookies",
    contato: "Contact",
    perguntasFrequentes: "Frequently asked questions",
    vejaTambem: "See also",
    nestaPagina: "On this page",
    atualizadoEm: "Updated on",
  },
};
