import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';

export default async function QRCodeRedirectPage({
  params,
}: {
  params: Promise<{ shortcode: string }>;
}) {
  const { shortcode } = await params;

  const qrCode = await prisma.qRCode.findUnique({
    where: { shortcode },
  });

  const isExpired = qrCode?.expiresAt != null && qrCode.expiresAt <= new Date();

  if (!qrCode || !qrCode.isActive || isExpired) {
    notFound();
  }

  await prisma.$transaction([
    // increment é resolvido no banco. A versão anterior lia scanCount fora da
    // transação e escrevia lido+1, então scans concorrentes se sobrescreviam.
    prisma.qRCode.update({
      where: { shortcode },
      data: { scanCount: { increment: 1 } },
    }),
    prisma.scanLog.create({
      data: { qrCodeId: qrCode.id },
    }),
  ]);

  const url = /^https?:\/\//i.test(qrCode.url)
    ? qrCode.url
    : `https://${qrCode.url}`;

  redirect(url);
}
