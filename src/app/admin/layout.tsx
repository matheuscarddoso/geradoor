import type { Metadata } from "next";

/**
 * Layout do segmento /admin, existindo apenas para o noindex.
 *
 * A metadata precisa ficar aqui e não na página: /admin/login é client
 * component e não pode exportar metadata, então herdava o `index, follow` do
 * layout raiz. O resultado era sinal contraditório — header dizendo noindex e
 * meta tag dizendo o contrário. Num layout, vale para toda a subárvore.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
