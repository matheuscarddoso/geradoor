"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { PageHeader } from "@/components/shell/AppShell";
import { useRecentes } from "@/lib/recentes";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Loader } from "lucide-react";
import { PhoneInput } from "@/components/PhoneInput";
import {
  DialogSelo,
  DialogDestaque,
  DialogSuperficie,
  DialogAcoes,
} from "@/components/ui/dialog-parts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { v4 as uuidv4 } from "uuid";
import { QrDownloadError, downloadQrCode, type QrFormat } from "@/lib/qrDownload";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { rasterizeSvgMarkup } from "@/lib/image";
import { LOGO_PRESETS, presetMarkup } from "@/components/qr/presets";
import { isValidPhoneNumber } from "react-phone-number-input";
import Link from "next/link";
import IMessagePreview from "@/components/whatsapp/IMessagePreview";
import PhoneFrame from "@/components/whatsapp/PhoneFrame";

/** Lado do QR renderizado nas duas telas. */
const QR_RENDER_SIZE = 200;
/** Lado do logo como fração da imagem. */
const LOGO_SCALE = 0.22;

const WhatsappLinkGenerator: React.FC = () => {
  const [phone, setPhone] = useState<string | null>("");
  const [message, setMessage] = useState<string | null>("");
  const [qrCodeValue, setQrCodeValue] = useState<string | null>("");
  const [loadingQrCode, setLoadingQrCode] = useState<boolean>(false);
  // resolvedTheme, não theme: o segundo devolve o valor escolhido, que pode
  // ser "system", enquanto as cores do QR precisam do tema efetivo.
  const { resolvedTheme } = useTheme();

  const handleGenerate = async () => {
    if (!phone || !isValidPhoneNumber(phone)) {
      toast.error("Por favor, preencha um número de telefone válido");
      return;
    }

    const link = `https://wa.me/${phone}?text=${encodeURIComponent(message || "")}`;
    const shortcode = uuidv4().slice(0, 6);
    const baseUrl = "https://www.geradoor.com/";

    try {
      setLoadingQrCode(true);
      const response = await fetch("/api/qrcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: link, shortcode }),
      });

      if (!response.ok) {
        throw new Error("Erro ao criar QR Code");
      }

      const data = await response.json();
      const criado = baseUrl + data.shortcode;
      setQrCodeValue(criado);
      registrar({ tipo: "whatsapp", label: criado, href: "/whatsapp" });
      setLoadingQrCode(false);
      toast.success("QR Code criado com sucesso!");
    } catch (error) {
      console.error("Erro ao criar QR Code:", error);
      toast.error("Erro ao criar QR Code");
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(qrCodeValue ?? "");
    toast("Link copiado para a área de transferência", {
      description: "Link copiado com sucesso!",
      action: {
        label: "Cancelar",
        onClick: () => {},
      },
    });
  }

  const [baixando, setBaixando] = useState<QrFormat | null>(null);
  const [usarLogo, setUsarLogo] = useState(true);
  const { registrar } = useRecentes();
  const [logoSrc, setLogoSrc] = useState<string | null>(null);

  /**
   * A marca do WhatsApp entra no QR como PNG data URL, não como SVG.
   *
   * O download desenha o SVG do código num canvas, e um <image> apontando para
   * SVG aninhado não carrega quando o SVG externo é lido como imagem — o logo
   * sairia faltando no arquivo baixado. Rasterizar resolve, e o resultado fica
   * em estado para não repetir o trabalho a cada toggle.
   */
  useEffect(() => {
    if (!usarLogo || logoSrc) return;
    const preset = LOGO_PRESETS.find((item) => item.id === "whatsapp");
    if (!preset) return;

    let ativo = true;
    rasterizeSvgMarkup(presetMarkup(preset))
      .then((src) => {
        if (ativo) setLogoSrc(src);
      })
      .catch(() => {
        if (!ativo) return;
        toast.error("Não foi possível carregar o ícone do WhatsApp");
        setUsarLogo(false);
      });
    return () => {
      ativo = false;
    };
  }, [usarLogo, logoSrc]);

  /**
   * Nível H recupera cerca de 30% dos módulos e é o que permite cobrir o
   * centro. Sem logo o nível volta ao padrão, para não mudar a densidade dos
   * códigos já gerados. A 22% da imagem o logo ocupa ~9% da área do código.
   */
  const logoAtivo = usarLogo && logoSrc !== null;
  const imageSettings = logoAtivo
    ? {
        src: logoSrc,
        height: Math.round(QR_RENDER_SIZE * LOGO_SCALE),
        width: Math.round(QR_RENDER_SIZE * LOGO_SCALE),
        excavate: true,
      }
    : undefined;

  const handleDownload = async (format: QrFormat) => {
    try {
      setBaixando(format);
      await downloadQrCode({
        // Duas instâncias do QR existem no DOM ao mesmo tempo, uma por
        // breakpoint. `:not([hidden])` não serve porque a que sobra é escondida
        // por classe, então pegamos a que de fato tem área renderizada.
        element: Array.from(
          document.querySelectorAll<SVGElement>(".qrcode-svg")
        ).find((el) => el.getBoundingClientRect().width > 0) ?? null,
        format,
        filename: "qrcode-whatsapp",
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


  return (
    /* A página recebe a área crua do shell (SEM_MOLDURA) para o painel da
       direita encostar nas bordas. O padding volta aqui, só na coluna da
       esquerda. */
    <div className="flex h-full min-h-[620px] w-full">
      <div className="flex min-w-0 flex-1 flex-col justify-center px-6 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <PageHeader
            title="Gerador de link do WhatsApp"
            description="Crie um link wa.me com a mensagem já preenchida. Quem clicar abre a conversa direto com você."
          />

        {/* Largura pelo conteúdo: a máscara "(00) 00000-0000" mais o seletor de
            país cabem em ~210px. Esticar até os 448px da coluna dá a impressão
            de que falta algo para preencher. */}
        <PhoneInput
          defaultCountry="BR"
          value={phone ?? ""}
          onChange={(e) => setPhone(e)}
          placeholder="(00) 00000-0000"
          className="max-w-[260px]"
        />

        {/* Textarea e não input: a mensagem pré-preenchida costuma passar de
            uma linha, e num campo de linha única o texto rola na horizontal e
            some da vista enquanto se digita. */}
        <Textarea
          placeholder="Customize sua mensagem"
          className="bg-background mt-4 min-h-[84px] resize-y"
          value={message ?? ""}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={500}
        />
        <p className="mt-2 text-sm font-normal leading-4 tracking-tight text-subtle">Exemplo: &quot;Olá, eu gostaria de receber mais informações sobre o produto&quot;</p>
        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <Label
              htmlFor="logo-whatsapp"
              className="text-sm font-medium leading-none"
            >
              Ícone do WhatsApp no centro
            </Label>
            <p className="mt-1 text-xs text-subtle">
              A marca aparece no meio do QR Code
            </p>
          </div>
          <Switch
            id="logo-whatsapp"
            checked={usarLogo}
            onCheckedChange={setUsarLogo}
            aria-label="Usar o ícone do WhatsApp no centro do QR Code"
          />
        </div>

        <Dialog>
        <DialogTrigger asChild>
        <Button className="w-full mt-4" onClick={handleGenerate} disabled={phone == ""}>
        Gerar meu link
        </Button>
        </DialogTrigger>
        <DialogContent>
          {loadingQrCode ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader className="h-5 w-5 animate-spin text-subtle" />
              <p className="text-sm text-subtle">Criando seu link...</p>
            </div>
          ) : (
            <>
              <DialogSelo variante="sucesso" />

              <DialogHeader>
                <DialogTitle>Link criado</DialogTitle>
                <DialogDescription>
                  Copie e compartilhe em qualquer lugar para ser contactado
                  instantaneamente.
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
                  /* A especificação do QR pede 4 módulos de quiet zone. O
                     qrcode.react vem com marginSize 0 e o código saía
                     encostado na borda, o que faz leitores falharem. */
                  marginSize={4}
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
                      PNG
                      <span className="ms-auto text-xs text-subtle">imagem</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDownload("pdf")}>
                      PDF
                      <span className="ms-auto text-xs text-subtle">impressão</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDownload("svg")}>
                      SVG
                      <span className="ms-auto text-xs text-subtle">vetor</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button onClick={copyLink}>Copiar link</Button>
              </DialogAcoes>
            </>
          )}
        </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Painel da prévia, com respiro em relação ao resto do conteúdo */}
      <div className="hidden w-[46%] shrink-0 py-3 pe-3 md:block">
        <div className="relative h-full w-full overflow-hidden rounded-2xl">
        {/* Fundo em <img> e não em background-image: o navegador trata como
            imagem, respeita lazy loading e o object-cover recorta pelo centro
            em qualquer proporção do painel. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- fundo decorativo, sem ganho em passar pelo next/image */}
        <img
          src="/preview-bg.webp"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
        />

          {/* Ancorado pelo RODAPÉ, não pelo topo: assim o quanto fica cortado
              é sempre 10% da altura do aparelho, e não uma sobra que muda
              conforme a altura do painel. `recorte="inteiro"` desliga o fade
              do próprio frame — dois recortes juntos deixariam o esmaecido
              no meio do painel em vez de na borda. */}
          {/* Centralizado nos dois eixos. A 56% da largura o aparelho inteiro
              cabe na altura do painel sem cortar, então `recorte="inteiro"`
              desenha o device completo e nada é aparado. */}
          <PhoneFrame
            recorte="inteiro"
            className="absolute left-1/2 top-1/2 w-[56%] -translate-x-1/2 -translate-y-1/2"
          >
            <IMessagePreview phone={phone ?? ""} message={message ?? ""} />
          </PhoneFrame>
        </div>
      </div>
    </div>
  );
};

export default WhatsappLinkGenerator;
