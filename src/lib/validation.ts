import { z } from "zod";
import { MAX_URL_LENGTH, isValidLink } from "./link";

/**
 * Esquemas das fronteiras HTTP.
 *
 * O shortcode aceita o conjunto "unreserved" da RFC 3986 (A-Z a-z 0-9 . _ ~ -).
 * É deliberadamente permissivo: a app gera `uuidv4().slice(0, 6)`, mas a rota é
 * pública e integrações existentes podem usar outros formatos. O que fica de
 * fora — barra, espaço, byte nulo, caractere de controle — não sobreviveria ao
 * roteamento de qualquer jeito.
 */
export const shortcodeSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9._~-]+$/);

/**
 * Só http e https. `new URL()` sozinho aceita `javascript:`, `data:` e `file:`,
 * que viram destino de redirect no /[shortcode].
 */
export const externalUrlSchema = z
  .string()
  .min(1)
  .max(MAX_URL_LENGTH)
  // Mesma função usada pelo formulário, para que cliente e servidor nunca
  // discordem sobre o que é um link. Além de esquema, cobre host sem TLD
  // ("https://abc") e credencial embutida ("https://banco.com@golpe.com").
  .refine(isValidLink);

export const createQRCodeSchema = z.object({
  url: externalUrlSchema,
  shortcode: shortcodeSchema,
  expiresAt: z.union([z.string().datetime(), z.null()]).optional(),
  description: z.string().max(2000).nullish(),
});

export const updateQRCodeSchema = z
  .object({
    url: externalUrlSchema.optional(),
    isActive: z.boolean().optional(),
    expiresAt: z.union([z.string().datetime(), z.null()]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Nenhum campo para atualizar",
  });
