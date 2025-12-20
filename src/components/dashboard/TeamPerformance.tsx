import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  initials: string;
  contracts: number;
  completed: number;
  progress: number;
}

const teamMembers: TeamMember[] = [
  {
    id: "1",
    name: "María García",
    role: "Asesora - Cartera 1",
    initials: "MG",
    contracts: 12,
    completed: 9,
    progress: 75,
  },
  {
    id: "2",
    name: "Carlos López",
    role: "Asesor - Cartera 2",
    initials: "CL",
    contracts: 10,
    completed: 7,
    progress: 70,
  },
  {
    id: "3",
    name: "Ana Rodríguez",
    role: "Asesora - Cartera 3",
    initials: "AR",
    contracts: 15,
    completed: 13,
    progress: 87,
  },
  {
    id: "4",
    name: "Luis Martínez",
    role: "Asesor - Cartera 4",
    initials: "LM",
    contracts: 8,
    completed: 5,
    progress: 63,
  },
  {
    id: "5",
    name: "Patricia Sánchez",
    role: "Asesora - Cartera 5",
    initials: "PS",
    contracts: 11,
    completed: 10,
    progress: 91,
  },
];

export function TeamPerformance() {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden animate-slide-up">
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground">
          Rendimiento del Equipo
        </h3>
        <p className="text-sm text-muted-foreground">
          Avance de asesores este mes
        </p>
      </div>

      <div className="divide-y divide-border">
        {teamMembers.map((member) => (
          <div
            key={member.id}
            className="p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors"
          >
            <Avatar className="h-10 w-10 bg-primary text-primary-foreground">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                {member.initials}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <p className="font-medium text-foreground text-sm truncate">
                    {member.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{member.role}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">
                    {member.progress}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {member.completed}/{member.contracts} contratos
                  </p>
                </div>
              </div>
              <Progress value={member.progress} className="h-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
