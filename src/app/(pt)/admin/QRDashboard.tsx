"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

type ScanDay = { date: string; scans: number };

type QRSummary = {
  shortcode: string;
  url: string;
  scanCount: number;
  createdAt: Date;
};

type Props = {
  totalQR: number;
  activeQR: number;
  totalScans: number;
  scansThisWeek: number;
  scanHistory: { scannedAt: Date }[];
  topQRCodes: QRSummary[];
  recentQRCodes: QRSummary[];
};

function buildChartData(logs: { scannedAt: Date }[]): ScanDay[] {
  const days: ScanDay[] = Array.from({ length: 7 }, (_, i) => {
    const d = startOfDay(subDays(new Date(), 6 - i));
    return { date: format(d, "d MMM", { locale: ptBR }), scans: 0 };
  });

  const cutoff = startOfDay(subDays(new Date(), 6));
  for (const log of logs) {
    const d = startOfDay(new Date(log.scannedAt));
    if (d < cutoff) continue;
    const diff = Math.round((d.getTime() - cutoff.getTime()) / 86400000);
    if (diff >= 0 && diff < 7) days[diff].scans++;
  }

  return days;
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: number;
  sub?: string;
}) {
  return (
    <div className="p-5 space-y-1">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tracking-tight">{value.toLocaleString("pt-BR")}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-background px-3 py-2 text-xs shadow-md">
      <p className="text-muted-foreground mb-0.5">{label}</p>
      <p className="font-medium">{payload[0].value} scan{payload[0].value !== 1 ? "s" : ""}</p>
    </div>
  );
};

export default function QRDashboard({
  totalQR,
  activeQR,
  totalScans,
  scansThisWeek,
  scanHistory,
  topQRCodes,
  recentQRCodes,
}: Props) {
  const chartData = buildChartData(scanHistory);

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="grid grid-cols-3 divide-x divide-zinc-200 dark:divide-zinc-800">
          <StatCard
            label="Total QR Codes"
            value={totalQR}
            sub={`${activeQR} ativos · ${totalQR - activeQR} inativos`}
          />
          <StatCard
            label="Total de Scans"
            value={totalScans}
            sub="somando todos os QR codes"
          />
          <StatCard
            label="Scans (7 dias)"
            value={scansThisWeek}
            sub="últimos 7 dias"
          />
        </div>
      </div>

      {/* Area chart */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 pt-6">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="scanGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="scans"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#scanGrad)"
              dot={false}
              activeDot={{ r: 4, fill: "#3b82f6" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Two tables */}
      <div className="grid grid-cols-2 gap-4">
        {/* Top QR codes */}
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
            <p className="text-sm font-medium">Mais escaneados</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Scans</p>
          </div>
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {topQRCodes.length === 0 ? (
              <li className="px-4 py-3 text-sm text-muted-foreground">Nenhum scan ainda.</li>
            ) : (
              topQRCodes.map((qr) => (
                <li key={qr.shortcode} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/40 transition-colors">
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-medium">{qr.shortcode}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[180px]">{qr.url}</p>
                  </div>
                  <span className="text-sm font-medium tabular-nums ml-4">{qr.scanCount}</span>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Recent QR codes */}
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
            <p className="text-sm font-medium">Criados recentemente</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Data</p>
          </div>
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {recentQRCodes.map((qr) => (
              <li key={qr.shortcode} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/40 transition-colors">
                <div className="min-w-0">
                  <p className="font-mono text-xs font-medium">{qr.shortcode}</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[180px]">{qr.url}</p>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums ml-4 shrink-0">
                  {format(new Date(qr.createdAt), "d MMM", { locale: ptBR })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
