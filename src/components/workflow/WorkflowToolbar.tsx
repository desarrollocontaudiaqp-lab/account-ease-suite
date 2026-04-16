import { useState, useEffect } from "react";
import { Plus, FileDown, FileUp, FolderOpen, Download, Loader2, Search, Workflow, X, Building2, Calendar, Trash2, Edit2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { WorkFlowModal } from "@/components/asignaciones/WorkFlowModal";
import * as XLSX from "xlsx";

interface WorkflowItem {
  id: string;
  tipo: "actividad" | "input" | "tarea" | "output" | "supervision";
  titulo: string;
  descripcion?: string;
  asignado_a?: string;
  asignado_nombre?: string;
  rol?: string;
  completado: boolean;
  orden: number;
  conexiones?: string[];
  subColumna?: number;
  parentId?: string;
  enlaceSharepoint?: string;
  fecha_inicio?: string;
  fecha_termino?: string;
  progreso?: number;
}

interface SavedWorkflow {
  id: string;
  codigo: string;
  contrato_id: string;
  fecha_creacion: string;
  items: WorkflowItem[];
  contrato?: {
    numero: string;
    descripcion: string;
    tipo_servicio: string;
    cliente?: { razon_social: string; codigo: string };
  };
}

interface ContratoOption {
  id: string;
  numero: string;
  descripcion: string;
  tipo_servicio: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  cliente: { razon_social: string; codigo: string };
  cartera: { id: string; nombre: string; especialidad: string | null } | null;
}

interface MiembroCartera {
  user_id: string;
  rol_en_cartera: string;
  profile: { full_name: string | null; email: string } | null;
}

interface WorkflowToolbarProps {
  onRefresh: () => void;
}

export function WorkflowToolbar({ onRefresh }: WorkflowToolbarProps) {
  // New workflow states
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [contratos, setContratos] = useState<ContratoOption[]>([]);
  const [selectedContratoId, setSelectedContratoId] = useState<string>("");
  const [miembros, setMiembros] = useState<MiembroCartera[]>([]);
  const [workflowModalOpen, setWorkflowModalOpen] = useState(false);
  const [loadingContratos, setLoadingContratos] = useState(false);

  // Open workflow states
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [savedWorkflows, setSavedWorkflows] = useState<SavedWorkflow[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [searchSaved, setSearchSaved] = useState("");
  const [selectedSavedWorkflow, setSelectedSavedWorkflow] = useState<SavedWorkflow | null>(null);
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [targetContratoId, setTargetContratoId] = useState<string>("");
  const [showApplyDialog, setShowApplyDialog] = useState(false);

  // Delete/Edit states
  const [deletingWorkflowId, setDeletingWorkflowId] = useState<string | null>(null);
  const [editingWorkflowId, setEditingWorkflowId] = useState<string | null>(null);
  const [editingCode, setEditingCode] = useState("");

  // Open workflow into modal states
  const [openingWorkflowContrato, setOpeningWorkflowContrato] = useState<ContratoOption | null>(null);
  const [openingMiembros, setOpeningMiembros] = useState<MiembroCartera[]>([]);
  const [openWorkflowModalOpen, setOpenWorkflowModalOpen] = useState(false);

  // Import states
  const [importing, setImporting] = useState(false);

  // Load contratos when opening the new dialog
  const loadContratos = async () => {
    setLoadingContratos(true);
    try {
      const { data: contratosData, error } = await supabase
        .from("contratos")
        .select("id, numero, descripcion, tipo_servicio, fecha_inicio, fecha_fin, cliente_id")
        .in("condicion", ["Vigente"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get clients for these contratos
      const clienteIds = [...new Set((contratosData || []).map(c => c.cliente_id))];
      const { data: clientesData } = await supabase
        .from("clientes")
        .select("id, razon_social, codigo")
        .in("id", clienteIds);

      // Get cartera assignments
      const { data: carteraClientes } = await supabase
        .from("cartera_clientes")
        .select("cliente_id, cartera_id");

      const { data: carteras } = await supabase
        .from("carteras")
        .select("id, nombre, especialidad");

      const clienteMap = new Map((clientesData || []).map(c => [c.id, c]));
      const carteraClienteMap = new Map((carteraClientes || []).map(cc => [cc.cliente_id, cc.cartera_id]));
      const carteraMap = new Map((carteras || []).map(c => [c.id, c]));

      const mapped: ContratoOption[] = (contratosData || []).map(c => {
        const cliente = clienteMap.get(c.cliente_id);
        const carteraId = carteraClienteMap.get(c.cliente_id);
        const cartera = carteraId ? carteraMap.get(carteraId) : null;
        return {
          id: c.id,
          numero: c.numero,
          descripcion: c.descripcion,
          tipo_servicio: c.tipo_servicio,
          fecha_inicio: c.fecha_inicio,
          fecha_fin: c.fecha_fin,
          cliente: {
            razon_social: cliente?.razon_social || "Sin cliente",
            codigo: cliente?.codigo || "",
          },
          cartera: cartera ? { id: cartera.id, nombre: cartera.nombre, especialidad: cartera.especialidad } : null,
        };
      });

      setContratos(mapped);
    } catch (error) {
      console.error("Error loading contratos:", error);
      toast.error("Error al cargar contratos");
    }
    setLoadingContratos(false);
  };

  const loadMiembros = async (carteraId: string) => {
    try {
      const { data, error } = await supabase
        .from("cartera_miembros")
        .select("user_id, rol_en_cartera")
        .eq("cartera_id", carteraId);

      if (error) throw error;

      const userIds = (data || []).map(m => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      const mapped: MiembroCartera[] = (data || []).map(m => ({
        user_id: m.user_id,
        rol_en_cartera: m.rol_en_cartera,
        profile: profileMap.get(m.user_id) || null,
      }));

      setMiembros(mapped);
    } catch (error) {
      console.error("Error loading miembros:", error);
    }
  };

  const handleNewWorkflow = () => {
    setShowNewDialog(true);
    loadContratos();
  };

  const handleSelectContrato = async (contratoId: string) => {
    setSelectedContratoId(contratoId);
    const contrato = contratos.find(c => c.id === contratoId);
    if (contrato?.cartera) {
      await loadMiembros(contrato.cartera.id);
    }
  };

  const handleOpenWorkflowModal = () => {
    if (!selectedContratoId) {
      toast.error("Selecciona un contrato primero");
      return;
    }
    const contrato = contratos.find(c => c.id === selectedContratoId);
    if (!contrato?.cartera) {
      toast.error("El contrato no tiene una cartera asignada");
      return;
    }
    setShowNewDialog(false);
    setWorkflowModalOpen(true);
  };

  // Open saved workflows
  const handleOpenSaved = async () => {
    setShowOpenDialog(true);
    setLoadingSaved(true);
    try {
      const { data, error } = await supabase
        .from("workflows")
        .select("id, codigo, contrato_id, fecha_creacion, items")
        .order("fecha_creacion", { ascending: false });

      if (error) throw error;

      // Get contrato details
      const contratoIds = [...new Set((data || []).map(w => w.contrato_id))];
      const { data: contratosData } = await supabase
        .from("contratos")
        .select("id, numero, descripcion, tipo_servicio, cliente_id");

      const { data: clientesData } = await supabase
        .from("clientes")
        .select("id, razon_social, codigo");

      const clienteMap = new Map((clientesData || []).map(c => [c.id, c]));

      const mapped: SavedWorkflow[] = (data || []).map(w => {
        const contrato = contratosData?.find(c => c.id === w.contrato_id);
        const cliente = contrato ? clienteMap.get(contrato.cliente_id) : null;
        return {
          id: w.id,
          codigo: w.codigo,
          contrato_id: w.contrato_id,
          fecha_creacion: w.fecha_creacion,
          items: (w.items as unknown as WorkflowItem[]) || [],
          contrato: contrato ? {
            numero: contrato.numero,
            descripcion: contrato.descripcion,
            tipo_servicio: contrato.tipo_servicio,
            cliente: cliente ? { razon_social: cliente.razon_social, codigo: cliente.codigo } : undefined,
          } : undefined,
        };
      });

      setSavedWorkflows(mapped);
    } catch (error) {
      console.error("Error loading workflows:", error);
      toast.error("Error al cargar workflows");
    }
    setLoadingSaved(false);
  };

  const handleApplyTemplate = async () => {
    if (!selectedSavedWorkflow || !targetContratoId) return;
    setApplyingTemplate(true);
    try {
      const targetContrato = contratos.find(c => c.id === targetContratoId);

      // Clone items with new IDs, removing assignees
      const idMap = new Map<string, string>();
      const clonedItems: WorkflowItem[] = selectedSavedWorkflow.items.map(item => {
        const newId = crypto.randomUUID();
        idMap.set(item.id, newId);
        return {
          ...item,
          id: newId,
          asignado_a: undefined,
          asignado_nombre: undefined,
          completado: false,
          progreso: 0,
        };
      });

      // Update references
      clonedItems.forEach(item => {
        if (item.conexiones) {
          item.conexiones = item.conexiones.map(c => idMap.get(c) || c);
        }
        if (item.parentId) {
          item.parentId = idMap.get(item.parentId) || item.parentId;
        }
      });

      const { data: userData } = await supabase.auth.getUser();
      const { data: codeData, error: codeError } = await supabase.rpc("get_next_workflow_code");
      if (codeError) throw codeError;

      const { error } = await supabase.from("workflows").insert({
        codigo: codeData as string,
        contrato_id: targetContratoId,
        items: clonedItems as any,
        created_by: userData?.user?.id,
      });

      if (error) throw error;

      toast.success("Workflow aplicado como plantilla correctamente");
      setShowApplyDialog(false);
      setShowOpenDialog(false);
      setSelectedSavedWorkflow(null);
      setTargetContratoId("");
      onRefresh();
    } catch (error) {
      console.error("Error applying template:", error);
      toast.error("Error al aplicar la plantilla");
    }
    setApplyingTemplate(false);
  };

  const handleStartApplyTemplate = (workflow: SavedWorkflow) => {
    setSelectedSavedWorkflow(workflow);
    setShowApplyDialog(true);
    if (contratos.length === 0) loadContratos();
  };

  // Open workflow into the WorkFlowModal
  const handleOpenWorkflow = async (workflow: SavedWorkflow) => {
    // We need the contrato details + cartera + miembros
    try {
      const { data: contratoData, error: cError } = await supabase
        .from("contratos")
        .select("id, numero, descripcion, tipo_servicio, fecha_inicio, fecha_fin, cliente_id")
        .eq("id", workflow.contrato_id)
        .single();
      if (cError) throw cError;

      const { data: clienteData } = await supabase
        .from("clientes")
        .select("id, razon_social, codigo")
        .eq("id", contratoData.cliente_id)
        .single();

      const { data: carteraCliente } = await supabase
        .from("cartera_clientes")
        .select("cartera_id")
        .eq("cliente_id", contratoData.cliente_id)
        .maybeSingle();

      let cartera: { id: string; nombre: string; especialidad: string | null } | null = null;
      if (carteraCliente) {
        const { data: carteraData } = await supabase
          .from("carteras")
          .select("id, nombre, especialidad")
          .eq("id", carteraCliente.cartera_id)
          .single();
        cartera = carteraData;
      }

      if (!cartera) {
        toast.error("El contrato no tiene una cartera asignada");
        return;
      }

      // Load miembros
      const { data: miembrosData } = await supabase
        .from("cartera_miembros")
        .select("user_id, rol_en_cartera")
        .eq("cartera_id", cartera.id);

      const userIds = (miembrosData || []).map(m => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      const mappedMiembros: MiembroCartera[] = (miembrosData || []).map(m => ({
        user_id: m.user_id,
        rol_en_cartera: m.rol_en_cartera,
        profile: profileMap.get(m.user_id) || null,
      }));

      setOpeningWorkflowContrato({
        id: contratoData.id,
        numero: contratoData.numero,
        descripcion: contratoData.descripcion,
        tipo_servicio: contratoData.tipo_servicio,
        fecha_inicio: contratoData.fecha_inicio,
        fecha_fin: contratoData.fecha_fin,
        cliente: {
          razon_social: clienteData?.razon_social || "Sin cliente",
          codigo: clienteData?.codigo || "",
        },
        cartera,
      });
      setOpeningMiembros(mappedMiembros);
      setShowOpenDialog(false);
      setOpenWorkflowModalOpen(true);
    } catch (error) {
      console.error("Error opening workflow:", error);
      toast.error("Error al abrir el workflow");
    }
  };

  // Delete workflow
  const handleDeleteWorkflow = async () => {
    if (!deletingWorkflowId) return;
    try {
      const { error } = await supabase
        .from("workflows")
        .delete()
        .eq("id", deletingWorkflowId);
      if (error) throw error;
      toast.success("Workflow eliminado correctamente");
      setSavedWorkflows(prev => prev.filter(w => w.id !== deletingWorkflowId));
      setDeletingWorkflowId(null);
      onRefresh();
    } catch (error) {
      console.error("Error deleting workflow:", error);
      toast.error("Error al eliminar el workflow");
    }
  };

  // Rename workflow
  const handleRenameWorkflow = async () => {
    if (!editingWorkflowId || !editingCode.trim()) return;
    try {
      const { error } = await supabase
        .from("workflows")
        .update({ codigo: editingCode.trim() })
        .eq("id", editingWorkflowId);
      if (error) throw error;
      toast.success("Código actualizado correctamente");
      setSavedWorkflows(prev => prev.map(w =>
        w.id === editingWorkflowId ? { ...w, codigo: editingCode.trim() } : w
      ));
      setEditingWorkflowId(null);
      setEditingCode("");
    } catch (error) {
      console.error("Error renaming workflow:", error);
      toast.error("Error al renombrar el workflow");
    }
  };

  // Excel template download
  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    // Activities sheet
    const actividadesData = [
      ["Actividad", "Descripción", "Fecha Inicio (YYYY-MM-DD)", "Fecha Término (YYYY-MM-DD)"],
      ["Creación de Carpeta", "Organización inicial del expediente", "", ""],
      ["Crear Libros", "Preparación de libros contables", "", ""],
    ];
    const wsActividades = XLSX.utils.aoa_to_sheet(actividadesData);
    wsActividades["!cols"] = [{ wch: 30 }, { wch: 45 }, { wch: 22 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, wsActividades, "Actividades");

    // Inputs sheet
    const inputsData = [
      ["Actividad (nombre exacto)", "Input", "Descripción", "Enlace SharePoint"],
      ["Creación de Carpeta", "Documentos de constitución", "Recopilar documentos legales", ""],
      ["Creación de Carpeta", "Ficha RUC", "Constancia de registro", ""],
      ["Crear Libros", "Declaraciones anteriores", "PDTs y declaraciones previas", ""],
    ];
    const wsInputs = XLSX.utils.aoa_to_sheet(inputsData);
    wsInputs["!cols"] = [{ wch: 30 }, { wch: 30 }, { wch: 45 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, wsInputs, "Inputs");

    // Procesos sheet
    const procesosData = [
      ["Actividad (nombre exacto)", "Input (nombre exacto)", "SubColumna (1, 2 o 3)", "Tarea", "Descripción", "Rol"],
      ["Creación de Carpeta", "Documentos de constitución", "1", "Verificar documentos", "Revisar completitud", "Asistente"],
      ["Creación de Carpeta", "Documentos de constitución", "2", "Clasificar documentos", "Organizar por tipo", "Asistente"],
      ["Creación de Carpeta", "Documentos de constitución", "3", "Archivar documentos", "Digitalizar y guardar", "Asistente"],
    ];
    const wsProcesos = XLSX.utils.aoa_to_sheet(procesosData);
    wsProcesos["!cols"] = [{ wch: 30 }, { wch: 30 }, { wch: 18 }, { wch: 30 }, { wch: 40 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsProcesos, "Procesos");

    // Outputs sheet
    const outputsData = [
      ["Actividad (nombre exacto)", "Output", "Descripción", "Enlace SharePoint"],
      ["Creación de Carpeta", "Carpeta digital organizada", "Carpeta lista para uso", ""],
      ["Crear Libros", "Libros contables creados", "Libros listos para registro", ""],
    ];
    const wsOutputs = XLSX.utils.aoa_to_sheet(outputsData);
    wsOutputs["!cols"] = [{ wch: 30 }, { wch: 30 }, { wch: 45 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, wsOutputs, "Outputs");

    // Supervisión sheet
    const supervisionData = [
      ["Actividad (nombre exacto)", "Supervisión", "Descripción"],
      ["Creación de Carpeta", "Verificar carpeta completa", "Revisar que todos los documentos estén organizados"],
      ["Crear Libros", "Verificar libros creados", "Validar que los libros cumplan con los requisitos"],
    ];
    const wsSupervision = XLSX.utils.aoa_to_sheet(supervisionData);
    wsSupervision["!cols"] = [{ wch: 30 }, { wch: 30 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, wsSupervision, "Supervisión");

    // Instructions sheet
    const instrucciones = [
      ["INSTRUCCIONES PARA LA PLANTILLA DE WORKFLOW"],
      [""],
      ["1. Hoja 'Actividades': Define las actividades principales del flujo de trabajo."],
      ["   - Cada fila es una actividad. El nombre debe ser único."],
      [""],
      ["2. Hoja 'Inputs': Define los datos de entrada para cada actividad."],
      ["   - La columna 'Actividad' debe coincidir exactamente con el nombre de la hoja Actividades."],
      [""],
      ["3. Hoja 'Procesos': Define las tareas/procesos vinculados a cada input."],
      ["   - 'Actividad' e 'Input' deben coincidir exactamente con los nombres previos."],
      ["   - 'SubColumna' indica la columna del proceso (1, 2 o 3)."],
      [""],
      ["4. Hoja 'Outputs': Define los entregables de cada actividad."],
      [""],
      ["5. Hoja 'Supervisión': Define los puntos de verificación."],
      [""],
      ["NOTAS:"],
      ["- Los nombres de Actividad e Input deben ser exactamente iguales en todas las hojas."],
      ["- Las fechas deben estar en formato YYYY-MM-DD (ej: 2026-01-15)."],
      ["- Las SubColumnas de Procesos van de 1 a 3."],
    ];
    const wsInstrucciones = XLSX.utils.aoa_to_sheet(instrucciones);
    wsInstrucciones["!cols"] = [{ wch: 80 }];
    XLSX.utils.book_append_sheet(wb, wsInstrucciones, "Instrucciones");

    XLSX.writeFile(wb, "Plantilla_Workflow.xlsx");
    toast.success("Plantilla descargada correctamente");
  };

  // Import from Excel
  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);

    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);

      // Parse Actividades
      const wsAct = wb.Sheets["Actividades"];
      if (!wsAct) throw new Error("No se encontró la hoja 'Actividades'");
      const actRows: any[] = XLSX.utils.sheet_to_json(wsAct);

      const items: WorkflowItem[] = [];
      const activityMap = new Map<string, string>(); // name -> id

      actRows.forEach((row, i) => {
        const name = row["Actividad"]?.toString().trim();
        if (!name) return;
        const id = crypto.randomUUID();
        activityMap.set(name, id);
        items.push({
          id,
          tipo: "actividad",
          titulo: name,
          descripcion: row["Descripción"]?.toString() || undefined,
          completado: false,
          orden: i,
          fecha_inicio: row["Fecha Inicio (YYYY-MM-DD)"]?.toString() || undefined,
          fecha_termino: row["Fecha Término (YYYY-MM-DD)"]?.toString() || undefined,
        });
      });

      // Parse Inputs
      const wsInp = wb.Sheets["Inputs"];
      const inputMap = new Map<string, string>(); // "actName|inputName" -> id
      if (wsInp) {
        const inpRows: any[] = XLSX.utils.sheet_to_json(wsInp);
        inpRows.forEach((row, i) => {
          const actName = row["Actividad (nombre exacto)"]?.toString().trim();
          const inputName = row["Input"]?.toString().trim();
          if (!actName || !inputName) return;
          const parentId = activityMap.get(actName);
          if (!parentId) return;
          const id = crypto.randomUUID();
          inputMap.set(`${actName}|${inputName}`, id);
          items.push({
            id,
            tipo: "input",
            titulo: inputName,
            descripcion: row["Descripción"]?.toString() || undefined,
            enlaceSharepoint: row["Enlace SharePoint"]?.toString() || undefined,
            completado: false,
            orden: i,
            parentId,
          });
        });
      }

      // Parse Procesos
      const wsProc = wb.Sheets["Procesos"];
      if (wsProc) {
        const procRows: any[] = XLSX.utils.sheet_to_json(wsProc);
        procRows.forEach((row, i) => {
          const actName = row["Actividad (nombre exacto)"]?.toString().trim();
          const inputName = row["Input (nombre exacto)"]?.toString().trim();
          const subCol = parseInt(row["SubColumna (1, 2 o 3)"]?.toString() || "1") - 1;
          const taskName = row["Tarea"]?.toString().trim();
          if (!actName || !inputName || !taskName) return;
          const parentId = inputMap.get(`${actName}|${inputName}`);
          if (!parentId) return;
          items.push({
            id: crypto.randomUUID(),
            tipo: "tarea",
            titulo: taskName,
            descripcion: row["Descripción"]?.toString() || undefined,
            rol: row["Rol"]?.toString() || undefined,
            completado: false,
            orden: i,
            subColumna: Math.min(Math.max(subCol, 0), 2),
            parentId,
          });
        });
      }

      // Parse Outputs
      const wsOut = wb.Sheets["Outputs"];
      if (wsOut) {
        const outRows: any[] = XLSX.utils.sheet_to_json(wsOut);
        outRows.forEach((row, i) => {
          const actName = row["Actividad (nombre exacto)"]?.toString().trim();
          const outputName = row["Output"]?.toString().trim();
          if (!actName || !outputName) return;
          const parentId = activityMap.get(actName);
          if (!parentId) return;
          items.push({
            id: crypto.randomUUID(),
            tipo: "output",
            titulo: outputName,
            descripcion: row["Descripción"]?.toString() || undefined,
            enlaceSharepoint: row["Enlace SharePoint"]?.toString() || undefined,
            completado: false,
            orden: i,
            parentId,
          });
        });
      }

      // Parse Supervisión
      const wsSup = wb.Sheets["Supervisión"];
      if (wsSup) {
        const supRows: any[] = XLSX.utils.sheet_to_json(wsSup);
        supRows.forEach((row, i) => {
          const actName = row["Actividad (nombre exacto)"]?.toString().trim();
          const supName = row["Supervisión"]?.toString().trim();
          if (!actName || !supName) return;
          const parentId = activityMap.get(actName);
          if (!parentId) return;
          items.push({
            id: crypto.randomUUID(),
            tipo: "supervision",
            titulo: supName,
            descripcion: row["Descripción"]?.toString() || undefined,
            completado: false,
            orden: i,
            parentId,
          });
        });
      }

      if (items.length === 0) {
        toast.error("No se encontraron datos válidos en el archivo");
        setImporting(false);
        return;
      }

      // Ask user which contract to apply to
      if (contratos.length === 0) await loadContratos();

      // Store imported items temporarily and show contract selection
      setImportedItems(items);
      setShowImportApplyDialog(true);

      toast.success(`Se importaron ${items.length} elementos del workflow`);
    } catch (error: any) {
      console.error("Error importing:", error);
      toast.error(error.message || "Error al importar el archivo Excel");
    }
    setImporting(false);
    // Reset file input
    e.target.value = "";
  };

  const [importedItems, setImportedItems] = useState<WorkflowItem[]>([]);
  const [showImportApplyDialog, setShowImportApplyDialog] = useState(false);
  const [importTargetContratoId, setImportTargetContratoId] = useState("");

  const handleApplyImport = async () => {
    if (!importTargetContratoId || importedItems.length === 0) return;
    setApplyingTemplate(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data: codeData, error: codeError } = await supabase.rpc("get_next_workflow_code");
      if (codeError) throw codeError;

      const { error } = await supabase.from("workflows").insert({
        codigo: codeData as string,
        contrato_id: importTargetContratoId,
        items: importedItems as any,
        created_by: userData?.user?.id,
      });

      if (error) throw error;

      toast.success("Workflow importado y guardado correctamente");
      setShowImportApplyDialog(false);
      setImportedItems([]);
      setImportTargetContratoId("");
      onRefresh();
    } catch (error) {
      console.error("Error applying import:", error);
      toast.error("Error al guardar el workflow importado");
    }
    setApplyingTemplate(false);
  };

  const selectedContrato = contratos.find(c => c.id === selectedContratoId);

  const filteredWorkflows = savedWorkflows.filter(w => {
    if (!searchSaved) return true;
    const q = searchSaved.toLowerCase();
    return (
      w.codigo.toLowerCase().includes(q) ||
      w.contrato?.numero?.toLowerCase().includes(q) ||
      w.contrato?.descripcion?.toLowerCase().includes(q) ||
      w.contrato?.cliente?.razon_social?.toLowerCase().includes(q)
    );
  });

  const getItemStats = (items: WorkflowItem[]) => {
    const acts = items.filter(i => i.tipo === "actividad").length;
    const inputs = items.filter(i => i.tipo === "input").length;
    const tareas = items.filter(i => i.tipo === "tarea").length;
    const outputs = items.filter(i => i.tipo === "output").length;
    const sups = items.filter(i => i.tipo === "supervision").length;
    return { acts, inputs, tareas, outputs, sups, total: items.length };
  };

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            className="gap-1.5 h-8"
            onClick={handleNewWorkflow}
          >
            <Plus className="h-3.5 w-3.5" />
            Nuevo
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 h-8">
                <FileDown className="h-3.5 w-3.5" />
                Importar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Descargar plantilla Excel
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => document.getElementById("workflow-import-input")?.click()}
                disabled={importing}
              >
                <FileUp className="h-4 w-4 mr-2" />
                {importing ? "Importando..." : "Importar desde Excel"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-8"
            onClick={handleOpenSaved}
          >
            <FolderOpen className="h-3.5 w-3.5" />
            Abrir
          </Button>
        </div>

        <input
          id="workflow-import-input"
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleImportExcel}
        />
      </div>

      {/* New Workflow - Contract Selection Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Workflow className="h-5 w-5 text-primary" />
              Nuevo Workflow
            </DialogTitle>
            <DialogDescription>
              Selecciona el contrato para crear un nuevo workflow
            </DialogDescription>
          </DialogHeader>

          {loadingContratos ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              <Select value={selectedContratoId} onValueChange={handleSelectContrato}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar contrato..." />
                </SelectTrigger>
                <SelectContent>
                  {contratos.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">{c.numero}</span>
                        <span className="text-muted-foreground">-</span>
                        <span className="truncate">{c.cliente.razon_social}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedContrato && (
                <div className="rounded-lg border p-3 bg-muted/30 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{selectedContrato.cliente.razon_social}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{selectedContrato.descripcion}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{selectedContrato.tipo_servicio}</Badge>
                    {selectedContrato.cartera && (
                      <Badge variant="secondary" className="text-xs">{selectedContrato.cartera.nombre}</Badge>
                    )}
                  </div>
                  {!selectedContrato.cartera && (
                    <p className="text-xs text-destructive">⚠ Este contrato no tiene una cartera asignada</p>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>Cancelar</Button>
            <Button
              onClick={handleOpenWorkflowModal}
              disabled={!selectedContratoId || !selectedContrato?.cartera}
            >
              Crear Workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Open Saved Workflows Dialog */}
      <Dialog open={showOpenDialog} onOpenChange={setShowOpenDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" />
              Workflows Guardados
            </DialogTitle>
            <DialogDescription>
              Selecciona un workflow para abrirlo o usarlo como plantilla base
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código, contrato o cliente..."
              value={searchSaved}
              onChange={(e) => setSearchSaved(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea className="max-h-[400px]">
            {loadingSaved ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredWorkflows.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No se encontraron workflows
              </div>
            ) : (
              <div className="space-y-2">
                {filteredWorkflows.map(w => {
                  const stats = getItemStats(w.items);
                  return (
                    <div
                      key={w.id}
                      className="rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {editingWorkflowId === w.id ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  value={editingCode}
                                  onChange={(e) => setEditingCode(e.target.value)}
                                  className="h-6 text-xs font-mono w-32"
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleRenameWorkflow();
                                    if (e.key === "Escape") setEditingWorkflowId(null);
                                  }}
                                  autoFocus
                                />
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={handleRenameWorkflow}>
                                  <CheckIcon className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <Badge variant="outline" className="font-mono text-xs shrink-0">
                                {w.codigo}
                              </Badge>
                            )}
                            <span className="text-sm font-medium truncate">
                              {w.contrato?.cliente?.razon_social || "Sin cliente"}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {w.contrato?.numero} - {w.contrato?.descripcion}
                          </p>
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {stats.acts} act
                            </Badge>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {stats.inputs} inp
                            </Badge>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {stats.tareas} proc
                            </Badge>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {stats.outputs} out
                            </Badge>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {stats.sups} sup
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="default"
                                className="h-7 w-7 p-0"
                                onClick={() => handleOpenWorkflow(w)}
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Abrir workflow</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 w-7 p-0"
                                onClick={() => {
                                  setEditingWorkflowId(w.id);
                                  setEditingCode(w.codigo);
                                }}
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Editar código</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                onClick={() => setDeletingWorkflowId(w.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Eliminar</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => handleStartApplyTemplate(w)}
                              >
                                Plantilla
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Usar como plantilla base</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1.5">
                        Creado: {new Date(w.fecha_creacion).toLocaleDateString("es-PE")}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Apply Template Dialog */}
      <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Aplicar Workflow como Plantilla</DialogTitle>
            <DialogDescription>
              Selecciona el contrato destino. Se copiarán las actividades, inputs, procesos, outputs y supervisión sin las asignaciones.
            </DialogDescription>
          </DialogHeader>

          {selectedSavedWorkflow && (
            <div className="rounded-lg border p-3 bg-muted/30">
              <p className="text-sm font-medium">Plantilla: {selectedSavedWorkflow.codigo}</p>
              <p className="text-xs text-muted-foreground">{selectedSavedWorkflow.contrato?.descripcion}</p>
              {(() => {
                const stats = getItemStats(selectedSavedWorkflow.items);
                return (
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.total} elementos ({stats.acts}A, {stats.inputs}I, {stats.tareas}P, {stats.outputs}O, {stats.sups}S)
                  </p>
                );
              })()}
            </div>
          )}

          <Select value={targetContratoId} onValueChange={setTargetContratoId}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar contrato destino..." />
            </SelectTrigger>
            <SelectContent>
              {contratos.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs">{c.numero}</span>
                    <span className="text-muted-foreground">-</span>
                    <span className="truncate">{c.cliente.razon_social}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApplyDialog(false)}>Cancelar</Button>
            <Button onClick={handleApplyTemplate} disabled={!targetContratoId || applyingTemplate}>
              {applyingTemplate && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Aplicar Plantilla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Apply Dialog */}
      <Dialog open={showImportApplyDialog} onOpenChange={setShowImportApplyDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Guardar Workflow Importado</DialogTitle>
            <DialogDescription>
              Selecciona el contrato al que se asignará el workflow importado desde Excel.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border p-3 bg-muted/30">
            {(() => {
              const stats = getItemStats(importedItems);
              return (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Datos importados</p>
                  <p className="text-xs text-muted-foreground">
                    {stats.total} elementos: {stats.acts} actividades, {stats.inputs} inputs, {stats.tareas} procesos, {stats.outputs} outputs, {stats.sups} supervisión
                  </p>
                </div>
              );
            })()}
          </div>

          {loadingContratos ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Select value={importTargetContratoId} onValueChange={setImportTargetContratoId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar contrato..." />
              </SelectTrigger>
              <SelectContent>
                {contratos.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{c.numero}</span>
                      <span className="text-muted-foreground">-</span>
                      <span className="truncate">{c.cliente.razon_social}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportApplyDialog(false)}>Cancelar</Button>
            <Button onClick={handleApplyImport} disabled={!importTargetContratoId || applyingTemplate}>
              {applyingTemplate && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar Workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WorkFlow Modal for new workflow */}
      {selectedContrato && selectedContrato.cartera && (
        <WorkFlowModal
          open={workflowModalOpen}
          onOpenChange={(open) => {
            setWorkflowModalOpen(open);
            if (!open) {
              onRefresh();
            }
          }}
          contrato={{
            id: selectedContrato.id,
            numero: selectedContrato.numero,
            descripcion: selectedContrato.descripcion,
            tipo_servicio: selectedContrato.tipo_servicio,
            fecha_inicio: selectedContrato.fecha_inicio,
            fecha_fin: selectedContrato.fecha_fin,
            cliente: selectedContrato.cliente,
            cartera: selectedContrato.cartera,
          }}
          miembros={miembros}
        />
      )}
    </>
  );
}
