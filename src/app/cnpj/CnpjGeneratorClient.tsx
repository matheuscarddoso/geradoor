"use client";

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { formatCNPJ, generateCNPJ } from '../utils/cnpj_gen';
import { Input } from '@/components/ui/input';
import { toast } from "sonner";
import { PageHeader } from '@/components/shell/AppShell';
import { useRecentes } from '@/lib/recentes';
import { useEspacoParaGerar } from '@/lib/useEspacoParaGerar';
import { GerarComEspaco } from '@/components/GerarComEspaco';

const CNPJGenerator: React.FC = () => {
  const [cnpj, setCnpj] = useState<string>('');
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
    const newCnpj = generateCNPJ();
    setCnpj(newCnpj);
    registrar({ tipo: "cnpj", label: formatCNPJ(newCnpj) });
  };

  // Gerar passou a ser exclusivo da barra de espaço.
  useEspacoParaGerar(handleGenerate);


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
    <div className="w-full max-w-md">
      <PageHeader
        title="Gerador de CNPJ"
        description="Números aleatórios com dígitos verificadores válidos, para testar cadastros e integrações."
      />

      <div className="flex w-full flex-col gap-3">
        <Input
          readOnly
          type="text"
          placeholder="CNPJ"
          className="bg-background text-center"
          value={formatCNPJ(cnpj)}
        />

        <Button onClick={copyToClipboard}>
          {copied ? "Copiado!" : "Copiar CNPJ"}
        </Button>

        <GerarComEspaco onGerar={handleGenerate} />
      </div>
    </div>
  );
};

export default CNPJGenerator;
