import React, { memo } from "react";
import {
  Handle,
  Position,
  NodeProps,
  EdgeProps,
  getBezierPath,
  getSmoothStepPath,
  BaseEdge,
  EdgeLabelRenderer,
} from "@xyflow/react";
import {
  LucideIcon,
  Users,
  Wrench,
  Brain,    
  Timer,
  Trash2Icon,
  Edit,
  Bot,
  Plus,
} from "lucide-react";
import {
  ActionButton,
  Menu,
  MenuTrigger,
  Item,
} from "@adobe/react-spectrum";
import { CustomNode } from "./types";
import {
  AgentConfig,
  TeamConfig,
  ComponentTypes,
  Component,
  ComponentConfig,
} from "../../../types/datamodel";
import { useDroppable } from "@dnd-kit/core";
import { TruncatableText } from "../../atoms";
import { useGraphBuilderStore } from "./store";
import {
  isAssistantAgent,
  isSelectorTeam,
  isWebSurferAgent,
} from "../../../types/guards";
import GroupNode from './GroupNode';

// Icon mapping for different node types
export const iconMap: Record<
  Component<ComponentConfig>["component_type"],
  LucideIcon
> = {
  team: Users,
  agent: Bot,
  tool: Wrench,
  model: Brain,
  termination: Timer,
  graph: Users, // Using Users icon for graph type
};

interface DroppableZoneProps {
  accepts: ComponentTypes[];
  children?: React.ReactNode;
  className?: string;
  id: string; // Add this to make each zone uniquely identifiable
}

const DroppableZone = memo<DroppableZoneProps>(
  ({ accepts, children, className, id }) => {
    const { isOver, setNodeRef, active } = useDroppable({
      id,
      data: { accepts },
    });

    // Fix the data path to handle nested current objects
    const isValidDrop =
      isOver &&
      active?.data?.current?.current?.type &&
      accepts.includes(active.data.current.current.type);

    return (
      <div
        ref={setNodeRef}
        className={`droppable-zone p-2 ${isValidDrop ? "can-drop" : ""} ${
          className || ""
        }`}
      >
        {children}
      </div>
    );
  }
);
DroppableZone.displayName = "DroppableZone";

// Base node layout component
interface BaseNodeProps extends NodeProps<CustomNode> {
  id: string;
  icon: LucideIcon;
  children?: React.ReactNode;
  headerContent?: React.ReactNode;
  descriptionContent?: React.ReactNode;
  className?: string;
  onEditClick?: (id: string) => void;
}

const BaseNode = memo<BaseNodeProps>(
  ({
    id,
    data,
    selected,
    dragHandle,
    icon: Icon,
    children,
    headerContent,
    descriptionContent,
    className,
    onEditClick,
  }) => {
    const deleteNode = useGraphBuilderStore((state) => state.deleteNode);
    const setSelectedNode = useGraphBuilderStore(
      (state) => state.setSelectedNode
    );
    const showDelete = data.type !== "team";

    return (
      <div
        ref={dragHandle}
        className={`
        bg-white text-primary relative rounded-lg shadow-lg w-72 
        ${selected ? "ring-2 ring-accent" : ""}
        ${className || ""} 
        transition-all duration-200
      `}
      >
        <div className="border-b p-3 bg-gray-50 rounded-t-lg">
          <div className="flex items-center justify-between min-w-0">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Icon className="flex-shrink-0 w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-800 truncate">
                {data.component.label}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs px-2 py-1 bg-gray-200 rounded text-gray-700">
                {data.component.component_type}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedNode(id);
                }}
                className="p-1 hover:bg-secondary rounded"
              >
                <Edit className="w-4 h-4 text-accent" />
              </button>
              {showDelete && (
                <>
                  <button
                    onClick={(e) => {
                      console.log("remove node", id);
                      e.stopPropagation();
                      if (id) deleteNode(id);
                    }}
                    className="p-1 hover:bg-red-100 rounded"
                  >
                    <Trash2Icon className="w-4 h-4 text-red-500" />
                  </button>
                </>
              )}
            </div>
          </div>
          {headerContent}
        </div>

        <div className="px-3 py-2 border-b text-sm text-gray-600">
          {descriptionContent}
        </div>

        <div className="p-3 space-y-2">{children}</div>
      </div>
    );
  }
);

BaseNode.displayName = "BaseNode";

// Reusable components
const NodeSection: React.FC<{
  title: string | React.ReactNode;
  children: React.ReactNode;
}> = ({ title, children }) => (
  <div className="space-y-1 relative">
    <h4 className="text-xs font-medium text-gray-500 uppercase">{title}</h4>
    <div className="bg-gray-50 rounded p-2">{children}</div>
  </div>
);

const ConnectionBadge: React.FC<{
  connected: boolean;
  label: string;
}> = ({ connected, label }) => (
  <span
    className={`
      text-xs px-2 py-1 rounded-full
      ${connected ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}
    `}
  >
    {label}
  </span>
);

// Simplified Node Component
export const SimpleNode = memo<NodeProps<CustomNode>>((props) => {
  const { id, data, selected, dragHandle } = props;
  const [isHovering, setIsHovering] = React.useState(false);
  
  // Don't render graph type nodes
  if (data.type === "graph") {
    return null;
  }
  
  const deleteNode = useGraphBuilderStore((state) => state.deleteNode);
  const setSelectedNode = useGraphBuilderStore(
    (state) => state.setSelectedNode
  );
  const addNode = useGraphBuilderStore((state) => state.addNode);
  
  const component = data.component;
  const Icon = iconMap[component.component_type] || Bot;
  const showDelete = data.type !== "graph"; // Don't allow deleting the main graph node
  
  // Get node-specific info
  const nodeInfo = {
    name: (component.config as any)?.name || component.label || "Unnamed",
    subtitle: getNodeSubtitle(component),
    color: getNodeColor(component.component_type),
  };

  // Create default agent configuration
  const createDefaultAgent = (): Component<ComponentConfig> => {
    const timestamp = Date.now();
    return {
      provider: "autogen_agentchat.agents.AssistantAgent",
      component_type: "agent",
      version: 1,
      component_version: 1,
      description: "An agent that provides assistance with tool use.",
      label: `Assistant Agent ${timestamp}`,
      config: {
        name: `assistant_agent_${timestamp}`,
        model_client: {
          provider: "autogen_ext.models.openai.OpenAIChatCompletionClient",
          component_type: "model",
          version: 1,
          component_version: 1,
          description: "Chat completion client for OpenAI hosted models.",
          label: "OpenAIChatCompletionClient",
          config: {
            model: "gpt-4o-mini"
          }
        },
        tools: [],
        handoffs: [],
        model_context: {
          provider: "autogen_core.model_context.UnboundedChatCompletionContext",
          component_type: "chat_completion_context",
          version: 1,
          component_version: 1,
          description: "An unbounded chat completion context that keeps a view of the all the messages.",
          label: "UnboundedChatCompletionContext",
          config: {}
        },
        description: "An agent that provides assistance with tool use.",
        system_message: "You are a helpful assistant. Solve tasks carefully. When done, say TERMINATE.",
        model_client_stream: false,
        reflect_on_tool_use: false,
        tool_call_summary_format: "{result}"
      }
    } as Component<ComponentConfig>;
  };

  const handleAddAgentClick = () => {
    console.log('Add agent button clicked!'); // Debug log
    // Calculate position for new node (to the right of current node)
    const position = {
      x: (props.positionAbsoluteX || 0) + 300, // Position to the right
      y: (props.positionAbsoluteY || 0), // Same vertical level
    };
    
    console.log('Position calculated:', position); // Debug log
    const defaultAgent = createDefaultAgent();
    console.log('Default agent created:', defaultAgent); // Debug log
    addNode(position, defaultAgent, id); // Pass current node id as targetNodeId
    console.log('addNode called'); // Debug log
  };

  return (
    <div
      ref={dragHandle}
      className={`
        bg-white text-primary relative rounded-lg shadow-sm border-2 w-64
        ${selected ? "border-accent shadow-lg" : "border-gray-200"}
        hover:shadow-md transition-all duration-200 cursor-pointer
      `}
      style={{ borderColor: selected ? undefined : nodeInfo.color }}
    >
      {/* Source handle - for outgoing connections */}
      <div 
        className="absolute"
        style={{ right: -16, top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}
        onMouseEnter={() => setIsHovering(true)}
                 onMouseLeave={() => setIsHovering(false)}
      >
        <Handle
          type="source"
          position={Position.Right}
          id={`${id}-source`}
          className="!bg-gray-400 !w-3 !h-3 hover:!bg-accent transition-colors"
          style={{ position: 'relative', right: 'auto', left: -8 }}
        />
        
        {/* Add button that shows on hover */}
        {isHovering && (
          <div 
            className="absolute" 
            style={{ left: 8, top: '50%', transform: 'translateY(-50%)' }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAddAgentClick();
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg transition-all duration-200"
              title="Add Agent"
            >
              <Plus size={12} />
            </button>
          </div>
        )}
      </div>
      
      {/* Target handle - for incoming connections */}
      <Handle
        type="target"
        position={Position.Left}
        id={`${id}-target`}
        className="!bg-gray-400 !w-3 !h-3 hover:!bg-accent transition-colors"
        style={{ left: -8 }}
      />

      {/* Header */}
      <div 
        className="p-3 rounded-t-lg"
        style={{ backgroundColor: `${nodeInfo.color}15` }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Icon 
              className="flex-shrink-0 w-5 h-5"
              style={{ color: nodeInfo.color }}
            />
            <div className="min-w-0 flex-1">
              <div className="font-medium text-gray-800 truncate text-sm">
                {nodeInfo.name}
              </div>
              {nodeInfo.subtitle && (
                <div className="text-xs text-gray-500 truncate">
                  {nodeInfo.subtitle}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedNode(id);
              }}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
            >
              <Edit className="w-3.5 h-3.5 text-gray-600" />
            </button>
            {showDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNode(id);
                }}
                className="p-1.5 hover:bg-red-100 rounded transition-colors"
              >
                <Trash2Icon className="w-3.5 h-3.5 text-red-500" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {component.description && (
        <div className="px-3 py-2 border-t border-gray-100">
          <TruncatableText
            content={component.description}
            textThreshold={80}
            showFullscreen={false}
            className="text-xs text-gray-600"
          />
        </div>
      )}
      
      {/* Status badges */}
      <div className="px-3 pb-2 pt-1">
        <div className="flex flex-wrap gap-1">
          {getNodeBadges(component).map((badge, index) => (
            <span
              key={index}
              className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600"
            >
              {badge}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
});

SimpleNode.displayName = "SimpleNode";

// Helper functions
function getNodeColor(type: ComponentTypes): string {
  const colors: Record<ComponentTypes, string> = {
    graph: "#8B5CF6", // Purple
    team: "#3B82F6",  // Blue
    agent: "#10B981", // Green
    model: "#F59E0B", // Amber
    tool: "#EF4444",  // Red
    termination: "#6B7280", // Gray
  };
  return colors[type] || "#6B7280";
}

function getNodeSubtitle(component: Component<ComponentConfig>): string {
  switch (component.component_type) {
    case "agent":
      return isAssistantAgent(component) ? "Assistant Agent" : 
             isWebSurferAgent(component) ? "Web Surfer Agent" : "Agent";
    case "team":
      return isSelectorTeam(component) ? "Selector Team" : "Team";
    case "model":
      return (component.config as any)?.model || "Model";
    case "tool":
      return "Tool";
    case "termination":
      return "Termination Condition";
    case "graph":
      return "Graph Flow";
    default:
      return component.component_type;
  }
}

function getNodeBadges(component: Component<ComponentConfig>): string[] {
  const badges: string[] = [];
  
  if (component.component_type === "agent" && isAssistantAgent(component)) {
    if (component.config.model_client) {
      badges.push(component.config.model_client.config.model);
    }
    if (component.config.tools?.length) {
      badges.push(`${component.config.tools.length} Tools`);
    }
  } else if (component.component_type === "team") {
    const team = component as Component<TeamConfig>;
    if (team.config.participants?.length) {
      badges.push(`${team.config.participants.length} Agents`);
    }
    if (isSelectorTeam(team) && team.config.model_client) {
      badges.push(team.config.model_client.config.model);
    }
  }
  
  return badges;
}

// Export all node types using the same SimpleNode component
export const nodeTypes = {
  team: SimpleNode,
  agent: SimpleNode,
  graph: SimpleNode,
  model: SimpleNode,
  tool: SimpleNode,
  termination: SimpleNode,
  custom: SimpleNode, // For any custom nodes
  group: GroupNode, // Group node type
};

const EDGE_STYLES = {
  "graph-connection": { stroke: "rgb(220,220,220)" },
  "model-connection": { stroke: "rgb(220,220,220)" },
  "tool-connection": { stroke: "rgb(220,220,220)" },
  "agent-connection": { stroke: "rgb(220,220,220)" },
  "termination-connection": { stroke: "rgb(220,220,220)" },
  "bidirectional": { stroke: "rgb(220,220,220)" },
} as const;

type EdgeType = keyof typeof EDGE_STYLES;
type CustomEdgeProps = EdgeProps & {
  type: EdgeType;
};

// Component for displaying and editing edge conditions
interface EdgeConditionLabelProps {
  edgeId: string;
  condition?: string;
  edgePath: string;
  style?: React.CSSProperties;
}

const EdgeConditionLabel: React.FC<EdgeConditionLabelProps> = ({
  edgeId,
  condition,
  edgePath,
  style,
}) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(condition || "");
  const updateEdgeData = useGraphBuilderStore((state) => state.updateEdgeData);

  // Calculate position along the edge path (middle of the edge)
  const pathElement = document.createElementNS("http://www.w3.org/2000/svg", "path");
  pathElement.setAttribute("d", edgePath);
  const pathLength = pathElement.getTotalLength();
  const midPoint = pathElement.getPointAtLength(pathLength / 2);

  const handleClick = () => {
    setIsEditing(true);
    setEditValue(condition || "");
  };

  const handleSave = () => {
    updateEdgeData(edgeId, {
      condition: editValue.trim() || undefined,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(condition || "");
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  // Don't render anything if no condition and not editing
  if (!condition && !isEditing) {
    return (
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${midPoint.x}px,${midPoint.y}px)`,
            pointerEvents: "all",
            ...style,
          }}
          className="edge-condition-label"
        >
          <button
            onClick={handleClick}
            className="bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-full w-6 h-6 flex items-center justify-center cursor-pointer transition-colors opacity-70 hover:opacity-100"
            title="Add condition"
          >
            <span className="text-gray-600 text-xs font-medium">+</span>
          </button>
        </div>
      </EdgeLabelRenderer>
    );
  }

  return (
    <EdgeLabelRenderer>
      <div
        style={{
          position: "absolute",
          transform: `translate(-50%, -50%) translate(${midPoint.x}px,${midPoint.y}px)`,
          pointerEvents: "all",
          ...style,
        }}
        className="edge-condition-label"
      >
        {isEditing ? (
          <div className="flex items-center gap-1 bg-white border border-gray-300 rounded px-2 py-1 shadow-sm">
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              autoFocus
              className="text-xs border-none outline-none bg-transparent min-w-[60px]"
              placeholder="Condition"
              style={{ fontSize: "11px" }}
            />
          </div>
        ) : (
          <div
            onClick={handleClick}
            className="bg-blue-100 border border-blue-300 rounded px-2 py-1 cursor-pointer hover:bg-blue-200 transition-colors"
            style={{ fontSize: "11px" }}
          >
            {condition}
          </div>
        )}
      </div>
    </EdgeLabelRenderer>
  );
};

// Bidirectional edge condition label component with two conditions
interface BidirectionalEdgeConditionLabelProps {
  edgeId: string;
  inCondition?: string;
  outCondition?: string;
  edgePath: string;
}

const BidirectionalEdgeConditionLabel: React.FC<BidirectionalEdgeConditionLabelProps> = ({
  edgeId,
  inCondition,
  outCondition,
  edgePath,
}) => {
  const [editingIn, setEditingIn] = React.useState(false);
  const [editingOut, setEditingOut] = React.useState(false);
  const [editInValue, setEditInValue] = React.useState(inCondition || "");
  const [editOutValue, setEditOutValue] = React.useState(outCondition || "");
  const updateEdgeData = useGraphBuilderStore((state) => state.updateEdgeData);

  // Calculate positions along the edge path (1/3 and 2/3 of the path)
  const pathElement = document.createElementNS("http://www.w3.org/2000/svg", "path");
  pathElement.setAttribute("d", edgePath);
  const pathLength = pathElement.getTotalLength();
  const inPoint = pathElement.getPointAtLength(pathLength / 3);
  const outPoint = pathElement.getPointAtLength(pathLength * 2 / 3);

  const handleInSave = () => {
    updateEdgeData(edgeId, {
      condition: editInValue.trim() || undefined,
    });
    setEditingIn(false);
  };

  const handleOutSave = () => {
    updateEdgeData(edgeId, {
      outCondition: editOutValue.trim() || undefined,
    });
    setEditingOut(false);
  };

  const handleInCancel = () => {
    setEditInValue(inCondition || "");
    setEditingIn(false);
  };

  const handleOutCancel = () => {
    setEditOutValue(outCondition || "");
    setEditingOut(false);
  };

  const handleInKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleInSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleInCancel();
    }
  };

  const handleOutKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleOutSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleOutCancel();
    }
  };

  const renderConditionLabel = (
    condition: string | undefined,
    isEditing: boolean,
    editValue: string,
    position: { x: number; y: number },
    direction: "in" | "out",
    onEdit: () => void,
    onSave: () => void,
    onChange: (value: string) => void,
    onKeyDown: (e: React.KeyboardEvent) => void
  ) => {
    const arrow = direction === "in" ? "→" : "←";
    const bgColor = direction === "in" ? "bg-green-100 border-green-300 hover:bg-green-200" : "bg-blue-100 border-blue-300 hover:bg-blue-200";
    const label = direction === "in" ? "In" : "Out";

    return (
      <div
        style={{
          position: "absolute",
          transform: `translate(-50%, -50%) translate(${position.x}px,${position.y}px)`,
          pointerEvents: "all",
        }}
        className="edge-condition-label"
      >
        {isEditing ? (
          <div className="flex items-center gap-1 bg-white border border-gray-300 rounded px-2 py-1 shadow-sm">
            <span className="text-xs text-gray-500">{arrow}</span>
            <input
              type="text"
              value={editValue}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={onKeyDown}
              onBlur={onSave}
              autoFocus
              className="text-xs border-none outline-none bg-transparent min-w-[60px]"
              placeholder={`${label} condition`}
              style={{ fontSize: "11px" }}
            />
          </div>
        ) : condition ? (
          <div
            onClick={onEdit}
            className={`flex items-center gap-1 border rounded px-2 py-1 cursor-pointer transition-colors ${bgColor}`}
            style={{ fontSize: "11px" }}
          >
            <span className="text-xs font-semibold">{arrow}</span>
            <span>{condition}</span>
          </div>
        ) : (
          <button
            onClick={onEdit}
            className="bg-gray-50 hover:bg-gray-100 border-2 border-dashed border-gray-300 hover:border-gray-400 rounded-full w-8 h-8 flex items-center justify-center cursor-pointer transition-all opacity-60 hover:opacity-100"
            title={`Add ${label.toLowerCase()} condition (${arrow})`}
          >
            <span className="text-gray-500 text-sm font-bold">+</span>
          </button>
        )}
      </div>
    );
  };

  return (
    <EdgeLabelRenderer>
      {renderConditionLabel(
        inCondition,
        editingIn,
        editInValue,
        inPoint,
        "in",
        () => setEditingIn(true),
        handleInSave,
        setEditInValue,
        handleInKeyDown
      )}
      {renderConditionLabel(
        outCondition,
        editingOut,
        editOutValue,
        outPoint,
        "out",
        () => setEditingOut(true),
        handleOutSave,
        setEditOutValue,
        handleOutKeyDown
      )}
    </EdgeLabelRenderer>
  );
};

export const CustomEdge = ({
  type,
  data,
  deletable,
  ...props
}: CustomEdgeProps) => {
  const [edgePath] = getBezierPath(props);
  const edgeType = type || "model-connection";

  // Extract only the SVG path properties we want to pass
  const { style: baseStyle, ...pathProps } = props;
  const {
    // Filter out the problematic props
    sourceX,
    sourceY,
    sourcePosition,
    targetPosition,
    sourceHandleId,
    targetHandleId,
    pathOptions,
    selectable,
    ...validPathProps
  } = pathProps;

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={{ ...EDGE_STYLES[edgeType], strokeWidth: 2 }}
        {...validPathProps}
      />
      <EdgeConditionLabel
        edgeId={props.id}
        condition={data?.condition as string | undefined}
        edgePath={edgePath}
      />
    </>
  );
};

// Bidirectional edge component with arrows on both ends
export const BidirectionalEdge = ({
  type,
  data,
  deletable,
  ...props
}: CustomEdgeProps) => {
  const [edgePath] = getBezierPath(props);
  const edgeType = type || "graph-connection";

  // Extract only the SVG path properties we want to pass
  const { style: baseStyle, ...pathProps } = props;
  const {
    // Filter out the problematic props
    sourceX,
    sourceY,
    sourcePosition,
    targetPosition,
    sourceHandleId,
    targetHandleId,
    pathOptions,
    selectable,
    ...validPathProps
  } = pathProps;

  // Create unique marker IDs for this edge
  const startMarkerId = `bidirectional-start-${props.id}`;
  const endMarkerId = `bidirectional-end-${props.id}`;

  return (
    <>
      <defs>
        {/* Arrow pointing backwards (for start of line) */}
        <marker
          id={startMarkerId}
          markerWidth="10"
          markerHeight="10"
          refX="1"
          refY="5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path
            d="M 10 0 L 0 5 L 10 10 z"
            fill={EDGE_STYLES[edgeType as EdgeType].stroke}
          />
        </marker>
        {/* Arrow pointing forwards (for end of line) */}
        <marker
          id={endMarkerId}
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path
            d="M 0 0 L 10 5 L 0 10 z"
            fill={EDGE_STYLES[edgeType as EdgeType].stroke}
          />
        </marker>
      </defs>
      <BaseEdge
        path={edgePath}
        style={{ 
          ...EDGE_STYLES[edgeType as EdgeType], 
          strokeWidth: 2,
          markerStart: `url(#${startMarkerId})`,
          markerEnd: `url(#${endMarkerId})`
        }}
        className="react-flow__edge-bidirectional"
        {...validPathProps}
      />
      <BidirectionalEdgeConditionLabel
        edgeId={props.id}
        inCondition={data?.condition as string | undefined}
        outCondition={data?.outCondition as string | undefined}
        edgePath={edgePath}
      />
    </>
  );
};

export const edgeTypes = {
  "graph-connection": CustomEdge,
  "model-connection": CustomEdge,
  "tool-connection": CustomEdge,
  "agent-connection": CustomEdge,
  "termination-connection": CustomEdge,
  "bidirectional": BidirectionalEdge,
}; 