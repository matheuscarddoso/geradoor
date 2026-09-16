import { PAGINAS_LEGAIS } from "@/components/shell/Rodape";
import { ROTAS_DE_POUSO, ROTAS_PUBLICAS } from "@/lib/rotas";
import { SITE, absolute } from "@/lib/seo";

/**
 * /llms.txt — o índice do site em texto, para agente de IA.
 *
 * Honestidade sobre o que isto é: o Google diz na guia de 15/05/2026 que não
 * precisa de arquivo legível por máquina para aparecer na busca generativa, e
 * o estudo de adoção mais amplo não encontrou sinal de ganho. A Anthropic
 * recomenda, a OpenAI usa no SDK de agentes, e três dos doze concorrentes que
 * medimos publicam um. Custa este arquivo e o risco é zero — então existe,
 * mas não é estratégia.
 *
 * É gerado da mesma lista que alimenta o menu e o sitemap, para não virar mais
 * uma cópia da verdade que envelhece sozinha.
 */

export const dynamic = "force-static";

function linha(href: string, nome: string, descricao: string) {
  return `- [${nome}](${absolute(href)}): ${descricao}`;
}

export function GET() {
  const ferramentas = ROTAS_PUBLICAS.filter((rota) => rota.grupo === "ferramenta");
  const geradores = ROTAS_PUBLICAS.filter((rota) => rota.grupo === "gerador");

  const corpo = `# ${SITE.name}

> Ferramentas de uso livre que rodam no navegador de quem usa, em português do Brasil.
> Sem cadastro, sem cobrança, sem marca d'água e sem limite de uso.
> O que é calculado no aparelho não é enviado a servidor nenhum.

O ${SITE.name} tem duas famílias de ferramenta:

1. **Ferramentas de imagem** — removedor de fundo e vetorizador. O recorte de fundo usa um serviço próprio e recebe apenas uma cópia reduzida da foto, que não é gravada; a vetorização acontece inteira no navegador, e a imagem não sai do aparelho.
2. **Geradores de dado de teste** — CPF, CNPJ, cartão de crédito e telefone. Os números respeitam o cálculo de verificação de cada formato, servem para testar software e **não pertencem a nenhuma pessoa real**: não são emitidos por órgão nenhum, não têm crédito e não valem como documento. Usá-los para fraude é crime.

## Ferramentas

${ferramentas.map((r) => linha(r.href, r.label, r.descricao)).join("\n")}

## Geradores

${geradores.map((r) => linha(r.href, r.label, r.descricao)).join("\n")}

## Conversões específicas

${ROTAS_DE_POUSO.map((r) => linha(r.href, r.label, r.descricao)).join("\n")}

## English

The whole site exists in English under /en, with its own tools where the format differs:

${ROTAS_PUBLICAS.map((r) => linha(r.en.href, r.en.label, r.en.descricao)).join("\n")}

## Institucional

${PAGINAS_LEGAIS.map((p) => linha(p.href, p.label, "Documento legal do site")).join("\n")}
`;

  return new Response(corpo, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
