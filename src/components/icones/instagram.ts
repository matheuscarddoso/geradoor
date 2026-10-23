import { createLucideIcon } from "lucide-react";

/**
 * Ícone do Instagram no traço do Lucide.
 *
 * O lucide-react 1.0 tirou os ícones de marca do pacote. Este é o mesmo
 * desenho que ele trazia até a 0.x, montado pela função do próprio Lucide:
 * sai com a classe `lucide`, o traço e as mesmas props dos outros ícones,
 * então o menu e a busca não percebem a troca.
 *
 * Desenho original: lucide-react 0.460.0, licença ISC.
 */
export const Instagram = createLucideIcon("instagram", [
  ["rect", { width: "20", height: "20", x: "2", y: "2", rx: "5", ry: "5", key: "2e1cvw" }],
  ["path", { d: "M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z", key: "9exkf1" }],
  ["line", { x1: "17.5", x2: "17.51", y1: "6.5", y2: "6.5", key: "r4j83e" }],
]);
