import { useState } from "react";
import { WorkFlowTreeSidebar, TreeNode } from "@/components/workflow/WorkFlowTreeSidebar";
import { WorkFlowContentPanel } from "@/components/workflow/WorkFlowContentPanel";
import { useWorkFlowTree } from "@/hooks/useWorkFlowTree";
import { Button } from "@/components/ui/button";
import { RefreshCw, Workflow } from "lucide-react";
import { cn } from "@/lib/utils";

const CalendarioTrabajo = () => {
  const { loading, treeData, refresh } = useWorkFlowTree();
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Page Header - Compact */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Workflow className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">WorkFlow</h1>
            <p className="text-xs text-muted-foreground">
              Gestiona los flujos de trabajo por cartera
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} className="gap-2 h-8">
          <RefreshCw className="h-3.5 w-3.5" />
          Actualizar
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className={cn(
          "flex-shrink-0 overflow-hidden transition-all duration-300",
          isSidebarCollapsed ? "w-12" : "w-56"
        )}>
          <WorkFlowTreeSidebar
            treeData={treeData}
            selectedNode={selectedNode}
            onSelectNode={setSelectedNode}
            loading={loading}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />
        </div>

        {/* Content Panel */}
        <div className="flex-1 overflow-hidden bg-muted/30">
          <WorkFlowContentPanel 
            selectedNode={selectedNode} 
            treeData={treeData} 
            onRefresh={refresh}
            onNavigateNode={setSelectedNode}
          />
        </div>
      </div>
    </div>
  );
};

export default CalendarioTrabajo;
