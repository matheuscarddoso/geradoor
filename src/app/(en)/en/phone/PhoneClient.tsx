"use client";

import { useCallback, useEffect, useState } from "react";
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
import { useEspacoParaGerar } from "@/lib/useEspacoParaGerar";
import { useRecentes } from "@/lib/recentes";
import { AREAS_POR_ESTADO, formatarTelefoneUS, gerarTelefoneUS } from "@/lib/documentosUS";

/** "Qualquer estado" precisa de um valor, porque Select não aceita string vazia. */
const QUALQUER = "any";

const ESTADOS = Object.entries(AREAS_POR_ESTADO)
  .map(([sigla, { nome }]) => ({ sigla, nome }))
  .sort((a, b) => a.nome.localeCompare(b.nome));

/**
 * O gerador de telefone americano.
 *
 * O interruptor da faixa de ficção é o mesmo dilema do SSN: 555-01xx não toca em
 * ninguém, e por isso mesmo alguns validadores a recusam. O padrão aqui é a
 * faixa fictícia, porque telefone de teste que chega a tocar no aparelho de
 * alguém é pior do que um que não passa na validação.
 */
export default function PhoneClient() {
  const [telefone, setTelefone] = useState("");
  const [estado, setEstado] = useState(QUALQUER);
  const [ficticio, setFicticio] = useState(true);
  const [copiado, setCopiado] = useState(false);
  const { registrar } = useRecentes();

  const gerar = useCallback(() => {
    const novo = gerarTelefoneUS(estado === QUALQUER ? undefined : estado, ficticio ? "ficticio" : "aleatorio");
    setTelefone(novo);
    registrar({ tipo: "telefone", label: formatarTelefoneUS(novo) });
  }, [estado, ficticio, registrar]);

  useEffect(() => {
    gerar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado, ficticio]);

  useEspacoParaGerar(gerar);

  const copiar = () => {
    navigator.clipboard.writeText(formatarTelefoneUS(telefone));
    setCopiado(true);
    toast("Copied", { description: "Phone number copied to your clipboard" });
    setTimeout(() => setCopiado(false), 1000);
  };

  return (
    <div className="w-full max-w-md">
      <PageHeader
        title="Phone Number Generator"
        description="US phone numbers that follow the North American Numbering Plan, by state or from anywhere in the country."
      />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="estado" className="text-sm">
            State
          </Label>
          <Select value={estado} onValueChange={setEstado}>
            <SelectTrigger id="estado" className="bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={QUALQUER}>Any state</SelectItem>
              {ESTADOS.map(({ sigla, nome }) => (
                <SelectItem key={sigla} value={sigla}>
                  {nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Input
          readOnly
          type="text"
          placeholder="(000) 000-0000"
          title="Click to copy"
          className="cursor-pointer bg-background text-center tabular-nums"
          value={formatarTelefoneUS(telefone)}
          onClick={(evento) => {
            if (!telefone) return;
            evento.currentTarget.select();
            copiar();
          }}
        />

        <Button onClick={copiar}>{copiado ? "Copied!" : "Copy number"}</Button>

        <GerarComEspaco onGerar={gerar} />

        <div className="mt-4 flex items-start justify-between gap-4 border-t border-border pt-5">
          <div>
            <Label htmlFor="ficticio" className="text-sm font-medium">
              Use the 555 fiction range
            </Label>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              555-0100 through 555-0199 is reserved for fiction and never rings anyone. Turn this off if your
              validation rejects 555.
            </p>
          </div>
          <Switch id="ficticio" checked={ficticio} onCheckedChange={setFicticio} />
        </div>
      </div>
    </div>
  );
}
