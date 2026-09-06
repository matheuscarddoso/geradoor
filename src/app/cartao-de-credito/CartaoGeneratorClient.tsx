"use client";

import React, { useEffect, useState } from 'react';
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
import { Clipboard } from 'lucide-react';

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
  const [copied, setCopied] = useState<boolean>(false);
  const { registrar } = useRecentes();

  useEffect(() => {
    // Gera o primeiro valor ao montar. Antes isto convivia com uma
    // manipulação manual da classe de tema no <html>, que brigava com o
    // next-themes; a dependência era [theme], então trocar o tema regerava o
    // valor sem motivo. Agora depende só da montagem.
    handleGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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


  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast(`${type} copiado!`, {
      description: `${type} copiado para a área de transferência`,
      action: {
        label: "Cancelar",
        onClick: () => {},
      },
    });
    setTimeout(() => {
      setCopied(false);
    }, 1000);
  };

  return (
    <div className="w-full max-w-md">
      <PageHeader
        title="Gerador de Cartão de Crédito"
        description="Números válidos pelo algoritmo de Luhn, para testar checkout e antifraude. Não funcionam em compras reais."
      />

      <div className="flex w-full flex-col space-y-4">
          <Select onValueChange={setSelectedBrand}>
            <SelectTrigger>
              <SelectValue placeholder="Todas as bandeiras" />
            </SelectTrigger>
            <SelectContent>
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

          <div className="space-y-3">
            <div className="flex space-x-2 relative">
              <Input
                readOnly 
                type="text" 
                placeholder="Número do Cartão" 
                className="bg-background" 
                value={cardData.formattedNumber} 
              />
              <Button 
                variant="outline" 
                className='w-7 h-7 absolute right-1 top-[50%] translate-y-[-50%] p-0 rounded-sm'
                onClick={() => copyToClipboard(cardData.number, 'Número do cartão')}
              >
                <Clipboard className='w-3 h-3'/>
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex space-x-2 relative">
                <Input 
                  readOnly 
                  type="text" 
                  placeholder="Validade" 
                  className="bg-background" 
                  value={cardData.expirationDate} 
                />
                <Button 
                  variant="outline" 
                  className='w-7 h-7 absolute right-1 top-[50%] translate-y-[-50%] p-0 rounded-sm'
                  onClick={() => copyToClipboard(cardData.expirationDate, 'Data de validade')}
                >
                  <Clipboard className='w-3 h-3'/>
                </Button>
              </div>

              <div className="flex space-x-2 relative">
                <Input 
                  readOnly 
                  type="text" 
                  placeholder={cardData.securityCodeName} 
                  className="bg-background" 
                  value={cardData.securityCode} 
                />
                <Button 
                  variant="outline" 
                  className='w-7 h-7 absolute right-1 top-[50%] translate-y-[-50%] p-0 rounded-sm'
                  onClick={() => copyToClipboard(cardData.securityCode, cardData.securityCodeName)}
                >
                  <Clipboard className='w-3 h-3'/>
                </Button>
              </div>
            </div>

            <div className="text-center text-sm text-zinc-600 dark:text-zinc-400">
              Bandeira: {cardData.brand} • {cardData.securityCodeName}: {cardData.securityCode}
            </div>
          </div>
      </div>
    </div>
  );
};

export default CartaoDeCreditoGenerator;