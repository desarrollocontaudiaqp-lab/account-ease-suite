import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import Proformas from "./pages/Proformas";
import Contratos from "./pages/Contratos";
import Carteras from "./pages/Carteras";
import CalendarioTrabajo from "./pages/CalendarioTrabajo";
import Usuarios from "./pages/Usuarios";
import Configuracion from "./pages/Configuracion";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/proformas" element={<Proformas />} />
            <Route path="/contratos" element={<Contratos />} />
            <Route path="/asignaciones" element={<Dashboard />} />
            <Route path="/carteras" element={<Carteras />} />
            <Route path="/calendario-pagos" element={<Dashboard />} />
            <Route path="/calendario-trabajo" element={<CalendarioTrabajo />} />
            <Route path="/reportes/*" element={<Dashboard />} />
            <Route path="/usuarios" element={<Usuarios />} />
            <Route path="/configuracion" element={<Configuracion />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
