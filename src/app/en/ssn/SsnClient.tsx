"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/shell/AppShell";
import { GerarComEspaco } from "@/components/GerarComEspaco";
import { useEspacoParaGerar } from "@/lib/useEspacoParaGerar";
import { useRecentes } from "@/lib/recentes";
import { formatarSsn, gerarSsn } from "@/lib/documentosUS";

/**
 * O gerador de SSN.
 *
 * O interruptor existe por causa de uma particularidade do formato, explicada
 * no texto abaixo da ferramenta: a faixa que a SSA reserva para publicidade
 * (987-65-43xx) está dentro do intervalo 900-999, que nunca foi emitido. Ou
 * seja, ela é comprovadamente falsa E recusada por validação estrita.
 *
 * Por isso o padrão é a faixa emissível, que passa em formulário — é para isso
 * que um gerador de teste serve. Quem precisa de um número que não possa
 * pertencer a ninguém liga o interruptor.
 */
export default function SsnClient() {
  const [ssn, setSsn] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [demonstracao, setDemonstracao] = useState(false);
  const { registrar } = useRecentes();

  const gerar = useCallback(() => {
    const novo = gerarSsn(demonstracao ? "demonstracao" : "aleatorio");
    setSsn(novo);
    registrar({ tipo: "cpf", label: formatarSsn(novo) });
  }, [demonstracao, registrar]);

  useEffect(() => {
    gerar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demonstracao]);

  useEspacoParaGerar(gerar);

  const copiar = () => {
    navigator.clipboard.writeText(formatarSsn(ssn));
    setCopiado(true);
    toast("Copied", { description: "SSN copied to your clipboard" });
    setTimeout(() => setCopiado(false), 1000);
  };

  return (
    <div className="w-full max-w-md">
      <PageHeader
        title="SSN Generator"
        description="Random Social Security Numbers that respect the ranges the SSA actually issues, for testing forms and databases."
      />

      <div className="mx-auto flex flex-col items-center gap-3" style={{ width: "calc(11.25ch + 3.5rem)" }}>
        <Input
          readOnly
          type="text"
          placeholder="SSN"
          title="Click to copy"
          className="w-full cursor-pointer bg-background text-center tabular-nums"
          value={formatarSsn(ssn)}
          onClick={(evento) => {
            if (!ssn) return;
            evento.currentTarget.select();
            copiar();
          }}
        />

        <Button className="w-full" onClick={copiar}>
          {copiado ? "Copied!" : "Copy SSN"}
        </Button>

        <GerarComEspaco onGerar={gerar} />
      </div>

      <div className="mt-8 flex items-start justify-between gap-4 border-t border-border pt-5">
        <div>
          <Label htmlFor="demonstracao" className="text-sm font-medium">
            Use the SSA demo range
          </Label>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            987-65-4320 through 4329 will never be assigned to anyone. They are also rejected by strict
            validation, because 900-999 was never issued.
          </p>
        </div>
        <Switch id="demonstracao" checked={demonstracao} onCheckedChange={setDemonstracao} />
      </div>
    </div>
  );
}
