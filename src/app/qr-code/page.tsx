"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import NavbarSection from "@/components/NavbarSection";
import { Copy, Loader } from "lucide-react";
import { cn } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";
import LogoPicker, { DEFAULT_LOGO, type LogoConfig } from "@/components/qr/LogoPicker";
import DecorativeQR from "@/components/qr/DecorativeQR";
import { parseLink } from "@/lib/link";

const PLACEHOLDER_URL = "https://geradoor.com";
const QR_SIZE = 180;

const QRCodeGenerator: React.FC = () => {
  const [inputValue, setInputValue] = useState<string>("");
  const [qrCodeValue, setQrCodeValue] = useState<string | null>(null);
  const [loadingQrCode, setLoadingQrCode] = useState<boolean>(false);
  const [logo, setLogo] = useState<LogoConfig>(DEFAULT_LOGO);
  const [touched, setTouched] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    if (typeof window !== "undefined") {
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(theme || "dark");
    }
  }, [theme]);

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
      setQrCodeValue(baseUrl + data.shortcode);
      toast.success("QR Code criado com sucesso!");
    } catch (error) {
      console.error("Erro ao criar QR Code:", error);
      toast.error("Erro ao criar QR Code");
    } finally {
      setLoadingQrCode(false);
    }
  };

  const downloadQRCode = (filetype: string) => {
    const svgElement = document.querySelector(".qrcode-svg");

    if (!svgElement) {
      toast.error("QR Code não encontrado!");
      return;
    }

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (filetype === "svg") {
      const blob = new Blob([svgData], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "qrcode.svg";
      link.click();
      URL.revokeObjectURL(url);
    } else {
      const img = new Image();
      img.onload = () => {
        const scale = 4;
        const size = 200;
        canvas.width = size * scale;
        canvas.height = size * scale;
        ctx?.scale(scale, scale);
        ctx?.drawImage(img, 0, 0, size, size);

        if (filetype === "png") {
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = "qrcode.png";
              link.click();
              URL.revokeObjectURL(url);
            }
          }, "image/png");
        } else if (filetype === "pdf") {
          import("jspdf").then((jsPDF) => {
            const pdf = new jsPDF.default();
            const imgData = canvas.toDataURL("image/png");
            pdf.addImage(imgData, "PNG", 10, 10, 180, 180);
            pdf.save("qrcode.pdf");
          });
        }
      };
      img.src = "data:image/svg+xml;base64," + btoa(svgData);
    }
  };

  const copyLink = () => {
    if (!qrCodeValue) return;
    navigator.clipboard.writeText(qrCodeValue);
    toast.success("Link copiado!");
  };

  return (
    <div className="flex flex-col items-center justify-center w-screen h-screen relative overflow-hidden px-8">
      <motion.div
        className="pattern absolute inset-0 -z-10 h-full w-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      />
      <NavbarSection />

      <motion.div
        className="max-w-screen-md w-full h-full flex items-center justify-center overflow-y-auto py-24"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <div className="w-full my-auto flex flex-col md:flex-row gap-10 md:gap-16 items-center">

          {/* Left — form (always visible) */}
          <div className="flex-1 flex flex-col space-y-4 w-full">
            <div className="space-y-2">
              <h1 className="text-4xl font-semibold tracking-tighter">Gerador de QRCode</h1>
              <p className="text-lg text-zinc-700 dark:text-zinc-400 font-normal leading-6 tracking-tighter">
                Preencha o link que deseja
                <br />
                para criar um QRCode
              </p>
            </div>
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

          {/* Right — QR panel (desktop only) */}
          <div className="hidden md:flex flex-1 flex-col items-center gap-4">

            {/* QR code — decorativo enquanto não foi criado */}
            <div className="relative overflow-hidden">
              <div className="bg-white p-5 overflow-hidden">
                {qrCodeValue ? (
                  <QRCodeSVG
                    value={qrCodeValue}
                    size={QR_SIZE}
                    className="qrcode-svg"
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
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
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
                    <Button variant="outline" size="sm" onClick={() => downloadQRCode("png")}>PNG</Button>
                    <Button variant="outline" size="sm" onClick={() => downloadQRCode("pdf")}>PDF</Button>
                    <Button variant="outline" size="sm" onClick={() => downloadQRCode("svg")}>SVG</Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>

        </div>
      </motion.div>
    </div>
  );
};

export default QRCodeGenerator;
