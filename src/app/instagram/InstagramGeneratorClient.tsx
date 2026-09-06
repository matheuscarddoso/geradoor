"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { ChevronDown, Loader } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DialogAcoes,
  DialogDestaque,
  DialogSelo,
  DialogSuperficie,
} from "@/components/ui/dialog-parts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/shell/AppShell";
import PhoneFrame from "@/components/whatsapp/PhoneFrame";
import { PerfilPreview } from "@/components/instagram/PerfilPreview";
import { LOGO_PRESETS, presetMarkup } from "@/components/qr/presets";
import { rasterizeSvgMarkup } from "@/lib/image";
import { MAX_ARROBA, parseArroba, perfilUrl } from "@/lib/instagram";
import { QrDownloadError, downloadQrCode, type QrFormat } from "@/lib/qrDownload";
import { useRecentes } from "@/lib/recentes";
import { cn } from "@/lib/utils";

const QR_RENDER_SIZE = 200;
const LOGO_SCALE = 0.22;

const InstagramGenerator: React.FC = () => {
  const [arroba, setArroba] = useState("");
  const [tocado, setTocado] = useState(false);
  const [qrCodeValue, setQrCodeValue] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [baixando, setBaixando] = useState<QrFormat | null>(null);
  const [usarLogo, setUsarLogo] = useState(true);
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();
  const { registrar } = useRecentes();

  const perfil = useMemo(() => parseArroba(arroba), [arroba]);
  // Só acusa erro depois de sair do campo, para não brigar com quem digita.
  const mostrarErro = tocado && arroba.length > 0 && !perfil.ok;

  /**
   * A marca entra no QR como PNG data URL, não como SVG.
   *
   * O download desenha o SVG do código num canvas, e um <image> apontando para
   * SVG aninhado não carrega quando o externo é lido como imagem — a marca
   * sumiria do arquivo baixado.
   */
  useEffect(() => {
    if (!usarLogo || logoSrc) return;
    const preset = LOGO_PRESETS.find((item) => item.id === "instagram");
    if (!preset) return;

    let ativo = true;
    rasterizeSvgMarkup(presetMarkup(preset))
      .then((src) => ativo && setLogoSrc(src))
      .catch(() => {
        if (!ativo) return;
        toast.error("Não foi possível carregar o ícone do Instagram");
        setUsarLogo(false);
      });
    return () => {
      ativo = false;
    };
  }, [usarLogo, logoSrc]);

  const logoAtivo = usarLogo && logoSrc !== null;
  const imageSettings = logoAtivo
    ? {
        src: logoSrc,
        height: Math.round(QR_RENDER_SIZE * LOGO_SCALE),
        width: Math.round(QR_RENDER_SIZE * LOGO_SCALE),
        excavate: true,
      }
    : undefined;

  const handleGenerate = async () => {
    if (!perfil.ok || !perfil.usuario) {
      setTocado(true);
      toast.error(perfil.motivo ?? "Esse @ não é válido");
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
      if (!resposta.ok) throw new Error("Erro ao criar QR Code");

      const dados = await resposta.json();
      const criado = baseUrl + dados.shortcode;
      setQrCodeValue(criado);
      registrar({ tipo: "instagram", label: `@${perfil.usuario}`, href: "/instagram" });
      toast.success("QR Code criado com sucesso!");
    } catch (error) {
      console.error("Erro ao criar QR Code:", error);
      toast.error("Erro ao criar QR Code");
    } finally {
      setCarregando(false);
    }
  };

  const handleDownload = async (format: QrFormat) => {
    try {
      setBaixando(format);
      await downloadQrCode({
        element: document.querySelector<SVGElement>(".qrcode-svg"),
        format,
        filename: `instagram-${perfil.usuario ?? "perfil"}`,
      });
    } catch (error) {
      toast.error(
        error instanceof QrDownloadError
          ? error.message
          : "Não foi possível baixar o QR Code"
      );
    } finally {
      setBaixando(null);
    }
  };

  const copiarLink = () => {
    if (!qrCodeValue) return;
    navigator.clipboard.writeText(qrCodeValue);
    toast.success("Link copiado!");
  };

  return (
    <div className="flex h-full min-h-[620px] w-full">
      <div className="flex min-w-0 flex-1 flex-col justify-center px-6 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <PageHeader
            title="Gerador de QR Code do Instagram"
            description="Crie um QR Code que abre o seu perfil. Basta informar o @ — quem escanear cai direto na sua página."
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
                  placeholder="seu.perfil"
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
                  {perfil.motivo}
                </p>
              )}
            </div>

            <div className="mt-2 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <Label htmlFor="logo-instagram" className="text-sm font-medium leading-none">
                  Ícone do Instagram no centro
                </Label>
                <p className="mt-1 text-xs text-subtle">
                  A marca aparece no meio do QR Code
                </p>
              </div>
              <Switch
                id="logo-instagram"
                checked={usarLogo}
                onCheckedChange={setUsarLogo}
                aria-label="Usar o ícone do Instagram no centro do QR Code"
              />
            </div>

            <Dialog>
              <DialogTrigger asChild>
                <Button
                  className="mt-4 w-full"
                  onClick={handleGenerate}
                  disabled={!perfil.ok || carregando}
                >
                  Gerar meu QR Code
                </Button>
              </DialogTrigger>
              <DialogContent>
                {carregando ? (
                  <div className="flex flex-col items-center gap-4 py-8">
                    <Loader className="h-5 w-5 animate-spin text-subtle" />
                    <p className="text-sm text-subtle">Criando seu QR Code...</p>
                  </div>
                ) : (
                  <>
                    <DialogSelo variante="sucesso" />
                    <DialogHeader>
                      <DialogTitle>QR Code criado</DialogTitle>
                      <DialogDescription>
                        Quem escanear vai direto para o seu perfil no Instagram.
                      </DialogDescription>
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

                    <DialogSuperficie className="flex justify-center py-5">
                      <QRCodeSVG
                        className="qrcode-svg"
                        value={qrCodeValue ?? ""}
                        size={QR_RENDER_SIZE}
                        /* 4 módulos de quiet zone, como pede a especificação;
                           o padrão da biblioteca é 0 e leitores falham. */
                        marginSize={4}
                        /* Nível H recupera ~30% dos módulos e é o que permite
                           cobrir o centro com a marca. */
                        level={logoAtivo ? "H" : "L"}
                        imageSettings={imageSettings}
                        fgColor={resolvedTheme === "dark" ? "white" : "black"}
                        bgColor={resolvedTheme === "dark" ? "black" : "white"}
                      />
                    </DialogSuperficie>

                    <DialogAcoes>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="secondary" disabled={baixando !== null}>
                            {baixando ? (
                              <Loader className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                Baixar
                                <ChevronDown className="ms-1 h-4 w-4 opacity-60" />
                              </>
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="center" className="min-w-[9rem]">
                          <DropdownMenuItem onClick={() => handleDownload("png")}>
                            PNG<span className="ms-auto text-xs text-subtle">imagem</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownload("pdf")}>
                            PDF<span className="ms-auto text-xs text-subtle">impressão</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownload("svg")}>
                            SVG<span className="ms-auto text-xs text-subtle">vetor</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <Button onClick={copiarLink}>Copiar link</Button>
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
          <PhoneFrame
            recorte="inteiro"
            className="absolute bottom-[-10%] left-1/2 w-[64%] -translate-x-1/2"
          >
            <PerfilPreview usuario={perfil.usuario ?? ""} />
          </PhoneFrame>
        </div>
      </div>
    </div>
  );
};

export default InstagramGenerator;
