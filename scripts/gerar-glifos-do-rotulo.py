"""
Gera src/lib/glifosDoRotulo.ts: os glifos do rótulo do QR do Instagram como
caminhos SVG, mais avanços e kerning.

Por que caminho, e não <text> com fonte: o rótulo vai dentro de um SVG que é
baixado como arquivo e rasterizado em canvas para PNG e PDF. Uma fonte
referenciada não carrega em SVG lido como imagem, e quem abre o .svg no
Illustrator ou numa gráfica não tem a fonte instalada. Contorno não depende
de nada: sai igual na tela, no PNG, no PDF e no vetor.

Só entra o que um @ do Instagram pode ter em caixa alta — A–Z, 0–9, ponto e
sublinhado — e o próprio @. Cerca de 40 glifos; a fonte inteira seria 170 KB.

Uso (fora do app, só quando trocar fonte ou peso):

    python3 -m venv .venv && .venv/bin/pip install fonttools uharfbuzz
    curl -L -o Oswald.ttf "https://github.com/google/fonts/raw/main/ofl/oswald/Oswald%5Bwght%5D.ttf"
    .venv/bin/python scripts/gerar-glifos-do-rotulo.py Oswald.ttf 300 src/lib/glifosDoRotulo.ts
"""

import io
import json
import string
import sys

import uharfbuzz as hb
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

CARACTERES = string.ascii_uppercase + string.digits + "._@"


def main(origem: str, peso: int, destino: str) -> None:
    fonte = instancer.instantiateVariableFont(TTFont(origem), {"wght": peso})
    buffer = io.BytesIO()
    fonte.save(buffer)
    binario = buffer.getvalue()

    cmap = fonte.getBestCmap()
    glifos = fonte.getGlyphSet()
    metricas = fonte["hmtx"].metrics
    upm = fonte["head"].unitsPerEm
    altura_da_maiuscula = fonte["OS/2"].sCapHeight

    saida: dict[str, dict] = {}
    for caractere in CARACTERES:
        nome = cmap[ord(caractere)]
        caneta = SVGPathPen(glifos, ntos=lambda v: str(round(v)))
        # Fonte cresce para cima; SVG, para baixo. A linha de base fica em y=0.
        glifos[nome].draw(TransformPen(caneta, (1, 0, 0, -1, 0, 0)))
        limites = BoundsPen(glifos)
        glifos[nome].draw(limites)
        x_min, _, x_max, _ = limites.bounds
        saida[caractere] = {
            "d": caneta.getCommands(),
            "avanco": metricas[nome][0],
            "tinta": [round(x_min), round(x_max)],
        }

    # Kerning lido do shaping real (GPOS), par a par, e não da tabela `kern`
    # legada, que a Oswald nem tem.
    face = hb.Face(binario)
    hb_fonte = hb.Font(face)
    kerning: dict[str, int] = {}
    for a in CARACTERES:
        for b in CARACTERES:
            buf = hb.Buffer()
            buf.add_str(a + b)
            buf.guess_segment_properties()
            hb.shape(hb_fonte, buf, {"kern": True, "liga": False})
            ajuste = buf.glyph_positions[0].x_advance - saida[a]["avanco"]
            if ajuste:
                kerning[a + b] = ajuste

    with open(destino, "w", encoding="utf-8") as arquivo:
        arquivo.write(
            "// Gerado por scripts/gerar-glifos-do-rotulo.py — não edite à mão.\n"
            f"// Oswald, peso {peso}. SIL Open Font License 1.1 (public/fonts/oswald-LICENSE.txt).\n\n"
            "export interface Glifo {\n"
            "  /** Contorno com a linha de base em y=0 e o topo em y negativo. */\n"
            "  d: string;\n"
            "  avanco: number;\n"
            "  /** Onde o desenho começa e termina na horizontal: centra pela tinta, não pela caixa. */\n"
            "  tinta: readonly [number, number];\n"
            "}\n\n"
            f"export const UNIDADES_POR_EM = {upm};\n"
            f"export const ALTURA_DA_MAIUSCULA = {altura_da_maiuscula};\n\n"
            "export const GLIFOS: Readonly<Record<string, Glifo>> = {\n"
            + "".join(
                f'  {json.dumps(c)}: {{ d: {json.dumps(g["d"])}, avanco: {g["avanco"]}, tinta: {json.dumps(g["tinta"])} }},\n'
                for c, g in saida.items()
            )
            + "};\n\n"
            "/** Ajuste de avanço do primeiro caractere de cada par, em unidades da fonte. */\n"
            "export const KERNING: Readonly<Record<string, number>> = "
            + json.dumps(kerning, ensure_ascii=False, indent=2)
            + ";\n"
        )


if __name__ == "__main__":
    main(sys.argv[1], int(sys.argv[2]), sys.argv[3])
