import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Paperclip, Upload, Trash2, Download, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
}

const MAX_BYTES = 10 * 1024 * 1024; // 10MB

export function ExpenseAttachments({ expenseId, canEdit }: { expenseId: string; canEdit: boolean }) {
  const { user } = useAuth();
  const [items, setItems] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("expense_attachments")
      .select("*")
      .eq("expense_id", expenseId)
      .order("created_at", { ascending: false });
    if (error) toast.error("Error al cargar adjuntos: " + error.message);
    setItems((data || []) as Attachment[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [expenseId]);

  const handleFile = async (file: File) => {
    if (file.size > MAX_BYTES) {
      toast.error("El archivo supera el límite de 10MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${expenseId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("expense-attachments").upload(path, file, {
        contentType: file.type || undefined,
      });
      if (upErr) throw upErr;
      const { error: insErr } = await (supabase as any).from("expense_attachments").insert({
        expense_id: expenseId,
        file_name: file.name,
        file_path: path,
        file_size: file.size,
        mime_type: file.type || null,
        uploaded_by: user?.id,
      });
      if (insErr) throw insErr;
      toast.success("Archivo adjuntado");
      load();
    } catch (e: any) {
      toast.error("Error al subir: " + e.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDownload = async (a: Attachment) => {
    const { data, error } = await supabase.storage.from("expense-attachments").createSignedUrl(a.file_path, 60);
    if (error || !data) { toast.error("No se pudo descargar"); return; }
    window.open(data.signedUrl, "_blank");
  };

  const handleDelete = async (a: Attachment) => {
    if (!confirm(`¿Eliminar ${a.file_name}?`)) return;
    try {
      await supabase.storage.from("expense-attachments").remove([a.file_path]);
      const { error } = await (supabase as any).from("expense_attachments").delete().eq("id", a.id);
      if (error) throw error;
      toast.success("Adjunto eliminado");
      load();
    } catch (e: any) {
      toast.error("Error: " + e.message);
    }
  };

  const fmtSize = (b: number | null) => {
    if (!b) return "—";
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1024 / 1024).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Paperclip className="h-4 w-4" /> Adjuntos ({items.length})
        </h3>
        {canEdit && (
          <>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              accept=".pdf,.xml,.jpg,.jpeg,.png,.webp,.xlsx,.xls,.docx,.doc"
            />
            <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />}
              Subir
            </Button>
          </>
        )}
      </div>
      {loading ? (
        <div className="text-xs text-muted-foreground">Cargando...</div>
      ) : items.length === 0 ? (
        <div className="text-xs text-muted-foreground py-4 text-center border border-dashed rounded">
          Sin archivos adjuntos
        </div>
      ) : (
        <div className="space-y-1.5">
          {items.map((a) => (
            <div key={a.id} className="flex items-center gap-2 p-2 border rounded text-sm hover:bg-muted/50">
              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium">{a.file_name}</p>
                <p className="text-xs text-muted-foreground">{fmtSize(a.file_size)}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => handleDownload(a)}>
                <Download className="h-3 w-3" />
              </Button>
              {canEdit && (
                <Button size="sm" variant="ghost" onClick={() => handleDelete(a)}>
                  <Trash2 className="h-3 w-3 text-rose-600" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}