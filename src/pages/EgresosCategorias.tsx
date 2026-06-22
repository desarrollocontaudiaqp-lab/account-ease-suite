import { useState } from "react";
import { Plus, Pencil, Trash2, Loader2, FolderTree } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useExpenseCategories } from "@/hooks/useExpenseCategories";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const EgresosCategorias = () => {
  const { categories, subcategories, loading, refresh } = useExpenseCategories();
  const { role } = useAuth();
  const isAdmin = role === "administrador" || role === "gerente";

  const [catDialog, setCatDialog] = useState(false);
  const [subDialog, setSubDialog] = useState(false);
  const [editingCat, setEditingCat] = useState<any>(null);
  const [editingSub, setEditingSub] = useState<any>(null);
  const [catForm, setCatForm] = useState({ nombre: "", descripcion: "" });
  const [subForm, setSubForm] = useState({ nombre: "", descripcion: "", categoria_id: "" });

  const openNewCat = () => { setEditingCat(null); setCatForm({ nombre: "", descripcion: "" }); setCatDialog(true); };
  const openEditCat = (c: any) => { setEditingCat(c); setCatForm({ nombre: c.nombre, descripcion: c.descripcion || "" }); setCatDialog(true); };
  const openNewSub = (categoriaId?: string) => { setEditingSub(null); setSubForm({ nombre: "", descripcion: "", categoria_id: categoriaId || "" }); setSubDialog(true); };
  const openEditSub = (s: any) => { setEditingSub(s); setSubForm({ nombre: s.nombre, descripcion: s.descripcion || "", categoria_id: s.categoria_id }); setSubDialog(true); };

  const saveCat = async () => {
    if (!catForm.nombre.trim()) { toast.error("El nombre es obligatorio"); return; }
    try {
      if (editingCat) {
        const { error } = await (supabase as any).from("expense_categories").update({ nombre: catForm.nombre.trim(), descripcion: catForm.descripcion || null }).eq("id", editingCat.id);
        if (error) throw error;
        toast.success("Categoría actualizada");
      } else {
        const { error } = await (supabase as any).from("expense_categories").insert({ nombre: catForm.nombre.trim(), descripcion: catForm.descripcion || null });
        if (error) throw error;
        toast.success("Categoría creada");
      }
      setCatDialog(false);
      refresh();
    } catch (e: any) { toast.error("Error: " + e.message); }
  };

  const saveSub = async () => {
    if (!subForm.nombre.trim() || !subForm.categoria_id) { toast.error("Nombre y categoría son obligatorios"); return; }
    try {
      if (editingSub) {
        const { error } = await (supabase as any).from("expense_subcategories").update({ nombre: subForm.nombre.trim(), descripcion: subForm.descripcion || null, categoria_id: subForm.categoria_id }).eq("id", editingSub.id);
        if (error) throw error;
        toast.success("Subcategoría actualizada");
      } else {
        const { error } = await (supabase as any).from("expense_subcategories").insert({ nombre: subForm.nombre.trim(), descripcion: subForm.descripcion || null, categoria_id: subForm.categoria_id });
        if (error) throw error;
        toast.success("Subcategoría creada");
      }
      setSubDialog(false);
      refresh();
    } catch (e: any) { toast.error("Error: " + e.message); }
  };

  const deleteCat = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar la categoría "${nombre}"?`)) return;
    try {
      const { error } = await (supabase as any).from("expense_categories").delete().eq("id", id);
      if (error) throw error;
      toast.success("Categoría eliminada");
      refresh();
    } catch (e: any) { toast.error("Error: " + e.message); }
  };

  const deleteSub = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar la subcategoría "${nombre}"?`)) return;
    try {
      const { error } = await (supabase as any).from("expense_subcategories").delete().eq("id", id);
      if (error) throw error;
      toast.success("Subcategoría eliminada");
      refresh();
    } catch (e: any) { toast.error("Error: " + e.message); }
  };

  return (
    <div className="p-6 space-y-6 font-jakarta">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FolderTree className="h-7 w-7 text-primary" />
            Categorías de Egresos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Organiza tus egresos en categorías y subcategorías
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => openNewSub()}><Plus className="h-4 w-4 mr-2" />Subcategoría</Button>
            <Button onClick={openNewCat}><Plus className="h-4 w-4 mr-2" />Categoría</Button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map((c) => {
            const subs = subcategories.filter((s) => s.categoria_id === c.id);
            return (
              <Card key={c.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{c.nombre}</h3>
                    {c.descripcion && <p className="text-sm text-muted-foreground">{c.descripcion}</p>}
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openNewSub(c.id)}><Plus className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => openEditCat(c)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteCat(c.id, c.nombre)}><Trash2 className="h-4 w-4 text-rose-600" /></Button>
                    </div>
                  )}
                </div>
                {subs.length > 0 && (
                  <ul className="mt-3 space-y-1 border-t pt-3">
                    {subs.map((s) => (
                      <li key={s.id} className="flex items-center justify-between text-sm">
                        <span>• {s.nombre}</span>
                        {isAdmin && (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => openEditSub(s)}><Pencil className="h-3 w-3" /></Button>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => deleteSub(s.id, s.nombre)}><Trash2 className="h-3 w-3 text-rose-600" /></Button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={catDialog} onOpenChange={setCatDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingCat ? "Editar Categoría" : "Nueva Categoría"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nombre *</Label><Input value={catForm.nombre} onChange={(e) => setCatForm((p) => ({ ...p, nombre: e.target.value }))} /></div>
            <div><Label>Descripción</Label><Input value={catForm.descripcion} onChange={(e) => setCatForm((p) => ({ ...p, descripcion: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialog(false)}>Cancelar</Button>
            <Button onClick={saveCat}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={subDialog} onOpenChange={setSubDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingSub ? "Editar Subcategoría" : "Nueva Subcategoría"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Categoría *</Label>
              <Select value={subForm.categoria_id} onValueChange={(v) => setSubForm((p) => ({ ...p, categoria_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Nombre *</Label><Input value={subForm.nombre} onChange={(e) => setSubForm((p) => ({ ...p, nombre: e.target.value }))} /></div>
            <div><Label>Descripción</Label><Input value={subForm.descripcion} onChange={(e) => setSubForm((p) => ({ ...p, descripcion: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubDialog(false)}>Cancelar</Button>
            <Button onClick={saveSub}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EgresosCategorias;