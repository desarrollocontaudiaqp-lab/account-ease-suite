import { useLocation, useNavigate } from "react-router-dom";
import { Receipt, Users, FileText, UserCheck, Briefcase } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RegistroVentasReport } from "@/components/reportes/RegistroVentasReport";
import { AvanceReport, AvanceGroupBy } from "@/components/reportes/AvanceReport";

const TABS: {
  value: string;
  path: string;
  label: string;
  icon: typeof Receipt;
  groupBy?: AvanceGroupBy;
  title?: string;
  description?: string;
}[] = [
  { value: "registro-ventas", path: "/reportes", label: "Registro de Ventas", icon: Receipt },
  {
    value: "clientes",
    path: "/reportes/clientes",
    label: "Todos los Clientes",
    icon: Users,
    groupBy: "cliente",
    title: "Todos los Clientes",
    description: "Avance de cobranza por cliente, con filtro de periodo y tipo de documento",
  },
  {
    value: "avance-contrato",
    path: "/reportes/avance-contrato",
    label: "Avance por Contrato",
    icon: FileText,
    groupBy: "contrato",
    title: "Avance por Contrato",
    description: "Avance de cobranza por contrato, con filtro de periodo y tipo de documento",
  },
  {
    value: "avance-asesor",
    path: "/reportes/avance-asesor",
    label: "Avance por Asesor",
    icon: UserCheck,
    groupBy: "asesor",
    title: "Avance por Asesor",
    description: "Avance de cobranza por asesor responsable del contrato",
  },
  {
    value: "avance-cartera",
    path: "/reportes/avance-cartera",
    label: "Avance por Cartera",
    icon: Briefcase,
    groupBy: "cartera",
    title: "Avance por Cartera",
    description: "Avance de cobranza consolidado por cartera de clientes",
  },
];

export default function Reportes() {
  const location = useLocation();
  const navigate = useNavigate();
  const current =
    TABS.find((t) => t.path !== "/reportes" && location.pathname.startsWith(t.path))?.value ??
    "registro-ventas";

  const handleChange = (value: string) => {
    const tab = TABS.find((t) => t.value === value);
    if (tab) navigate(tab.path);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Reportes</h1>
        <p className="text-muted-foreground">
          Generación y consulta de reportes contables y de gestión
        </p>
      </div>

      {/* Report Tabs */}
      <Tabs value={current} onValueChange={handleChange} className="w-full">
        <TabsList className="bg-muted/50 flex-wrap h-auto">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="gap-2">
              <t.icon className="h-4 w-4" />
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="registro-ventas" className="mt-6">
          <RegistroVentasReport />
        </TabsContent>
        {TABS.filter((t) => t.groupBy).map((t) => (
          <TabsContent key={t.value} value={t.value} className="mt-6">
            <AvanceReport groupBy={t.groupBy!} title={t.title!} description={t.description!} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
