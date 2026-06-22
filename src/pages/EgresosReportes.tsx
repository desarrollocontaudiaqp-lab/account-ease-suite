import { BarChart3, Construction } from "lucide-react";
import { Card } from "@/components/ui/card";

const EgresosReportes = () => {
  return (
    <div className="p-6 space-y-6 font-jakarta">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BarChart3 className="h-7 w-7 text-primary" />
          Reportes de Egresos
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Análisis y exportación de egresos por categoría, periodo y proveedor
        </p>
      </div>

      <Card className="p-12 flex flex-col items-center justify-center text-center gap-3">
        <Construction className="h-12 w-12 text-amber-500" />
        <h2 className="text-xl font-semibold">Próximamente</h2>
        <p className="text-muted-foreground max-w-md">
          Aquí encontrarás gráficos comparativos por categoría, evolución mensual,
          top proveedores y exportación a Excel/PDF. Se habilitará en la Fase 3 del módulo.
        </p>
      </Card>
    </div>
  );
};

export default EgresosReportes;