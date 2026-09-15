# Vetorizador

Documentação da ferramenta `/vetorizador`: o que ela faz, como cada parte
funciona, por que foi feita assim, quais são os limites e o que fazer para
evoluir.

O motor em WebAssembly — protocolo, compilação, reprodutibilidade, publicação de
versão nova — tem manual próprio:
[`wasm/vetorizador/README.md`](../wasm/vetorizador/README.md).

---

## Sumário

1. [Visão geral](#1-visão-geral)
2. [Mapa dos arquivos](#2-mapa-dos-arquivos)
3. [O caminho de uma imagem](#3-o-caminho-de-uma-imagem)
4. [Preparação dos pixels](#4-preparação-dos-pixels)
4.1. [Os dois traçados](#41-os-dois-traçados)
5. [Estilos e controles](#5-estilos-e-controles)
6. [Fidelidade](#6-fidelidade)
7. [Garantias contra travar](#7-garantias-contra-travar)
8. [Tela, zoom e exportação](#8-tela-zoom-e-exportação)
9. [Integração com o site](#9-integração-com-o-site)
10. [Por que no navegador](#10-por-que-no-navegador)
11. [O que foi tentado e descartado](#11-o-que-foi-tentado-e-descartado)
12. [Testes](#12-testes)
13. [Limitações conhecidas e pendências](#13-limitações-conhecidas-e-pendências)

---

## 1. Visão geral

A pessoa solta, escolhe ou cola uma imagem. Em menos de um segundo, na maioria
dos casos, aparece o SVG ao lado da original, com divisória para comparar e zoom
para ver as curvas. Ela escolhe um estilo, ajusta cores, detalhe e suavidade —
cada ajuste refaz o SVG em segundos — e baixa o arquivo ou copia o código.

| Princípio | Como se traduz |
|---|---|
| **Custo zero** | Tudo roda no navegador. Sem servidor, sem cota, sem conta para vigiar. |
| **Não travar** | Decodificação já reduzida, piso automático de detalhe, teto de memória no WebAssembly, tetos de complexidade antes de o SVG chegar à tela (seção 7). |
| **Fiel à imagem** | Cores escolhidas pela imagem, contornos no lugar certo, e a fidelidade medida e mostrada (seção 6). |
| **Privacidade** | A imagem não sai do aparelho. |

**Formatos aceitos:** JPG, PNG, WEBP e AVIF, até 80 MB. HEIC e SVG são recusados.

**Formas de enviar:** arrastar e soltar em qualquer ponto da página, clicar no
palco ou em "Escolher imagem", ou colar (⌘V / Ctrl+V) fora de um campo de texto.

**O que esperar por tipo de imagem:**

| Tipo | Resultado |
|---|---|
| Logo, ícone, cores chapadas | Retas saem retas e cantos saem no lugar exato, não como curvas onduladas. Poucas formas, arquivo de KB, fidelidade acima de 98%. |
| Traço, desenho, assinatura | Excelente. Fidelidade acima de 99%. |
| Texto pequeno dentro do logo | As letras saem fechadas e legíveis até ~9 px de altura. |
| Ilustração | Arte chapada sai como logo; com sombreado, vira efeito pôster. |
| Foto | Efeito pôster. Mais cores deixam mais fiel e mais pesado (16 cores: ~2,7 MB, fidelidade ~94%). |

---

## 2. Mapa dos arquivos

| Arquivo | Responsabilidade |
|---|---|
| `src/app/vetorizador/page.tsx` | Metadados de SEO e JSON-LD. Servidor. |
| `src/app/vetorizador/VetorizadorClient.tsx` | A página: soltar/colar, layout, estado dos ajustes com espera, estatísticas, exportação. |
| `src/components/vetorizador/ComparadorDoVetor.tsx` | Imagem e SVG sobrepostos, divisória, zoom de 100% a 800% com arrasto. |
| `src/components/vetorizador/AjustesDoVetor.tsx` | Estilo, sliders, fundo transparente, cor do traço. |
| `src/lib/useVetorizador.ts` | Hook: compila o motor, cria e descarta workers, tentativas de simplificação, tempo limite, mede a fidelidade. |
| `src/lib/vetorizador.ts` | Toda a lógica pura: limites, estilos, cor OKLab, preparação dos pixels, paleta, fundo, parâmetros do motor, SVG, fidelidade, protocolo. |
| `src/lib/vetorizador.worker.ts` | Worker: decodifica a imagem; prepara, traça, monta o SVG e mede a fidelidade. |
| `src/lib/tracadoPreciso.ts` | O traçado de logo, arte chapada e traço: contorno abaixo do pixel, retas e cantos exatos, curvas de Bézier. |
| `src/lib/dimensoesDaImagem.ts` | Lê largura, altura e orientação do cabeçalho do arquivo, sem decodificar. |
| `src/lib/vetorizadorMotor.ts` | Ponte entre TypeScript e o WebAssembly. |
| `wasm/vetorizador/` | Código Rust do motor e script de compilação. |
| `public/wasm/vetorizador-v2.wasm` | O motor compilado (145 KB), conferido por hash. |
| `next.config.ts` | Cache imutável de um ano em `/wasm/:path*`. |
| `src/lib/rotas.ts`, `AppShell.tsx`, `sitemap.ts` | Menu e busca com etiqueta "Novo", layout sem moldura, sitemap. |

---

## 3. O caminho de uma imagem

```mermaid
sequenceDiagram
    participant U as Pessoa
    participant P as Página
    participant H as useVetorizador
    participant W1 as Worker (preparar)
    participant W2 as Worker (vetorizar)

    U->>P: arquivo
    P->>H: carregar
    H->>H: valida tipo e tamanho
    par
        H->>W1: arquivo
        W1->>W1: decodifica com EXIF, reduz a ≤ 2 MP, prévia ≤ 2560 px
        W1-->>H: pixels de traçado + prévia
    and
        H->>H: baixa, confere hash e compila o motor
    end
    Note over W1: descartado
    P->>H: vetorizar(ajustes)
    H->>W2: pixels (cópia) + motor compilado + ajustes
    W2->>W2: prepara pixels, traça, monta SVG, confere tetos
    alt dentro dos tetos
        W2-->>H: SVG + estatísticas + referência
        H->>H: mede fidelidade
    else complexo demais
        W2-->>H: complexo-demais
        H->>W2: nova tentativa, mais simples (até 3)
    end
    Note over W2: descartado
    H-->>P: resultado
    U->>P: ajuste
    P->>H: vetorizar (250 ms depois da última mudança)
```

Passo a passo:

1. **Validação** (`validarArquivo`): tipo em JPG, PNG, WEBP ou AVIF; não vazio;
   até 80 MB.
2. **Preparar**: o tamanho vem do cabeçalho do arquivo
   (`dimensoesDaImagem.ts`), e `createImageBitmap` decodifica **já reduzido**
   ao maior tamanho que será usado. Numa foto de 48 MP, é a diferença entre um
   bitmap de 192 MB e um de 13 MB — era a maior alocação da ferramenta, e
   acontecia antes de qualquer decisão. Formato cujo cabeçalho não se reconheça
   decodifica inteiro, como antes. O traçado (`dimensoesDeTracado`) reduz o que
   passar de 1,2 MP ou 1600 px de lado, e nunca amplia. A prévia de tela sai
   com até 1800 px.
3. **Motor**, em paralelo: baixa `/wasm/vetorizador-v2.wasm`, confere o SHA-256,
   compila uma vez. O `WebAssembly.Module` compilado é enviado a cada worker, que
   só instancia.
4. **Vetorizar**: o worker recebe uma cópia dos pixels — a página mantém os
   originais para o próximo ajuste —, prepara (seção 4), traça (seção 4.1),
   monta o SVG, encaixa as cores na paleta, confere os tetos (seção 7) e mede a
   fidelidade (seção 6).
5. **Resultado**: o SVG vira Blob e object URL, e a tela troca.
6. **Ajustes**: cada mudança de controle espera 250 ms sem novas mudanças e
   vetoriza de novo. Um pedido novo encerra o worker do anterior na hora.

---

## 4. Preparação dos pixels

`prepararPixels`, em `src/lib/vetorizador.ts`. É a parte que mais pesa na
qualidade: o traçado desenha bem o que recebe, e o que ele recebe é decidido
aqui.

### Estilos coloridos (Automático, Logo, Ilustração, Foto)

1. **Alfa binário** (`binarizarAlfa`): alfa < 128 vira transparente, o resto
   opaco. SVG não tem meio-termo por pixel, e um pixel de borda com alfa 60 seria
   traçado como se fosse opaco — um contorno escuro em volta de todo PNG recortado.
2. **Estilo**, no Automático (`detectarEstilo`): se 16 cores representam bem a
   imagem, é logo; se 32 representam, ilustração; senão, foto.
3. **Suavização**, só na Foto (`suavizarPreservandoBordas`): filtro bilateral 3×3,
   duas passadas. Alisa o grão do sensor, que viraria milhares de manchas de dois
   pixels, sem borrar contornos.
4. **Paleta** (`histograma` + `kmeans` / `paletaAutomatica`):
   - as cores são agrupadas num histograma de 18 bits (6 por canal), com a cor
     média de cada caixa em **OKLab** — espaço em que a distância acompanha a
     diferença percebida;
   - **k-means ponderado** sobre as caixas, com início k-means++ de semente fixa
     (determinístico), até 16 iterações;
   - **peso do miolo** (`pesosDoMiolo`): pixels com os quatro vizinhos da mesma
     cor pesam 1; os demais, 0,15. É o que impede o antisserrilhado de virar
     cor. Sem isso, a faixa rosada entre um laranja e um branco vira uma cor
     própria, uma forma estreita e serrilhada ao longo de todo contorno, e o
     círculo sai ondulado. Peso pequeno, e não zero, para regiões largas sem miolo
     (um degradê metálico) ainda ganharem as suas cores. Numa textura quase sem
     miolo (menos de 30%), todos pesam igual;
   - **número de cores automático**: a menor quantidade, dentro da faixa do
     estilo, em que a fração de pixels mal representados (a mais de ΔE 0,05 da
     cor da paleta) fica abaixo do alvo do estilo. Não o erro médio: num logo de
     fundo branco, o fundo é 80% dos pixels com erro zero, e um círculo inteiro
     com a cor errada quase não mexe na média;
   - cada pixel recebe a cor mais próxima da paleta (`aplicarPaleta`). A faixa de
     antisserrilhado se divide entre as duas cores vizinhas, e o contorno cai no
     meio dela — onde ele está de verdade.
5. **Fundo transparente**, se ligado (`removerFundoLiso`), depois da paleta:
   - a cor do fundo é a mais comum entre os pixels opacos da borda, e precisa
     ocupar pelo menos metade dela;
   - sai por preenchimento a partir da borda, pela cor exata. O branco dentro de
     um "O" fica, porque não encosta na borda;
   - resultados: `removido`, `sem-fundo-liso` (a página sugere o Removedor de
     fundo) ou `ja-transparente`.

Duas coisas a mais, só no traçado de precisão:

- **`removerMisturas`** tira da paleta a cor que é só antisserrilhado — mistura
  de duas outras, vista quase só em bordas e em faixa estreita. Num texto preto
  sobre amarelo, a paleta automática vinha com cinco cores, três delas tons de
  oliva, e cada tom virava um halo em volta das letras.
- **`rotularMisturas`** dá a cada pixel de borda uma das duas cores que ele
  mistura, nunca uma terceira. O antisserrilhado entre marinho e branco caía
  no piscina de outra forma da imagem, e o contorno saía picotado.

Depois do traçado, **`ajustarCoresAPaleta`** troca cada cor do SVG pela mais
próxima da paleta. O VTracer pinta cada forma com a média dos pixels dela, e ao juntar
uma mancha pequena à vizinha a média mistura as duas — uma letra saía em quatro
tons de grafite, e um contorno ganhava uma lasca bege.

### Traço

1. Alfa binário.
2. **Limiar** de luminância: automático por **Otsu** (`limiarDeOtsu`) — o valor
   que melhor separa tinta de papel —, ou o escolhido no controle.
3. **Binarização**: tinta preta, papel branco. Só a tinta é traçada; o papel
   sai transparente.
4. A cor do traço (preto, branco ou livre) substitui o preto no SVG.

---

## 4.1. Os dois traçados

| Estilo | Traçado |
|---|---|
| Logo | Precisão (`tracadoPreciso.ts`) |
| Traço | Precisão |
| Ilustração | Precisão se for arte chapada; VTracer se tiver textura (`eArteChapada`) |
| Foto | VTracer (`wasm/vetorizador`) |

### Por que dois

O VTracer traça o degrau dos pixels já reduzidos a cores chapadas e tenta
alisar esse degrau com splines. A informação de onde a borda realmente passa —
o antisserrilhado — foi jogada fora antes, e o que sai é uma reta de logo
desenhada como dezenas de curvinhas que ondulam em volta dela. Num logo com
muitos ângulos retos, isso salta aos olhos.

Em foto e em arte com sombreado, o VTracer continua melhor: ele empilha regiões
hierárquicas e reproduz o degradê. Medido numa foto tratada como ilustração, o
traçado de precisão ficou em 72% a 79% de fidelidade, contra 94% do VTracer.

### Como o traçado de precisão funciona

1. **Cobertura abaixo do pixel** (`coberturas`). Cada cor vira um campo: 1 no
   miolo, 0 fora, e na borda a fração que o antisserrilhado indica — a posição
   da cor do pixel no segmento entre as duas cores vizinhas. Na borda com o
   vazio, a fração é o alfa.
2. **Piso automático de área** (`pisoDeArea`). As manchas menores que o detalhe
   pedido são absorvidas pela vizinha; se ainda sobrarem mais de 6 mil regiões,
   o piso dobra até caber. É o que impede uma textura de virar milhares de
   caminhos — antes de gastar tempo e memória com eles.
3. **Curvas de nível** (`curvasDeNivel`). O contorno é a linha de cobertura 0,5,
   por marching squares com interpolação: ele passa exatamente no meio da
   borda. Regiões pequenas têm o campo ampliado até 3× por interpolação
   bicúbica (`ampliarRegiao`) — é o que reconstrói um traço de 1 px que caiu
   entre duas fileiras de pixels, como o topo de um "O" num texto de 9 px.
   `preservarTracosFinos` cuida do mesmo caso quando a ampliação não basta.
4. **Polígono mínimo e cantos** (`analisarPoligono`). O contorno vira o
   polígono com menos vértices que fica a 0,45 px dele, na ideia do Potrace
   (Selinger, 2003). Um vértice é canto se a virada passa do ângulo pedido ou
   se ele fica longe da corda entre os pontos médios das arestas vizinhas —
   assim a ponta arredondada de um traço não vira dois cantos e uma reta.
   Vértices próximos com viradas no mesmo sentido são fundidos: o
   antisserrilhado corta a ponta de um canto e a simplificação o partia em dois.
5. **Retas** (`ajustarReta`, `eArco`). Uma aresta longa do polígono vira uma
   reta única, por mínimos quadrados totais, quando é reta de verdade: o teste
   compara o ajuste de reta com o de círculo (Kåsa), porque numa circunferência
   grande a aresta desvia da reta menos que o ruído. O canto entre duas retas é
   a **interseção** delas, não o pixel mais próximo.
6. **Curvas** (`ajustarCurva`). O resto é ajustado com Béziers cúbicas
   (Schneider, *Graphics Gems*, 1990), subdividindo só onde o erro passa da
   tolerância.
7. **Rede de segurança** (`ajustarContorno`). O ajuste é comparado ao contorno
   real nos dois sentidos; se algum ponto ficar longe demais, refaz com
   tolerância justa, e em último caso sai como polígono fiel. Uma letra de
   texto miúdo nunca sai deformada, nem some.
8. **Sem frestas**. Um caminho por cor, com buracos (`evenodd`), e cada camada
   avança dois pixels por baixo das camadas desenhadas depois dela.

---

## 5. Estilos e controles

### Pontos de partida

| Estilo | Detalhe | Suavidade | Faixa de cores | Alvo de mal representados | Suaviza antes |
|---|---|---|---|---|---|
| Automático | conforme o detectado | | | | |
| Logo | 70 | 50 | 2–16 | 0,5% | não |
| Ilustração | 75 | 50 | 2–32 | 2% | não |
| Foto | 55 | 80 | 8–64 | 8% | sim |
| Traço | 70 | 50 | — | — | — |

Escolher um estilo redefine os controles para os valores dele, mantendo o fundo
transparente escolhido. No Automático, a dica diz como a imagem foi tratada
("Tratando como logo").

### Controles e o que viram no motor (`parametrosDoMotor`)

| Controle | Faixa | No motor |
|---|---|---|
| **Cores** | 2–64 ou automático | Tamanho da paleta (seção 4). O motor compara cores com precisão total (8 bits) e diferença de camada 0, porque a imagem já chega reduzida. |
| **Limiar** (Traço) | 0–255 ou automático | Luminância abaixo da qual é tinta. |
| **Detalhe** | 0–100 | Lado da menor mancha mantida: `(1 + (1 − d)^1,5 × 11) × lado_do_traçado/1000`, no mínimo 1 px. 100 mantém manchas de 1 px; 0 descarta até ~12 px de lado numa imagem de 1000 px. |
| **Suavidade** | 0–100 | Ângulo de canto `20° + 160° × s²`: no meio, 60° (padrão do VTracer; o canto de 90° de uma letra continua canto); no máximo, 180° (tudo curva, como o VTracer usa em foto). Comprimento mínimo de segmento de 3 a 6. No zero, polígono puro. |
| **Fundo transparente** | liga/desliga | Seção 4. Não aparece no Traço. |
| **Cor do traço** | preto, branco, livre | Troca o `fill` no SVG. Só no Traço. |

Fixos: modo spline (exceto suavidade 0), camadas empilhadas (sem frestas entre
formas), 10 iterações, emenda a 45°, 2 casas decimais.

Cores e limiar começam no automático e mostram o valor escolhido ("Automático:
4 cores"). Mover o slider fixa o valor; "Voltar ao automático" desfaz.

---

## 6. Fidelidade

Depois de cada resultado, o **worker** desenha as próprias formas com `Path2D`
numa amostra de até 384 px e compara com a **referência** (`fidelidade`).

No worker, e não na página: medir exigia decodificar um SVG de milhares de
caminhos na thread principal, e com uma imagem ruidosa isso deixava a tela sem
responder por dezenas de segundos.

- **Referência** é a imagem que o SVG tenta reproduzir: a original com alfa
  binário e sem o fundo que foi removido. No Traço, a tinta binarizada sobre
  transparente. Comparar com a original acusaria como erro o fundo que a pessoa
  pediu para tirar.
- **Pixels relevantes**: os opacos em pelo menos um dos lados. Transparente dos
  dois lados não conta, senão um logo pequeno numa tela vazia pontuaria 99% com
  qualquer desenho.
- **Reproduzido**: nos **dois sentidos**, a cor do pixel (a até ΔE OKLab 0,03) e
  a opacidade aparecem no outro lado, nele ou num vizinho imediato. A folga de um
  pixel é para o contorno, que o traçado põe no meio do antisserrilhado. Os dois
  sentidos impedem que uma forma inventada sobre o fundo transparente passe.

A tolerância foi calibrada para a nota acompanhar o que se vê:

| Imagem | Fidelidade |
|---|---|
| Logo em cores chapadas | 98% |
| Traço de uma foto | 99,7% |
| Foto em 48 cores | 94% |
| Foto em 12 cores | 89% |
| Foto em 8 cores, com faixas evidentes | 78% |

Imagens com degradês muito sutis (um fundo quase preto com variações de 1–2%) e
molduras finas com brilho metálico pontuam baixo (50–60%) mesmo parecendo
próximas: nesses casos a métrica é mais rigorosa que o olho.

---

## 7. Garantias contra travar

A exigência central da ferramenta. Cada camada, e onde ela mora:

| # | Garantia | Onde |
|---|---|---|
| 1 | O traçado roda num worker, nunca na thread da página — inclusive a medição de fidelidade | `useVetorizador`, `vetorizador.worker.ts` |
| 2 | A imagem é decodificada **já reduzida**, pelo tamanho lido do cabeçalho: uma foto de 48 MP não vira um bitmap de 192 MB | `dimensoesDaImagem.ts` |
| 3 | Traçado de no máximo 1,2 MP; prévia de tela de até 1800 px | `PIXELS_MAXIMOS_DE_TRACADO`, `LADO_DA_PREVIA` |
| 4 | Piso automático de área: textura e ruído são simplificados **antes** do traçado, não depois de falhar | `pisoDeArea` |
| 5 | Teto duro de 256 MB na memória do WebAssembly: acima disso ele aborta, não cresce | `wasm/vetorizador/.cargo/config.toml` |
| 6 | O traçado de precisão para em 8 mil contornos | `MAX_CONTORNOS` |
| 7 | SVG com mais de 8 mil caminhos ou 3 MB não chega à tela | `MAX_CAMINHOS`, `MAX_BYTES_DO_SVG` |
| 8 | Passou dos tetos ou esgotou a memória: uma nova tentativa com metade das cores e menos detalhe; depois disso, mensagem | `simplificar`, `MAX_TENTATIVAS` |
| 9 | 30 segundos sem resposta encerram o worker | `TEMPO_LIMITE_MS` |
| 10 | Um worker só, reaproveitado; descartado quando o motor aborta, quando o pedido é abandonado e depois de um minuto ocioso | `useVetorizador` |
| 11 | Ajustes em sequência esperam 250 ms de pausa | `ESPERA_DO_AJUSTE_MS` |
| 12 | A foto é decodificada uma vez só; os ajustes usam a cópia de até 1,2 MP | `carregar` |
| 13 | O SVG é mostrado como `<img>`, nunca inserido no DOM | `ComparadorDoVetor` |
| 14 | Zoom limitado a 8× | `NIVEIS` |

### Verificação em navegador real

Chromium headless, em tela retina, com um vigia que soma a memória de todos os
processos do navegador a cada 200 ms.

**Oito imagens em sequência** (pôsteres coloridos e fotos grandes), que é como o
problema aparece na prática:

| | Antes | Depois |
|---|---|---|
| Memória ao abrir | 638 MB | 624 MB |
| Depois de 8 imagens | 1.040 MB, **sempre subindo** | 692 a 815 MB, **subindo e voltando** |
| Pico | 1.080 MB | 917 MB |

O crescimento contínuo era o que derrubava a aba numa máquina com pouca memória
livre. Ele vinha de bitmaps — não de JavaScript: o heap JS ficava em 10 MB, e
forçar o coletor devolvia 270 MB de uma vez.

**Casos difíceis:**

| Entrada | Antes | Depois |
|---|---|---|
| Ruído de 4 MP | 13,5 s e resultado inútil; a página não respondia por mais de 30 s | recusado com mensagem em 4,2 s, sem travar |
| Ruído de 2 MP | 13,5 s | 3,2 s |
| Pôster colorido de 3,2 MP | 3,3 s | 2,7 s |
| Foto de 3,8 MP | 4,3 s | 3,3 s |
| Zoom de 100% a 800%, arrastando | — | memória estável em ~580 MB |

---

## 8. Tela, zoom e exportação

### Comparador

- Imagem à esquerda da divisória, SVG à direita, na mesma caixa, sobre xadrez
  (transparência visível). Rótulos "Imagem" e "SVG".
- A primeira vetorização revela o resultado com a divisória correndo até o meio.
  As seguintes trocam o SVG no lugar, sem mexer na divisória.
- Durante a primeira, varredura animada e pílula "Vetorizando"; nas seguintes, o
  SVG anterior fica visível com a pílula "Atualizando".

### Zoom

| Ação | Efeito |
|---|---|
| Botões − / + | 100%, 200%, 400%, 800%, em torno do centro |
| Clique no percentual | Volta a 100% |
| ⌘/Ctrl + roda, pinça no trackpad | Muda o nível em torno do ponteiro |
| Duplo clique | Alterna entre 100% e 400% no ponto clicado |
| Arrastar, com zoom | Move a imagem (limitada à caixa) |
| Arrastar, sem zoom | Move a divisória |
| Puxador | Sempre move a divisória; setas, Home e End pelo teclado |

Ampliada, a imagem original fica pixelada de propósito (`image-rendering:
pixelated`) e o SVG continua nítido — é onde se vê o que vetorizar faz. A camada
não usa `will-change`: com ele, o navegador rasterizaria uma vez e esticaria o
bitmap, e o SVG ampliado sairia borrado.

Imagem nova volta o zoom a 100%.

### Estatísticas

Cores, formas (caminhos), tamanho do arquivo e fidelidade ("…" enquanto é
medida).

### Exportação

- **Baixar SVG**: `<nome-original>.svg`, com caracteres inválidos trocados por
  hífen.
- **Copiar código**: o texto do SVG na área de transferência.

O SVG tem `width`/`height` da imagem original e `viewBox` na resolução de
traçado: abre no tamanho da foto em qualquer programa, com as coordenadas na
precisão em que foram traçadas.

### Rodapé

"Vetorizado no seu aparelho. A imagem não é enviada a lugar nenhum." e **Limpar**,
que encerra o worker, revoga as URLs e volta os ajustes ao Automático.

---

## 9. Integração com o site

- **Menu e busca:** `src/lib/rotas.ts`, ícone `Spline`, rótulo curto "Vetorizar",
  termos "vetorizar", "svg", "png para svg", "jpg para svg", "logo", "traço"…,
  com `novo: true`. Para tirar a etiqueta, remova `novo: true`.
- **Layout:** em `SEM_MOLDURA` (`AppShell.tsx`), mesma estrutura do Removedor de
  fundo: texto e controles à esquerda, palco com 58% à direita; uma coluna no
  celular.
- **SEO:** título "Vetorizar imagem online e grátis: PNG e JPG para SVG",
  `toolSchema`, `breadcrumbSchema`; sitemap com prioridade 0,9.
- **Removedor de fundo:** quando o fundo não é liso, a página sugere passar a foto
  pelo Removedor e trazer o PNG. O PNG recortado entra com transparência, que o
  vetorizador preserva.
- **Headers:** `/wasm/:path*` com cache imutável de um ano. A rota não precisa de
  isolamento de origem (o motor usa uma thread só).

---

## 10. Por que no navegador

A alternativa estudada era rodar o motor na Cloudflare, como o recorte do
Removedor de fundo. Não dá de graça:

| Opção | Por que não |
|---|---|
| Worker da Cloudflare, plano Free | 10 ms de CPU por requisição; vetorizar leva centenas de ms a segundos. O Removedor funciona lá porque o trabalho pesado roda no Cloudflare Images, não no Worker; não existe serviço equivalente de vetorização. |
| Worker Paid, Containers | Custo fixo mensal. |
| Função na Vercel | O plano gratuito é não comercial, e passar do limite de CPU pausa as funções do site inteiro. |

E no navegador o motivo que levou o Removedor para a nuvem não existe: lá era um
modelo de IA de centenas de MB; aqui é um algoritmo de 145 KB que usa dezenas a
poucas centenas de MB. De quebra, a imagem não sai do aparelho, não há cota por
pessoa, e o ajuste é imediato, sem viagem pela rede.

---

## 11. O que foi tentado e descartado

| Tentativa | O que aconteceu | Decisão |
|---|---|---|
| Pacotes prontos (`vectortracer`, `vtracer-wasm`) | Builds de terceiros, sem código-fonte no pacote | Motor compilado aqui, do código oficial |
| Depender do crate `vtracer` | Puxa `clap`, `image` e `fastrand` com imports de JS | Só `visioncortex`, conversor reescrito |
| Escolher o número de cores pelo erro médio | Logo de 4 cores saía com 2: o fundo branco diluía o erro | Fração de pixels mal representados |
| Paleta com todos os pixels pesando igual | O antisserrilhado virava cores; círculos ondulados, letras deformadas | Peso do miolo |
| Paleta só com o miolo (peso zero na borda) | Moldura metálica sem miolo perdia as cores | Peso 0,15 na borda |
| Suavidade padrão com canto a 118° | Cantos de 90° das letras arredondados | Curva quadrática, 60° no meio |
| Tirar o fundo antes da paleta, por tolerância | Sobravam lascas bege em volta das letras | Tirar depois da paleta, pela cor exata |
| Cores do SVG como o motor devolve | Uma letra em quatro tons | Encaixar na paleta |
| Fidelidade pixel a pixel, ΔE 0,05 | Moldura fina idêntica à vista marcava 50%; foto em pôster marcava 93% | Folga de um pixel, ΔE 0,03 |
| Fidelidade num sentido só | Forma inventada sobre fundo transparente passava | Dois sentidos |
| Traço comparado com a foto colorida | Fidelidade 0% | Referência = tinta binarizada |
| `will-change: transform` no zoom | SVG ampliado borrado | Removido |
| VTracer para logo | Uma reta virava dezenas de curvinhas que ondulam em volta dela | Traçado de precisão próprio |
| Ampliar a imagem pequena antes de traçar | A interpolação espalhava o antisserrilhado, e a haste de um "I" de texto pequeno sumia | Nunca ampliar a imagem; ampliar o campo de cobertura, por região |
| Traçado de precisão também na foto | 72% a 79% de fidelidade, contra 94% do VTracer | VTracer onde há sombreado (`eArteChapada`) |
| Decodificar a imagem inteira para saber o tamanho | Uma foto de 48 MP virava 192 MB antes de qualquer decisão | Ler o tamanho do cabeçalho e decodificar já reduzido |
| Medir a fidelidade na página | Decodificar um SVG de milhares de caminhos travava a tela por dezenas de segundos | Medir no worker, com `Path2D` |
| Tentar, falhar e simplificar | Cada tentativa custava o traçado inteiro; o ruído levava 13,5 s | Piso automático de área, antes de traçar |
| Um worker novo por pedido | Compilava o módulo a cada vez e o navegador segurava a memória dos anteriores | Um worker reaproveitado, descartado quando precisa |

---

## 12. Testes

```bash
npx vitest run src/lib/vetorizador src/lib/vetorizadorMotor
```

| Arquivo | Cobre |
|---|---|
| `src/lib/vetorizador.test.ts` | Validação; dimensões de traçado (redução, lado máximo, ampliação até 4×) e de amostra; normalização e simplificação dos ajustes; parâmetros do motor (canto de 60° no meio, polígono no zero, mancha por detalhe e por resolução, binário só no traço); OKLab ida e volta; alfa binário; peso do miolo e textura sem miolo; paleta do logo sem as cores do antisserrilhado; k-means determinístico; detecção de estilo; Otsu; fundo liso (miolo preservado, borda não lisa, já transparente, referência sem o fundo); preparação completa (traço, automático, cores fixas); montagem do SVG, cor do traço, encaixe na paleta, nome do arquivo; fidelidade (iguais, contorno deslocado, cor errada, transparente dos dois lados, tamanhos diferentes). |
| `src/lib/vetorizadorMotor.test.ts` | O `.wasm` publicado: hash igual ao que a página confere, nenhum import, teto de memória; traçado de formas e cores; determinismo; transparência; modo binário; descarte de manchas pelo detalhe; recusa de dimensões e parâmetros inválidos sem inutilizar a instância; imagem acima do teto aborta como `MotorEsgotado`; ponta a ponta de preparação e motor. |

O que depende de canvas, workers e da tela (decodificação, amostra da referência,
comparador, zoom) foi verificado no navegador real da seção 7.

### Roteiro de verificação manual

1. **Logo** com fundo branco: Automático deve tratar como logo, com as cores
   exatas e fidelidade acima de 95%.
2. **Zoom** a 400% e 800% na borda de uma curva: original pixelada, SVG liso.
3. **Fundo transparente** no logo: fundo sai, o branco de dentro das letras fica.
4. **Fundo transparente** numa foto: aviso sugerindo o Removedor de fundo.
5. **PNG já recortado** pelo Removedor: transparência preservada.
6. **Foto** em Automático e em Foto: efeito pôster, sem travar; subir e baixar
   cores.
7. **Traço** de uma assinatura fotografada: limiar automático, cor do traço.
8. **Ícone pequeno** (64 px): curvas lisas graças à ampliação.
9. **Trocas rápidas** de estilo e arrasto contínuo de slider: a página não trava,
   só a última vetorização conclui.
10. **Imagem enorme** (48 MP): abre, traça a 2 MP, SVG com o tamanho original.
11. **Baixar** e abrir o SVG no navegador e num editor; **Copiar código**.
12. **Celular**: layout em uma coluna, zoom pelos botões.
13. **Tema claro e escuro**.

---

## 13. Limitações conhecidas e pendências

| Limitação | Impacto | Caminho, se valer |
|---|---|---|
| Degradês viram faixas | Ilustrações com gradiente e fotos ficam com cara de pôster | Detectar degradês e emitir `<linearGradient>` |
| Traçado a 1,2 MP | Detalhes menores que ~1/1100 da imagem se perdem numa foto grande | Traçar por blocos, com memória por bloco |
| Sem seleção de cores da paleta | A pessoa não escolhe quais cores manter ou juntar | Editor de paleta sobre o resultado |
| SVG não otimizado além do básico | Arquivos de foto ficam em MB | Juntar caminhos de mesma cor, coordenadas relativas |
| Fidelidade rigorosa em degradês sutis e molduras finas | Nota baixa com resultado visualmente próximo | Métrica perceptual por região (SSIM em OKLab) |
| Textura e ruído são simplificados sem avisar | O piso de área sobe sozinho; a pessoa vê menos detalhe do que pediu | Dizer na tela que a imagem foi simplificada, e o quanto |
| Fundo transparente só para fundo liso | Foto precisa passar antes pelo Removedor | Integrar o recorte do Removedor como opção |
| Primeira vetorização baixa 145 KB de motor | Irrelevante; fica em cache por um ano | — |

### Pendências

- [ ] Remover a etiqueta "Novo" (`novo: true` em `src/lib/rotas.ts`) quando deixar
  de ser novidade.
