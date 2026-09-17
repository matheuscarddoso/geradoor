import type { Idioma } from "./idioma";

/**
 * O texto de dentro das ferramentas, nos dois idiomas.
 *
 * Separado de `textos.ts`, que guarda só a casca — menu, rodapé, busca. Aqui
 * são as strings da interface de cada ferramenta: rótulo de botão, mensagem de
 * erro, texto de apoio de campo.
 *
 * Os clientes leem daqui por gancho, e não por prop. Todos são componentes de
 * cliente e já sabem a rota, então o idioma sai do caminho sem ninguém precisar
 * passá-lo — o que evita o encadeamento de props que uma árvore de seis níveis
 * exigiria.
 *
 * O gerador de código de barras fica de fora de propósito: é ferramenta interna,
 * atrás de senha, sem página em inglês.
 */

export type Ferramentas = {
  /** Comum a mais de uma ferramenta. */
  comum: {
    pesquisarPais: string;
    paisNaoEncontrado: string;
    copiar: string;
    copiado: string;
    baixar: string;
    escolherImagem: string;
    escolherOutra: string;
    solteAqui: string;
    ouClique: string;
    solteParaTrocar: string;
    podeSoltar: string;
    limpar: string;
    trocar: string;
    fundo: string;
    tamanho: string;
    naoFoiPossivelAbrir: string;
    escParaSair: string;
    cliqueParaCopiar: string;
    /** Vem depois do símbolo da tecla: "⌘V para colar". */
    paraColar: string;
  };
  removedor: {
    formatos: string;
    contornoPreciso: string;
    contornoPrecisoTexto: string;
    resolucaoOriginal: string;
    resolucaoOriginalTexto: string;
    nadaGuardado: string;
    nadaGuardadoTexto: string;
    copiarImagem: string;
    imagemCopiada: string;
    naoCopiou: string;
    baixarPng: string;
    semRecorte: string;
    naoGerouPng: string;
    recortando: string;
    restaurando: string;
    compararOriginal: string;
    pincelMagico: string;
    pincelDevolver: string;
    pincelTirar: string;
    magicoDevolver: string;
    magicoTirar: string;
    mudamTamanho: string;
    apagar: string;
    restaurar: string;
  };
  vetorizador: {
    formatos: string;
    curvasDeVerdade: string;
    curvasDeVerdadeTexto: string;
    fielAImagem: string;
    fielAImagemTexto: string;
    nadaSai: string;
    nadaSaiTexto: string;
    baixarSvg: string;
    copiarCodigo: string;
    copiarCodigoSvg: string;
    codigoCopiado: string;
    abrindoImagem: string;
    arquivo: string;
    cores: string;
    formas: string;
    fidelidade: string;
    detalhe: string;
    suavidade: string;
    estilo: string;
    automatico: string;
    logo: string;
    ilustracao: string;
    foto: string;
    traco: string;
    corDoTraco: string;
    limiar: string;
    outraCor: string;
    fundoTransparente: string;
    fundoTransparenteTexto: string;
    jaTransparente: string;
    escolhaOEstilo: string;
    dicaAutomatico: string;
    dicaLogo: string;
    dicaIlustracao: string;
    menosCores: string;
    dicaFoto: string;
    dicaTraco: string;
    limiarMaisAlto: string;
    preto: string;
    branco: string;
    compararSvg: string;
    imagem: string;
    vetorizadoAqui: string;
  };
  qr: {
    criar: string;
    criando: string;
    copiarLink: string;
    linkCopiado: string;
    criadoComSucesso: string;
    linkInvalido: string;
    preenchaOLink: string;
    naoBaixou: string;
    erroAoCriar: string;
    naoEscaneavel: string;
    previaIlustrativa: string;
    quemEscanear: string;
    impressao: string;
    imagemMinuscula: string;
    logoNoCentro: string;
    logoNoCentroTexto: string;
    ativarLogo: string;
    marcaNoMeio: string;
    enviarLogo: string;
    limparFundoDoLogo: string;
    ate4mb: string;
    naoAplicouIcone: string;
    naoCarregouImagem: string;
  };
  instagram: {
    arrobaInvalido: string;
    criandoQr: string;
    gerandoPerfil: string;
    gerarQr: string;
    usarIcone: string;
    naoCarregouIcone: string;
    seuPerfil: string;
    compartilharPerfil: string;
    copiarLink: string;
    baixar: string;
    refazer: string;
  };
  whatsapp: {
    criandoLink: string;
    gerandoLink: string;
    gerarLink: string;
    customizeMensagem: string;
    usarIcone: string;
    suaMensagem: string;
    linkCopiadoSucesso: string;
    exemploMensagem: string;
  };
  cartao: {
    numero: string;
    numeroDoCartao: string;
    gerar: string;
    copiarNumero: string;
    copiarValidade: string;
    copiarCid: string;
    copiarCvv: string;
    /** Verbo isolado, para montar "Copy CVV" e afins com o nome do código. */
    copiarPrefixo: string;
    validade: string;
    codigo: string;
  };
};

export const FERRAMENTAS: Record<Idioma, Ferramentas> = {
  "pt-BR": {
    comum: {
      pesquisarPais: "Pesquisar país...",
      paisNaoEncontrado: "País não encontrado.",
      copiar: "Copiar",
      copiado: "Copiado!",
      baixar: "Baixar",
      escolherImagem: "Escolher imagem",
      escolherOutra: "Escolher outra",
      solteAqui: "Solte uma imagem aqui",
      ouClique: "ou clique para escolher",
      solteParaTrocar: "Solte para trocar a imagem",
      podeSoltar: "Pode soltar",
      limpar: "Limpar",
      trocar: "Trocar",
      fundo: "Fundo",
      tamanho: "Tamanho",
      naoFoiPossivelAbrir: "Não foi possível abrir essa imagem",
      escParaSair: "Esc para sair",
      cliqueParaCopiar: "Clique para copiar",
      paraColar: "V para colar",
    },
    removedor: {
      formatos: "JPG, PNG, WEBP ou AVIF · até 80 MB · sai na resolução original",
      contornoPreciso: "Contorno preciso",
      contornoPrecisoTexto: "Um modelo de segmentação em alta resolução separa cabelo, roupa e objeto do fundo.",
      resolucaoOriginal: "Resolução original",
      resolucaoOriginalTexto: "O PNG sai no tamanho da sua foto, com transparência e sem marca d'água.",
      nadaGuardado: "Nada fica guardado",
      nadaGuardadoTexto: "A imagem é processada na hora e descartada. Não salvamos nenhuma cópia.",
      copiarImagem: "Copiar imagem",
      imagemCopiada: "Imagem copiada",
      naoCopiou: "Seu navegador não deixou copiar. Use Baixar PNG.",
      baixarPng: "Baixar PNG",
      semRecorte: "Sem recorte",
      naoGerouPng: "Não foi possível gerar o PNG",
      recortando: "Recortando o elemento",
      restaurando: "Restaurando",
      compararOriginal: "Comparar o original com o recorte",
      pincelMagico: "Pincel mágico",
      pincelDevolver: "Pinte sobre a foto apagada para trazer de volta o que o recorte levou.",
      pincelTirar: "Pinte o que sobrou de fundo para tirar do recorte.",
      magicoDevolver: "Passe sobre o que quer de volta: o elemento volta inteiro, com a borda dele.",
      magicoTirar: "Passe sobre o que quer tirar: o elemento sai inteiro, com a borda dele.",
      mudamTamanho: "mudam o tamanho.",
      apagar: "Apagar",
      restaurar: "Restaurar",
    },
    vetorizador: {
      formatos: "JPG, PNG, WEBP ou AVIF · até 80 MB · sai em SVG",
      curvasDeVerdade: "Curvas de verdade",
      curvasDeVerdadeTexto: "Cada forma vira um caminho vetorial. Amplie o quanto quiser: o contorno continua liso.",
      fielAImagem: "Fiel à imagem",
      fielAImagemTexto: "As cores e o nível de detalhe são escolhidos pela imagem, e a fidelidade do resultado é medida.",
      nadaSai: "Nada sai do aparelho",
      nadaSaiTexto: "A vetorização roda no seu navegador. A imagem não é enviada a lugar nenhum.",
      baixarSvg: "Baixar SVG",
      copiarCodigo: "Copiar código",
      copiarCodigoSvg: "Copiar código SVG",
      codigoCopiado: "Código SVG copiado",
      abrindoImagem: "Abrindo a imagem",
      arquivo: "Arquivo",
      cores: "Cores",
      formas: "Formas",
      fidelidade: "Fidelidade",
      detalhe: "Detalhe",
      suavidade: "Suavidade",
      estilo: "Estilo",
      automatico: "Auto",
      logo: "Logo",
      ilustracao: "Ilustração",
      foto: "Foto",
      traco: "Traço",
      corDoTraco: "Cor do traço",
      limiar: "Limiar",
      outraCor: "Outra cor",
      fundoTransparente: "Fundo transparente",
      fundoTransparenteTexto: "Tira o fundo liso que encosta nas bordas.",
      jaTransparente: "Esta imagem já tem o fundo transparente.",
      escolhaOEstilo: "Escolhe o estilo e o número de cores olhando a imagem.",
      dicaAutomatico: "Automático: separa a tinta do papel sozinho.",
      dicaLogo: "Poucas cores chapadas e contornos precisos, para marcas e ícones.",
      dicaIlustracao: "Mais cores e formas menores, para desenhos e artes.",
      menosCores: "Menos cores deixam o arquivo menor e mais limpo.",
      dicaFoto: "Efeito pôster: suaviza o ruído e agrupa os tons.",
      dicaTraco: "Só a tinta, sem fundo, para desenho, assinatura e carimbo.",
      limiarMaisAlto: "Mais alto pega tons mais claros como tinta.",
      preto: "Preto",
      branco: "Branco",
      compararSvg: "Comparar a imagem com o SVG",
      imagem: "Imagem",
      vetorizadoAqui: "Vetorizado no seu aparelho. A imagem não é enviada a lugar nenhum.",
    },
    qr: {
      criar: "Criar QRCode",
      criando: "Criando seu QR Code",
      copiarLink: "Copiar link",
      linkCopiado: "Link copiado!",
      criadoComSucesso: "QR Code criado com sucesso!",
      linkInvalido: "Esse link não é válido",
      preenchaOLink: "Por favor, preencha o link antes de gerar o QR Code",
      naoBaixou: "Não foi possível baixar o QR Code",
      erroAoCriar: "Erro ao criar QR Code",
      naoEscaneavel: "Este desenho não é escaneável. Clique em criar para gerar o código de verdade.",
      previaIlustrativa: "Prévia ilustrativa",
      quemEscanear: "Quem escanear vai direto para o link que você encurtou.",
      impressao: "impressão",
      imagemMinuscula: "imagem",
      logoNoCentro: "Logo no centro",
      logoNoCentroTexto: "Sua marca dentro do código",
      ativarLogo: "Ativar logo no centro do QR Code",
      marcaNoMeio: "A marca aparece no meio do QR Code",
      enviarLogo: "Enviar imagem do logo",
      limparFundoDoLogo: "Limpar fundo atrás do logo",
      ate4mb: "Até 4 MB.",
      naoAplicouIcone: "Não foi possível aplicar este ícone",
      naoCarregouImagem: "Não foi possível carregar a imagem",
    },
    instagram: {
      arrobaInvalido: "Esse @ não é válido",
      criandoQr: "Criando seu QR Code",
      gerandoPerfil: "Estamos gerando o código do seu perfil.",
      gerarQr: "Gerar meu QR Code",
      usarIcone: "Usar o ícone do Instagram no centro do QR Code",
      naoCarregouIcone: "Não foi possível carregar o ícone do Instagram",
      seuPerfil: "seu.perfil",
      compartilharPerfil: "Compartilhar perfil",
      copiarLink: "Copiar link",
      baixar: "Baixar",
      refazer: "Refazer",
    },
    whatsapp: {
      criandoLink: "Criando seu link",
      gerandoLink: "Estamos gerando o link e o QR Code do seu WhatsApp.",
      gerarLink: "Gerar meu link",
      customizeMensagem: "Customize sua mensagem",
      usarIcone: "Usar o ícone do WhatsApp no centro do QR Code",
      suaMensagem: "Sua mensagem aparece aqui",
      linkCopiadoSucesso: "Link copiado com sucesso!",
      exemploMensagem: 'Exemplo: "Olá, eu gostaria de receber mais informações sobre o produto"',
    },
    cartao: {
      numero: "Número",
      numeroDoCartao: "Número do cartão",
      gerar: "Gerar Cartão",
      copiarNumero: "Copiar número do cartão",
      copiarValidade: "Copiar data de validade",
      copiarCid: "Copiar CID",
      copiarCvv: "Copiar CVV",
      copiarPrefixo: "Copiar",
      validade: "Validade",
      codigo: "Código",
    },
  },
  en: {
    comum: {
      pesquisarPais: "Search country...",
      paisNaoEncontrado: "No country found.",
      copiar: "Copy",
      copiado: "Copied!",
      baixar: "Download",
      escolherImagem: "Choose an image",
      escolherOutra: "Choose another",
      solteAqui: "Drop an image here",
      ouClique: "or click to choose",
      solteParaTrocar: "Drop to replace the image",
      podeSoltar: "Drop it",
      limpar: "Clear",
      trocar: "Replace",
      fundo: "Background",
      tamanho: "Size",
      naoFoiPossivelAbrir: "Could not open that image",
      escParaSair: "Esc to exit",
      cliqueParaCopiar: "Click to copy",
      paraColar: "V to paste",
    },
    removedor: {
      formatos: "JPG, PNG, WEBP or AVIF · up to 80 MB · comes out at the original resolution",
      contornoPreciso: "Precise edges",
      contornoPrecisoTexto: "A high-resolution segmentation model separates hair, clothing and objects from the background.",
      resolucaoOriginal: "Original resolution",
      resolucaoOriginalTexto: "The PNG comes out the size of your photo, with transparency and no watermark.",
      nadaGuardado: "Nothing is stored",
      nadaGuardadoTexto: "The image is processed on the spot and discarded. We keep no copy.",
      copiarImagem: "Copy image",
      imagemCopiada: "Image copied",
      naoCopiou: "Your browser would not allow copying. Use Download PNG.",
      baixarPng: "Download PNG",
      semRecorte: "No cutout",
      naoGerouPng: "Could not generate the PNG",
      recortando: "Cutting out the subject",
      restaurando: "Restoring",
      compararOriginal: "Compare the original with the cutout",
      pincelMagico: "Magic brush",
      pincelDevolver: "Paint over the erased photo to bring back what the cutout removed.",
      pincelTirar: "Paint over leftover background to remove it from the cutout.",
      magicoDevolver: "Brush over what you want back: the whole element returns, with its edge.",
      magicoTirar: "Brush over what you want gone: the whole element leaves, with its edge.",
      mudamTamanho: "change the size.",
      apagar: "Erase",
      restaurar: "Restore",
    },
    vetorizador: {
      formatos: "JPG, PNG, WEBP or AVIF · up to 80 MB · comes out as SVG",
      curvasDeVerdade: "Real curves",
      curvasDeVerdadeTexto: "Every shape becomes a vector path. Zoom as far as you like: the edge stays smooth.",
      fielAImagem: "True to the image",
      fielAImagemTexto: "Colors and detail level are chosen from the image, and the fidelity of the result is measured.",
      nadaSai: "Nothing leaves your device",
      nadaSaiTexto: "Vectorizing runs in your browser. The image is never uploaded anywhere.",
      baixarSvg: "Download SVG",
      copiarCodigo: "Copy code",
      copiarCodigoSvg: "Copy SVG code",
      codigoCopiado: "SVG code copied",
      abrindoImagem: "Opening the image",
      arquivo: "File",
      cores: "Colors",
      formas: "Shapes",
      fidelidade: "Fidelity",
      detalhe: "Detail",
      suavidade: "Smoothing",
      estilo: "Style",
      automatico: "Auto",
      logo: "Logo",
      ilustracao: "Illustration",
      foto: "Photo",
      traco: "Line art",
      corDoTraco: "Line color",
      limiar: "Threshold",
      outraCor: "Another color",
      fundoTransparente: "Transparent background",
      fundoTransparenteTexto: "Removes the flat background that touches the edges.",
      jaTransparente: "This image already has a transparent background.",
      escolhaOEstilo: "Pick the style and the color count by looking at the image.",
      dicaAutomatico: "Automatic: separates ink from paper on its own.",
      dicaLogo: "Few flat colors and precise edges, for marks and icons.",
      dicaIlustracao: "More colors and smaller shapes, for drawings and artwork.",
      menosCores: "Fewer colors make the file smaller and cleaner.",
      dicaFoto: "Poster effect: smooths the noise and groups the tones.",
      dicaTraco: "Ink only, no background, for drawings, signatures and stamps.",
      limiarMaisAlto: "Higher picks up lighter tones as ink.",
      preto: "Black",
      branco: "White",
      compararSvg: "Compare the image with the SVG",
      imagem: "Image",
      vetorizadoAqui: "Vectorized on your device. The image is never uploaded anywhere.",
    },
    qr: {
      criar: "Create QR Code",
      criando: "Creating your QR Code",
      copiarLink: "Copy link",
      linkCopiado: "Link copied!",
      criadoComSucesso: "QR Code created",
      linkInvalido: "That link is not valid",
      preenchaOLink: "Please enter a link before generating the QR Code",
      naoBaixou: "Could not download the QR Code",
      erroAoCriar: "Could not create the QR Code",
      naoEscaneavel: "This drawing is not scannable. Click create to generate the real code.",
      previaIlustrativa: "Illustrative preview",
      quemEscanear: "Whoever scans it goes straight to the link you shortened.",
      impressao: "print",
      imagemMinuscula: "image",
      logoNoCentro: "Logo in the center",
      logoNoCentroTexto: "Your mark inside the code",
      ativarLogo: "Put a logo in the center of the QR Code",
      marcaNoMeio: "The mark appears in the middle of the QR Code",
      enviarLogo: "Upload a logo image",
      limparFundoDoLogo: "Clear the background behind the logo",
      ate4mb: "Up to 4 MB.",
      naoAplicouIcone: "Could not apply this icon",
      naoCarregouImagem: "Could not load the image",
    },
    instagram: {
      arrobaInvalido: "That @ is not valid",
      criandoQr: "Creating your QR Code",
      gerandoPerfil: "We are generating the code for your profile.",
      gerarQr: "Create my QR Code",
      usarIcone: "Use the Instagram icon in the center of the QR Code",
      naoCarregouIcone: "Could not load the Instagram icon",
      seuPerfil: "your.profile",
      compartilharPerfil: "Share profile",
      copiarLink: "Copy link",
      baixar: "Download",
      refazer: "Retake",
    },
    whatsapp: {
      criandoLink: "Creating your link",
      gerandoLink: "We are generating your WhatsApp link and QR Code.",
      gerarLink: "Create my link",
      customizeMensagem: "Customize your message",
      usarIcone: "Use the WhatsApp icon in the center of the QR Code",
      suaMensagem: "Your message appears here",
      linkCopiadoSucesso: "Link copied",
      exemploMensagem: 'Example: "Hi, I\'d like to know more about the product"',
    },
    cartao: {
      numero: "Number",
      numeroDoCartao: "Card number",
      gerar: "Generate card",
      copiarNumero: "Copy card number",
      copiarValidade: "Copy expiry date",
      copiarCid: "Copy CID",
      copiarCvv: "Copy CVV",
      copiarPrefixo: "Copy",
      validade: "Expiry",
      codigo: "Security code",
    },
  },
};
