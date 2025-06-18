// builder/types.ts
import { Node, Edge } from "@xyflow/react";
import {
  Component,
  ComponentConfig,
  ComponentTypes,
} from "../../../types/datamodel";

export interface NodeData extends Record<string, unknown> {
  component: Component<ComponentConfig>;
}

export interface EditingState {
  component: Component<ComponentConfig>;
  path: string[];
  changes?: Partial<Component<ComponentConfig>>;
}

// Define our node type that extends the XYFlow Node type
export type CustomNode = Node<NodeData>;
// export type CustomEdge = Edge;

export type EdgeTypes =
  | "graph-connection"
  | "model-connection"
  | "tool-connection"
  | "agent-connection"
  | "team-connection"
  | "termination-connection"
  | "bidirectional";

export interface EdgeData extends Record<string, unknown> {
  condition?: string; // condition for the previous agent to pass to the next agent, applies for both uni- and bidirectional edges
  outCondition?: string; // condition for the next agent to pass back to the previous agent, applies only for bidirectional edges
}

export interface CustomEdge extends Edge {
  type: EdgeTypes;
  data?: EdgeData;
}

export interface Position {
  x: number;
  y: number;
}
export interface GraphState {
  nodes: CustomNode[];
  edges: CustomEdge[];
}

export interface FormFieldMapping {
  fieldName: string;
  type: "input" | "textarea" | "select" | "number" | "switch";
  label: string;
  required?: boolean;
  options?: { label: string; value: any }[];
  validate?: (value: any) => boolean;
}

export interface DragItem {
  config: ComponentConfig;
}

export interface NodeComponentProps {
  data: NodeData;
  selected: boolean;
  onClick: () => void;
}

export interface NodeEditorProps {
  node: CustomNode | null;
  onUpdate: (updates: Partial<NodeData>) => void;
  onClose: () => void;
}

export interface LibraryProps {
  onDragStart: (item: DragItem) => void;
}

export interface VisualizerProps {
  nodes: CustomNode[];
  edges: CustomEdge[];
  onNodesChange: (changes: any[]) => void;
  onEdgesChange: (changes: any[]) => void;
  onNodeClick: (nodeId: string) => void;
  onConnect: (params: any) => void;
}
