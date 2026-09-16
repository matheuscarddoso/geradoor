"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shell/AppShell";
import { GerarComEspaco } from "@/components/GerarComEspaco";
import { useEspacoParaGerar } from "@/lib/useEspacoParaGerar";
import { useRecentes } from "@/lib/recentes";
import { formatarEin, gerarEin } from "@/lib/documentosUS";

/** O gerador de EIN. Prefixo de campus válido, resto sequencial. */
export default function EinClient() {
  const [ein, setEin] = useState("");
  const [copiado, setCopiado] = useState(false);
  const { registrar } = useRecentes();

  const gerar = useCallback(() => {
    const novo = gerarEin();
    setEin(novo);
    registrar({ tipo: "cnpj", label: formatarEin(novo) });
  }, [registrar]);

  useEffect(() => {
    gerar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEspacoParaGerar(gerar);

  const copiar = () => {
    navigator.clipboard.writeText(formatarEin(ein));
    setCopiado(true);
    toast("Copied", { description: "EIN copied to your clipboard" });
    setTimeout(() => setCopiado(false), 1000);
  };

  return (
    <div className="w-full max-w-md">
      <PageHeader
        title="EIN Generator"
        description="Employer Identification Numbers with a real IRS campus prefix, for testing forms and databases."
      />

      <div className="mx-auto flex flex-col items-center gap-3" style={{ width: "calc(11.25ch + 3.5rem)" }}>
        <Input
          readOnly
          type="text"
          placeholder="EIN"
          title="Click to copy"
          className="w-full cursor-pointer bg-background text-center tabular-nums"
          value={formatarEin(ein)}
          onClick={(evento) => {
            if (!ein) return;
            evento.currentTarget.select();
            copiar();
          }}
        />

        <Button className="w-full" onClick={copiar}>
          {copiado ? "Copied!" : "Copy EIN"}
        </Button>

        <GerarComEspaco onGerar={gerar} />
      </div>
    </div>
  );
}
