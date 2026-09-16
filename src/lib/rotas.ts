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
import type { Idioma } from "./idioma";

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
  /**
   * A mesma ferramenta em inglês: endereço, nome e termos de busca próprios.
   *
   * Fica dentro da rota, e não numa lista paralela, porque o par é a unidade —
   * é ele que o hreflang declara. Duas listas separadas sairiam de sincronia no
   * dia em que alguém acrescentasse uma ferramenta em só uma delas.
   *
   * O endereço em inglês é escrito em inglês, e não `/en/vetorizador`: quem
   * busca "vectorizer" não digita "vetorizador", e o endereço é um dos lugares
   * onde o buscador procura a palavra.
   */
  en: {
    href: string;
    label: string;
    labelCurto?: string;
    descricao: string;
    termos: string[];
  };
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
    en: {
      href: "/en/background-remover",
      label: "Background Remover",
      labelCurto: "Remove BG",
      descricao: "Remove the background from a photo",
      termos: ["remove background", "background remover", "transparent png", "cutout", "remove bg", "photo", "image"],
    },
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
    en: {
      href: "/en/vectorizer",
      label: "Vectorizer",
      labelCurto: "Vectorize",
      descricao: "Turn an image into an SVG",
      termos: ["vectorize", "vector", "svg", "png to svg", "jpg to svg", "logo", "trace", "convert", "image"],
    },
  },
  {
    href: "/qr-code",
    grupo: "ferramenta",
    label: "QR Code",
    descricao: "Criar QR Code a partir de um link",
    termos: ["qrcode", "código", "link", "logo"],
    icon: QrCode,
    en: {
      href: "/en/qr-code",
      label: "QR Code",
      descricao: "Create a QR Code from a link",
      termos: ["qrcode", "qr", "code", "link", "logo"],
    },
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
    en: {
      href: "/en/barcode",
      label: "Barcode",
      labelCurto: "Barcode",
      descricao: "Generate a numbered PDF in Code 128",
      termos: ["barcode", "code 128", "label", "pdf", "print"],
    },
  },

  {
    href: "/cpf",
    grupo: "gerador",
    label: "CPF",
    descricao: "Gerar CPF válido para teste",
    termos: ["documento", "pessoa física", "cadastro de pessoa física"],
    icon: IdCard,
    en: {
      href: "/en/ssn",
      label: "SSN",
      descricao: "Generate a valid SSN for testing",
      termos: ["ssn", "social security", "social security number", "test data", "fake ssn"],
    },
  },
  {
    href: "/cnpj",
    grupo: "gerador",
    label: "CNPJ",
    descricao: "Gerar CNPJ válido para teste",
    termos: ["empresa", "pessoa jurídica", "cadastro nacional"],
    icon: Building2,
    en: {
      href: "/en/ein",
      label: "EIN",
      descricao: "Generate a valid EIN for testing",
      termos: ["ein", "employer identification", "tax id", "test data", "fake ein"],
    },
  },
  {
    href: "/cartao-de-credito",
    grupo: "gerador",
    label: "Cartão de Crédito",
    labelCurto: "Cartão",
    descricao: "Gerar número de cartão para teste",
    termos: ["luhn", "visa", "mastercard", "checkout", "pagamento"],
    icon: CreditCard,
    en: {
      href: "/en/credit-card",
      label: "Credit Card",
      labelCurto: "Card",
      descricao: "Generate a card number for testing",
      termos: ["credit card", "card number", "luhn", "test card", "visa", "mastercard", "amex"],
    },
  },
  {
    href: "/telefone",
    grupo: "gerador",
    label: "Telefone",
    descricao: "Gerar celular com DDD por estado",
    termos: ["celular", "ddd", "número", "fone", "whatsapp"],
    icon: Smartphone,
    en: {
      href: "/en/phone",
      label: "Phone Number",
      labelCurto: "Phone",
      descricao: "Generate a phone number by country and state",
      termos: ["phone", "phone number", "area code", "test data", "us phone", "cell"],
    },
  },
  {
    href: "/instagram",
    grupo: "gerador",
    label: "Instagram",
    descricao: "QR Code que abre o seu perfil",
    termos: ["insta", "perfil", "arroba", "@", "bio"],
    icon: Instagram,
    en: {
      href: "/en/instagram-qr-code",
      label: "Instagram",
      descricao: "QR Code that opens your profile",
      termos: ["instagram", "qr code", "profile", "bio"],
    },
  },
  {
    href: "/whatsapp",
    grupo: "gerador",
    label: "WhatsApp",
    descricao: "Criar link wa.me com mensagem pronta",
    termos: ["wa.me", "zap", "mensagem", "telefone"],
    icon: MessageCircle,
    en: {
      href: "/en/whatsapp-link",
      label: "WhatsApp",
      descricao: "Create a wa.me link with a preset message",
      termos: ["whatsapp", "wa.me", "link", "chat", "message"],
    },
  },
];

export const ROTAS_PUBLICAS: Rota[] = ROTAS.filter((rota) => !rota.privada);

/**
 * A rota vista no idioma pedido: endereço, nome e descrição já resolvidos.
 *
 * Existe para quem desenha menu e lista não precisar escrever `idioma === "en"`
 * em cada campo — o `if` acontece uma vez, aqui.
 */
export interface RotaTraduzida {
  href: string;
  grupo: GrupoDaRota;
  label: string;
  labelCurto?: string;
  descricao: string;
  termos: string[];
  icon: LucideIcon;
  novo?: true;
  privada?: true;
}

export function traduzir(rota: Rota, idioma: Idioma): RotaTraduzida {
  const { en, ...base } = rota;
  if (idioma === "pt-BR") return base;
  return { ...base, href: en.href, label: en.label, labelCurto: en.labelCurto, descricao: en.descricao, termos: en.termos };
}

/** As ferramentas públicas no idioma pedido, na mesma ordem. */
export function rotasPublicas(idioma: Idioma): RotaTraduzida[] {
  return ROTAS_PUBLICAS.map((rota) => traduzir(rota, idioma));
}

/** O par de endereços de uma página, para o hreflang. Null se não for rota de ferramenta. */
export function parDeIdiomas(href: string): { "pt-BR": string; en: string } | null {
  // A home é o par que não está na lista de ferramentas.
  if (href === "/" || href === "/en") return { "pt-BR": "/", en: "/en" };
  const rota = ROTAS.find((r) => r.href === href || r.en.href === href);
  if (rota) return { "pt-BR": rota.href, en: rota.en.href };

  const pouso = ROTAS_DE_POUSO.find((r) => r.href === href || r.en?.href === href);
  return pouso?.en ? { "pt-BR": pouso.href, en: pouso.en.href } : null;
}

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
  /** O par em inglês, quando existe. Nem toda busca tem equivalente. */
  en?: { href: string; label: string; descricao: string };
}

export const ROTAS_DE_POUSO: RotaDePouso[] = [
  {
    href: "/png-para-svg",
    label: "PNG para SVG",
    descricao: "Converter PNG em vetor SVG",
    ferramenta: "/vetorizador",
    en: { href: "/en/png-to-svg", label: "PNG to SVG", descricao: "Convert a PNG into a vector SVG" },
  },
  {
    href: "/jpg-para-svg",
    label: "JPG para SVG",
    descricao: "Converter JPG em vetor SVG",
    ferramenta: "/vetorizador",
    en: { href: "/en/jpg-to-svg", label: "JPG to SVG", descricao: "Convert a JPG into a vector SVG" },
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
  ...ROTAS.map((rota) => rota.en.href),
  ...ROTAS_DE_POUSO.map((rota) => rota.href),
  ...ROTAS_DE_POUSO.flatMap((rota) => (rota.en ? [rota.en.href] : [])),
]);
