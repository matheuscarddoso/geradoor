import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';

export default async function QRCodeRedirectPage({
  params,
}: {
  params: Promise<{ shortcode: string }>;
}) {
  // await the params promise before using .shortcode
  const { shortcode } = await params;

  const qrCode = await prisma.qRCode.findUnique({
    where: { shortcode },
  });

  if (!qrCode || !qrCode.isActive) {
    notFound();
  }

  await prisma.$transaction([
    prisma.qRCode.update({
      where: { shortcode },
      data: { scanCount: qrCode.scanCount + 1 },
    }),
    prisma.scanLog.create({
      data: { qrCodeId: qrCode.id },
    }),
  ]);

  const url = /^https?:\/\//i.test(qrCode.url)
    ? qrCode.url
    : `https://${qrCode.url}`;

  redirect(url);
  return null;
}
