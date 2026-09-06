"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner";
import { PageHeader } from '@/components/shell/AppShell';
import { useRecentes } from '@/lib/recentes';
import { generateCreditCard } from '../utils/credit_card_gen';
import { Check, Clipboard } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Botão de copiar de dentro de um campo.
 *
 * Sem borda: o campo já é a caixa, e uma segunda moldura a 6px da primeira
 * cria um ruído que não carrega informação. O que marca o alvo clicável é a
 * cor do ícone — apagada em repouso, cheia no hover.
 *
 * Os dois ícones ficam empilhados e trocam por opacidade em vez de um trocar
 * de lugar com o outro: transição, não keyframe, porque o botão pode ser
 * clicado várias vezes em sequência e a troca precisa poder ser interrompida
 * no meio do caminho. Nada de layout se move.
 */
function BotaoCopiar({
  rotulo,
  copiado,
  onCopiar,
}: {
  rotulo: string;
  copiado: boolean;
  onCopiar: () => void;
}) {
  return (
    <Button
      variant="ghost"
      onClick={onCopiar}
      aria-label={rotulo}
      className="absolute right-1.5 top-1/2 h-7 w-7 -translate-y-1/2 rounded-full p-0 text-subtle hover:text-foreground [&_svg]:size-3.5"
    >
      <span className="relative flex h-3.5 w-3.5 items-center justify-center">
        <Clipboard
          className={cn(
            "absolute transition-opacity duration-150 ease-out",
            copiado ? "opacity-0" : "opacity-100",
          )}
        />
        <Check
          className={cn(
            "absolute text-emerald-500 transition-opacity duration-150 ease-out",
            copiado ? "opacity-100" : "opacity-0",
          )}
        />
      </span>
    </Button>
  );
}

/** Rótulo de campo. À direita, opcionalmente, um valor de apoio. */
function RotuloCampo({ children, apoio }: { children: React.ReactNode; apoio?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 px-1">
      <span className="text-xs text-subtle">{children}</span>
      {apoio ? <span className="truncate text-xs text-subtle">{apoio}</span> : null}
    </div>
  );
}

const CartaoDeCreditoGenerator: React.FC = () => {
  const [cardData, setCardData] = useState({
    number: '',
    formattedNumber: '',
    expirationDate: '',
    securityCode: '',
    brand: '',
    securityCodeName: ''
  });
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [copiado, setCopiado] = useState<string | null>(null);
  const relogioCopia = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gatilhoBandeira = useRef<HTMLButtonElement>(null);
  const escolhaPorPonteiro = useRef(false);
  const { registrar } = useRecentes();

  useEffect(() => {
    // Gera o primeiro valor ao montar. Antes isto convivia com uma
    // manipulação manual da classe de tema no <html>, que brigava com o
    // next-themes; a dependência era [theme], então trocar o tema regerava o
    // valor sem motivo. Agora depende só da montagem.
    handleGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => {
    if (relogioCopia.current) clearTimeout(relogioCopia.current);
  }, []);

  const handleGenerate = () => {
    const newCard = generateCreditCard(selectedBrand === 'all' ? undefined : selectedBrand);
    setCardData(newCard);
    // Só os quatro últimos dígitos no histórico: a sidebar fica visível na
    // tela inteira e número de cartão completo ali é exposição desnecessária.
    registrar({
      tipo: "cartao",
      label: `•••• ${newCard.number.replace(/\D/g, "").slice(-4)}`,
    });
  };

  // O Radix devolve o foco ao gatilho quando o select fecha, e com ele focado a
  // barra de espaço reabre a lista — inesperado depois de já ter escolhido.
  // Num clique o foco sai; no teclado ele fica, senão o Tab perderia o lugar.
  const aoFecharBandeira = (evento: Event) => {
    if (!escolhaPorPonteiro.current) return;
    evento.preventDefault();
    escolhaPorPonteiro.current = false;
    gatilhoBandeira.current?.blur();
  };

  // `campo` diz qual dos três acabou de ser copiado, para o visto aparecer só
  // naquele. Com um booleano único os três respondiam ao mesmo clique.
  const copiar = (texto: string, rotulo: string, campo: string) => {
    if (!texto) return;
    navigator.clipboard.writeText(texto);
    setCopiado(campo);
    toast.success(`${rotulo} copiado`);
    if (relogioCopia.current) clearTimeout(relogioCopia.current);
    relogioCopia.current = setTimeout(() => setCopiado(null), 1400);
  };

  const nomeCodigo = cardData.securityCodeName || "CVV";

  return (
    <div className="w-full max-w-md">
      <PageHeader
        title="Gerador de Cartão de Crédito"
        description="Números válidos pelo algoritmo de Luhn, para testar checkout e antifraude. Não funcionam em compras reais."
      />

      <div
        className="mx-auto flex flex-col gap-4"
        style={{ width: "calc(10ch + 7rem + 8px)" }}
      >
        <Select onValueChange={setSelectedBrand}>
          <SelectTrigger ref={gatilhoBandeira}>
            <SelectValue placeholder="Todas as bandeiras" />
          </SelectTrigger>
          <SelectContent
            onPointerDown={() => {
              escolhaPorPonteiro.current = true;
            }}
            onKeyDown={() => {
              escolhaPorPonteiro.current = false;
            }}
            onCloseAutoFocus={aoFecharBandeira}
          >
            <SelectItem value="all">Todas as bandeiras</SelectItem>
            <SelectItem value="visa">Visa</SelectItem>
            <SelectItem value="mastercard">Mastercard</SelectItem>
            <SelectItem value="american express">American Express</SelectItem>
            <SelectItem value="diners club">Diners Club</SelectItem>
            <SelectItem value="discover">Discover</SelectItem>
            <SelectItem value="jcb">JCB</SelectItem>
            <SelectItem value="hipercard">HiperCard</SelectItem>
            <SelectItem value="aura">Aura</SelectItem>
          </SelectContent>
        </Select>

        <Button className="w-full" onClick={handleGenerate}>
          Gerar Cartão
        </Button>

        {/* Clicar no campo copia, além do botão: o valor é somente-leitura e só
            serve para ser levado embora. O select() mostra exatamente o que
            foi para a área de transferência. */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <RotuloCampo apoio={cardData.brand}>Número</RotuloCampo>
            <div className="relative flex">
              <Input
                readOnly
                type="text"
                placeholder="Número do cartão"
                title="Clique para copiar"
                className="w-full cursor-pointer bg-background pr-10"
                value={cardData.formattedNumber}
                onClick={(evento) => {
                  evento.currentTarget.select();
                  copiar(cardData.number, "Número do cartão", "numero");
                }}
              />
              <BotaoCopiar
                rotulo="Copiar número do cartão"
                copiado={copiado === "numero"}
                onCopiar={() => copiar(cardData.number, "Número do cartão", "numero")}
              />
            </div>
          </div>

          {/* Validade e código lado a lado, cada um do tamanho do seu próprio
              conteúdo: 7 caracteres de data contra 3 ou 4 de código. */}
          <div className="flex gap-2">
            <div className="flex w-[calc(6.5ch+3.5rem)] flex-none flex-col gap-1.5">
              <RotuloCampo>Validade</RotuloCampo>
              <div className="relative flex">
                <Input
                  readOnly
                  type="text"
                  placeholder="Validade"
                  title="Clique para copiar"
                  className="w-full cursor-pointer bg-background pr-10"
                  value={cardData.expirationDate}
                  onClick={(evento) => {
                    evento.currentTarget.select();
                    copiar(cardData.expirationDate, "Data de validade", "validade");
                  }}
                />
                <BotaoCopiar
                  rotulo="Copiar data de validade"
                  copiado={copiado === "validade"}
                  onCopiar={() =>
                    copiar(cardData.expirationDate, "Data de validade", "validade")
                  }
                />
              </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <RotuloCampo>{nomeCodigo}</RotuloCampo>
              <div className="relative flex">
                <Input
                  readOnly
                  type="text"
                  placeholder={nomeCodigo}
                  title="Clique para copiar"
                  className="w-full cursor-pointer bg-background pr-10"
                  value={cardData.securityCode}
                  onClick={(evento) => {
                    evento.currentTarget.select();
                    copiar(cardData.securityCode, nomeCodigo, "codigo");
                  }}
                />
                <BotaoCopiar
                  rotulo={`Copiar ${nomeCodigo}`}
                  copiado={copiado === "codigo"}
                  onCopiar={() => copiar(cardData.securityCode, nomeCodigo, "codigo")}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartaoDeCreditoGenerator;
