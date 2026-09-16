"use client";

import { useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shell/AppShell";
import { apenasDigitos, validarCpf } from "@/lib/validarCpf";
import { cn } from "@/lib/utils";

/** A máscara do documento, aplicada enquanto se digita. */
function comMascara(digitos: string): string {
  return digitos
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

/**
 * O validador.
 *
 * Responde enquanto a pessoa digita, sem botão: conferir um número é uma
 * pergunta de uma linha, e um botão só acrescentaria um clique entre a
 * pergunta e a resposta.
 *
 * Quando não fecha, mostra quais dígitos eram esperados. É o que transforma
 * "inválido" em informação útil — quase sempre o erro é um algarismo trocado
 * na digitação, e ver o esperado ao lado do informado aponta onde.
 */
export default function ValidadorClient() {
  const [texto, setTexto] = useState("");
  const resultado = useMemo(() => validarCpf(texto), [texto]);

  return (
    <div className="w-full max-w-md">
      <PageHeader
        title="Validador de CPF"
        description="Cole um CPF e veja na hora se os dígitos verificadores fecham. A conta é feita no seu navegador."
      />

      <div className="flex flex-col gap-3">
        <Input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="000.000.000-00"
          aria-label="CPF a validar"
          aria-describedby="resposta-da-validacao"
          className="bg-background text-center text-base tabular-nums"
          value={comMascara(apenasDigitos(texto))}
          onChange={(evento) => setTexto(evento.target.value)}
        />

        {/* role=status para quem usa leitor de tela ouvir a resposta sem
            precisar sair do campo e voltar. */}
        <div id="resposta-da-validacao" role="status" aria-live="polite" className="min-h-[3.25rem]">
          {resultado.estado === "valido" && (
            <Resposta ok titulo="CPF válido">
              Os dois dígitos verificadores fecham. Emissão na região fiscal de {resultado.regiao}.
            </Resposta>
          )}

          {resultado.estado === "invalido" && (
            <Resposta titulo="CPF inválido">
              Os verificadores deveriam ser{" "}
              <strong className="font-medium tabular-nums text-foreground">
                {resultado.esperados.join("")}
              </strong>
              , e não{" "}
              <strong className="font-medium tabular-nums text-foreground">
                {resultado.informados.join("")}
              </strong>
              . Costuma ser um algarismo trocado na digitação.
            </Resposta>
          )}

          {resultado.estado === "repetido" && (
            <Resposta titulo="CPF inválido">
              Números com todos os algarismos iguais fecham a conta por acidente, mas são recusados por qualquer
              sistema.
            </Resposta>
          )}

          {resultado.estado === "incompleto" && (
            <p className="px-1 pt-2 text-sm text-muted-foreground">
              {resultado.digitos} de 11 algarismos.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Resposta({ ok, titulo, children }: { ok?: boolean; titulo: string; children: React.ReactNode }) {
  const Icone = ok ? Check : X;
  return (
    <div
      className={cn(
        "flex gap-2.5 rounded-xl border px-3 py-2.5",
        ok
          ? "border-emerald-600/25 bg-emerald-600/[0.06]"
          : "border-amber-600/25 bg-amber-600/[0.06]"
      )}
    >
      <Icone
        className={cn("mt-0.5 h-4 w-4 shrink-0", ok ? "text-emerald-600 dark:text-emerald-500" : "text-amber-600 dark:text-amber-500")}
      />
      <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
        <strong className="font-medium text-foreground">{titulo}.</strong> {children}
      </p>
    </div>
  );
}
