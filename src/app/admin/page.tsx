import { prisma } from "@/lib/prisma";
import { formatDistanceToNow, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import LogoutButton from "./LogoutButton";
import QRCodeTable from "./QRCodeTable";
import QRDashboard from "./QRDashboard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const since7Days = subDays(new Date(), 7);

  const [users, qrcodes, totalScansAgg, scansThisWeekAgg, scanHistory] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.qRCode.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.qRCode.aggregate({ _sum: { scanCount: true } }),
    prisma.scanLog.count({ where: { scannedAt: { gte: since7Days } } }),
    prisma.scanLog.findMany({
      where: { scannedAt: { gte: since7Days } },
      select: { scannedAt: true },
      orderBy: { scannedAt: "asc" },
    }),
  ]);

  const totalQR = qrcodes.length;
  const activeQR = qrcodes.filter((q) => q.isActive).length;
  const totalScans = totalScansAgg._sum.scanCount ?? 0;

  const topQRCodes = [...qrcodes]
    .filter((q) => q.scanCount > 0)
    .sort((a, b) => b.scanCount - a.scanCount)
    .slice(0, 8);

  const recentQRCodes = qrcodes.slice(0, 8);

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-6xl mx-auto space-y-10">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tighter">Admin</h1>
            <p className="text-sm text-zinc-500 mt-1">Visão completa do banco de dados</p>
          </div>
          <LogoutButton />
        </div>

        {/* Dashboard */}
        <section>
          <QRDashboard
            totalQR={totalQR}
            activeQR={activeQR}
            totalScans={totalScans}
            scansThisWeek={scansThisWeekAgg}
            scanHistory={scanHistory}
            topQRCodes={topQRCodes}
            recentQRCodes={recentQRCodes}
          />
        </section>

        {/* Users */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xl font-medium tracking-tight">Usuários</h2>
            <span className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full">
              {users.length}
            </span>
          </div>
          {users.length === 0 ? (
            <p className="text-sm text-zinc-400">Nenhum usuário cadastrado.</p>
          ) : (
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Criado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="text-muted-foreground">{user.id}</TableCell>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true, locale: ptBR })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        {/* QR Codes */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xl font-medium tracking-tight">QR Codes</h2>
            <span className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full">
              {qrcodes.length}
            </span>
          </div>
          {qrcodes.length === 0 ? (
            <p className="text-sm text-zinc-400">Nenhum QR Code gerado ainda.</p>
          ) : (
            <QRCodeTable qrcodes={qrcodes} />
          )}
        </section>
      </div>
    </div>
  );
}
