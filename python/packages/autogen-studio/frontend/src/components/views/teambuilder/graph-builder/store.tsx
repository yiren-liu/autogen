import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import dagre from "@dagrejs/dagre";
import {
  Component,
  GraphConfig,
  AgentConfig,
  ModelConfig,
  ToolConfig,
  TerminationConfig,
  ComponentConfig,
  DiGraph,
  DiGraphNode,
  DiGraphEdge,
  Group,
  GroupNode,
  GroupEdge,
} from "../../../types/datamodel";
import { CustomNode, CustomEdge } from "./types";
import { groupAPI } from "../api";

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

interface GraphBuilderState {
  nodes: CustomNode[];
  edges: CustomEdge[];
  selectedNodeId: string | null;
  history: Array<{ nodes: CustomNode[]; edges: CustomEdge[] }>;
  currentHistoryIndex: number;
  // Add user context tracking
  userId: string | null;

  // Actions
  setNodes: (nodes: CustomNode[]) => void;
  setEdges: (edges: CustomEdge[]) => void;
  addNode: (position: { x: number; y: number }, config: ComponentConfig, targetNodeId?: string) => void;
  updateNode: (nodeId: string, updates: Partial<{ component: Component<ComponentConfig> }>) => void;
  deleteNode: (nodeId: string) => void;
  setSelectedNode: (nodeId: string | null) => void;
  updateEdgeData: (edgeId: string, data: Record<string, any>) => void;
  setUserId: (userId: string | null) => void;
  
  // Grouping actions with API integration
  createGroup: (nodeIds: string[], edgeIds: string[], groupName?: string) => Promise<string>;
  ungroupNodes: (groupId: string) => Promise<void>;
  
  // Graph-specific actions
  addGraphEdge: (sourceId: string, targetId: string, condition?: string) => void;
  removeGraphEdge: (sourceId: string, targetId: string) => void;
  updateGraphEdge: (sourceId: string, targetId: string, condition: string) => void;
  
  // Serialization
  loadFromJson: (component: Component<GraphConfig>, skipHistory?: boolean) => { nodes: CustomNode[]; edges: CustomEdge[] };
  syncToJson: () => Component<GraphConfig> | null;
  
  // History
  addToHistory: () => void;
  undo: () => void;
  redo: () => void;
  resetHistory: () => void;
  
  // Layout
  layoutNodes: () => void;
}

// Helper to convert graph structure to visual nodes/edges
const graphToVisualElements = (component: Component<GraphConfig>) => {
  const nodes: CustomNode[] = [];
  const edges: CustomEdge[] = [];

  // Note: We don't create a main graph node as it's not needed for the visual builder
  // The graph metadata is stored separately and managed by the component props

  // Add participant nodes
  component.config.participants?.forEach((participant, index) => {
    const participantNode: CustomNode = {
      id: `agent-${index}`,
      type: "agent", 
      position: { x: 100 + index * 200, y: 200 },
      data: {
        component: participant,
        label: participant.label || `Agent ${index + 1}`,
        type: "agent",
      },
    };
    nodes.push(participantNode);

    // Add edge from graph to participant
    // edges.push({
    //   id: `graph-agent-${index}`,
    //   source: "graph",
    //   target: `agent-${index}`,
    //   type: "graph-connection",
    // });
  });

  // Add termination condition node if exists
  if (component.config.termination_condition) {
    const terminationNode: CustomNode = {
      id: "termination",
      type: "custom",
      position: { x: 400, y: 50 },
      data: {
        component: component.config.termination_condition,
        label: component.config.termination_condition.label || "Termination",
        type: "termination",
      },
    };
    nodes.push(terminationNode);

    // Note: No edges to/from termination node since we removed the main graph node
  }

  // Convert DiGraph edges to visual edges
  const graphConfig = component.config;
  const processedPairs = new Set<string>();
  
  if (graphConfig.graph?.nodes) {
    Object.entries(graphConfig.graph.nodes).forEach(([nodeName, graphNode]) => {
      graphNode.edges.forEach((edge, edgeIndex) => {
        const sourceNodeId = findNodeIdByName(nodes, nodeName);
        const targetNodeId = findNodeIdByName(nodes, edge.target);
        
        if (sourceNodeId && targetNodeId) {
          // Create a normalized pair key for bidirectional detection
          const pairKey = [sourceNodeId, targetNodeId].sort().join('-');
          
          // Check if there's a reverse edge
          const reverseExists = graphConfig.graph.nodes[edge.target]?.edges.some(
            reverseEdge => reverseEdge.target === nodeName
          );
          
          if (reverseExists && !processedPairs.has(pairKey)) {
            // Create bidirectional edge
            processedPairs.add(pairKey);
            const reverseEdge = graphConfig.graph.nodes[edge.target]?.edges.find(
              reverseEdge => reverseEdge.target === nodeName
            );
            edges.push({
              id: `${sourceNodeId}-${targetNodeId}-bidirectional`,
              source: sourceNodeId,
              target: targetNodeId,
              type: "bidirectional",
              data: { // take the in and out edge data, and form bidirectional edge data 
                condition: edge.condition || undefined,
                outCondition: reverseEdge?.condition || undefined,
              },
            });
          } else if (!reverseExists && !processedPairs.has(pairKey)) {
            // Create normal edge
            edges.push({
              id: `${nodeName}-${edge.target}-${edgeIndex}`,
              source: sourceNodeId,
              target: targetNodeId,
              type: "graph-connection",
              data: {
                condition: edge.condition || undefined,
              },
            });
          }
        }
      });
    });
  }

  return { nodes, edges };
};

// Helper to find node ID by agent name
const findNodeIdByName = (nodes: CustomNode[], name: string): string | null => {
  const node = nodes.find(n => 
    (n.data.component.config as any)?.name === name ||
    n.data.component.label === name ||
    n.id === name
  );
  return node?.id || null;
};

// Helper to convert visual elements back to graph structure
const visualElementsToGraph = (nodes: CustomNode[], edges: CustomEdge[]): Component<GraphConfig> | null => {
  const participants: Component<AgentConfig>[] = [];
  let termination_condition: Component<TerminationConfig> | undefined;
  let max_turns: number | undefined;

  // Collect participants and other components
  nodes.forEach(node => {
    if (node.data.type === "agent") {
      participants.push(node.data.component as Component<AgentConfig>);
    } else if (node.data.type === "termination") {
      termination_condition = node.data.component as Component<TerminationConfig>;
    }
  });

  // If no participants, return null (empty graph)
  if (participants.length === 0) {
    return null;
  }

  // Build DiGraph structure from visual edges
  const diGraphNodes: Record<string, DiGraphNode> = {};
  
  // Initialize nodes from participants
  participants.forEach(participant => {
    const nodeName = (participant.config as any)?.name || participant.label || "unknown";
    diGraphNodes[nodeName] = {
      name: nodeName,
      edges: [],
      activation: "all" // default activation
    };
  });

  // Add edges from visual representation
  edges.forEach(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    if (sourceNode && targetNode && 
        sourceNode.data.type === "agent" && targetNode.data.type === "agent") {
      const sourceName = (sourceNode.data.component.config as any)?.name || sourceNode.data.component.label || "unknown";
      const targetName = (targetNode.data.component.config as any)?.name || targetNode.data.component.label || "unknown";
      
      // Handle bidirectional edges
      if (edge.type === "bidirectional") {
        // Add edge in both directions
        if (diGraphNodes[sourceName]) {
          diGraphNodes[sourceName].edges.push({
            target: targetName,
            condition: edge.data?.condition || undefined
          });
        }
        if (diGraphNodes[targetName]) {
          diGraphNodes[targetName].edges.push({
            target: sourceName,
            condition: edge.data?.outCondition || undefined
          });
        }
        console.log(diGraphNodes);
      } else {
        // Normal unidirectional edge
        if (diGraphNodes[sourceName]) {
          diGraphNodes[sourceName].edges.push({
            target: targetName,
            condition: edge.data?.condition || undefined
          });
        }
      }
    }
  });

  const graph: DiGraph = {
    nodes: diGraphNodes,
    default_start_node: (participants[0]?.config as any)?.name || participants[0]?.label
  };

  // Create a default graph component since we no longer have a main graph node
  const component: Component<GraphConfig> = {
    provider: "autogen_agentchat.teams.GraphFlow", 
    component_type: "graph",
    version: 1,
    component_version: 1,
    description: "A graph-based conversation flow",
    label: "Graph Flow",
    config: {
      participants,
      termination_condition,
      max_turns,
      graph
    }
  };

  return component;
};

export const useGraphBuilderStore = create<GraphBuilderState>()(
  subscribeWithSelector((set, get) => ({
    nodes: [],
    edges: [],
    selectedNodeId: null,
    history: [],
    currentHistoryIndex: -1,
    userId: null,

    setNodes: (nodes) => set({ nodes }),
    setEdges: (edges) => set({ edges }),

    addNode: (position, config, targetNodeId) => {
      const { nodes, edges } = get();
      const newId = generateId();
      
      const newNode: CustomNode = {
        id: newId,
        type: "custom",
        position,
        data: {
          component: config as Component<ComponentConfig>,
          label: (config as any).label || "New Component",
          type: (config as any).component_type,
        },
      };

      let newEdges = [...edges];
      if (targetNodeId) {
        newEdges.push({
          id: `${targetNodeId}-${newId}`,
          source: targetNodeId,
          target: newId,
          type: "graph-connection",
        });
      }

      set({ 
        nodes: [...nodes, newNode], 
        edges: newEdges 
      });
      get().addToHistory();
    },

    updateNode: (nodeId, updates) => {
      const { nodes } = get();
      const updatedNodes = nodes.map(node =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                ...updates,
              },
            }
          : node
      );
      set({ nodes: updatedNodes });
      get().addToHistory();
    },

    deleteNode: (nodeId) => {
      const { nodes, edges } = get();
      const newNodes = nodes.filter(node => node.id !== nodeId);
      const newEdges = edges.filter(edge => 
        edge.source !== nodeId && edge.target !== nodeId
      );
      set({ 
        nodes: newNodes, 
        edges: newEdges,
        selectedNodeId: get().selectedNodeId === nodeId ? null : get().selectedNodeId
      });
      get().addToHistory();
    },

    setSelectedNode: (nodeId) => set({ selectedNodeId: nodeId }),

    updateEdgeData: (edgeId, data) => {
      const { edges } = get();
      const updatedEdges = edges.map(edge => 
        edge.id === edgeId
          ? { 
              ...edge, 
              data: {
                ...edge.data,
                ...data
              }
            }
          : edge
      );
      set({ edges: updatedEdges });
      get().addToHistory();
    },

    addGraphEdge: (sourceId, targetId, condition) => {
      const { edges } = get();
      const newEdge: CustomEdge = {
        id: `${sourceId}-${targetId}`,
        source: sourceId,
        target: targetId,
        type: "graph-connection",
        data: {
          condition: condition,
        },
      };
      set({ edges: [...edges, newEdge] });
      get().addToHistory();
    },

    removeGraphEdge: (sourceId, targetId) => {
      const { edges } = get();
      const newEdges = edges.filter(edge => 
        !(edge.source === sourceId && edge.target === targetId)
      );
      set({ edges: newEdges });
      get().addToHistory();
    },

    updateGraphEdge: (sourceId, targetId, condition) => {
      const { edges } = get();
      const updatedEdges = edges.map(edge => 
        edge.source === sourceId && edge.target === targetId
          ? { 
              ...edge, 
              data: {
                ...edge.data,
                condition: condition
              }
            }
          : edge
      );
      set({ edges: updatedEdges });
      get().addToHistory();
    },

    loadFromJson: (component, skipHistory = true) => {
      const { nodes, edges } = graphToVisualElements(component);
      set({ nodes, edges });
      
      if (!skipHistory) {
        get().addToHistory();
      }
      
      return { nodes, edges };
    },

    syncToJson: () => {
      const { nodes, edges } = get();
      return visualElementsToGraph(nodes, edges);
    },

    addToHistory: () => {
      const { nodes, edges, history, currentHistoryIndex } = get();
      const newHistory = history.slice(0, currentHistoryIndex + 1);
      newHistory.push({ nodes: [...nodes], edges: [...edges] });
      
      // Limit history size
      if (newHistory.length > 50) {
        newHistory.shift();
      } else {
        set({ currentHistoryIndex: currentHistoryIndex + 1 });
      }
      
      set({ history: newHistory });
    },

    undo: () => {
      const { history, currentHistoryIndex } = get();
      if (currentHistoryIndex > 0) {
        const prevState = history[currentHistoryIndex - 1];
        set({
          nodes: prevState.nodes,
          edges: prevState.edges,
          currentHistoryIndex: currentHistoryIndex - 1,
        });
      }
    },

    redo: () => {
      const { history, currentHistoryIndex } = get();
      if (currentHistoryIndex < history.length - 1) {
        const nextState = history[currentHistoryIndex + 1];
        set({
          nodes: nextState.nodes,
          edges: nextState.edges,
          currentHistoryIndex: currentHistoryIndex + 1,
        });
      }
    },

    resetHistory: () => {
      const { nodes, edges } = get();
      set({
        history: [{ nodes: [...nodes], edges: [...edges] }],
        currentHistoryIndex: 0,
      });
    },

    layoutNodes: () => {
      const { nodes, edges } = get();
      
      const dagreGraph = new dagre.graphlib.Graph();
      dagreGraph.setDefaultEdgeLabel(() => ({}));
      dagreGraph.setGraph({ rankdir: "LR", ranker: "tight-tree", ranksep: 200, nodesep: 100 });

      nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: 200, height: 100 });
      });

      edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
      });

      dagre.layout(dagreGraph);

      const layoutedNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        return {
          ...node,
          position: {
            x: nodeWithPosition.x - 100,
            y: nodeWithPosition.y - 50,
          },
        };
      });

      set({ nodes: layoutedNodes });
      get().addToHistory();
    },

    createGroup: async (nodeIds, edgeIds, groupName) => {
      const { nodes, edges } = get();
      const groupId = `group-${generateId()}`;
      
      // Get the nodes to be grouped
      const nodesToGroup = nodes.filter(node => nodeIds.includes(node.id));
      const edgesToGroup = edges.filter(edge => edgeIds.includes(edge.id));
      
      if (nodesToGroup.length === 0) return groupId;
      
      // Check if any nodes are already grouped (have parentId)
      const alreadyGroupedNodes = nodesToGroup.filter(node => node.parentId);
      if (alreadyGroupedNodes.length > 0) {
        console.warn('Cannot group nodes that are already part of a group:', alreadyGroupedNodes.map(n => n.id));
        return groupId; // Return without creating group
      }
      
      // Calculate the bounding box of selected nodes
      const bounds = nodesToGroup.reduce(
        (acc, node) => ({
          minX: Math.min(acc.minX, node.position.x),
          minY: Math.min(acc.minY, node.position.y),
          maxX: Math.max(acc.maxX, node.position.x + 200), // Assuming node width ~200
          maxY: Math.max(acc.maxY, node.position.y + 100), // Assuming node height ~100
        }),
        { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
      );
      
      // Create group node
      const groupNode: CustomNode = {
        id: groupId,
        type: 'group',
        position: { x: bounds.minX - 20, y: bounds.minY - 20 },
        data: {
          label: groupName || `Component Group ${nodesToGroup.length}`,
          type: 'group',
          component: {} as any, // Placeholder
          groupedComponents: nodesToGroup.map(node => ({
            id: node.id,
            component: node.data.component,
            type: node.data.type,
            label: node.data.label,
          })),
          groupedEdges: edgesToGroup.map(edge => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            type: edge.type,
            data: edge.data,
          })),
        },
        style: {
          width: bounds.maxX - bounds.minX + 40,
          height: bounds.maxY - bounds.minY + 40,
        },
      };
      
      // Update nodes: add group node and set parent relationships
      const updatedNodes = [
        ...nodes.filter(node => !nodeIds.includes(node.id)),
        groupNode,
        ...nodesToGroup.map(node => ({
          ...node,
          parentId: groupId,
          extent: 'parent' as const,
          // Adjust position to be relative to group
          position: {
            x: node.position.x - bounds.minX + 20,
            y: node.position.y - bounds.minY + 20,
          },
        }))
      ];
      
      // Keep all edges visible - don't remove internal edges
      // Internal edges will remain visible within the group
      const updatedEdges = edges;
      
      set({ 
        nodes: updatedNodes, 
        edges: updatedEdges 
      });
      get().addToHistory();
      
      // Call API to persist group if userId is available
      const { userId } = get();
      if (userId) {
        try {
          const groupData: Partial<Group> = {
            name: groupName || `Component Group ${nodesToGroup.length}`,
            description: `Group containing ${nodesToGroup.length} components`,
            nodes: nodesToGroup.map(node => ({
              id: node.id,
              node_type: node.data.type as any,
              node_config: node.data.component.config,
              label: String(node.data.label || 'Untitled'),
              position: node.position,
              relative_position: {
                x: node.position.x - bounds.minX + 20,
                y: node.position.y - bounds.minY + 20,
              },
            })),
            edges: edgesToGroup.map(edge => ({
              id: edge.id,
              source_node_id: edge.source,
              target_node_id: edge.target,
              edge_type: edge.type || 'default',
              edge_data: edge.data,
            })),
            layout_info: {
              bounds: {
                x: bounds.minX - 20,
                y: bounds.minY - 20,
                width: bounds.maxX - bounds.minX + 40,
                height: bounds.maxY - bounds.minY + 40,
              },
            },
          };
          
          await groupAPI.createGroup(groupData, userId);
        } catch (error) {
          console.error('Failed to persist group to backend:', error);
          // Continue with local grouping even if API fails
        }
      }
      
      return groupId;
    },

    ungroupNodes: async (groupId) => {
      const { nodes, edges } = get();
      
      const groupNode = nodes.find(node => node.id === groupId);
      if (!groupNode || groupNode.type !== 'group') return;
      
      const childNodes = nodes.filter(node => node.parentId === groupId);
      const groupData = groupNode.data as any;
      
      // Restore child nodes to their absolute positions
      const restoredNodes = childNodes.map(node => ({
        ...node,
        parentId: undefined,
        extent: undefined,
        position: {
          x: groupNode.position.x + node.position.x,
          y: groupNode.position.y + node.position.y,
        },
      }));
      
      // Restore internal edges if they exist in the group data
      const restoredEdges = groupData.groupedEdges || [];
      
      // Update the store
      const updatedNodes = [
        ...nodes.filter(node => node.id !== groupId && node.parentId !== groupId),
        ...restoredNodes,
      ];
      
      const updatedEdges = [
        ...edges,
        ...restoredEdges,
      ];
      
      set({ 
        nodes: updatedNodes, 
        edges: updatedEdges 
      });
      get().addToHistory();
      
      // Call API to delete group if userId is available
      const { userId } = get();
      if (userId) {
        try {
          // Extract the numeric ID from the groupId (assuming format: "group-{id}")
          const numericGroupId = parseInt(groupId.replace('group-', ''));
          if (!isNaN(numericGroupId)) {
            await groupAPI.deleteGroup(numericGroupId, userId);
          }
        } catch (error) {
          console.error('Failed to delete group from backend:', error);
          // Continue with local ungrouping even if API fails
        }
      }
    },

    setUserId: (userId) => set({ userId }),
  }))
);
