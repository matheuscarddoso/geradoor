"use client";

import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { formatCNPJ, generateCNPJ } from '../utils/cnpj_gen';
import { Input } from '@/components/ui/input';
import { toast } from "sonner";
import { motion } from 'framer-motion';
import NavbarSection from '@/components/NavbarSection';

const CNPJGenerator: React.FC = () => {
  const [cnpj, setCnpj] = useState<string>('');
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
    const newCpf = generateCNPJ();
    setCnpj(newCpf);
  };


  const copyToClipboard = () => {
    navigator.clipboard.writeText(cnpj);
    setCopied(true);
    toast("Copiado pro trem que coisa", {
      description: "CNPJ copiado para a área de transferência",
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
          <h1 className="text-4xl font-semibold tracking-tighter">Gerador de CNPJ</h1>
          <p className="text-lg text-zinc-700 dark:text-zinc-400 font-normal leading-6 tracking-tighter text-center">Clique em &quot;Gerar CNPJ&quot; e obtenha um número<br />de CNPJ válido instantaneamente.</p>
        </div>
        <Button className="w-full max-w-[250px] mt-8" onClick={handleGenerate}>
          Gerar CNPJ
        </Button>
        <div className="flex space-x-2 w-full max-w-[250px] mx-auto">
          <Input readOnly type="text" placeholder="CNPJ" className="bg-background" value={formatCNPJ(cnpj)} />
          <Button variant="outline" onClick={copyToClipboard}>
            {copied ? 'Copiado!' : 'Copiar'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default CNPJGenerator;
