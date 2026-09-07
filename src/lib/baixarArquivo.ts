/**
 * Entrega um Blob ao operador como arquivo.
 *
 * Mora fora de `barcodePdf` porque exportar o layout em JSON também precisa
 * disso, e não deve arrastar o `jspdf` inteiro junto.
 */
export function baixar(blob: Blob, nome: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  document.body.append(link);
  link.click();
  link.remove();
  // O revoke imediato corta o download em alguns navegadores; um segundo de
  // folga é suficiente e não vaza.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
