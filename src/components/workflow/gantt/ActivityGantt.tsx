import { Gantt } from "wx-react-gantt";
import "wx-react-gantt/dist/gantt.css";

// Datos de ejemplo para verificar que el componente funciona
const demoTasks = [
  {
    id: 1,
    text: "Preparación de documentos",
    start: new Date(2026, 1, 1),
    end: new Date(2026, 1, 5),
    progress: 100,
    type: "task",
  },
  {
    id: 2,
    text: "Revisión contable",
    start: new Date(2026, 1, 3),
    end: new Date(2026, 1, 8),
    progress: 60,
    type: "task",
  },
  {
    id: 3,
    text: "Presentación SUNAT",
    start: new Date(2026, 1, 8),
    end: new Date(2026, 1, 10),
    progress: 0,
    type: "task",
  },
  {
    id: 4,
    text: "Entrega final",
    start: new Date(2026, 1, 10),
    end: new Date(2026, 1, 10),
    progress: 0,
    type: "milestone",
  },
];

const demoLinks = [
  { id: 1, source: 1, target: 2, type: "e2s" },
  { id: 2, source: 2, target: 3, type: "e2s" },
  { id: 3, source: 3, target: 4, type: "e2s" },
];

const scales = [
  { unit: "month", step: 1, format: "MMMM yyyy" },
  { unit: "day", step: 1, format: "d" },
];

const columns = [
  { id: "text", header: "Tarea", flexgrow: 1 },
  { id: "start", header: "Inicio", width: 100, align: "center" },
  { id: "end", header: "Fin", width: 100, align: "center" },
  { id: "progress", header: "Progreso", width: 80, align: "center" },
];

interface ActivityGanttProps {
  className?: string;
}

const ActivityGantt = ({ className }: ActivityGanttProps) => {
  return (
    <div className={`w-full h-full min-h-[500px] ${className || ""}`}>
      <Gantt
        tasks={demoTasks}
        links={demoLinks}
        scales={scales}
        columns={columns}
      />
    </div>
  );
};

export default ActivityGantt;
