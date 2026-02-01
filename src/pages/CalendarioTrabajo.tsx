import { useState } from "react";
import { WorkFlowTreeSidebar, TreeNode } from "@/components/workflow/WorkFlowTreeSidebar";
import { WorkFlowContentPanel } from "@/components/workflow/WorkFlowContentPanel";
import { useWorkFlowTree } from "@/hooks/useWorkFlowTree";
import { Button } from "@/components/ui/button";
import { RefreshCw, Workflow } from "lucide-react";

const CalendarioTrabajo = () => {
  const { loading, treeData, refresh } = useWorkFlowTree();
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);

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
        <div className="w-56 flex-shrink-0 overflow-hidden">
          <WorkFlowTreeSidebar
            treeData={treeData}
            selectedNode={selectedNode}
            onSelectNode={setSelectedNode}
            loading={loading}
          />
        </div>

        {/* Content Panel */}
        <div className="flex-1 overflow-hidden bg-muted/30">
          <WorkFlowContentPanel selectedNode={selectedNode} treeData={treeData} />
        </div>
      </div>
    </div>
  );
};

export default CalendarioTrabajo;
