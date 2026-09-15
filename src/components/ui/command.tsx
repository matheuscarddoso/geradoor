"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { type DialogProps } from "@radix-ui/react-dialog"
import { Command as CommandPrimitive } from "cmdk"
import { Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { DialogTitle } from "@/components/ui/dialog"

const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      "flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground",
      className
    )}
    {...props}
  />
))
Command.displayName = CommandPrimitive.displayName

/**
 * O painel de comando: campo grande no topo, resultados logo abaixo.
 *
 * Sem animação nenhuma, nem no fundo nem no painel. Busca é reflexo: entre
 * apertar ⌘F e começar a digitar não cabe um quadro de espera, e a entrada
 * com escala que o resto do site usa fazia o campo chegar depois da primeira
 * letra.
 *
 * Não usa o `DialogContent` do projeto de propósito. Aquele é o modal das
 * ferramentas — alça no topo, botão de fechar no canto, padding largo —, e
 * aqui nada disso serve: um painel de busca fecha com Esc, e o X no canto
 * rouba a atenção do campo, que é a única coisa que importa quando ele abre.
 *
 * Fica acima do meio da tela (`top-[12vh]`), onde o olho já está quando se
 * pede busca, e não centralizado como um aviso.
 */
const CommandDialog = ({ children, ...props }: DialogProps) => {
  return (
    <DialogPrimitive.Root {...props}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          className={cn(
            "squircle fixed left-1/2 top-[12vh] z-50 w-[calc(100%-2rem)] max-w-[560px] -translate-x-1/2 overflow-hidden",
            "border border-zinc-200 bg-popover shadow-[0_24px_60px_-12px_rgb(0_0_0/0.35)] dark:border-zinc-800"
          )}
        >
          {/* Título só para leitor de tela: o Radix exige um para anunciar o
              diálogo, e sem ele quem usa leitor ouve "diálogo" e nada mais. Não
              aparece porque o campo de busca já diz do que se trata a quem vê. */}
          <DialogTitle className="sr-only">Buscar</DialogTitle>
          <Command className="bg-transparent">{children}</Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input> & {
    /** Campo grande, sem lupa: o painel de busca. Sem isto, o seletor de país. */
    grande?: boolean
  }
>(({ className, grande, ...props }, ref) => (
  <div
    className={cn("flex items-center border-b border-zinc-200 dark:border-zinc-800", grande ? "px-5" : "px-3")}
    cmdk-input-wrapper=""
  >
    {!grande && <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />}
    <CommandPrimitive.Input
      ref={ref}
      className={cn(
        "flex w-full bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
        grande ? "h-14 text-base tracking-tight" : "h-10 rounded-md py-3 text-sm",
        className
      )}
      {...props}
    />
  </div>
))

CommandInput.displayName = CommandPrimitive.Input.displayName

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn("max-h-[min(420px,50vh)] overflow-y-auto overflow-x-hidden", className)}
    {...props}
  />
))

CommandList.displayName = CommandPrimitive.List.displayName

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => (
  <CommandPrimitive.Empty
    ref={ref}
    className="py-10 text-center text-sm text-muted-foreground"
    {...props}
  />
))

CommandEmpty.displayName = CommandPrimitive.Empty.displayName

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn(
      "overflow-hidden p-2 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-zinc-400 dark:[&_[cmdk-group-heading]]:text-zinc-500",
      className
    )}
    {...props}
  />
))

CommandGroup.displayName = CommandPrimitive.Group.displayName

const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 h-px bg-border", className)}
    {...props}
  />
))
CommandSeparator.displayName = CommandPrimitive.Separator.displayName

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none data-[disabled=true]:pointer-events-none data-[selected=true]:bg-zinc-100 data-[selected=true]:text-foreground data-[disabled=true]:opacity-50 dark:data-[selected=true]:bg-zinc-800 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
      className
    )}
    {...props}
  />
))

CommandItem.displayName = CommandPrimitive.Item.displayName

const CommandShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}
CommandShortcut.displayName = "CommandShortcut"

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}
