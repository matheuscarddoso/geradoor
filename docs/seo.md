# SEO e busca generativa

Como o site é indexado, o que foi decidido e por quê, e o que está aberto.

Escrito em 16 de setembro de 2026, depois de uma auditoria do que existia e de
uma pesquisa dos concorrentes. Os números aqui são medidos, não estimados: onde
houver um percentual, há um script que o produziu.

---

## 1. O ponto de partida

A auditoria de setembro de 2026 encontrou metadata correta — title, description,
canonical e JSON-LD em todas as páginas — e **nenhum conteúdo para ranquear**.

| rota | palavras no HTML servido | `<h2>` |
| --- | --- | --- |
| `/` | 133 | 0 |
| `/cpf` | 28 | 0 |
| `/cnpj` | 28 | 0 |
| `/cartao-de-credito` | 32 | 0 |
| `/telefone` | 32 | 0 |
| `/qr-code` | **9** | 0 |
| `/instagram` | **9** | 0 |
| `/whatsapp` | **9** | 0 |
| `/removedor-de-fundo` | 96 | 0 |
| `/vetorizador` | 98 | 0 |

Para comparação, `4devs.com.br/gerador_de_cpf` serve 451 palavras — e a maior
parte é o mega-menu de ~100 links, não texto da página.

### O defeito que explicava os nove

`/qr-code`, `/instagram` e `/whatsapp` serviam o corpo **vazio**: nenhum `<h1>`,
nenhum texto. Todas as três envolviam o gerador inteiro num `<Suspense>` porque
`useQrDeRecente` chamava `useSearchParams`, e isso tira da geração estática tudo
que está abaixo do boundary. O conteúdo só existia depois da hidratação —
buscador e robô de IA liam a casca.

O conserto foi isolar a leitura da query: `RestauradorDeQr`, em
`src/lib/qrRecente.tsx`, com o `<Suspense>` em volta só dele. Ele não desenha
nada, só avisa. E `useLimparQrDaUrl` lê `location.search` no clique, em vez de
usar o hook.

**Lição que vale para o futuro:** um `<Suspense>` grande demais é invisível no
navegador e catastrófico para indexação. Se um dia outra página precisar de
`useSearchParams`, o boundary tem que ficar em volta do menor pedaço possível.

---

## 2. O formato do conteúdo

Toda página de ferramenta segue o mesmo desenho, em `ConteudoDaFerramenta`:

1. A **ferramenta ocupa a primeira tela**, intacta. Nada de esconder o que a
   pessoa veio fazer atrás de texto.
2. Abaixo, três seções com `<h2>` escrito **como a pergunta que a pessoa faz** —
   "Como o CPF é calculado?", não "Sobre o CPF".
3. Cada bloco responde **sozinho**, sem depender do parágrafo anterior: quem
   recupera para uma resposta de IA pega a passagem isolada, e pronome sem
   antecedente no chunk é chunk inútil.
4. Uma **FAQ visível**, que alimenta o `FAQPage` do JSON-LD a partir da mesma
   lista. Texto de `FAQPage` que não está visível na página viola a diretriz do
   Google, e duas cópias garantem que uma envelheça.
5. **"Veja também"**, com âncora descritiva.

O resultado, medido em produção:

| rota | palavras | `<h2>` | FAQ |
| --- | --- | --- | --- |
| `/` | 798 | 4 | 7 |
| `/cpf` | 805 | 5 | 7 |
| `/cnpj` | 788 | 5 | 7 |
| `/cartao-de-credito` | 710 | 5 | 6 |
| `/telefone` | 603 | 5 | 6 |
| `/qr-code` | 673 | 5 | 7 |
| `/instagram` | 581 | 5 | 6 |
| `/whatsapp` | 613 | 5 | 6 |
| `/removedor-de-fundo` | 736 | 5 | 10 |
| `/vetorizador` | 852 | 5 | 11 |
| `/png-para-svg` | 727 | 5 | 10 |
| `/jpg-para-svg` | 779 | 5 | 10 |
| `/validador-de-cpf` | 641 | 5 | 7 |

**Volume não é a meta.** `invertexto.com` ranqueia em primeiro para "gerador de
cpf" com 188 palavras e 9 KB de HTML. O que conta é fato por palavra.

### A regra que não se quebra

Todo número escrito nessas páginas é conferido contra o código ou contra fonte
oficial antes de ir ao ar. Três erros que a conferência impediu de publicar:

- **CNPJ alfanumérico**: a conversão de letra é **ASCII − 48**, então A vale
  **17**, não 10 — a tabela ASCII pula sete caracteres entre o `9` e o `A`.
  Supor A=10 quebra o validador, e é o erro mais comum das implementações.
  (IN RFB nº 2.229/2024, em vigor desde 31/07/2026.)
- **QR Code**: os percentuais de correção de erro (7/15/25/30%) são sobre
  **codewords**, não sobre área da imagem. "O nível H tolera cobrir 30% da
  imagem" é falso.
- **DDD**: não houve código novo em 2026. O que mudou foi a reestruturação das
  áreas locais da telefonia fixa, de 4.118 para 67.

E o que ficou **de fora** por não ter fonte oficial: as faixas de BIN de Elo e
Hipercard, que circulam em repositório comunitário sem documento da bandeira. A
página diz isso em vez de apresentá-las como oficiais.

Onde a ferramenta não faz algo, o texto diz que não faz — o gerador de CNPJ não
produz o formato alfanumérico, o de CPF não filtra por região, o removedor ainda
não troca o fundo. Prometer o contrário gera volta.

---

## 3. Páginas de pouso

Uma URL por intenção de busca, movidas pelo mesmo motor. Declaradas em
`ROTAS_DE_POUSO`, em `src/lib/rotas.ts`.

| rota | busca que ataca | motor |
| --- | --- | --- |
| `/png-para-svg` | "png para svg", "converter png em svg" | `VetorizadorClient` |
| `/jpg-para-svg` | "jpg para svg", "jpeg para svg" | `VetorizadorClient` |
| `/validador-de-cpf` | "validar cpf", "cpf é válido" | `validarCpf`, próprio |

Ficam **fora do menu, da busca e da grade da home**: quem chega pelo site
encontra a ferramenta pelo nome dela. Entram no sitemap, no `llms.txt` e são
ligadas à ferramenta de origem e entre si pelo "Veja também" — sem isso seriam
órfãs, alcançáveis só pelo sitemap.

### O risco, e como ele é controlado

Página fina e quase duplicada é penalizada, e a guia oficial do Google de maio
de 2026 desaconselha por escrito "reciclar o que outros já disseram, ou o que
poderia ser produzido por um modelo generativo".

A primeira versão tinha **23% de frases em comum** entre `/png-para-svg` e
`/jpg-para-svg`. Depois da correção: **2,5%**, e zero entre `/png-para-svg` e
`/vetorizador`.

O que reduziu:

- Cada página trata do que **só vale para o seu formato**. PNG: canal alfa,
  compressão sem perda, print de tela. JPG: artefato de compressão, foto como
  pior caso, contornar baixando o número de cores.
- `/vetorizador` **cedeu** a pergunta "Como converter PNG para SVG?" para a
  página dedicada. Duas páginas do mesmo site respondendo a pergunta idêntica
  competem entre si.
- Respostas repetidas foram reescritas do zero, não adaptadas.

**Antes de criar a próxima página de pouso, rode a medição.** O script está em
`docs/seo.md`, seção 6.

---

## 4. Camada técnica

| item | onde | decisão |
| --- | --- | --- |
| sitemap | `src/app/sitemap.ts` | Derivado de `ROTAS_PUBLICAS` e `ROTAS_DE_POUSO`. `lastModified` é **data fixa**, não a do build: dizer que toda página mudou a cada deploy ensina o buscador a ignorar o campo. |
| robots | `src/app/robots.ts` | Nomeia `OAI-SearchBot`, `GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended` e outros. O `*` já os liberava; nomear deixa escrito que é decisão, e evita que alguém aperte o `*` um dia e corte a fonte de citação sem perceber. |
| `llms.txt` | `src/app/llms.txt/route.ts` | Gerado da mesma lista de rotas. Ver a ressalva na seção 5. |
| hreflang | `src/lib/seo.ts` | `pt-BR` e `x-default` na mesma URL. O site é monolíngue, mas concorrente que serve português europeu para busca brasileira perde por isso. |
| JSON-LD | `src/lib/seo.ts` | `WebApplication` + `Offer` + `BreadcrumbList` por página, `FAQPage` onde há FAQ, `ItemList` na home. A home declarava um segundo `WebSite` com a mesma URL do layout e outra descrição — dois nós conflitantes para o mesmo endereço. |

---

## 5. O que a evidência não sustenta

Vale registrar para não se gastar esforço de novo:

- **Schema não faz LLM citar.** O estudo controlado da Ahrefs (1.885 páginas
  contra 4.000 de controle) mediu +2,2% no ChatGPT — ruído — e **−4,6% em AI
  Overviews**. Um experimento de fevereiro de 2026 mostrou que ChatGPT, Claude,
  Perplexity, Gemini e AI Mode extraem **HTML visível** e ignoram JSON-LD na
  recuperação direta. Mantemos o schema pelo SEO clássico: rich results,
  elegibilidade de features, desambiguação de entidade. Não pelo GEO.
- **`llms.txt` é aposta barata, não estratégia.** Google diz na guia oficial que
  não precisa; um estudo com 300 mil domínios achou 10% de adoção e a variável
  **piorou** a acurácia do modelo de predição de citações. Três dos doze
  concorrentes medidos publicam um. Custa um arquivo, o downside é zero, e é só
  isso.
- **Volume de palavras não é meta.** Ver seção 2.
- **Sitemap elaborado não é alavanca.** O do 4Devs tem 128 URLs, zero metadado,
  e funciona.

O que **é** decisivo, segundo as mesmas fontes: estar indexável com HTML
servido, arquitetura de uma URL por intenção, conteúdo factual não-commodity,
blocos de resposta auto-contidos, e velocidade.

---

## 6. Como medir antes de publicar

Conteúdo servido por página, a partir do build:

```bash
npm run build
for r in cpf cnpj png-para-svg vetorizador; do
  printf "%-20s " "/$r"
  python3 -c "
import re, html
h = open('.next/server/app/$r.html', encoding='utf-8').read()
corpo = re.sub(r'<script\b.*?</script>|<style\b.*?</style>|<head\b.*?</head>', ' ', h, flags=re.S)
print('palavras:', len(html.unescape(re.sub(r'<[^>]+>', ' ', corpo)).split()),
      '| h2:', len(re.findall(r'<h2', h)),
      '| FAQPage:', 'sim' if 'FAQPage' in h else 'não')
"
done
```

Duplicação entre duas páginas — **rode isto antes de criar qualquer página de
pouso nova**:

```bash
python3 -c "
import re, pathlib, html as H
def editorial(rota):
    h = pathlib.Path(f'.next/server/app/{rota}.html').read_text(encoding='utf-8')
    m = re.search(r'<section class=\"border-t border-border px-6 py-12.*?</section>', h, re.S)
    t = H.unescape(re.sub(r'<[^>]+>', ' ', m.group(0)))
    return {f.strip().lower() for f in re.split(r'[.!?]\s', t) if len(f.split()) >= 6}
a, b = editorial('png-para-svg'), editorial('jpg-para-svg')
c = a & b
print(f'{len(c)} frases em comum — {100*len(c)/min(len(a), len(b)):.1f}%')
for f in c: print('  ·', f[:90])
"
```

Acima de ~10% no bloco editorial, reescreva antes de publicar.

---

## 7. Pendências

- [x] **`sameAs`** — resolvido em 16/09/2026, e não como estava previsto. O
      projeto não tem rede social própria; quem tem presença pública é o autor.
      Então o `sameAs` foi para um nó `Person`, ligado ao `Organization` por
      `founder`, com os perfis em `PERFIS_DO_AUTOR` (`src/lib/seo.ts`).
      Declarar perfil pessoal como se fosse da marca seria afirmar algo falso, e
      sinal impreciso vale menos que sinal ausente.

- [ ] **Registrar `@geradoor` no X e no Instagram**, com bio e link, sem
      compromisso de postar. Não é SEO — rede social não é fator de ranking, e o
      4Devs lidera há 14 anos sem nenhuma. É para a marca não ser ocupada por
      outra pessoa. Se um dia as contas existirem de verdade e forem do projeto,
      aí sim entram num `sameAs` do `Organization`.

- [ ] **Search Console.** Submeter o sitemap e acompanhar impressão e clique das
      três páginas de pouso. Página nova leva 60 a 90 dias para dar sinal legível.

- [ ] **Decidir sobre expandir o pSEO** com base nesse dado, por volta de
      dezembro de 2026. Se as três pegarem tração, o mesmo padrão vale para
      `/webp-para-svg`, `/validador-de-cnpj`,
      `/remover-fundo-de-foto-de-produto` e `/foto-3x4`. Se não pegarem, a
      conclusão é que o fosso do 4Devs é autoridade de domínio e não
      arquitetura — e o esforço vai melhor para outro lugar.

- [ ] **CNPJ alfanumérico no gerador.** O formato está em vigor desde 31/07/2026
      e o algoritmo está confirmado (seção 2). Nenhum concorrente escreveu uma
      linha sobre o assunto, e o 4Devs implementou sem documentar. Seria
      diferencial real. Hoje `/cnpj` diz que gera só o formato numérico.

- [ ] **A home tem 4 `<h2>`, contra 5 das ferramentas.** Não é problema: ela
      ranqueia pela marca. Só está anotado para não parecer esquecimento.
