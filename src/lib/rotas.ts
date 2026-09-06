import {
  Building2,
  CreditCard,
  IdCard,
  MessageCircle,
  QrCode,
  Instagram,
  Smartphone,
  type LucideIcon,
} from "lucide-react";

export interface Rota {
  href: string;
  label: string;
  /** Versão curta para as abas do topo, onde a largura é disputada. */
  labelCurto?: string;
  /** Descrição curta, usada na busca. */
  descricao: string;
  /** Termos alternativos para a busca encontrar. */
  termos: string[];
  icon: LucideIcon;
}

/** Fonte única das ferramentas: topo, sidebar e busca leem daqui. */
export const ROTAS: Rota[] = [
  {
    href: "/",
    label: "CPF",
    descricao: "Gerar CPF válido para teste",
    termos: ["documento", "pessoa física", "cadastro de pessoa física"],
    icon: IdCard,
  },
  {
    href: "/cnpj",
    label: "CNPJ",
    descricao: "Gerar CNPJ válido para teste",
    termos: ["empresa", "pessoa jurídica", "cadastro nacional"],
    icon: Building2,
  },
  {
    href: "/cartao-de-credito",
    label: "Cartão de Crédito",
    labelCurto: "Cartão",
    descricao: "Gerar número de cartão para teste",
    termos: ["luhn", "visa", "mastercard", "checkout", "pagamento"],
    icon: CreditCard,
  },
  {
    href: "/telefone",
    label: "Telefone",
    descricao: "Gerar celular com DDD por estado",
    termos: ["celular", "ddd", "número", "fone", "whatsapp"],
    icon: Smartphone,
  },
  {
    href: "/qr-code",
    label: "QR Code",
    descricao: "Criar QR Code a partir de um link",
    termos: ["qrcode", "código", "link", "logo"],
    icon: QrCode,
  },
  {
    href: "/instagram",
    label: "Instagram",
    descricao: "QR Code que abre o seu perfil",
    termos: ["insta", "perfil", "arroba", "@", "bio"],
    icon: Instagram,
  },
  {
    href: "/whatsapp",
    label: "WhatsApp",
    descricao: "Criar link wa.me com mensagem pronta",
    termos: ["wa.me", "zap", "mensagem", "telefone"],
    icon: MessageCircle,
  },
];
