"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shell/AppShell";
import { GerarComEspaco } from "@/components/GerarComEspaco";
import { useRecentes } from "@/lib/recentes";
import { useEspacoParaGerar } from "@/lib/useEspacoParaGerar";
import { UFS, formatarTelefone, gerarTelefone } from "../utils/telefone_gen";

const TelefoneGenerator: React.FC = () => {
  const [telefone, setTelefone] = useState<string>("");
  const [uf, setUf] = useState<string>("all");
  const [formatado, setFormatado] = useState<boolean>(true);
  const [copiado, setCopiado] = useState<boolean>(false);
  const { registrar } = useRecentes();

  const exibido = formatado ? formatarTelefone(telefone) : telefone;

  const handleGenerate = () => {
    const novo = gerarTelefone(uf);
    setTelefone(novo);
    registrar({ tipo: "telefone", label: formatarTelefone(novo) });
  };

  // Gerar é exclusivo da barra de espaço, como no CPF e no CNPJ.
  useEspacoParaGerar(handleGenerate);

  useEffect(() => {
    handleGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Trocar de estado regera na hora: manter na tela um número de outro
  // estado depois da escolha faria o seletor parecer quebrado.
  const handleUf = (nova: string) => {
    setUf(nova);
    const novo = gerarTelefone(nova);
    setTelefone(novo);
    registrar({ tipo: "telefone", label: formatarTelefone(novo) });
  };

  const copiar = () => {
    if (!telefone) return;
    // Copia o que está na tela: quem desligou a formatação quer o número cru.
    navigator.clipboard.writeText(exibido);
    setCopiado(true);
    toast.success("Telefone copiado!");
    setTimeout(() => setCopiado(false), 1000);
  };

  return (
    <div className="w-full max-w-md">
      <PageHeader
        title="Gerador de Telefone"
        description="Celulares com DDD real de cada estado, para testar cadastros e máscaras de formulário."
      />

      <div className="flex w-full flex-col gap-3">
        <Select value={uf} onValueChange={handleUf}>
          <SelectTrigger aria-label="Estado">
            <SelectValue placeholder="Todos os estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os estados</SelectItem>
            {UFS.map((item) => (
              <SelectItem key={item.sigla} value={item.sigla}>
                {item.nome} ({item.ddds.join(", ")})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          readOnly
          type="text"
          placeholder="Telefone"
          className="bg-background text-center"
          value={exibido}
        />

        <div className="flex items-center justify-between gap-3 py-1">
          <Label htmlFor="formatar" className="text-sm font-normal text-subtle">
            Com formatação
          </Label>
          <Switch
            id="formatar"
            checked={formatado}
            onCheckedChange={setFormatado}
            aria-label="Exibir o telefone com formatação"
          />
        </div>

        <Button onClick={copiar}>
          {copiado ? "Copiado!" : "Copiar telefone"}
        </Button>

        <GerarComEspaco onGerar={handleGenerate} />
      </div>
    </div>
  );
};

export default TelefoneGenerator;
