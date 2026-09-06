"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { PageHeader } from "@/components/shell/AppShell";
import { useRecentes } from "@/lib/recentes";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Loader } from "lucide-react";
import { cn } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";
import LogoPicker, { DEFAULT_LOGO, type LogoConfig } from "@/components/qr/LogoPicker";
import { QrDownloadError, downloadQrCode, type QrFormat } from "@/lib/qrDownload";
import DecorativeQR from "@/components/qr/DecorativeQR";
import { parseLink } from "@/lib/link";

const PLACEHOLDER_URL = "https://geradoor.com";
const QR_SIZE = 180;
const QUIET_ZONE = 4;

const QRCodeGenerator: React.FC = () => {
  const [inputValue, setInputValue] = useState<string>("");
  const [qrCodeValue, setQrCodeValue] = useState<string | null>(null);
  const [loadingQrCode, setLoadingQrCode] = useState<boolean>(false);
  const [logo, setLogo] = useState<LogoConfig>(DEFAULT_LOGO);
  const [touched, setTouched] = useState(false);
  const { registrar } = useRecentes();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setQrCodeValue(null);
  };

  const link = useMemo(() => parseLink(inputValue), [inputValue]);
  // Só acusa erro depois que o campo perdeu o foco, para não brigar com quem
  // ainda está no meio de digitar o endereço.
  const showError = touched && inputValue.length > 0 && !link.ok;

  const handleGenerate = async () => {
    if (!inputValue) {
      toast.error("Por favor, preencha o link antes de gerar o QR Code");
      return;
    }

    if (!link.ok || !link.url) {
      setTouched(true);
      toast.error(link.reason ?? "Esse link não é válido");
      return;
    }

    const url = link.url;

    const shortcode = uuidv4().slice(0, 6);
    const baseUrl = "https://www.geradoor.com/";

    try {
      setLoadingQrCode(true);
      const response = await fetch("/api/qrcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, shortcode }),
      });

      if (!response.ok) throw new Error("Erro ao criar QR Code");

      const data = await response.json();
      const criado = baseUrl + data.shortcode;
      setQrCodeValue(criado);
      registrar({ tipo: "qrcode", label: criado, href: "/qr-code" });
      toast.success("QR Code criado com sucesso!");
    } catch (error) {
      console.error("Erro ao criar QR Code:", error);
      toast.error("Erro ao criar QR Code");
    } finally {
      setLoadingQrCode(false);
    }
  };

  const [baixando, setBaixando] = useState<QrFormat | null>(null);

  const handleDownload = async (format: QrFormat) => {
    try {
      setBaixando(format);
      await downloadQrCode({
        element: document.querySelector<SVGElement>(".qrcode-svg"),
        format,
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

  const copyLink = () => {
    if (!qrCodeValue) return;
    navigator.clipboard.writeText(qrCodeValue);
    toast.success("Link copiado!");
  };

  return (
    /* Mesmo wireframe do /whatsapp: a página recebe a área crua do shell
       (SEM_MOLDURA) e o painel da direita encosta na borda. */
    <div className="flex h-full min-h-[620px] w-full">
      <div className="flex min-w-0 flex-1 flex-col justify-center px-6 py-10 sm:px-10">
        <div className="w-full max-w-md">
      <PageHeader
        title="Gerador de QR Code"
        description="Crie um QR Code a partir de qualquer link, com a sua logo no centro. Baixe em PNG, PDF ou SVG."
      />

      <div className="flex w-full flex-col space-y-4">
            <div className="space-y-1.5">
              <Input
                type="url"
                inputMode="url"
                autoComplete="url"
                placeholder="https://"
                className={cn(
                  "bg-background",
                  showError &&
                    "border-red-500/70 focus-visible:ring-red-500/40 dark:border-red-500/60"
                )}
                value={inputValue}
                onChange={handleInputChange}
                onBlur={() => setTouched(true)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                aria-invalid={showError}
                aria-describedby={showError ? "link-erro" : undefined}
              />
              <AnimatePresence initial={false}>
                {showError && (
                  <motion.p
                    key="link-erro"
                    id="link-erro"
                    role="alert"
                    initial={{ opacity: 0, transform: "translateY(-2px)" }}
                    animate={{ opacity: 1, transform: "translateY(0px)" }}
                    exit={{ opacity: 0, transform: "translateY(-2px)" }}
                    transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
                    className="text-xs text-red-500 dark:text-red-400"
                  >
                    {link.reason}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
            <LogoPicker value={logo} onChange={setLogo} disabled={loadingQrCode} />

            <Button
              className="w-full"
              onClick={handleGenerate}
              disabled={!link.ok || loadingQrCode}
            >
              {loadingQrCode ? <Loader className="animate-spin h-4 w-4" /> : "Criar QRCode"}
            </Button>
          </div>

      </div>
      </div>

      {/* Painel do QR: altura toda, encostado na borda direita */}
      <div className="hidden w-[46%] shrink-0 py-3 pe-3 md:block">
        <div className="relative flex h-full w-full flex-col items-center justify-center gap-5 overflow-hidden rounded-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element -- fundo decorativo */}
          <img
            src="/preview-bg.webp"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
          />
          <div className="relative flex flex-col items-center gap-5">

            {/* QR code — decorativo enquanto não foi criado */}
            <div className="relative overflow-hidden">
              <div className="bg-white p-5 overflow-hidden">
                {qrCodeValue ? (
                  <QRCodeSVG
                    value={qrCodeValue}
                    size={QR_SIZE}
                    className="qrcode-svg"
                    /* 4 módulos de quiet zone, como pede a especificação.
                       O padrão do qrcode.react é 0. */
                    marginSize={QUIET_ZONE}
                    /* Nível H recupera ~30% dos módulos e é o que permite cobrir
                       o centro com o logo. Sem logo, mantém o nível padrão para
                       não alterar a densidade dos códigos já existentes. */
                    level={logo.src ? "H" : "L"}
                    imageSettings={
                      logo.src
                        ? {
                            src: logo.src,
                            height: Math.round(QR_SIZE * logo.scale),
                            width: Math.round(QR_SIZE * logo.scale),
                            excavate: true,
                          }
                        : undefined
                    }
                  />
                ) : (
                  <div className="relative text-zinc-900">
                    <DecorativeQR seed={inputValue} size={QR_SIZE} />
                    {logo.src && (
                      // eslint-disable-next-line @next/next/no-img-element -- data URL gerado no cliente, next/image não se aplica
                      <img
                        src={logo.src}
                        alt=""
                        style={{
                          width: QR_SIZE * logo.scale,
                          height: QR_SIZE * logo.scale,
                        }}
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                      />
                    )}
                  </div>
                )}
              </div>

              <AnimatePresence>
                {loadingQrCode && (
                  <motion.div
                    key="loading"
                    className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
                  >
                    <Loader className="animate-spin h-5 w-5 text-zinc-900" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Deixa explícito que o desenho acima não é escaneável ainda */}
            <AnimatePresence initial={false}>
              {!qrCodeValue && (
                <motion.p
                  key="preview-label"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
                  className="text-xs text-zinc-500 dark:text-zinc-400 text-center max-w-[220px] leading-relaxed"
                >
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    Prévia ilustrativa
                  </span>
                  <br />
                  Este desenho não é escaneável. Clique em criar para gerar o
                  código real.
                </motion.p>
              )}
            </AnimatePresence>

            {/* Link + downloads — aparecem após criação */}
            <AnimatePresence>
              {qrCodeValue && (
                <motion.div
                  className="flex flex-col items-center gap-3 w-full"
                  initial={{ opacity: 0, transform: "translateY(6px)" }}
                  animate={{ opacity: 1, transform: "translateY(0px)" }}
                  exit={{ opacity: 0, transform: "translateY(6px)" }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center gap-1">
                    <a
                      href={qrCodeValue}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-500 hover:underline truncate max-w-[220px]"
                    >
                      {qrCodeValue}
                    </a>
                    <button onClick={copyLink} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={baixando !== null} onClick={() => handleDownload("png")}>PNG</Button>
                    <Button variant="outline" size="sm" disabled={baixando !== null} onClick={() => handleDownload("pdf")}>PDF</Button>
                    <Button variant="outline" size="sm" disabled={baixando !== null} onClick={() => handleDownload("svg")}>SVG</Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodeGenerator;
