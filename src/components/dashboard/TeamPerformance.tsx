import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

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

const getProgressGradient = (progress: number) => {
  if (progress >= 80) return "from-emerald-500 to-green-500";
  if (progress >= 60) return "from-amber-500 to-yellow-500";
  return "from-red-500 to-orange-500";
};

const avatarColors = [
  "from-primary to-primary/80",
  "from-secondary to-secondary/80",
  "from-violet-500 to-purple-500",
  "from-emerald-500 to-teal-500",
  "from-rose-500 to-pink-500",
];

export function TeamPerformance() {
  return (
    <div className="bg-card rounded-2xl border border-border/50 overflow-hidden animate-slide-up shadow-sm hover:shadow-md transition-shadow">
      <div className="p-6 border-b border-border/50">
        <h3 className="text-lg font-semibold text-foreground">
          Rendimiento del Equipo
        </h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Avance de asesores este mes
        </p>
      </div>

      <div className="divide-y divide-border/50">
        {teamMembers.map((member, index) => (
          <div
            key={member.id}
            className="p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors group cursor-pointer"
          >
            <Avatar className="h-12 w-12 ring-2 ring-background shadow-lg">
              <AvatarFallback className={cn(
                "bg-gradient-to-br text-white text-sm font-bold",
                avatarColors[index % avatarColors.length]
              )}>
                {member.initials}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-semibold text-foreground text-sm truncate">
                    {member.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{member.role}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-foreground">
                    {member.progress}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {member.completed}/{member.contracts}
                  </p>
                </div>
              </div>
              
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full bg-gradient-to-r transition-all duration-700 ease-out",
                    getProgressGradient(member.progress)
                  )}
                  style={{ width: `${member.progress}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
