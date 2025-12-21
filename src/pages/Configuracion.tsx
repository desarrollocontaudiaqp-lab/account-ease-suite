import { Settings, Shield, Briefcase, FileText, Bell, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

const Configuracion = () => {
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

      <Tabs defaultValue="roles" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="roles" className="gap-2">
            <Shield className="h-4 w-4" />
            Roles
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

        {/* Roles Tab */}
        <TabsContent value="roles">
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Gestión de Roles</h3>
                <p className="text-sm text-muted-foreground">Define los roles y permisos del sistema</p>
              </div>
              <Button className="btn-gradient gap-2">
                <Settings className="h-4 w-4" />
                Nuevo Rol
              </Button>
            </div>

            <div className="space-y-4">
              {["Administrador", "Gerente", "Supervisor", "Asesor", "Auxiliar", "Practicante"].map((role) => (
                <div key={role} className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Shield className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{role}</p>
                      <p className="text-sm text-muted-foreground">Permisos configurados</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">Editar permisos</Button>
                </div>
              ))}
            </div>
          </div>
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
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Servicios de Contabilidad</h3>
              <div className="space-y-3">
                {[
                  { name: "Declaración mensual IGV", price: 150 },
                  { name: "Balance General", price: 500 },
                  { name: "Estados Financieros", price: 800 },
                  { name: "Planilla de sueldos", price: 200 },
                  { name: "Auditoría interna", price: 1500 },
                ].map((service) => (
                  <div key={service.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <span className="text-sm text-foreground">{service.name}</span>
                    <span className="text-sm font-medium text-foreground">S/ {service.price}</span>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4">Agregar servicio</Button>
            </div>

            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Servicios de Trámites</h3>
              <div className="space-y-3">
                {[
                  { name: "Constitución de empresa", price: 1200 },
                  { name: "Inscripción SUNARP", price: 350 },
                  { name: "Licencia de funcionamiento", price: 400 },
                  { name: "Registro de marca INDECOPI", price: 600 },
                ].map((service) => (
                  <div key={service.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <span className="text-sm text-foreground">{service.name}</span>
                    <span className="text-sm font-medium text-foreground">S/ {service.price}</span>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4">Agregar servicio</Button>
            </div>
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
