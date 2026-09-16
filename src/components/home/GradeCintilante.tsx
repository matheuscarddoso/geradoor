"use client";

import { useEffect, useRef } from "react";

/**
 * Uma grade de quadradinhos que piscam, desenhada em canvas.
 *
 * É o fundo do bloco que fecha a home. A ideia vem do `flickering-grid` do
 * Magic UI; a implementação é própria, porque o efeito cabe em cem linhas e não
 * justifica uma dependência.
 *
 * Três cuidados que a versão ingênua não tem:
 *
 * - **Só redesenha o que muda.** A cada quadro, apenas uma fração dos quadrados
 *   sorteia opacidade nova; o resto fica como está. Sem isso o laço vira um
 *   `for` sobre milhares de células a 60 Hz, e o ventilador liga.
 * - **Respeita quem pediu menos movimento.** Com `prefers-reduced-motion`, a
 *   grade é desenhada uma vez e para. Continua sendo textura, deixa de ser
 *   animação.
 * - **Para quando sai da tela.** Um IntersectionObserver suspende o laço quando
 *   o bloco não está visível — o rodapé fica embaixo de tudo, e animar o que
 *   ninguém vê é só gastar bateria.
 */
export function GradeCintilante({
  ladoDoQuadrado = 4,
  espaco = 6,
  chanceDePiscar = 0.3,
  cor = "255, 255, 255",
  opacidadeMaxima = 0.25,
  className,
}: {
  ladoDoQuadrado?: number;
  espaco?: number;
  /** Fração dos quadrados que sorteia opacidade nova a cada segundo. */
  chanceDePiscar?: number;
  /** A cor em "r, g, b" — entra num rgba, então sem # aqui. */
  cor?: string;
  opacidadeMaxima?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const pai = canvas?.parentElement;
    if (!canvas || !pai) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const semMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const passo = ladoDoQuadrado + espaco;

    let colunas = 0;
    let linhas = 0;
    let opacidades = new Float32Array(0);
    let quadro = 0;
    let visivel = true;
    let ultimo = performance.now();

    function dimensionar() {
      if (!canvas || !pai || !ctx) return;
      const escala = Math.min(window.devicePixelRatio || 1, 2);
      const largura = pai.clientWidth;
      const altura = pai.clientHeight;

      canvas.width = Math.floor(largura * escala);
      canvas.height = Math.floor(altura * escala);
      canvas.style.width = `${largura}px`;
      canvas.style.height = `${altura}px`;
      ctx.setTransform(escala, 0, 0, escala, 0, 0);

      colunas = Math.ceil(largura / passo);
      linhas = Math.ceil(altura / passo);
      opacidades = new Float32Array(colunas * linhas);
      for (let i = 0; i < opacidades.length; i++) opacidades[i] = Math.random() * opacidadeMaxima;
      desenhar();
    }

    function desenhar() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let c = 0; c < colunas; c++) {
        for (let l = 0; l < linhas; l++) {
          ctx.fillStyle = `rgba(${cor}, ${opacidades[c * linhas + l]})`;
          ctx.fillRect(c * passo, l * passo, ladoDoQuadrado, ladoDoQuadrado);
        }
      }
    }

    function animar(agora: number) {
      const delta = Math.min((agora - ultimo) / 1000, 0.1);
      ultimo = agora;

      if (visivel) {
        const quantos = Math.floor(opacidades.length * chanceDePiscar * delta);
        for (let i = 0; i < quantos; i++) {
          opacidades[Math.floor(Math.random() * opacidades.length)] = Math.random() * opacidadeMaxima;
        }
        desenhar();
      }
      quadro = requestAnimationFrame(animar);
    }

    const observador = new ResizeObserver(dimensionar);
    observador.observe(pai);

    const naTela = new IntersectionObserver(([entrada]) => {
      visivel = entrada.isIntersecting;
    });
    naTela.observe(pai);

    dimensionar();
    if (!semMovimento) quadro = requestAnimationFrame(animar);

    return () => {
      cancelAnimationFrame(quadro);
      observador.disconnect();
      naTela.disconnect();
    };
  }, [ladoDoQuadrado, espaco, chanceDePiscar, cor, opacidadeMaxima]);

  return <canvas ref={canvasRef} aria-hidden="true" className={className} />;
}
