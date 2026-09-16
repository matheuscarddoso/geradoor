import {
  Barcode,
  Building2,
  CreditCard,
  Eraser,
  IdCard,
  MessageCircle,
  QrCode,
  Instagram,
  Smartphone,
  Spline,
  type LucideIcon,
} from "lucide-react";

/**
 * A que família a rota pertence.
 *
 * `ferramenta` trabalha sobre algo que a pessoa traz — uma imagem, um link —,
 * e é o que ela vem usar. `gerador` inventa um dado de teste. A separação vale
 * no menu e na busca.
 */
export type GrupoDaRota = "ferramenta" | "gerador";

export const NOMES_DOS_GRUPOS: Record<GrupoDaRota, string> = {
  ferramenta: "Ferramentas",
  gerador: "Geradores",
};

/** A ordem em que os grupos aparecem. */
export const GRUPOS: GrupoDaRota[] = ["ferramenta", "gerador"];

export interface Rota {
  href: string;
  grupo: GrupoDaRota;
  label: string;
  /** Versão curta para as abas do topo, onde a largura é disputada. */
  labelCurto?: string;
  /** Descrição curta, usada na busca. */
  descricao: string;
  /** Termos alternativos para a busca encontrar. */
  termos: string[];
  icon: LucideIcon;
  /**
   * Fora do menu, da busca e do sitemap.
   *
   * Ferramenta de uso interno, atrás de senha. Continua sendo uma rota — o
   * layout precisa saber que é página de ferramenta —, só não é oferecida a
   * quem chega no site.
   */
  privada?: true;
  /**
   * Ferramenta recém-lançada, com a etiqueta "Novo" no menu e na busca.
   *
   * Tirar quando deixar de ser novidade — uns dois meses. Etiqueta que fica
   * para sempre deixa de ser lida.
   */
  novo?: true;
}

/** Fonte única das ferramentas: topo, sidebar e busca leem daqui. */
export const ROTAS: Rota[] = [
  // Ferramentas antes dos geradores: é o que traz gente ao site, e a
  // ordem aqui é a ordem do menu e da busca.
  {
    href: "/removedor-de-fundo",
    grupo: "ferramenta",
    label: "Removedor de fundo",
    labelCurto: "Remover fundo",
    descricao: "Tirar o fundo de uma foto em PNG",
    termos: ["remover fundo", "tirar fundo", "png transparente", "recortar", "remove bg", "imagem", "foto"],
    icon: Eraser,
    novo: true,
  },
  {
    href: "/vetorizador",
    grupo: "ferramenta",
    label: "Vetorizador",
    labelCurto: "Vetorizar",
    descricao: "Transformar uma imagem em SVG",
    termos: ["vetorizar", "vetor", "svg", "png para svg", "jpg para svg", "logo", "traço", "converter", "imagem"],
    icon: Spline,
    novo: true,
  },
  {
    href: "/qr-code",
    grupo: "ferramenta",
    label: "QR Code",
    descricao: "Criar QR Code a partir de um link",
    termos: ["qrcode", "código", "link", "logo"],
    icon: QrCode,
  },
  {
    href: "/codigo-de-barras",
    grupo: "ferramenta",
    label: "Código de Barras",
    labelCurto: "Barras",
    descricao: "Gerar PDF numerado em Code 128",
    termos: ["code 128", "barcode", "etiqueta", "formulário", "numeração", "gráfica", "pdf"],
    icon: Barcode,
    privada: true,
  },

  {
    href: "/cpf",
    grupo: "gerador",
    label: "CPF",
    descricao: "Gerar CPF válido para teste",
    termos: ["documento", "pessoa física", "cadastro de pessoa física"],
    icon: IdCard,
  },
  {
    href: "/cnpj",
    grupo: "gerador",
    label: "CNPJ",
    descricao: "Gerar CNPJ válido para teste",
    termos: ["empresa", "pessoa jurídica", "cadastro nacional"],
    icon: Building2,
  },
  {
    href: "/cartao-de-credito",
    grupo: "gerador",
    label: "Cartão de Crédito",
    labelCurto: "Cartão",
    descricao: "Gerar número de cartão para teste",
    termos: ["luhn", "visa", "mastercard", "checkout", "pagamento"],
    icon: CreditCard,
  },
  {
    href: "/telefone",
    grupo: "gerador",
    label: "Telefone",
    descricao: "Gerar celular com DDD por estado",
    termos: ["celular", "ddd", "número", "fone", "whatsapp"],
    icon: Smartphone,
  },
  {
    href: "/instagram",
    grupo: "gerador",
    label: "Instagram",
    descricao: "QR Code que abre o seu perfil",
    termos: ["insta", "perfil", "arroba", "@", "bio"],
    icon: Instagram,
  },
  {
    href: "/whatsapp",
    grupo: "gerador",
    label: "WhatsApp",
    descricao: "Criar link wa.me com mensagem pronta",
    termos: ["wa.me", "zap", "mensagem", "telefone"],
    icon: MessageCircle,
  },
];

export const ROTAS_PUBLICAS: Rota[] = ROTAS.filter((rota) => !rota.privada);

/**
 * Páginas de pouso: uma por intenção de busca, movidas pela mesma ferramenta.
 *
 * "Vetorizador" e "converter png para svg" são a mesma função e buscas
 * diferentes, e o buscador ranqueia a página cujo conteúdo casa com a busca.
 * Cada uma destas tem título, texto e perguntas próprios — repetir o conteúdo
 * do /vetorizador trocando a palavra PNG por JPG seria página fina, que é o
 * que o próprio Google diz que não quer.
 *
 * Ficam fora do menu, da busca e da grade da home de propósito: quem chega
 * pelo site encontra a ferramenta pelo nome dela. Entram no sitemap e são
 * ligadas entre si e à ferramenta de origem pelo bloco "Veja também".
 */
export interface RotaDePouso {
  href: string;
  label: string;
  descricao: string;
  /** A ferramenta que atende esta busca. */
  ferramenta: string;
}

export const ROTAS_DE_POUSO: RotaDePouso[] = [
  {
    href: "/png-para-svg",
    label: "PNG para SVG",
    descricao: "Converter PNG em vetor SVG",
    ferramenta: "/vetorizador",
  },
  {
    href: "/jpg-para-svg",
    label: "JPG para SVG",
    descricao: "Converter JPG em vetor SVG",
    ferramenta: "/vetorizador",
  },
  {
    href: "/validador-de-cpf",
    label: "Validador de CPF",
    descricao: "Conferir se um CPF é válido",
    ferramenta: "/cpf",
  },
];

/** Toda rota que o layout deve tratar como página de ferramenta. */
export const HREFS_COM_CASCA = new Set<string>([
  ...ROTAS.map((rota) => rota.href),
  ...ROTAS_DE_POUSO.map((rota) => rota.href),
]);
