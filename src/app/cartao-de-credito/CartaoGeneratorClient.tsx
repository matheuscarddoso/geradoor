"use client";

import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
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
import { motion } from 'framer-motion';
import NavbarSection from '@/components/NavbarSection';
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
  const {theme, setTheme} = useTheme();

  useEffect(() => {
    if (typeof window !== "undefined") {
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(theme || "dark");
      handleGenerate();
    }
  }, [theme]);  

  const handleGenerate = () => {
    const newCard = generateCreditCard(selectedBrand === 'all' ? undefined : selectedBrand);
    setCardData(newCard);
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
    <div className="flex flex-col items-center justify-center w-screen h-screen relative overflow-hidden px-8">
      <motion.div
        className="pattern absolute inset-0 -z-10 h-full w-full" 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      ></motion.div>
      <NavbarSection />
      <motion.div
        className="max-w-screen-md w-full h-full flex flex-col space-y-2 items-center justify-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <div className="flex flex-col items-center justify-center space-y-3 my-5">
          <h1 className="text-4xl font-semibold tracking-tighter text-center">Gerador de<br/>Cartão de Crédito</h1>
          <p className="text-lg text-zinc-700 dark:text-zinc-400 font-normal leading-6 tracking-tighter text-center">
            Selecione uma bandeira e gere números<br />de cartão de crédito válidos instantaneamente.
          </p>
        </div>

        <div className="flex flex-col space-y-4 w-full max-w-[350px] mx-auto">
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
      </motion.div>
    </div>
  );
};

export default CartaoDeCreditoGenerator;