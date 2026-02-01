import { useState } from "react";
import { WorkFlowTreeSidebar, TreeNode } from "@/components/workflow/WorkFlowTreeSidebar";
import { WorkFlowContentPanel } from "@/components/workflow/WorkFlowContentPanel";
import { useWorkFlowTree } from "@/hooks/useWorkFlowTree";
import { Button } from "@/components/ui/button";
import { RefreshCw, Workflow, PanelLeftClose, PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const CalendarioTrabajo = () => {
  const { loading, treeData, refresh } = useWorkFlowTree();
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [isTreeCollapsed, setIsTreeCollapsed] = useState(false);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Page Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Workflow className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">WorkFlow</h1>
            <p className="text-sm text-muted-foreground">
              Gestiona los flujos de trabajo por cartera
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar with collapse functionality */}
        <div className={cn(
          "flex-shrink-0 overflow-hidden transition-all duration-300 relative",
          isTreeCollapsed ? "w-0" : "w-72"
        )}>
          {!isTreeCollapsed && (
            <WorkFlowTreeSidebar
              treeData={treeData}
              selectedNode={selectedNode}
              onSelectNode={setSelectedNode}
              loading={loading}
            />
          )}
          
          {/* Collapse/Expand Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setIsTreeCollapsed(!isTreeCollapsed)}
                className={cn(
                  "absolute top-3 z-10 h-6 w-6 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-sm",
                  isTreeCollapsed ? "left-2" : "-right-3"
                )}
              >
                {isTreeCollapsed ? (
                  <PanelLeft className="h-3.5 w-3.5" />
                ) : (
                  <PanelLeftClose className="h-3.5 w-3.5" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {isTreeCollapsed ? "Mostrar panel de espacios" : "Ocultar panel de espacios"}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Floating expand button when collapsed */}
        {isTreeCollapsed && (
          <div className="flex-shrink-0 w-10 border-r border-border bg-muted/30 flex flex-col items-center pt-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setIsTreeCollapsed(false)}
                  className="h-8 w-8 rounded-lg bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <PanelLeft className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                Mostrar panel de espacios
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Content Panel */}
        <div className="flex-1 overflow-hidden bg-muted/30">
          <WorkFlowContentPanel selectedNode={selectedNode} />
        </div>
      </div>
    </div>
  );
};

export default CalendarioTrabajo;
