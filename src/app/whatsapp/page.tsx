"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import NavbarSection from "@/components/NavbarSection";
import { Copy, Loader, Send } from "lucide-react";
import { PhoneInput } from "@/components/PhoneInput";
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { v4 as uuidv4 } from "uuid";
import { isValidPhoneNumber } from "react-phone-number-input";
import Link from "next/link";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const WhatsappLinkGenerator: React.FC = () => {
  const [phone, setPhone] = useState<string | null>("");
  const [message, setMessage] = useState<string | null>("");
  const [qrCodeValue, setQrCodeValue] = useState<string | null>("");
  const [loadingQrCode, setLoadingQrCode] = useState<boolean>(false);
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  const handleMouseEnter = () => {
    setOpen(true);
  };

  const handleMouseLeave = () => {
    setOpen(false);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(theme || "dark");
    }
  }, [theme]);

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
      setQrCodeValue(baseUrl + data.shortcode);
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
        onClick: () => console.log("Cancelar"),
      },
    });
  }

  const downloadQRCode = () => {
    const svg = document.querySelector(".qrcode-svg");
    if (!svg) {
      toast.error("QR Code não encontrado!");
      return;
    }
  
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
  
    const scale = 4;
    const size = 200;
  
    canvas.width = size * scale;
    canvas.height = size * scale;
  
    ctx?.scale(scale, scale);
  
    const img = new Image();
    img.onload = () => {
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      ctx?.drawImage(img, 0, 0, size, size);
  
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "qrcode.png";
          a.click();
          URL.revokeObjectURL(url);
        }
      });
    };
  
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };


  return (
    <div className="flex flex-col items-center justify-center w-screen h-screen relative overflow-hidden px-8">
      <motion.div
        className="pattern absolute inset-0 -z-10 h-full w-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      ></motion.div>
      <NavbarSection />

      <motion.div
        className="max-w-screen-md mx-auto w-full h-full max-h-[400px] hidden md:flex lg:flex flex-col space-y-2 items-start justify-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <ResizablePanelGroup direction="horizontal" className="">
          <ResizablePanel>
            <motion.div 
              className="flex flex-col h-full justify-center pe-6 ps-1"
              initial={{ opacity: 0, x: -20, y: 0 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}>
              <div className="font-semibold leading-none tracking-tight mb-1">Compatilhe links de WhatsApp</div>
              <div className="text-sm text-muted-foreground mb-6">Digite o número de telefone do WhatsApp que quer criar.</div>
              <PhoneInput defaultCountry="BR" value={phone ?? ""} onChange={(e) => setPhone(e)} placeholder="(00) 00000-0000" />
              <Input
                type="text"
                placeholder="Customize sua mensagem"
                className="bg-background mt-4"
                value={message ?? ""}
                onChange={(e) => setMessage(e.target.value)}
              />
              <p className="mt-2 font-normal text-sm tracking-tight leading-4">Exemplo: &quot;Olá, eu gostaria de receber mais informações sobre o produto&quot;</p>
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="w-full mt-8" onClick={handleGenerate} disabled={phone == ""}>
                    Gerar meu link
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Esse é o seu link do WhatsApp</DialogTitle>
                    <DialogDescription>
                      Copie e compartilhe em qualquer lugar para ser contactado instantaneamente.
                    </DialogDescription>
                    { loadingQrCode ? (
                      <div className="flex items-center justify-center w-full h-full py-12">
                        <Loader className="animate-spin rounded-full h-5 w-5"/>
                      </div>
                    ) : (
                      <div className="flex flex-col pt-6">
                        <div className="flex flex-row items-center justify-center mb-6 mx-auto">
                          <Link className="underline underline-offset-4" href={qrCodeValue ?? ""} target="_blank" >{qrCodeValue}</Link>
                          <Button variant="ghost" className="w-7 h-7 p-0 ms-1" onClick={copyLink}>
                            <Copy />
                          </Button>
                        </div>
                        <QRCodeSVG
                          className="mx-auto qrcode-svg"
                          value={qrCodeValue ?? ""}
                          size={200}
                          fgColor={theme === "dark" ? "white" : "black"}
                          bgColor={theme === "dark" ? "black" : "white"}
                        />
                        <div className="flex flex-row gap-4 mt-6 justify-center">
                          <Button variant="secondary" onClick={downloadQRCode}>
                            Baixar QR Code
                          </Button>
                          <Button className="" onClick={copyLink}>
                            Copiar link
                          </Button>
                        </div>
                      </div>
                    ) }
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            </motion.div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel>
            <motion.div 
              className="flex flex-col items-center justify-center ps-6 pe-1 h-full"
              initial={{ opacity: 0, x: 20, y: 0 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger
                  asChild
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                  onClick={e => {
                    e.preventDefault();
                  }}>
                  <div className="flex flex-col items-start w-full h-full border rounded-md p-4 bg-background my-auto">
                    <div className="flex flex-row gap-3 items-center">
                      <Avatar className="w-8 h-8 rounded-full overflow-hidden">
                        <AvatarImage src="/supmark.avif" className="h-full object-cover" alt="What is up Mark?"></AvatarImage>
                        <AvatarFallback>CN</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{phone == "" ? "+00 000 00-0000" : phone}</p>
                        <p className="text-xs font-normal text-muted-foreground leading-none">Digitando...</p>
                      </div>
                    </div>
                    <div className="mt-auto flex flex-col w-full space-y-4">
                      { message && (
                        <div className="bg-primary text-primary-foreground text-sm p-1 px-2 font-normal rounded-sm ms-auto mt-auto">
                          <span>{message}</span>
                        </div>
                      )}
                      <div className="flex flex-row w-full">
                        <Input
                          type="text"
                          placeholder="Digite sua mensagem..."
                          className="bg-background w-full"
                          disabled
                        />
                        <div className="w-9 h-9 ms-3 px-2 border rounded-md flex items-center justify-center">
                          <Send className="" />
                        </div>
                      </div>
                    </div>
                  </div>
                </PopoverTrigger>
                <PopoverContent side="top" className="p-2">
                  <p className="text-xs text-center">Conteúdo apenas para pré-visualização, sem interação / ação existente.</p>
                </PopoverContent>
              </Popover>

            </motion.div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </motion.div>

      <motion.div
        className="max-w-screen-md mx-auto w-full h-full max-h-[400px] flex md:hidden lg:hidden flex-col space-y-2 items-start justify-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <div className="flex flex-col h-full justify-center w-full mx-auto px-4 max-w-[400px]">
          <div className="font-semibold leading-none tracking-tight mb-1">Compatilhe links de WhatsApp</div>
          <div className="text-sm text-muted-foreground mb-6">Digite o número de telefone do WhatsApp que quer criar.</div>
          <PhoneInput defaultCountry="BR" value={phone ?? ""} onChange={(e) => setPhone(e)} placeholder="(00) 00000-0000" />
          <Input
            type="text"
            placeholder="Customize sua mensagem"
            className="bg-background mt-4"
            value={message ?? ""}
            onChange={(e) => setMessage(e.target.value)}
          />
          <p className="mt-2 font-normal text-sm tracking-tight leading-4">Exemplo: &quot;Olá, eu gostaria de receber mais informações sobre o produto&quot;</p>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="w-full mt-8" onClick={handleGenerate} disabled={phone == ""}>
                Gerar meu link
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Esse é o seu link do WhatsApp</DialogTitle>
                <DialogDescription>
                  Copie e compartilhe em qualquer lugar para ser contactado instantaneamente.
                </DialogDescription>
                { loadingQrCode ? (
                  <div className="flex items-center justify-center w-full h-full py-12">
                    <Loader className="animate-spin rounded-full h-5 w-5"/>
                  </div>
                ) : (
                  <div className="flex flex-col pt-6">
                    <div className="flex flex-row items-center justify-center mb-6 mx-auto">
                      <Link className="underline underline-offset-4" href={qrCodeValue ?? ""} target="_blank" >{qrCodeValue}</Link>
                      <Button variant="ghost" className="w-7 h-7 p-0 ms-1" onClick={copyLink}>
                        <Copy />
                      </Button>
                    </div>
                    <QRCodeSVG
                      className="mx-auto qrcode-svg"
                      value={qrCodeValue ?? ""}
                      size={200}
                      fgColor={theme === "dark" ? "white" : "black"}
                      bgColor={theme === "dark" ? "black" : "white"}
                    />
                    <div className="flex flex-row gap-4 mt-6 justify-center">
                      <Button variant="secondary" onClick={downloadQRCode}>
                        Baixar QR Code
                      </Button>
                      <Button className="" onClick={copyLink}>
                        Copiar link
                      </Button>
                    </div>
                  </div>
                ) }
              </DialogHeader>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

    </div>
  );
};

export default WhatsappLinkGenerator;
