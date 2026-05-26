"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader, Pencil, PowerOff, QrCode, RotateCcw } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

type QRCode = {
  id: string;
  shortcode: string;
  url: string;
  scanCount: number;
  isActive: boolean;
  expiresAt: Date | null;
  createdAt: Date;
  description: string | null;
};


export default function QRCodeTable({ qrcodes }: { qrcodes: QRCode[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<QRCode | null>(null);
  const [editUrl, setEditUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [viewingQR, setViewingQR] = useState<QRCode | null>(null);

  const openEdit = (qr: QRCode) => {
    setEditing(qr);
    setEditUrl(qr.url);
  };

  const closeEdit = () => {
    setEditing(null);
    setEditUrl("");
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/qrcode/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: editUrl }),
      });
      if (!res.ok) throw new Error();
      toast.success("QR Code atualizado");
      closeEdit();
      router.refresh();
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (qr: QRCode) => {
    setTogglingId(qr.id);
    try {
      const res = await fetch(`/api/admin/qrcode/${qr.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !qr.isActive }),
      });
      if (!res.ok) throw new Error();
      toast.success(qr.isActive ? "QR Code desativado" : "QR Code reativado");
      router.refresh();
    } catch {
      toast.error("Erro ao alterar status");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <>
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Shortcode</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Scans</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead>Expira</TableHead>
              <TableHead>Criado</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {qrcodes.map((qr) => (
              <TableRow
                key={qr.id}
                className={qr.isActive ? "" : "opacity-50"}
              >
                <TableCell className="font-mono text-xs">{qr.shortcode}</TableCell>
                <TableCell className="max-w-[240px]">
                  <a
                    href={qr.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline truncate block"
                    title={qr.url}
                  >
                    {qr.url}
                  </a>
                </TableCell>
                <TableCell className="text-muted-foreground">{qr.scanCount}</TableCell>
                <TableCell>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      qr.isActive
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
                    }`}
                  >
                    {qr.isActive ? "sim" : "não"}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {qr.expiresAt
                    ? formatDistanceToNow(new Date(qr.expiresAt), { addSuffix: true, locale: ptBR })
                    : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDistanceToNow(new Date(qr.createdAt), { addSuffix: true, locale: ptBR })}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setViewingQR(qr)}
                      title="Ver QR Code"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openEdit(qr)}
                      title="Editar"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-red-500"
                      onClick={() => handleToggleActive(qr)}
                      disabled={togglingId === qr.id}
                      title={qr.isActive ? "Desativar" : "Reativar"}
                    >
                      {togglingId === qr.id ? (
                        <Loader className="w-3.5 h-3.5 animate-spin" />
                      ) : qr.isActive ? (
                        <PowerOff className="w-3.5 h-3.5" />
                      ) : (
                        <RotateCcw className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Dialog: Editar */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-medium tracking-tight">
              Editar QR Code{" "}
              <span className="font-mono text-zinc-400 text-sm">{editing?.shortcode}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-url">URL de destino</Label>
              <Input
                id="edit-url"
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                placeholder="https://"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={closeEdit} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving || !editUrl}>
                {saving ? <Loader className="w-4 h-4 animate-spin" /> : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Ver QR Code */}
      <Dialog open={!!viewingQR} onOpenChange={(open) => !open && setViewingQR(null)}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="font-medium tracking-tight">
              QR Code{" "}
              <span className="font-mono text-zinc-400 text-sm">{viewingQR?.shortcode}</span>
            </DialogTitle>
          </DialogHeader>
          {viewingQR && (
            <div className="flex flex-col items-center gap-4 pt-2">
              <div className="bg-white p-4 rounded-2xl">
                <QRCodeSVG
                  value={`https://www.geradoor.com/${viewingQR.shortcode}`}
                  size={200}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center break-all">
                {`https://www.geradoor.com/${viewingQR.shortcode}`}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
