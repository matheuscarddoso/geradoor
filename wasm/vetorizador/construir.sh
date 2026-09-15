#!/usr/bin/env bash
# Recompila o motor e publica em public/wasm.
#
# Pré-requisito, uma vez por máquina: rustup target add wasm32-unknown-unknown
# O .wasm publicado vai para o git: a Vercel não tem Rust, e o arquivo servido
# precisa ser exatamente o que foi conferido. Depois de rodar, atualize o
# sha256 em src/lib/vetorizador.ts (MOTOR) com o valor impresso no fim.
set -euo pipefail
cd "$(dirname "$0")"
# -j 2: a compilação não disputa a máquina inteira com o resto.
cargo build --release -j 2
destino=../../public/wasm/vetorizador-v2.wasm
mkdir -p "$(dirname "$destino")"
cp target/wasm32-unknown-unknown/release/vetorizador.wasm "$destino"
shasum -a 256 "$destino"
