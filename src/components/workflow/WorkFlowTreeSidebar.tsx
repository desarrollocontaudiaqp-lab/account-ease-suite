import { useState, useEffect, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  ChevronRight,
  ChevronDown,
  Briefcase,
  Calendar,
  FileText,
  Activity,
  Database,
  ListTodo,
  Package,
  ShieldCheck,
  Link2,
  Plus,
  MoreHorizontal,
  FolderOpen,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

// Tree node types
export type NodeType = 
  | "espacio" 
  | "mes" 
  | "contrato" 
  | "actividad" 
  | "input" 
  | "procesos" 
  | "tarea" 
  | "outputs" 
  | "output" 
  | "supervision" 
  | "supervision_item";

export interface TreeNode {
  id: string;
  type: NodeType;
  label: string;
  icon?: React.ReactNode;
  children?: TreeNode[];
  data?: any;
  badge?: number;
  isCompleted?: boolean;
}

interface WorkFlowTreeSidebarProps {
  treeData: TreeNode[];
  selectedNode: TreeNode | null;
  onSelectNode: (node: TreeNode) => void;
  loading?: boolean;
}

const nodeIcons: Record<NodeType, React.ElementType> = {
  espacio: Briefcase,
  mes: Calendar,
  contrato: FileText,
  actividad: Activity,
  input: Database,
  procesos: FolderOpen,
  tarea: ListTodo,
  outputs: FolderOpen,
  output: Package,
  supervision: ShieldCheck,
  supervision_item: Check,
};

const nodeColors: Record<NodeType, string> = {
  espacio: "text-violet-600 dark:text-violet-400",
  mes: "text-blue-600 dark:text-blue-400",
  contrato: "text-amber-600 dark:text-amber-400",
  actividad: "text-green-600 dark:text-green-400",
  input: "text-emerald-600 dark:text-emerald-400",
  procesos: "text-amber-500 dark:text-amber-400",
  tarea: "text-orange-600 dark:text-orange-400",
  outputs: "text-purple-500 dark:text-purple-400",
  output: "text-purple-600 dark:text-purple-400",
  supervision: "text-red-600 dark:text-red-400",
  supervision_item: "text-red-500 dark:text-red-400",
};

interface TreeItemProps {
  node: TreeNode;
  level: number;
  selectedNode: TreeNode | null;
  onSelectNode: (node: TreeNode) => void;
  expandedNodes: Set<string>;
  toggleExpand: (id: string) => void;
}

const TreeItem = ({
  node,
  level,
  selectedNode,
  onSelectNode,
  expandedNodes,
  toggleExpand,
}: TreeItemProps) => {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedNodes.has(node.id);
  const isSelected = selectedNode?.id === node.id;
  const Icon = nodeIcons[node.type] || FileText;

  return (
    <div className="select-none">
      <div
        className={cn(
          "flex items-center gap-1 py-1 px-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors group",
          isSelected && "bg-primary/10 text-primary",
          node.isCompleted && "opacity-60"
        )}
        style={{ paddingLeft: `${level * 12 + 4}px` }}
        onClick={() => onSelectNode(node)}
      >
        {/* Expand/Collapse button */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand(node.id);
            }}
            className="p-0.5 rounded hover:bg-muted"
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>
        ) : (
          <span className="w-4" />
        )}

        {/* Icon */}
        <Icon className={cn("h-4 w-4 flex-shrink-0", nodeColors[node.type])} />

        {/* Label */}
        <span className={cn(
          "text-sm truncate flex-1",
          isSelected ? "font-medium" : "text-foreground"
        )}>
          {node.label}
        </span>

        {/* Badge */}
        {node.badge !== undefined && node.badge > 0 && (
          <Badge variant="secondary" className="h-5 min-w-[20px] px-1 text-[10px]">
            {node.badge}
          </Badge>
        )}

        {/* More actions button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </Button>

        {/* Add button for certain node types */}
        {(node.type === "mes" || node.type === "actividad" || node.type === "procesos" || node.type === "outputs") && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="animate-in fade-in slide-in-from-top-1 duration-200">
          {node.children!.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              level={level + 1}
              selectedNode={selectedNode}
              onSelectNode={onSelectNode}
              expandedNodes={expandedNodes}
              toggleExpand={toggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export function WorkFlowTreeSidebar({
  treeData,
  selectedNode,
  onSelectNode,
  loading,
}: WorkFlowTreeSidebarProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Auto-expand first level on mount
  useEffect(() => {
    if (treeData.length > 0 && expandedNodes.size === 0) {
      const initialExpanded = new Set<string>();
      treeData.forEach((node) => initialExpanded.add(node.id));
      setExpandedNodes(initialExpanded);
    }
  }, [treeData]);

  const toggleExpand = (id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full bg-background border-r border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Espacios</span>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Tree view */}
      <ScrollArea className="flex-1">
        <div className="py-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
            </div>
          ) : treeData.length === 0 ? (
            <div className="px-3 py-4 text-sm text-muted-foreground text-center">
              No hay datos disponibles
            </div>
          ) : (
            treeData.map((node) => (
              <TreeItem
                key={node.id}
                node={node}
                level={0}
                selectedNode={selectedNode}
                onSelectNode={onSelectNode}
                expandedNodes={expandedNodes}
                toggleExpand={toggleExpand}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer with "All Carteras" option */}
      <div className="border-t border-border p-2">
        <div
          className={cn(
            "flex items-center gap-2 py-2 px-3 rounded-md cursor-pointer hover:bg-muted/50 transition-colors",
            !selectedNode && "bg-primary/10"
          )}
          onClick={() => onSelectNode({ id: "all", type: "espacio", label: "Todas las Carteras" })}
        >
          <Briefcase className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Todas las Carteras</span>
        </div>
      </div>
    </div>
  );
}
