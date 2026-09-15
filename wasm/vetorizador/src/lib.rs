//! Motor de vetorização do Geradoor.
//!
//! É o conversor do VTracer (visioncortex/vtracer, `src/converter.rs` da versão
//! 0.6.5, MIT OR Apache-2.0) sobre a biblioteca `visioncortex`, com três
//! mudanças deliberadas:
//!
//! - **Sem glue de JavaScript.** Nada de wasm-bindgen: o módulo não importa
//!   nada e exporta meia dúzia de funções numéricas. O mesmo `.wasm` roda no
//!   worker do navegador e nos testes em Node, e não há dependência de
//!   ferramenta de build além do `rustup`.
//! - **Determinístico.** O VTracer sorteia a cor-chave da transparência com
//!   `fastrand`; aqui a busca é por uma sequência fixa. A mesma imagem com os
//!   mesmos parâmetros dá sempre o mesmo SVG.
//! - **Só os caminhos.** O cabeçalho do SVG (tamanho, viewBox) é montado do
//!   lado de lá, que sabe o tamanho original da foto; daqui saem só os
//!   elementos `<path>`, na ordem de empilhamento.
//!
//! Protocolo, do ponto de vista de quem chama:
//!
//! 1. `alocar(n)` reserva `n` bytes e devolve o ponteiro; quem chama escreve
//!    os pixels RGBA ali.
//! 2. `vetorizar(ponteiro, n, largura, altura, …)` consome esse buffer — ele é
//!    liberado aqui dentro, não chame `liberar` depois — e devolve 0 no
//!    sucesso ou um código negativo.
//! 3. `resultado_ponteiro()` e `resultado_tamanho()` apontam o texto UTF-8 dos
//!    caminhos; `caminhos()` diz quantos são. O resultado vale até a próxima
//!    chamada de `vetorizar`.

use std::cell::RefCell;

use visioncortex::color_clusters::{KeyingAction, Runner, RunnerConfig, HIERARCHICAL_MAX};
use visioncortex::{Color, ColorImage, ColorName, PathSimplifyMode, PointF64};

thread_local! {
    static RESULTADO: RefCell<Vec<u8>> = const { RefCell::new(Vec::new()) };
    static CAMINHOS: RefCell<u32> = const { RefCell::new(0) };
}

/// Fração de pixels transparentes, nas linhas amostradas, a partir da qual a
/// transparência é recortada. A mesma do VTracer.
const LIMIAR_DE_TRANSPARENCIA: f32 = 0.2;

pub const OK: i32 = 0;
pub const ERRO_PARAMETROS: i32 = -1;
pub const ERRO_SEM_COR_CHAVE: i32 = -2;

/// Parâmetros do conversor, já nas unidades do visioncortex.
#[derive(Debug, Clone, Copy)]
pub struct Parametros {
    /// Traço em preto e branco (vermelho < 128 é tinta) em vez de cores.
    pub binario: bool,
    /// Camadas recortadas umas das outras em vez de empilhadas.
    pub recortado: bool,
    pub modo: PathSimplifyMode,
    /// Menor área de mancha mantida, em pixels (lado ao quadrado).
    pub area_minima: usize,
    /// Bits de cor descartados na comparação (8 − precisão).
    pub perda_de_cor: i32,
    pub diferenca_de_camada: i32,
    pub angulo_de_canto: f64,
    pub comprimento_minimo: f64,
    pub iteracoes: usize,
    pub angulo_de_emenda: f64,
    pub casas_decimais: u32,
}

/// Reserva `tamanho` bytes no heap do módulo.
#[no_mangle]
pub extern "C" fn alocar(tamanho: usize) -> *mut u8 {
    // Boxed slice, e não `Vec::with_capacity`: a capacidade fica exatamente
    // igual ao tamanho, que é o que `vetorizar` presume ao retomar o buffer.
    Box::into_raw(vec![0u8; tamanho].into_boxed_slice()) as *mut u8
}

/// Devolve um buffer de `alocar` que não chegou a ser passado a `vetorizar`.
///
/// # Safety
/// `ponteiro` e `tamanho` precisam ser exatamente os de uma chamada a `alocar`.
#[no_mangle]
pub unsafe extern "C" fn liberar(ponteiro: *mut u8, tamanho: usize) {
    if !ponteiro.is_null() {
        drop(Box::from_raw(std::ptr::slice_from_raw_parts_mut(ponteiro, tamanho)));
    }
}

#[no_mangle]
pub extern "C" fn resultado_ponteiro() -> *const u8 {
    RESULTADO.with(|r| r.borrow().as_ptr())
}

#[no_mangle]
pub extern "C" fn resultado_tamanho() -> usize {
    RESULTADO.with(|r| r.borrow().len())
}

#[no_mangle]
pub extern "C" fn caminhos() -> u32 {
    CAMINHOS.with(|c| *c.borrow())
}

/// Vetoriza os pixels RGBA em `ponteiro`.
///
/// # Safety
/// `ponteiro` e `tamanho` precisam vir de `alocar`, e `tamanho` precisa ser
/// `largura × altura × 4`. O buffer é consumido.
#[no_mangle]
#[allow(clippy::too_many_arguments)]
pub unsafe extern "C" fn vetorizar(
    ponteiro: *mut u8,
    tamanho: usize,
    largura: usize,
    altura: usize,
    binario: u32,
    recortado: u32,
    modo: u32,
    lado_da_mancha: u32,
    precisao_de_cor: i32,
    diferenca_de_camada: i32,
    angulo_de_canto_graus: i32,
    comprimento_minimo: f64,
    iteracoes: u32,
    angulo_de_emenda_graus: i32,
    casas_decimais: u32,
) -> i32 {
    let pixels = Box::from_raw(std::ptr::slice_from_raw_parts_mut(ponteiro, tamanho)).into_vec();
    RESULTADO.with(|r| r.borrow_mut().clear());
    CAMINHOS.with(|c| *c.borrow_mut() = 0);

    let modo = match modo {
        0 => PathSimplifyMode::None,
        1 => PathSimplifyMode::Polygon,
        2 => PathSimplifyMode::Spline,
        _ => return ERRO_PARAMETROS,
    };
    if largura == 0 || altura == 0 || largura.checked_mul(altura).and_then(|a| a.checked_mul(4)) != Some(tamanho) {
        return ERRO_PARAMETROS;
    }
    if !(1..=8).contains(&precisao_de_cor) || diferenca_de_camada < 0 || iteracoes == 0 {
        return ERRO_PARAMETROS;
    }

    let parametros = Parametros {
        binario: binario != 0,
        recortado: recortado != 0,
        modo,
        area_minima: (lado_da_mancha as usize).saturating_mul(lado_da_mancha as usize),
        perda_de_cor: 8 - precisao_de_cor,
        diferenca_de_camada,
        angulo_de_canto: (angulo_de_canto_graus as f64).to_radians(),
        comprimento_minimo,
        iteracoes: iteracoes as usize,
        angulo_de_emenda: (angulo_de_emenda_graus as f64).to_radians(),
        casas_decimais,
    };

    let imagem = ColorImage { pixels, width: largura, height: altura };
    match converter(imagem, &parametros) {
        Ok((texto, total)) => {
            RESULTADO.with(|r| *r.borrow_mut() = texto.into_bytes());
            CAMINHOS.with(|c| *c.borrow_mut() = total);
            OK
        }
        Err(codigo) => codigo,
    }
}

/// O SVG em texto (só os `<path>`) e quantos caminhos ele tem.
pub fn converter(imagem: ColorImage, parametros: &Parametros) -> Result<(String, u32), i32> {
    if parametros.binario {
        Ok(binario(imagem, parametros))
    } else {
        colorido(imagem, parametros)
    }
}

fn escrever_caminho(saida: &mut String, caminho: &visioncortex::CompoundPath, cor: &Color, casas: u32) {
    use std::fmt::Write;
    let (d, deslocamento) = caminho.to_svg_string(true, PointF64::default(), Some(casas));
    // `write!` numa String não falha.
    let _ = write!(
        saida,
        "<path d=\"{}\" fill=\"{}\" transform=\"translate({},{})\"/>",
        d,
        cor.to_hex_string(),
        deslocamento.x,
        deslocamento.y
    );
}

fn deve_recortar_transparencia(imagem: &ColorImage) -> bool {
    let limiar = ((imagem.width * 2) as f32 * LIMIAR_DE_TRANSPARENCIA) as usize;
    let mut transparentes = 0;
    let linhas = [0, imagem.height / 4, imagem.height / 2, 3 * imagem.height / 4, imagem.height - 1];
    for y in linhas {
        for x in 0..imagem.width {
            if imagem.get_pixel(x, y).a == 0 {
                transparentes += 1;
                if transparentes >= limiar {
                    return true;
                }
            }
        }
    }
    false
}

fn cor_existe(imagem: &ColorImage, cor: Color) -> bool {
    imagem
        .pixels
        .chunks_exact(4)
        .any(|p| p[0] == cor.r && p[1] == cor.g && p[2] == cor.b)
}

/// Uma cor que não aparece na imagem, para marcar os pixels transparentes.
///
/// Primeiro as cores puras, depois uma sequência pseudoaleatória de semente
/// fixa — e não sorteada, como no VTracer, para o resultado ser reproduzível.
fn cor_chave(imagem: &ColorImage) -> Option<Color> {
    let puras = [
        Color::new(255, 0, 255),
        Color::new(0, 255, 0),
        Color::new(0, 0, 255),
        Color::new(255, 0, 0),
        Color::new(0, 255, 255),
        Color::new(255, 255, 0),
    ];
    if let Some(cor) = puras.into_iter().find(|&c| !cor_existe(imagem, c)) {
        return Some(cor);
    }
    let mut estado: u32 = 0x9E37_79B9;
    (0..64).find_map(|_| {
        // xorshift32
        estado ^= estado << 13;
        estado ^= estado >> 17;
        estado ^= estado << 5;
        let cor = Color::new((estado >> 16) as u8, (estado >> 8) as u8, estado as u8);
        (!cor_existe(imagem, cor)).then_some(cor)
    })
}

fn colorido(mut imagem: ColorImage, p: &Parametros) -> Result<(String, u32), i32> {
    let largura = imagem.width;
    let altura = imagem.height;

    let chave = if deve_recortar_transparencia(&imagem) {
        let chave = cor_chave(&imagem).ok_or(ERRO_SEM_COR_CHAVE)?;
        for pixel in imagem.pixels.chunks_exact_mut(4) {
            if pixel[3] == 0 {
                pixel[0] = chave.r;
                pixel[1] = chave.g;
                pixel[2] = chave.b;
                pixel[3] = 255;
            }
        }
        chave
    } else {
        // Tudo zero é o valor especial do visioncortex para "sem chave".
        Color::default()
    };

    let mut clusters = Runner::new(
        RunnerConfig {
            diagonal: p.diferenca_de_camada == 0,
            hierarchical: HIERARCHICAL_MAX,
            batch_size: 25600,
            good_min_area: p.area_minima,
            good_max_area: largura * altura,
            is_same_color_a: p.perda_de_cor,
            is_same_color_b: 1,
            deepen_diff: p.diferenca_de_camada,
            hollow_neighbours: 1,
            key_color: chave,
            keying_action: if p.recortado { KeyingAction::Keep } else { KeyingAction::Discard },
        },
        imagem,
    )
    .run();

    if p.recortado {
        let imagem = clusters.view().to_color_image();
        let area = imagem.width * imagem.height;
        clusters = Runner::new(
            RunnerConfig {
                diagonal: false,
                hierarchical: 64,
                batch_size: 25600,
                good_min_area: 0,
                good_max_area: area,
                is_same_color_a: 0,
                is_same_color_b: 1,
                deepen_diff: 0,
                hollow_neighbours: 0,
                key_color: chave,
                keying_action: KeyingAction::Discard,
            },
            imagem,
        )
        .run();
    }

    let vista = clusters.view();
    let mut saida = String::new();
    let mut total = 0u32;
    for &indice in vista.clusters_output.iter().rev() {
        let cluster = vista.get_cluster(indice);
        let caminho = cluster.to_compound_path(
            &vista,
            false,
            p.modo,
            p.angulo_de_canto,
            p.comprimento_minimo,
            p.iteracoes,
            p.angulo_de_emenda,
        );
        escrever_caminho(&mut saida, &caminho, &cluster.residue_color(), p.casas_decimais);
        total += 1;
    }
    Ok((saida, total))
}

fn binario(imagem: ColorImage, p: &Parametros) -> (String, u32) {
    let imagem = imagem.to_binary_image(|c| c.r < 128);
    let clusters = imagem.to_clusters(false);
    let preto = Color::color(&ColorName::Black);
    let mut saida = String::new();
    let mut total = 0u32;
    for i in 0..clusters.len() {
        let cluster = clusters.get_cluster(i);
        if cluster.size() >= p.area_minima {
            let caminho = cluster.to_compound_path(
                p.modo,
                p.angulo_de_canto,
                p.comprimento_minimo,
                p.iteracoes,
                p.angulo_de_emenda,
            );
            escrever_caminho(&mut saida, &caminho, &preto, p.casas_decimais);
            total += 1;
        }
    }
    (saida, total)
}
