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
  addEdge,
  Connection,
  Background,
  BackgroundVariant,
  MiniMap,
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
    selectedNodeId,
    setSelectedNode,
  } = useGraphBuilderStore();

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
      setEdges((eds: CustomEdge[]) => {
        // Check for existing reverse connection
        const reverseEdge = eds.find(
          (e) => e.source === params.target && e.target === params.source
        );

        if (reverseEdge) {
          // Remove the reverse edge and create a bidirectional edge
          const filteredEdges = eds.filter((e) => e.id !== reverseEdge.id);
          const bidirectionalEdge: CustomEdge = {
            ...params,
            id: `${params.source}-${params.target}-bidirectional`,
            type: "bidirectional",
          } as CustomEdge;
          
          return addEdge(bidirectionalEdge, filteredEdges);
        } else {
          // Check if there's already a bidirectional edge
          const existingBidirectional = eds.find(
            (e) => 
              e.type === "bidirectional" && 
              ((e.source === params.source && e.target === params.target) ||
               (e.source === params.target && e.target === params.source))
          );
          
          if (existingBidirectional) {
            // Don't add duplicate edge if bidirectional already exists
            return eds;
          }
          
          // Create a normal edge
          const newEdge: CustomEdge = {
            ...params,
            id: `${params.source}-${params.target}`,
            type: "graph-connection",
          } as CustomEdge;
          
          return addEdge(newEdge, eds);
        }
      });
      
      // Add to history for undo/redo
      useGraphBuilderStore.getState().addToHistory();
    },
    [setEdges]
  );

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
      setNodes(state.nodes);
      setEdges(state.edges);
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
                      onNodesChange={onNodesChange}
                      onEdgesChange={onEdgesChange}
                      onConnect={onConnect}
                      nodeTypes={nodeTypes}
                      edgeTypes={edgeTypes}
                      deleteKeyCode={["Backspace", "Delete"]}
                      fitView
                      snapToGrid={showGrid}
                      className="reactflow-wrapper"
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