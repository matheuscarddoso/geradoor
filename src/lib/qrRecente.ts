"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Reabrir, pelo histórico, o modal de um QR Code já criado.
 *
 * O que fica guardado no recente é só o shortcode, na query do href. O link
 * curto é reconstruído a partir dele — guardar a URL inteira duplicaria uma
 * informação que já está em `label` e amarraria o histórico ao domínio de
 * quando o item foi criado.
 *
 * Itens antigos, gravados antes disso, têm href sem query: continuam levando
 * para a página, apenas sem reabrir o modal. Nada quebra.
 */

export const QR_BASE_URL = "https://www.geradoor.com/";

/** Nome da query. Curto porque aparece na barra de endereço. */
const PARAM = "c";

/** Href do recente: a rota do gerador mais o código do QR criado. */
export function hrefRecente(rota: string, shortcode: string) {
  return `${rota}?${PARAM}=${encodeURIComponent(shortcode)}`;
}

/**
 * Href de restauração para um item do histórico.
 *
 * Itens gravados antes desta funcionalidade têm href sem query e ficariam
 * inertes — pior ainda estando já na página, onde clicar não faz nada. Mas
 * nesses itens o rótulo É o link curto, então o código sai dali. Só o
 * Instagram antigo fica de fora: o rótulo dele guarda o arroba, não a URL.
 */
export function hrefDeRestauracao(item: { href?: string; label: string }): string | undefined {
  if (!item.href) return undefined;
  if (item.href.includes(`${PARAM}=`)) return item.href;

  const codigo = codigoDoLink(item.label);
  return codigo ? hrefRecente(item.href, codigo) : item.href;
}

/** Extrai o shortcode de um link curto do geradoor. Devolve null se não for um. */
export function codigoDoLink(valor: string): string | null {
  const limpo = valor.trim();
  if (!limpo.startsWith("http")) return null;
  try {
    const url = new URL(limpo);
    if (!/(^|\.)geradoor\.com$/i.test(url.hostname)) return null;
    const codigo = url.pathname.replace(/^\/+|\/+$/g, "");
    // O shortcode é um segmento só, curto e sem barras.
    return /^[A-Za-z0-9_-]{4,16}$/.test(codigo) ? codigo : null;
  } catch {
    return null;
  }
}

/**
 * Observa a query e avisa quando há um QR a restaurar.
 *
 * Devolve `aoFechar`, que limpa a query. Sem isso, fechar o modal e clicar no
 * MESMO recente de novo não faria nada: a query já estaria lá, sem mudança
 * para o efeito reagir. Limpar também evita que um F5 reabra o modal sozinho.
 *
 * Depende de `useSearchParams`, então quem usa precisa estar sob um <Suspense>
 * — caso contrário o Next tira a página da geração estática.
 */
export function useQrDeRecente(aoRestaurar: (valorDoQr: string) => void) {
  const params = useSearchParams();
  const rota = usePathname();
  const router = useRouter();
  const shortcode = params.get(PARAM);

  useEffect(() => {
    if (!shortcode) return;
    aoRestaurar(QR_BASE_URL + shortcode);
    // aoRestaurar é recriada a cada render nas páginas; incluí-la aqui
    // reabriria o modal em loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shortcode]);

  const aoFechar = () => {
    if (shortcode) router.replace(rota, { scroll: false });
  };

  return { restaurando: Boolean(shortcode), aoFechar };
}
