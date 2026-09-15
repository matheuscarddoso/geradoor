# Motor do vetorizador

O traçado de imagem para SVG do [Vetorizador](https://www.geradoor.com/vetorizador),
compilado de Rust para WebAssembly. Roda no navegador da pessoa, num worker; nada
passa por servidor.

A feature inteira — página, preparação dos pixels, estilos, fidelidade, limites —
está em [`docs/vetorizador.md`](../../docs/vetorizador.md). Este documento cobre só o
motor: o que é, como se comunica, como compilar e como publicar uma versão nova.

| | |
|---|---|
| Código | `src/lib.rs` |
| Arquivo publicado | `public/wasm/vetorizador-v1.wasm` (145 KB) |
| SHA-256 | `536dafe1b33b22f4d02c5067a5f38a5366fba04618dbb835c72329a796b94086` |
| Algoritmo | [VTracer](https://github.com/visioncortex/vtracer) 0.6.5, sobre `visioncortex` 0.8.8 |
| Licença do algoritmo | MIT OR Apache-2.0 |
| Compilador | Rust 1.94.0 (fixado em `rust-toolchain.toml`) |
| Teto de memória | 512 MB (fixado em `.cargo/config.toml`) |

---

## O que é

O VTracer é o vetorizador aberto de referência para imagens coloridas. Ele agrupa
pixels de cores parecidas em regiões hierárquicas, empilha as regiões e ajusta
curvas (splines) aos contornos. O código dele é dividido em uma biblioteca de
algoritmos (`visioncortex`) e um conversor fino por cima (`vtracer/src/converter.rs`).

Este crate depende só da biblioteca e reescreve o conversor, com três mudanças:

1. **Sem glue de JavaScript.** Nada de `wasm-bindgen`. O módulo não importa nada
   e exporta meia dúzia de funções numéricas. Consequências: o mesmo `.wasm` roda
   no worker e nos testes em Node sem adaptação, o arquivo é pequeno, e compilar
   não exige nenhuma ferramenta além do `rustup`.
2. **Determinístico.** O VTracer sorteia com `fastrand` a cor usada para marcar os
   pixels transparentes. Aqui a busca segue uma sequência fixa. A mesma imagem com
   os mesmos parâmetros dá sempre o mesmo SVG — o que torna o motor testável.
3. **Só os caminhos.** O cabeçalho `<svg>` é montado em TypeScript
   (`montarSvg`), que conhece o tamanho original da imagem. Daqui saem só os
   elementos `<path>`, na ordem de empilhamento.

O crate `vtracer` não é dependência de propósito: ele puxa `clap` e `image`, que o
navegador não usa, e o `fastrand` com a feature de WebAssembly exigiria importar
funções do JavaScript.

---

## Protocolo

Tudo passa por números e pela memória linear do módulo. A ponte TypeScript é
`src/lib/vetorizadorMotor.ts`; ninguém mais chama estas funções.

| Exportação | Assinatura | O que faz |
|---|---|---|
| `alocar` | `(tamanho) → ponteiro` | Reserva `tamanho` bytes. Quem chama escreve os pixels RGBA ali. |
| `vetorizar` | `(ponteiro, tamanho, largura, altura, …parâmetros) → código` | Consome o buffer (não chame `liberar` depois) e traça. `0` é sucesso. |
| `resultado_ponteiro` | `() → ponteiro` | Início do texto UTF-8 com os `<path>`. |
| `resultado_tamanho` | `() → bytes` | Tamanho desse texto. |
| `caminhos` | `() → número` | Quantos `<path>` o resultado tem. |
| `liberar` | `(ponteiro, tamanho)` | Devolve um buffer de `alocar` que não foi passado a `vetorizar`. |
| `memory` | — | A memória linear. |

O resultado vale até a próxima chamada de `vetorizar`.

### Parâmetros de `vetorizar`, na ordem

| # | Parâmetro | Tipo | Faixa | Significado |
|---|---|---|---|---|
| 1–4 | ponteiro, tamanho, largura, altura | inteiros | `tamanho = largura × altura × 4` | Os pixels |
| 5 | `binario` | 0/1 | | 1: só a tinta (vermelho < 128) vira forma, em preto |
| 6 | `recortado` | 0/1 | | 1: camadas recortadas; 0: empilhadas. A página usa sempre 0 |
| 7 | `modo` | 0/1/2 | | 0: pixel; 1: polígono; 2: spline |
| 8 | `lado_da_mancha` | inteiro | ≥ 0 | Regiões com área menor que lado² são descartadas |
| 9 | `precisao_de_cor` | inteiro | 1–8 | Bits de cor comparados |
| 10 | `diferenca_de_camada` | inteiro | ≥ 0 | Diferença de cor para virar camada separada |
| 11 | `angulo_de_canto_graus` | inteiro | | Abaixo disto, uma virada do contorno é canto |
| 12 | `comprimento_minimo` | real | | Comprimento mínimo de segmento de curva |
| 13 | `iteracoes` | inteiro | ≥ 1 | Iterações de subdivisão da curva |
| 14 | `angulo_de_emenda_graus` | inteiro | | Ângulo para emendar splines |
| 15 | `casas_decimais` | inteiro | | Precisão das coordenadas no SVG |

### Códigos de retorno

| Código | Significado | Estado da instância |
|---|---|---|
| `0` | Sucesso | Utilizável |
| `-1` | Parâmetro fora do contrato (dimensões não batem, modo inválido, precisão fora de 1–8, iterações 0) | Utilizável |
| `-2` | Nenhuma cor livre para marcar a transparência (a imagem usa as 6 cores puras e 64 sorteadas) | Utilizável |
| *trap* `unreachable` | Pânico ou memória esgotada | **Inutilizável.** A ponte lança `MotorEsgotado`, e o worker é descartado |

---

## Teto de memória

`.cargo/config.toml` passa `--max-memory=536870912` ao linker: a memória do módulo
nunca passa de 512 MB. Uma alocação acima disso falha dentro do WebAssembly e
aborta a vetorização, em vez de crescer até onde o navegador deixar.

Medições que definiram os limites (Node, mesmo `.wasm`):

| Entrada | Memória do módulo | Tempo |
|---|---|---|
| Foto real, 0,7 MP | 53 MB | 0,4 s |
| Foto real, 1,7 MP | 107 MB | 1,0 s |
| Foto real, 2,8 MP | 207 MB | 2,0 s |
| Ruído puro (pior caso), 1 MP | 193 MB | 3,6 s |
| Ruído puro, 2 MP | 385 MB | 8,9 s |
| Ruído puro, 3,6 MP | aborta em 0,14 s, no teto | — |

O pior caso cresce ~195 MB por megapixel. Por isso a página traça no máximo 2 MP
(`PIXELS_MAXIMOS_DE_TRACADO`): nem ruído puro encosta no teto. Numa imagem real,
depois da redução de cores que a página faz antes, o uso fica bem abaixo disso.

---

## Compilar e publicar

Pré-requisito, uma vez por máquina: [rustup](https://rustup.rs). O
`rust-toolchain.toml` baixa sozinho o Rust 1.94.0 e o alvo
`wasm32-unknown-unknown` na primeira compilação.

```bash
wasm/vetorizador/construir.sh
```

O script compila (com `-j 2`, para não disputar a máquina inteira), copia o
resultado para `public/wasm/vetorizador-v1.wasm` e imprime o SHA-256.

### Reprodutibilidade

O build é reproduzível: com o mesmo `Cargo.lock` e o mesmo compilador, uma
compilação do zero (`cargo clean` antes) gera um arquivo idêntico, byte a byte.
Foi conferido. Por isso o compilador é fixado, e por isso o hash do arquivo
publicado vale como prova de que ele saiu deste código.

O `.wasm` vai para o git: a Vercel não tem Rust, e o arquivo servido precisa ser
exatamente o conferido.

### Publicar uma versão nova do motor

1. Altere `src/lib.rs` (ou a versão do `visioncortex`, sempre com `=` exato).
2. **Troque o nome do arquivo**: `vetorizador-v2.wasm`, no `construir.sh` e em
   `MOTOR.url` (`src/lib/vetorizador.ts`). Nunca sobrescreva a v1: ela é servida
   com cache imutável de um ano (`next.config.ts`), e navegadores com a v1 em
   cache não baixariam a nova.
3. Rode `construir.sh` e copie o hash impresso para `MOTOR.sha256`.
4. Rode os testes: `npx vitest run src/lib/vetorizador` (o teste
   `vetorizadorMotor.test.ts` confere o hash, a ausência de imports e o teto de
   memória do arquivo publicado).
5. Se a medição de memória mudar, revise `PIXELS_MAXIMOS_DE_TRACADO`.
6. Apague o arquivo da versão anterior só depois que a nova estiver no ar.

---

## Créditos

O algoritmo é do VTracer, da Vision Cortex (autor do crate: Chris Tsang),
licenciado como MIT OR Apache-2.0. `src/lib.rs` reescreve o
`converter.rs` do VTracer 0.6.5 com as mudanças descritas acima.
