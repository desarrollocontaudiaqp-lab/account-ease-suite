import { Settings, Shield, Briefcase, FileText, Bell, Database, Receipt, Users, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { OpcionesManager } from "@/components/configuracion/OpcionesManager";
import { RolesManager } from "@/components/configuracion/RolesManager";
import { ServiciosManager } from "@/components/configuracion/ServiciosManager";
import { ProformaEstadosManager } from "@/components/configuracion/ProformaEstadosManager";
import { useConfiguracionOpciones } from "@/hooks/useConfiguracionOpciones";

const Configuracion = () => {
  const regimenTributario = useConfiguracionOpciones("regimen_tributario");
  const regimenLaboral = useConfiguracionOpciones("regimen_laboral");

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
          Configuración
        </h1>
        <p className="text-muted-foreground mt-1">
          Configura los parámetros del sistema
        </p>
      </div>

      <Tabs defaultValue="regimenes" className="space-y-6">
        <TabsList className="bg-muted/50 flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="regimenes" className="gap-2">
            <Receipt className="h-4 w-4" />
            Regímenes
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-2">
            <Shield className="h-4 w-4" />
            Roles
          </TabsTrigger>
          <TabsTrigger value="proformas" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Proformas
          </TabsTrigger>
          <TabsTrigger value="carteras" className="gap-2">
            <Briefcase className="h-4 w-4" />
            Carteras
          </TabsTrigger>
          <TabsTrigger value="servicios" className="gap-2">
            <FileText className="h-4 w-4" />
            Servicios
          </TabsTrigger>
          <TabsTrigger value="notificaciones" className="gap-2">
            <Bell className="h-4 w-4" />
            Notificaciones
          </TabsTrigger>
          <TabsTrigger value="sistema" className="gap-2">
            <Database className="h-4 w-4" />
            Sistema
          </TabsTrigger>
        </TabsList>

        {/* Regímenes Tab */}
        <TabsContent value="regimenes">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <OpcionesManager
              titulo="Régimen Tributario"
              descripcion="Gestiona las opciones de régimen tributario para clientes"
              opciones={regimenTributario.opciones}
              onAdd={regimenTributario.addOpcion}
              onUpdate={regimenTributario.updateOpcion}
              onToggle={regimenTributario.toggleOpcion}
              onDelete={regimenTributario.deleteOpcion}
              icon={<Receipt className="h-4 w-4" />}
              colorClass="bg-primary/10 text-primary"
            />
            <OpcionesManager
              titulo="Régimen Laboral"
              descripcion="Gestiona las opciones de régimen laboral para clientes"
              opciones={regimenLaboral.opciones}
              onAdd={regimenLaboral.addOpcion}
              onUpdate={regimenLaboral.updateOpcion}
              onToggle={regimenLaboral.toggleOpcion}
              onDelete={regimenLaboral.deleteOpcion}
              icon={<Users className="h-4 w-4" />}
              colorClass="bg-secondary/20 text-secondary"
            />
          </div>
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles">
          <RolesManager />
        </TabsContent>

        {/* Proformas Tab */}
        <TabsContent value="proformas">
          <ProformaEstadosManager />
        </TabsContent>

        {/* Carteras Tab */}
        <TabsContent value="carteras">
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Configuración de Carteras</h3>
                <p className="text-sm text-muted-foreground">Gestiona las carteras operativas</p>
              </div>
              <Button className="btn-gradient gap-2">
                <Briefcase className="h-4 w-4" />
                Nueva Cartera
              </Button>
            </div>

            <div className="grid gap-4">
              {[1, 2, 3, 4, 5].map((num) => (
                <div key={num} className="flex items-center justify-between p-4 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-secondary/20">
                      <Briefcase className="h-4 w-4 text-secondary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Cartera {num}</p>
                      <p className="text-sm text-muted-foreground">
                        {num % 2 === 0 ? "Trámites" : num % 3 === 0 ? "Mixta" : "Contabilidad"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch defaultChecked />
                    <Button variant="outline" size="sm">Editar</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Servicios Tab */}
        <TabsContent value="servicios">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ServiciosManager tipo="contabilidad" titulo="Servicios de Contabilidad" />
            <ServiciosManager tipo="tramites" titulo="Servicios de Trámites" />
          </div>
        </TabsContent>

        {/* Notificaciones Tab */}
        <TabsContent value="notificaciones">
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-6">Configuración de Notificaciones</h3>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Notificaciones por email</p>
                  <p className="text-sm text-muted-foreground">Recibir alertas por correo electrónico</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Alertas de pagos vencidos</p>
                  <p className="text-sm text-muted-foreground">Notificar cuando un pago está vencido</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Recordatorios de contratos</p>
                  <p className="text-sm text-muted-foreground">Alertar contratos próximos a vencer</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Notificaciones push</p>
                  <p className="text-sm text-muted-foreground">Notificaciones en el navegador</p>
                </div>
                <Switch />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Sistema Tab */}
        <TabsContent value="sistema">
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-6">Parámetros del Sistema</h3>
            
            <div className="grid gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre del Estudio</Label>
                  <Input defaultValue="Contadores y Auditores Arequipa" />
                </div>
                <div className="space-y-2">
                  <Label>RUC</Label>
                  <Input defaultValue="20123456789" />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email de contacto</Label>
                  <Input type="email" defaultValue="contacto@estudio.com" />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input defaultValue="054-123456" />
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Modo mantenimiento</p>
                  <p className="text-sm text-muted-foreground">Desactivar acceso temporalmente</p>
                </div>
                <Switch />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Backup automático</p>
                  <p className="text-sm text-muted-foreground">Respaldo diario de datos</p>
                </div>
                <Switch defaultChecked />
              </div>

              <Button className="w-fit btn-gradient">Guardar cambios</Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Configuracion;
