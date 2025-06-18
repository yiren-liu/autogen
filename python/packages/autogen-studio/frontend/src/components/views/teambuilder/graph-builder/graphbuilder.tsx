import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  DndContext,
  useSensor,
  useSensors,
  PointerSensor,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  Connection,
  Background,
  BackgroundVariant,
  MiniMap,
  addEdge,
  EdgeChange,
  NodeChange,
  SelectionMode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { 
  Button, 
  Switch, 
  TooltipTrigger, 
  Tooltip, 
  Flex, 
  View,
  AlertDialog,
  DialogTrigger,
  ActionButton
} from "@adobe/react-spectrum";
import {
  Cable,
  CheckCircle,
  CircleX,
  Code2,
  Download,
  ListCheck,
  PlayCircle,
  Save,
  X,
} from "lucide-react";
import { useGraphBuilderStore } from "./store";
// import { ComponentLibrary } from "../builder/library";
import { ComponentTypes, Gallery, Graph } from "../../../types/datamodel";


import { CustomNode, CustomEdge, DragItem } from "./types";
import SelectionBox from "./SelectionBox";
import { edgeTypes, nodeTypes } from "./nodes";
import ComponentEditor from "./component-editor/component-editor";

// import builder css
import "../builder/builder.css";
import "./graph-builder.css";
import GraphBuilderToolbar from "./toolbar";
import { MonacoEditor } from "../../monaco";
import debounce from "lodash.debounce";
import TestDrawer from "./testdrawer";
import { validationAPI, ValidationResponse } from "../api";
import { ValidationErrors } from "../builder/validationerrors";

interface DragItemData {
  type: ComponentTypes;
  config: any;
  label: string;
  icon: React.ReactNode;
}

interface GraphBuilderProps {
  graph: Graph;
  onChange?: (graph: Partial<Graph>) => void;
  onDirtyStateChange?: (isDirty: boolean) => void;
  selectedGallery?: Gallery | null;
}

export const GraphBuilder: React.FC<GraphBuilderProps> = ({
  graph,
  onChange,
  onDirtyStateChange,
  selectedGallery,
}) => {
  // Replace store state with React Flow hooks
  const [nodes, setNodes, onNodesChange] = useNodesState<CustomNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<CustomEdge>([]);
  const [isJsonMode, setIsJsonMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showMiniMap, setShowMiniMap] = useState(true);
  const editorRef = useRef(null);
  const [activeDragItem, setActiveDragItem] = useState<DragItemData | null>(
    null
  );
  const [validationResults, setValidationResults] =
    useState<ValidationResponse | null>(null);

  const [validationLoading, setValidationLoading] = useState(false);
  const [rightPanelMode, setRightPanelMode] = useState<'none' | 'component' | 'test'>('none');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedNodesCount, setSelectedNodesCount] = useState(0);
  const [selectedEdgesCount, setSelectedEdgesCount] = useState(0);

  const {
    undo,
    redo,
    loadFromJson,
    syncToJson,
    addNode,
    layoutNodes,
    resetHistory,
    history,
    updateNode,
    deleteNode,
    selectedNodeId,
    setSelectedNode,
    addGraphEdge,
    removeGraphEdge,
  } = useGraphBuilderStore();
  // const setNewEdges = useGraphBuilderStore((state) => state.setEdges);

  const currentHistoryIndex = useGraphBuilderStore(
    (state) => state.currentHistoryIndex
  );

  // Compute isDirty based on the store value
  const isDirty = currentHistoryIndex > 0;

  // Compute undo/redo capability from history state
  const canUndo = currentHistoryIndex > 0;
  const canRedo = currentHistoryIndex < history.length - 1;

  const onConnect = useCallback(
    (params: Connection) => {
      const currentEdges = useGraphBuilderStore.getState().edges;
      
      // Check for existing reverse connection
      const reverseEdge = currentEdges.find(
        (e) => e.source === params.target && e.target === params.source
      );

      let updatedEdges: CustomEdge[];
      
      if (reverseEdge) {
        // Remove the reverse edge and create a bidirectional edge
        const filteredEdges = currentEdges.filter((e) => e.id !== reverseEdge.id);
        // take the in and out edge data, and form bidirectional edge data 
        const bidirectionalEdge: CustomEdge = {
          ...params,
          id: `${params.source}-${params.target}-bidirectional`,
          type: "bidirectional",
          data: {
            condition: reverseEdge.data?.condition,
            outCondition: "",
          },
        } as CustomEdge;

        updatedEdges = addEdge(bidirectionalEdge, filteredEdges);
      } else {
        // Check if there's already a bidirectional edge
        const existingBidirectional = currentEdges.find(
          (e) => 
            e.type === "bidirectional" && 
            ((e.source === params.source && e.target === params.target) ||
             (e.source === params.target && e.target === params.source))
        );
        
        if (existingBidirectional) {
          // Don't add duplicate edge if bidirectional already exists
          return;
        }
        
        // Create a normal edge
        const newEdge: CustomEdge = {
          ...params,
          id: `${params.source}-${params.target}`,
          type: "graph-connection",
        } as CustomEdge;
        
        updatedEdges = addEdge(newEdge, currentEdges);
      }
      
      // Update the store's edges
      useGraphBuilderStore.getState().setEdges(updatedEdges);
      
      // Add to history for undo/redo
      useGraphBuilderStore.getState().addToHistory();
    },
    []
  );

  // Custom edge changes handler to intercept deletions and use store methods
  const handleEdgesChange = useCallback(
    (changes: EdgeChange<CustomEdge>[]) => {
      // Separate deletion changes from other changes
      const deleteChanges = changes.filter((change) => change.type === 'remove');
      const otherChanges = changes.filter((change) => change.type !== 'remove');

      // Handle deletions using store methods
      if (deleteChanges.length > 0) {
        const currentEdges = useGraphBuilderStore.getState().edges;
        const edgesToDelete = deleteChanges.map((change) => change.id);
        
        // Filter out deleted edges
        const filteredEdges = currentEdges.filter((edge) => !edgesToDelete.includes(edge.id));
        
        // Update store with filtered edges
        useGraphBuilderStore.getState().setEdges(filteredEdges);
        
        // Add to history for undo/redo
        useGraphBuilderStore.getState().addToHistory();
      }

      // Let ReactFlow handle non-deletion changes (like selection, hover, etc.)
      if (otherChanges.length > 0) {
        onEdgesChange(otherChanges);
      }
    },
    [onEdgesChange]
  );

  // Custom node changes handler to intercept deletions and use store methods
  const handleNodesChange = useCallback(
    (changes: NodeChange<CustomNode>[]) => {
      // Separate deletion changes from other changes
      const deleteChanges = changes.filter((change) => change.type === 'remove');
      const otherChanges = changes.filter((change) => change.type !== 'remove');

      // Handle deletions using store methods
      if (deleteChanges.length > 0) {
        const nodesToDelete = deleteChanges.map((change) => change.id);
        
        // Delete each node using store method
        nodesToDelete.forEach((nodeId) => {
          deleteNode(nodeId);
        });
      }

      // Let ReactFlow handle non-deletion changes (like selection, hover, etc.)
      if (otherChanges.length > 0) {
        onNodesChange(otherChanges);
      }
    },
    [onNodesChange, deleteNode]
  );

  // Handle selection changes for nodes
  const handleSelectionChange = useCallback(
    ({ nodes: selectedNodes, edges: selectedEdges }: { nodes: CustomNode[], edges: CustomEdge[] }) => {
      setSelectedNodesCount(selectedNodes.length);
      setSelectedEdgesCount(selectedEdges.length);
      
      // If only one node is selected, open component editor
      if (selectedNodes.length === 1) {
        setSelectedNode(selectedNodes[0].id);
      } else if (selectedNodes.length === 0) {
        setSelectedNode(null);
      } else {
        // Multiple nodes selected, close component editor if open
        if (rightPanelMode === 'component') {
          setRightPanelMode('none');
        }
        setSelectedNode(null);
      }
    },
    [setSelectedNode, rightPanelMode]
  );

  // Bulk delete selected elements
  const handleBulkDelete = useCallback(() => {
    const selectedNodes = nodes.filter(node => node.selected);
    const selectedEdges = edges.filter(edge => edge.selected);
    
    // Delete selected nodes
    selectedNodes.forEach(node => {
      deleteNode(node.id);
    });
    
    // Delete selected edges
    if (selectedEdges.length > 0) {
      const currentEdges = useGraphBuilderStore.getState().edges;
      const edgeIds = selectedEdges.map(edge => edge.id);
      const filteredEdges = currentEdges.filter(edge => !edgeIds.includes(edge.id));
      useGraphBuilderStore.getState().setEdges(filteredEdges);
      useGraphBuilderStore.getState().addToHistory();
    }
  }, [nodes, edges, deleteNode]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Need to notify parent whenever isDirty changes
  React.useEffect(() => {
    onDirtyStateChange?.(isDirty);
  }, [isDirty, onDirtyStateChange]);

  // Add beforeunload handler when dirty
  React.useEffect(() => {
    if (isDirty) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = "";
      };
      window.addEventListener("beforeunload", handleBeforeUnload);
      return () =>
        window.removeEventListener("beforeunload", handleBeforeUnload);
    }
  }, [isDirty]);

  // Load initial config
  React.useEffect(() => {
    if (graph?.component) {
      const { nodes: initialNodes, edges: initialEdges } = loadFromJson(
        graph.component
      );
      setNodes(initialNodes);
      setEdges(initialEdges);
      
      // Auto-layout nodes after loading
      setTimeout(() => {
        layoutNodes();
      }, 100); // Small delay to ensure nodes are rendered
    }
    handleValidate();

    return () => {
      setValidationResults(null);
    };
  }, [graph, setNodes, setEdges, layoutNodes]);

  // Handle JSON changes
  const handleJsonChange = useCallback(
    debounce((value: string) => {
      try {
        const config = JSON.parse(value);
        loadFromJson(config, false);
        useGraphBuilderStore.getState().addToHistory();
      } catch (error) {
        console.error("Invalid JSON:", error);
      }
    }, 1000),
    [loadFromJson]
  );

  // Cleanup debounced function
  useEffect(() => {
    return () => {
      handleJsonChange.cancel();
      setValidationResults(null);
    };
  }, [handleJsonChange]);

  const handleValidate = useCallback(async () => {
    const component = syncToJson();
    if (!component) {
      throw new Error("Unable to generate valid configuration");
    }

    try {
      setValidationLoading(true);
      const validationResult = await validationAPI.validateComponent(component);
      setValidationResults(validationResult);
    } catch (error) {
      console.error("Validation error:", error);
      setErrorMessage("Validation failed");
    } finally {
      setValidationLoading(false);
    }
  }, [syncToJson]);

  // Handle save
  const handleSave = useCallback(async () => {
    try {
      const component = syncToJson();
      if (!component) {
        throw new Error("Unable to generate valid configuration");
      }

      if (onChange) {
        const graphData: Partial<Graph> = graph
          ? {
              ...graph,
              component,
              created_at: undefined,
              updated_at: undefined,
            }
          : { component };
        await onChange(graphData);
        resetHistory();
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to save graph configuration"
      );
    }
  }, [syncToJson, onChange, resetHistory]);

  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  React.useEffect(() => {
    if (!isFullscreen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFullscreen(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isFullscreen]);

  React.useEffect(() => {
    const unsubscribe = useGraphBuilderStore.subscribe((state) => {
      // Preserve selection and position state when updating from store
      setNodes(currentNodes => {
        // Create maps of current selections and positions
        const selectionMap = new Map();
        const positionMap = new Map();
        currentNodes.forEach(node => {
          if (node.selected) {
            selectionMap.set(node.id, true);
          }
          // Preserve current position if it exists
          positionMap.set(node.id, node.position);
        });
        
        // Check if this looks like a bulk layout operation
        let nodesWithSignificantChanges = 0;
        state.nodes.forEach(node => {
          const currentPosition = positionMap.get(node.id);
          if (currentPosition && (
            Math.abs(currentPosition.x - node.position.x) > 30 ||
            Math.abs(currentPosition.y - node.position.y) > 30
          )) {
            nodesWithSignificantChanges++;
          }
        });
        
        // If many nodes changed position significantly, it's likely a layout operation
        const isLayoutOperation = nodesWithSignificantChanges >= Math.min(3, state.nodes.length * 0.5);
        
        // Apply selections and positions to new nodes from store
        return state.nodes.map(node => {
          const currentPosition = positionMap.get(node.id);
          
          return {
            ...node,
            selected: selectionMap.has(node.id) || false,
            // Use store position if it's a layout operation, otherwise preserve current position
            position: isLayoutOperation ? node.position : (currentPosition || node.position)
          };
        });
      });
      
      setEdges(currentEdges => {
        // Create a map of current edge selections
        const edgeSelectionMap = new Map();
        currentEdges.forEach(edge => {
          if (edge.selected) {
            edgeSelectionMap.set(edge.id, true);
          }
        });
        
        // Apply selections to new edges from store
        return state.edges.map(edge => ({
          ...edge,
          selected: edgeSelectionMap.has(edge.id) || false
        }));
      });
    });
    return unsubscribe;
  }, [setNodes, setEdges]);

  // Open component editor when a node is selected
  React.useEffect(() => {
    if (selectedNodeId) {
      setRightPanelMode('component');
    } else if (rightPanelMode === 'component') {
      setRightPanelMode('none');
    }
  }, [selectedNodeId, rightPanelMode]);

  const validateDropTarget = (
    draggedType: ComponentTypes,
    targetType: ComponentTypes
  ): boolean => {
    const validTargets: Record<ComponentTypes, ComponentTypes[]> = {
      model: ["graph", "agent"],
      tool: ["agent"],
      agent: ["graph"],
      team: [],
      termination: ["graph"],
      graph: [],
    };
    return validTargets[draggedType]?.includes(targetType) || false;
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over?.id || !active.data.current) return;

    const draggedType = active.data.current.type;
    const targetNode = nodes.find((node) => node.id === over.id);
    if (!targetNode) return;

    const isValid = validateDropTarget(
      draggedType,
      targetNode.data.component.component_type
    );
    if (isValid) {
      targetNode.className = "drop-target-valid";
    } else {
      targetNode.className = "drop-target-invalid";
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !active.data?.current?.current) return;

    const draggedItem = active.data.current.current;
    const dropZoneId = over.id as string;

    const [nodeId] = dropZoneId.split("@@@");
    const targetNode = nodes.find((node) => node.id === nodeId);
    if (!targetNode) return;

    const isValid = validateDropTarget(
      draggedItem.type,
      targetNode.data.component.component_type
    );
    if (!isValid) return;

    const position = {
      x: event.delta.x,
      y: event.delta.y,
    };

    addNode(position, draggedItem.config, nodeId);
    setActiveDragItem(null);
  };

  const handleCloseRightPanel = () => {
    setRightPanelMode('none');
    if (selectedNodeId) {
      setSelectedNode(null);
    }
  };

  const graphValidated = validationResults && validationResults.is_valid;

  const onDragStart = (item: DragItem) => {
    // We can add any drag start logic here if needed
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current) {
      setActiveDragItem(active.data.current as DragItemData);
    }
  };

  const rightPanelWidth = rightPanelMode === 'none' ? '0px' : '400px';

  // Add keyboard shortcuts for multi-selection operations
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+A or Cmd+A to select all
      if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
        event.preventDefault();
        setNodes(nodes => nodes.map(node => ({ ...node, selected: true })));
        setEdges(edges => edges.map(edge => ({ ...edge, selected: true })));
      }
      
      // Escape to deselect all
      if (event.key === 'Escape') {
        setNodes(nodes => nodes.map(node => ({ ...node, selected: false })));
        setEdges(edges => edges.map(edge => ({ ...edge, selected: false })));
      }
      
      // Delete key to delete selected elements
      if ((event.key === 'Delete' || event.key === 'Backspace')) {
        const hasSelection = selectedNodesCount > 0 || selectedEdgesCount > 0;
        if (hasSelection) {
          event.preventDefault();
          handleBulkDelete();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodesCount, selectedEdgesCount, handleBulkDelete, setNodes, setEdges]);



  return (
    <View>
      <Flex 
        direction="row" 
        gap="size-100" 
        alignItems="center" 
        justifyContent="space-between"
        UNSAFE_className="text-xs rounded border-dashed border p-2 mb-2"
      >
        <Flex direction="row" alignItems="center" gap="size-100">
          <Switch
            isSelected={!isJsonMode}
            onChange={(isSelected) => setIsJsonMode(!isSelected)}
            aria-label="Toggle view mode"
          >
            {isJsonMode ? "View JSON" : "Visual Builder"}
          </Switch>
          

          
          {/* Selection Tips */}
          {selectedNodesCount === 0 && selectedEdgesCount === 0 && (
            <View UNSAFE_className="text-xs text-gray-500">
              <span>Drag to pan • Hold Shift + drag to select multiple elements</span>
            </View>
          )}
        </Flex>

        <Flex direction="row" alignItems="center" gap="size-100">
          {validationResults && !validationResults.is_valid && (
            <View>
              <ValidationErrors validation={validationResults} />
            </View>
          )}
          
          <TooltipTrigger>
            <ActionButton
              onPress={() => {
                const json = JSON.stringify(syncToJson(), null, 2);
                const blob = new Blob([json], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "graph-config.json";
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Download size={18} />
            </ActionButton>
            <Tooltip>Download Graph</Tooltip>
          </TooltipTrigger>

          <TooltipTrigger>
            <ActionButton onPress={handleSave}>
              <Flex alignItems="center">
                <Save size={18} />
                {isDirty && (
                  <View 
                    UNSAFE_className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"
                  />
                )}
              </Flex>
            </ActionButton>
            <Tooltip>Save Changes</Tooltip>
          </TooltipTrigger>

          <TooltipTrigger>
            <ActionButton 
              onPress={handleValidate}
              isDisabled={validationLoading}
            >
              <Flex alignItems="center">
                <ListCheck size={18} />
                {validationResults && (
                  <View 
                    UNSAFE_className={`absolute top-0 right-0 w-2 h-2 rounded-full ${
                      graphValidated ? "bg-green-500" : "bg-red-500"
                    }`}
                  />
                )}
              </Flex>
            </ActionButton>
            <Tooltip>
              <Flex direction="column">
                <span>Validate Graph</span>
                {validationResults && (
                  <Flex direction="row" alignItems="center" gap="size-50">
                    {graphValidated ? (
                      <>
                        <CheckCircle size={12} color="green" />
                        <span>success</span>
                      </>
                    ) : (
                      <>
                        <CircleX size={12} color="red" />
                        <span>errors</span>
                      </>
                    )}
                  </Flex>
                )}
              </Flex>
            </Tooltip>
          </TooltipTrigger>

          <TooltipTrigger>
            <Button 
              variant="cta"
              onPress={() => setRightPanelMode('test')}
            >
              <PlayCircle size={18} />
              <span>Run</span>
            </Button>
            <Tooltip>Run Graph</Tooltip>
          </TooltipTrigger>
        </Flex>
      </Flex>

      <DndContext
        sensors={sensors}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragStart={handleDragStart}
      >
        <Flex direction="row" height="calc(100vh - 239px)">
          {/* Main graph view */}
          <View 
            flex
            UNSAFE_className="relative bg-primary rounded"
            borderWidth="thin"
            borderColor="dark"
            borderRadius="medium"
            UNSAFE_style={{ 
              width: `calc(100% - ${rightPanelWidth})`,
              transition: 'width 0.2s ease-in-out'
            }}
          >
            <View 
              UNSAFE_className="bg-primary rounded h-full"
              backgroundColor="gray-50"
            >
              <View UNSAFE_className="relative rounded bg-tertiary h-full">
                <View
                  UNSAFE_className={`w-full h-full transition-all duration-200 ${
                    isFullscreen
                      ? "fixed inset-4 z-50 shadow bg-tertiary backdrop-blur-sm"
                      : ""
                  }`}
                >
                  {isJsonMode ? (
                    <MonacoEditor
                      value={JSON.stringify(syncToJson(), null, 2)}
                      onChange={handleJsonChange}
                      editorRef={editorRef}
                      language="json"
                      minimap={false}
                    />
                  ) : (
                    <ReactFlow
                      nodes={nodes}
                      edges={edges}
                      onNodesChange={handleNodesChange}
                      onEdgesChange={handleEdgesChange}
                      onConnect={onConnect}
                      onSelectionChange={handleSelectionChange}
                      nodeTypes={nodeTypes}
                      edgeTypes={edgeTypes}
                      deleteKeyCode={["Backspace", "Delete"]}
                      fitView
                      snapToGrid={showGrid}
                      className="reactflow-wrapper"
                      multiSelectionKeyCode={["Shift"]}
                      selectionOnDrag={true}
                      panOnDrag={true}
                      selectNodesOnDrag={false}
                      selectionMode={SelectionMode.Full}
                      selectionKeyCode={["Shift"]}
                      panActivationKeyCode={null}
                    >
                      <Background
                        variant={BackgroundVariant.Dots}
                        gap={20}
                        size={1}
                        style={{ display: showGrid ? "block" : "none" }}
                      />
                      {showMiniMap && <MiniMap />}
                      <GraphBuilderToolbar
                        onToggleFullscreen={handleToggleFullscreen}
                        isFullscreen={isFullscreen}
                        onUndo={undo}
                        onRedo={redo}
                        canUndo={canUndo}
                        canRedo={canRedo}
                        onLayout={layoutNodes}
                        showGrid={showGrid}
                        onToggleGrid={() => setShowGrid(!showGrid)}
                        showMiniMap={showMiniMap}
                        onToggleMiniMap={() => setShowMiniMap(!showMiniMap)}
                      />
                      <SelectionBox />
                    </ReactFlow>
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* Right panel for component editor or test drawer */}
          {rightPanelMode !== 'none' && (
            <View 
              width="400px"
              borderWidth="thin"
              borderColor="dark"
              borderRadius="medium"
              backgroundColor="gray-50"
              UNSAFE_className="ml-2 overflow-hidden"
              UNSAFE_style={{ 
                transition: 'width 0.2s ease-in-out'
              }}
            >
                                            <View 
                 padding="size-150"
                 borderBottomWidth="thin"
                 borderBottomColor="gray-300"
               >
                 <Flex 
                   direction="row" 
                   alignItems="center" 
                   justifyContent="space-between"
                 >
                   <View UNSAFE_className="font-semibold">
                     {rightPanelMode === 'component' ? 'Edit Component' : 'Test Graph'}
                   </View>
                   <ActionButton onPress={handleCloseRightPanel}>
                     <X size={16} />
                   </ActionButton>
                 </Flex>
               </View>
              
              <View 
                UNSAFE_className="panel-content"
                UNSAFE_style={{ 
                  height: 'calc(100% - 60px)', // Account for header height
                  overflow: 'auto',
                  padding: '12px'
                }}
              >
                {rightPanelMode === 'component' && selectedNodeId && (
                  <>
                    {nodes.find((n) => n.id === selectedNodeId)?.data.component && (
                      <ComponentEditor
                        component={
                          nodes.find((n) => n.id === selectedNodeId)!.data.component
                        }
                        onChange={(updatedComponent) => {
                          if (selectedNodeId) {
                            updateNode(selectedNodeId, {
                              component: updatedComponent,
                            });
                            // Note: API save is separate - triggered by main save button
                          }
                        }}
                        navigationDepth={true}
                      />
                    )}
                  </>
                )}
                
                {rightPanelMode === 'test' && syncToJson() && (
                  <TestDrawer
                    isVisible={true}
                    onClose={handleCloseRightPanel}
                    component={syncToJson()!}
                    graphId={graph?.id}
                  />
                )}
              </View>
            </View>
          )}
        </Flex>

        <DragOverlay>
          {activeDragItem && (
            <View 
              backgroundColor="gray-50" 
              borderWidth="thin" 
              borderColor="gray-400"
              padding="size-100"
              borderRadius="medium"
              UNSAFE_className="shadow-lg"
            >
              <Flex direction="row" alignItems="center" gap="size-100">
                {activeDragItem.icon}
                <span>{activeDragItem.label}</span>
              </Flex>
            </View>
          )}
        </DragOverlay>
      </DndContext>

      {errorMessage && (
        <DialogTrigger isOpen={!!errorMessage}>
          <Button variant="negative" isHidden>Error</Button>
          <AlertDialog 
            title="Error"
            variant="error"
            primaryActionLabel="OK"
            onPrimaryAction={() => setErrorMessage(null)}
          >
            {errorMessage}
          </AlertDialog>
        </DialogTrigger>
      )}
    </View>
  );
};

export default GraphBuilder;