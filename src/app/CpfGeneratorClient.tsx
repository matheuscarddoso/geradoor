"use client";

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { formatCPF, generateCPF } from './utils/cpf_gen';
import { Input } from '@/components/ui/input';
import { toast } from "sonner";
import { PageHeader } from '@/components/shell/AppShell';
import { useRecentes } from '@/lib/recentes';
import { useEspacoParaGerar } from '@/lib/useEspacoParaGerar';
import { GerarComEspaco } from '@/components/GerarComEspaco';

const CPFGenerator: React.FC = () => {
  const [cpf, setCpf] = useState<string>('');
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
    const newCpf = generateCPF();
    setCpf(newCpf);
    registrar({ tipo: "cpf", label: formatCPF(newCpf) });
  };

  // Gerar passou a ser exclusivo da barra de espaço.
  useEspacoParaGerar(handleGenerate);


  const copyToClipboard = () => {
    navigator.clipboard.writeText(cpf);
    setCopied(true);
    toast("Copiado pro trem que coisa", {
      description: "CPF copiado para a área de transferência",
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
        title="Gerador de CPF"
        description="Números aleatórios com dígitos verificadores válidos, para testar sistemas e formulários."
      />

      <div className="flex w-full flex-col gap-3">
        <Input
          readOnly
          type="text"
          placeholder="CPF"
          className="bg-background text-center"
          value={formatCPF(cpf)}
        />

        <Button onClick={copyToClipboard}>
          {copied ? "Copiado!" : "Copiar CPF"}
        </Button>

        <GerarComEspaco onGerar={handleGenerate} />
      </div>
    </div>
  );
};

export default CPFGenerator;
