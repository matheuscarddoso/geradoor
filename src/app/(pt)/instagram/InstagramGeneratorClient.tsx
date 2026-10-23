"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronDown, Loader } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DialogAcoes, DialogDestaque, DialogSelo } from "@/components/ui/dialog-parts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/shell/AppShell";
import { MarcaSvg } from "@/components/MarcaSvg";
import PhoneFrame from "@/components/whatsapp/PhoneFrame";
import { PerfilPreview } from "@/components/instagram/PerfilPreview";
import { EscolhaDeVariante, SeletorDeVariante } from "@/components/instagram/VariantesDoQr";
import { MAX_ARROBA, parseArroba, perfilUrl, type MotivoDoArroba } from "@/lib/instagram";
import { QrDownloadError, downloadQrCode, type QrFormat } from "@/lib/qrDownload";
import type { VarianteDoQr } from "@/lib/qrInstagram";
import { useRecentes } from "@/lib/recentes";
import { RestauradorDeQr, hrefRecente, useLimparQrDaUrl } from "@/lib/qrRecente";
import { cn } from "@/lib/utils";
import { useFerramentas } from "@/lib/useTextos";
import { preencher } from "@/lib/textosDasFerramentas";

/**
 * Largura do arquivo baixado, em px, antes da amostragem 4x do PNG: sai com
 * 1200 px de largura, o bastante para impressão em cartão e cartaz pequeno.
 * Fixa, e não lida da tela, porque no modal o código aparece em meia coluna.
 */
const LARGURA_DO_ARQUIVO = 300;

const InstagramGenerator: React.FC<{ titulo?: string; descricao?: string }> = ({
  titulo = "Gerador de QR Code do Instagram",
  descricao = "Crie um QR Code que abre o seu perfil. Basta informar o @ — quem escanear cai direto na sua página.",
}) => {
  const f = useFerramentas();

  /** O código que `parseArroba` devolve, dito na língua da página. */
  const motivoEmTexto = (motivo: MotivoDoArroba | undefined) => {
    switch (motivo) {
      case "vazio":
        return f.instagram.arrobaVazio;
      case "longo":
        return preencher(f.instagram.arrobaLongo, { max: MAX_ARROBA });
      case "caracteres":
        return f.instagram.arrobaCaracteres;
      case "ponto-na-ponta":
        return f.instagram.arrobaPontoNaPonta;
      case "pontos-seguidos":
        return f.instagram.arrobaPontosSeguidos;
      default:
        return undefined;
    }
  };
  const [arroba, setArroba] = useState("");
  const [tocado, setTocado] = useState(false);
  const [qrCodeValue, setQrCodeValue] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);

  // Clicar num recente reabre este modal com o QR daquele item.
  const limparQrDaUrl = useLimparQrDaUrl();
  const restaurarQr = useCallback((valor: string) => {
    setQrCodeValue(valor);
    setModalAberto(true);
  }, []);
  const [baixando, setBaixando] = useState<QrFormat | null>(null);
  const [variante, setVariante] = useState<VarianteDoQr>("gradiente");
  const svgs = useRef<Record<VarianteDoQr, SVGSVGElement | null>>({ preto: null, gradiente: null });
  const registrarSvg = useCallback((qual: VarianteDoQr, svg: SVGSVGElement | null) => {
    svgs.current[qual] = svg;
  }, []);
  const { registrar } = useRecentes();

  const perfil = useMemo(() => parseArroba(arroba), [arroba]);
  // Só acusa erro depois de sair do campo, para não brigar com quem digita.
  const mostrarErro = tocado && arroba.length > 0 && !perfil.ok;

  const handleGenerate = async () => {
    if (!perfil.ok || !perfil.usuario) {
      setTocado(true);
      toast.error(motivoEmTexto(perfil.motivo) ?? f.instagram.arrobaInvalido);
      return;
    }

    const shortcode = uuidv4().slice(0, 6);
    const baseUrl = "https://www.geradoor.com/";

    try {
      setCarregando(true);
      const resposta = await fetch("/api/qrcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: perfilUrl(perfil.usuario), shortcode }),
      });
      if (!resposta.ok) throw new Error(f.qr.erroAoCriar);

      const dados = await resposta.json();
      const criado = baseUrl + dados.shortcode;
      setQrCodeValue(criado);
      registrar({
        tipo: "instagram",
        label: `@${perfil.usuario}`,
        href: hrefRecente("/instagram", dados.shortcode),
      });
      toast.success(f.qr.criadoComSucesso);
    } catch (error) {
      console.error("Erro ao criar QR Code:", error);
      toast.error(f.qr.erroAoCriar);
    } finally {
      setCarregando(false);
    }
  };

  const handleDownload = async (format: QrFormat) => {
    try {
      setBaixando(format);
      await downloadQrCode({
        element: svgs.current[variante],
        format,
        filename: `instagram-${perfil.usuario ?? "perfil"}-${variante}`,
        width: LARGURA_DO_ARQUIVO,
      });
    } catch (error) {
      toast.error(
        error instanceof QrDownloadError
          ? error.message
          : f.qr.naoBaixou
      );
    } finally {
      setBaixando(null);
    }
  };

  const copiarLink = () => {
    if (!qrCodeValue) return;
    navigator.clipboard.writeText(qrCodeValue);
    toast.success(f.qr.linkCopiado);
  };

  return (
    <div className="flex h-full min-h-[620px] w-full">
      {/* Não desenha nada: lê a query e reabre o QR vindo de um recente.
          Fica aqui, e não em volta da página, para o <Suspense> dele não
          tirar o resto do conteúdo da geração estática. */}
      <RestauradorDeQr aoRestaurar={restaurarQr} />
      <div className="flex min-w-0 flex-1 flex-col justify-center px-6 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <PageHeader
            icone={<MarcaSvg id="instagram" />}
            title={titulo}
            description={descricao}
          />

          <div className="flex w-full flex-col gap-3">
            <div className="space-y-1.5">
              {/* O "@" é decoração do campo, não texto digitável: colar o
                  perfil inteiro também funciona, o parse cuida disso. */}
              <div className="relative max-w-[320px]">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 start-4 flex items-center text-sm text-subtle"
                >
                  @
                </span>
                <Input
                  type="text"
                  inputMode="text"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={MAX_ARROBA + 30}
                  placeholder={f.instagram.seuPerfil}
                  className={cn(
                    "bg-background ps-8",
                    mostrarErro &&
                      "border-red-500/70 focus-visible:ring-red-500/40"
                  )}
                  value={arroba}
                  onChange={(e) => {
                    setArroba(e.target.value);
                    setQrCodeValue(null);
                  }}
                  onBlur={() => setTocado(true)}
                  onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                  aria-invalid={mostrarErro}
                  aria-describedby={mostrarErro ? "arroba-erro" : undefined}
                />
              </div>
              {mostrarErro && (
                <p id="arroba-erro" role="alert" className="text-xs text-red-500">
                  {motivoEmTexto(perfil.motivo)}
                </p>
              )}
            </div>

            <div className="mt-2 space-y-2.5">
              <p className="text-sm font-medium leading-none">{f.instagram.estilo}</p>
              <SeletorDeVariante valor={variante} onChange={setVariante} />
              <p className="text-xs text-subtle">{f.instagram.estiloDica}</p>
            </div>

            <Dialog
              open={modalAberto}
              onOpenChange={(aberto) => {
                setModalAberto(aberto);
                if (!aberto) limparQrDaUrl();
              }}
            >
              <DialogTrigger asChild>
                <Button
                  className="mt-4 w-full"
                  onClick={handleGenerate}
                  disabled={!perfil.ok || carregando}
                >{f.instagram.gerarQr}</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[440px]">
                {carregando ? (
                  /* O DialogTitle precisa existir em TODO estado: o Radix o
                     usa como nome acessível do diálogo e avisa quando falta.
                     Antes ele vivia só no ramo de sucesso, e o modal abria sem
                     título nenhum enquanto carregava. */
                  <>
                    <Loader className="mx-auto h-11 w-11 animate-spin p-2 text-subtle" />
                    <DialogHeader>
                      <DialogTitle>{f.instagram.criandoQr}</DialogTitle>
                      <DialogDescription>{f.instagram.gerandoPerfil}</DialogDescription>
                    </DialogHeader>
                  </>
                ) : (
                  <>
                    <DialogSelo variante="sucesso" />
                    <DialogHeader>
                      <DialogTitle>{f.instagram.qrCriado}</DialogTitle>
                      <DialogDescription>{f.instagram.qrCriadoTexto}</DialogDescription>
                    </DialogHeader>

                    <DialogDestaque>
                      <Link
                        href={qrCodeValue ?? ""}
                        target="_blank"
                        className="truncate hover:underline"
                      >
                        {qrCodeValue}
                      </Link>
                    </DialogDestaque>

                    {qrCodeValue && (
                      <EscolhaDeVariante
                        valor={variante}
                        onChange={setVariante}
                        valorDoQr={qrCodeValue}
                        usuario={perfil.usuario}
                        registrar={registrarSvg}
                      />
                    )}

                    <DialogAcoes>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="secondary" disabled={baixando !== null}>
                            {baixando ? (
                              <Loader className="h-4 w-4 animate-spin" />
                            ) : (
                              <>{f.comum.baixar}<ChevronDown className="ms-1 h-4 w-4 opacity-60" />
                              </>
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="center" className="min-w-[9rem]">
                          <DropdownMenuItem onClick={() => handleDownload("png")}>
                            PNG<span className="ms-auto text-xs text-subtle">{f.qr.imagemMinuscula}</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownload("pdf")}>
                            PDF<span className="ms-auto text-xs text-subtle">{f.qr.impressao}</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownload("svg")}>
                            SVG<span className="ms-auto text-xs text-subtle">{f.qr.vetor}</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <Button onClick={copiarLink}>{f.qr.copiarLink}</Button>
                    </DialogAcoes>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Painel da prévia, mesmo wireframe do WhatsApp */}
      <div className="hidden w-[46%] shrink-0 py-3 pe-3 md:block">
        <div className="relative h-full w-full overflow-hidden rounded-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element -- fundo decorativo */}
          <img
            src="/preview-bg.webp"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
          />
          {/* Centralizado nos dois eixos. A 56% da largura o aparelho inteiro
              cabe na altura do painel sem cortar, então `recorte="inteiro"`
              desenha o device completo e nada é aparado. */}
          <PhoneFrame
            recorte="inteiro"
            className="absolute left-1/2 top-1/2 w-[56%] -translate-x-1/2 -translate-y-1/2"
          >
            <PerfilPreview usuario={perfil.usuario ?? ""} variante={variante} />
          </PhoneFrame>
        </div>
      </div>
    </div>
  );
};

export default InstagramGenerator;
