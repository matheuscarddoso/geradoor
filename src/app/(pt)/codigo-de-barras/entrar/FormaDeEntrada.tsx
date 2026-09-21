"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Barcode, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROTA_DA_API, ROTA_PROTEGIDA } from "@/lib/acessoDaGrafica";

export function FormaDeEntrada() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  const enviar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (!senha || enviando) return;
    setErro("");
    setEnviando(true);

    try {
      const resposta = await fetch(ROTA_DA_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha }),
      });

      if (resposta.ok) {
        // `replace` e não `push`: sem isto o botão de voltar traz a tela de
        // senha de volta por cima da ferramenta já aberta.
        router.replace(ROTA_PROTEGIDA);
        // O router só troca de rota; o `refresh` é o que faz o middleware
        // rodar de novo com o cookie novo em mãos.
        router.refresh();
        return;
      }

      const corpo = (await resposta.json().catch(() => null)) as { error?: string } | null;
      setErro(corpo?.error ?? "Senha incorreta.");
    } catch {
      setErro("Sem conexão. Verifique a internet e tente de novo.");
    }
    setEnviando(false);
  };

  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-16">
      <div className="w-full max-w-[320px]">
        <div className="mb-8 space-y-2">
          <Barcode className="h-5 w-5 text-muted-foreground" aria-hidden />
          <h1 className="text-base font-medium leading-tight tracking-tight">
            Gerador de código de barras
          </h1>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Ferramenta de uso interno. Digite a senha para continuar.
          </p>
        </div>

        <form onSubmit={enviar} className="space-y-3" noValidate>
          <Input
            type="password"
            /* Corpo maior que o padrão do site: quem usa esta tela não é quem
               desenhou o site, e um campo de senha de 12px é o tipo de detalhe
               que faz alguém desistir e ligar pedindo ajuda. */
            className="h-11 bg-background text-[15px]"
            placeholder="Senha"
            aria-label="Senha de acesso"
            autoComplete="current-password"
            autoFocus
            value={senha}
            onChange={(evento) => {
              setSenha(evento.target.value);
              setErro("");
            }}
            disabled={enviando}
          />

          <Button type="submit" className="h-11 w-full text-[14px]" disabled={!senha || enviando}>
            {enviando ? <Loader className="h-4 w-4 animate-spin" aria-hidden /> : "Entrar"}
          </Button>

          {/* `role=alert` para o leitor de tela anunciar sem precisar
              reencontrar o foco. */}
          {erro && (
            <p role="alert" className="text-[13px] leading-relaxed text-destructive">
              {erro}
            </p>
          )}
        </form>

        <p className="mt-6 text-[12px] leading-relaxed text-muted-foreground">
          Este computador continua conectado por 90 dias.
        </p>
      </div>
    </main>
  );
}
