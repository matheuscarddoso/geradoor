"use client";

import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Minus } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { usePathname } from 'next/navigation';
import { Separator } from './ui/separator';
import { AnimatedLink } from './PageTransition';
import { MaximizeIcon, type MaximizeIconHandle } from '@/components/ui/maximize-icon';

const NavbarSection: React.FC = () => {
  const currentPath = usePathname();
  const logoRef = useRef<MaximizeIconHandle>(null);

  return (
    <motion.div
      className="pointer-events-none fixed inset-x-0 top-0 z-20 mx-auto max-w-screen-md mt-4 flex px-6"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className="bg-background dark:bg-primary-dark-2 pointer-events-auto relative mx-auto w-full flex h-full items-center overflow-y-scroll rounded-[14px] px-2 py-2 shadow-[rgba(142,140,152,0.2)_0px_0px_30px,rgba(219,216,224,0.2)_0px_0px_0px_1px] dark:shadow-[rgba(111,109,120,0.1)_0px_0px_30px,rgba(60,57,63,0.4)_0px_0px_0px_1px] sm:overflow-y-visible">
        <Button
          variant="ghost"
          className='hover:bg-transparent gap-2'
          onMouseEnter={() => logoRef.current?.startAnimation()}
          onMouseLeave={() => logoRef.current?.stopAnimation()}
        >
          {/* O ref deixa o ícone em modo controlado: quem dispara a animação
              é o hover do botão inteiro, não só o hover sobre o desenho. */}
          <MaximizeIcon ref={logoRef} size={16} className="flex items-center" />
          Geradoor
        </Button>
        <div className="mx-auto hidden lg:inline md:inline">
          <Button variant="ghost" asChild>
            <AnimatedLink href={'/'} className={currentPath === '/' ? '' : 'text-zinc-500'}>
              CPF
            </AnimatedLink>
          </Button>
          <Button variant="ghost" asChild>
            <AnimatedLink href={'/cnpj'} className={currentPath === '/cnpj' ? '' : 'text-zinc-500'}>
              CNPJ
            </AnimatedLink>
          </Button>
          <Button variant="ghost" asChild>
            <AnimatedLink href={'/cartao-de-credito'} className={currentPath === '/cartao-de-credito' ? '' : 'text-zinc-500'}>
              Cartão de Crédito
            </AnimatedLink>
          </Button>
          <Button variant="ghost" asChild>
            <AnimatedLink href={'/qr-code'} className={currentPath === '/qr-code' ? '' : 'text-zinc-500'}>
              QRCode
            </AnimatedLink>
          </Button>
          <Button variant="ghost" asChild>
            <AnimatedLink href={'/whatsapp'} className={currentPath === '/whatsapp' ? '' : 'text-zinc-500'}>
              Whatsapp
            </AnimatedLink>
          </Button>
        </div>
        <Drawer>
          <DrawerTrigger className='flex lg:hidden md:hidden ms-auto me-2'>
            <div className="flex flex-col space-y-1.5 h-8 w-8 items-center justify-center">
              <div className="w-5 h-[1px] p-0 bg-primary rounded-full"></div>
              <div className="w-5 h-[1px] p-0 bg-primary rounded-full"></div>
            </div>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Menu</DrawerTitle>
            </DrawerHeader>
            <div className="flex flex-col px-4 pb-12 space-y-2">
              <AnimatedLink href={'/'} className={currentPath === '/' ? '' : 'text-zinc-500'}>
                CPF
              </AnimatedLink>
              <AnimatedLink href={'/cnpj'} className={currentPath === '/cnpj' ? '' : 'text-zinc-500'}>
                CNPJ
              </AnimatedLink>
              <AnimatedLink href={'/cartao-de-credito'} className={currentPath === '/cartao-de-credito' ? '' : 'text-zinc-500'}>
                Cartão de Crédito
              </AnimatedLink>
              <AnimatedLink href={'/qr-code'} className={currentPath === '/qr-code' ? '' : 'text-zinc-500'}>
                QRCode
              </AnimatedLink>
              <AnimatedLink href={'/whatsapp'} className={currentPath === '/whatsapp' ? '' : 'text-zinc-500'}>
                Whatsapp
              </AnimatedLink>
              { currentPath === "/" && (
                <div className="flex flex-col space-y-4 text-sm">
                  <Separator className='my-6'/>
                  <p>Nosso gerador online de CPF tem como intenção ajudar estudantes, programadores, analistas e testadores a gerar CPF válidos. Normalmente necessários para testar seus softwares em desenvolvimento.</p>
                  <p>A má utilização dos dados aqui gerados é de total responsabilidade do usuário.</p>
                  <p>Os números são gerados de forma aleatória, e não salvamos nenhum CPF gerado em nossa base, respeitando as regras de criação de cada documento.</p>
                </div>
              ) }
              { currentPath === "/cnpj" && (
                <div className="flex flex-col space-y-4 text-sm">
                  <Separator className='my-6'/>
                  <p>Nosso gerador online de CNPJ tem como intenção ajudar estudantes, programadores, analistas e testadores a gerar CNPJ válidos. Normalmente necessários parar testar seus softwares em desenvolvimento.</p>
                  <p>A má utilização dos dados aqui gerados é de total responsabilidade do usuário.</p>
                  <p>Os números são gerados de forma aleatória, respeitando as regras de criação de cada documento.</p>
                </div>
              ) }
              { currentPath === "/cartao-de-credito" && (
                <div className="flex flex-col space-y-4 text-sm">
                  <Separator className='my-6'/>
                  <p>Nosso gerador online de Cartão de Crédito tem como intenção ajudar estudantes, programadores, analistas e testadores a gerar Cartões válidos. Normalmente necessários parar testar seus softwares em desenvolvimento.</p>
                  <p>Esses dados não servem para fazer compras na internet.</p>
                  <p>A má utilização dos dados aqui gerados é de total responsabilidade do usuário.</p>
                  <p>Os números são gerados de forma aleatória, respeitando as regras de criação de cada documento.</p>
                </div>
              ) }
            </div>
          </DrawerContent>
        </Drawer>

        <Button variant="link" asChild className='hidden lg:inline md:inline'>
          <AnimatedLink href={'https://www.youtube.com/watch?v=dQw4w9WgXcQ'} target='_blank' className="ms-auto text-zinc-400">
            API
          </AnimatedLink>
        </Button>
      </div>
    </motion.div>
  );
};

export default NavbarSection;
