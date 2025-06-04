import React, { useState, useRef, useEffect } from "react";
import { 
  Button, 
  SearchField, 
  ActionButton, 
  TooltipTrigger, 
  Tooltip, 
  Flex, 
  View, 
  Text, 
  Heading,
  DialogTrigger,
  Dialog,
  AlertDialog,
  TextField,
  Content,
  Divider
} from "@adobe/react-spectrum";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Trash2,
  Edit3,
  FolderOpen,
  Share,
  FileText,
  Users,
  Calendar,
  Sparkles
} from "lucide-react";
import { Gallery, Graph } from "../../../types/datamodel";
import { GalleryManager } from "../../gallery/manager";

interface GraphSidebarProps {
  isOpen: boolean;
  graphs: Graph[];
  currentGraph: Graph | null;
  onToggle: () => void;
  onSelectGraph: (graph: Graph) => void;
  onCreateGraph: (graph: Graph) => void;
  onEditGraph: (graph: Graph) => void;
  onDeleteGraph: (graphId: number) => void;
  isLoading: boolean;
  setSelectedGallery: (gallery: Gallery | null) => void;
  selectedGallery: Gallery | null;
}

export const GraphSidebar: React.FC<GraphSidebarProps> = ({
  isOpen,
  graphs,
  currentGraph,
  onToggle,
  onSelectGraph,
  onCreateGraph,
  onEditGraph,
  onDeleteGraph,
  isLoading,
  setSelectedGallery,
  selectedGallery,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingGraphId, setEditingGraphId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [galleryManagerVisible, setGalleryManagerVisible] = useState(false);
  const [deleteDialogGraph, setDeleteDialogGraph] = useState<Graph | null>(null);
  const editInputRef = useRef<any>(null);

  // useEffect(() => {
  //   if (!selectedGallery) {
  //     setSelectedGallery(defaultGallery);
  //   }
  // }, [selectedGallery, setSelectedGallery]);

  const filteredGraphs = graphs.filter((graph) =>
    graph.component?.label?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateGraph = () => {
    // const newGraph: Graph = {
    //   component: {
    //     provider: "autogen_agentchat.teams.GraphFlow",
    //     component_type: "graph",
    //     version: 1,
    //     component_version: 1,
    //     description: "A new graph-based conversation flow",
    //     label: "New Graph",
    //     config: {
    //       participants: [],
    //       graph: {
    //         nodes: {},
    //       },
    //     },
    //   },
    // };
    if (!selectedGallery?.config.components?.graphs?.length) {
      return;
    }
    const newGraph = Object.assign(
      {},
      { component: selectedGallery.config.components.graphs[0] }
    );
    newGraph.component.label =
      "default_graph" + new Date().getTime().toString().slice(0, 2);
    onCreateGraph(newGraph);
  };

  const handleEditGraphName = (graph: Graph) => {
    setEditingGraphId(graph.id!);
    setEditingName(graph.component?.label || "");
    setTimeout(() => {
      editInputRef.current?.focus();
    }, 100);
  };

  const handleSaveGraphName = () => {
    if (editingGraphId && editingName.trim()) {
      const graph = graphs.find((g) => g.id === editingGraphId);
      if (graph) {
        const updatedGraph = {
          ...graph,
          component: {
            ...graph.component!,
            label: editingName.trim(),
          },
        };
        onEditGraph(updatedGraph);
      }
    }
    setEditingGraphId(null);
    setEditingName("");
  };

  const handleDeleteGraph = (graph: Graph) => {
    setDeleteDialogGraph(graph);
  };

  const confirmDeleteGraph = () => {
    if (deleteDialogGraph?.id) {
      onDeleteGraph(deleteDialogGraph.id);
    }
    setDeleteDialogGraph(null);
  };

  const openGalleryManager = () => {
    setGalleryManagerVisible(true);
  };

  const closeGalleryManager = () => {
    setGalleryManagerVisible(false);
  };

  return (
    <>
      <View 
        height="100vh" 
        backgroundColor="gray-75" 
        borderEndWidth="thin" 
        borderEndColor="gray-300"
        UNSAFE_className="flex flex-col shadow-sm"
      >
        {/* Header */}
        <View 
          padding="size-200" 
          borderBottomWidth="thin" 
          borderBottomColor="gray-300"
          backgroundColor="gray-50"
          UNSAFE_className="shadow-sm"
        >
          <Flex direction="row" alignItems="center" gap="size-150">
            <TooltipTrigger delay={0}>
              <ActionButton 
                onPress={onToggle} 
                isQuiet 
                UNSAFE_className="flex-shrink-0 p-2 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {isOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
              </ActionButton>
              <Tooltip>{isOpen ? "Collapse Sidebar" : "Expand Sidebar"}</Tooltip>
            </TooltipTrigger>
            
            {isOpen && (
              <>
                <Flex direction="row" alignItems="center" gap="size-100" flex="1">
                  <FileText size={20} color="var(--spectrum-global-color-blue-600)" />
                  <Heading level={3} UNSAFE_className="text-lg font-semibold text-gray-800 m-0">
                    Graphs
                  </Heading>
                </Flex>
                
                <TooltipTrigger delay={0}>
                  <ActionButton 
                    onPress={handleCreateGraph} 
                    UNSAFE_className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    <Plus size={16} />
                  </ActionButton>
                  <Tooltip>Create New Graph</Tooltip>
                </TooltipTrigger>
              </>
            )}
          </Flex>
        </View>

        {isOpen && (
          <>
            {/* Search */}
            <View padding="size-200" backgroundColor="gray-50">
              <SearchField 
                placeholder="Search graphs..."
                value={searchTerm}
                onChange={setSearchTerm}
                width="100%"
                UNSAFE_className="rounded-lg shadow-sm"
              />
            </View>

            <Divider size="S" />

            {/* Gallery Info */}
            {/* {selectedGallery && (
              <>
                <View 
                  padding="size-200" 
                  backgroundColor="blue-400"
                  UNSAFE_className="border-l-4 border-blue-500"
                >
                  <Flex direction="row" alignItems="center" gap="size-100" marginBottom="size-75">
                    <FolderOpen size={16} color="var(--spectrum-global-color-blue-600)" />
                    <Text UNSAFE_className="text-sm font-semibold text-blue-800">
                      Gallery: {selectedGallery.config?.name}
                    </Text>
                  </Flex>
                  <Text UNSAFE_className="text-xs text-blue-700 leading-relaxed">
                    {selectedGallery.config?.metadata?.description}
                  </Text>
                </View>
                <Divider size="S" />
              </>
            )} */}

            {/* Graph List */}
            <View flex="1 1 auto" UNSAFE_className="overflow-y-auto" backgroundColor="gray-75">
              {isLoading ? (
                <View padding="size-300">
                  <Flex direction="column" alignItems="center" gap="size-150">
                    <Sparkles size={24} color="var(--spectrum-global-color-gray-600)" />
                    <Text UNSAFE_className="text-center text-gray-600 text-sm">
                      Loading graphs...
                    </Text>
                  </Flex>
                </View>
              ) : filteredGraphs.length === 0 ? (
                <View padding="size-300">
                  <Flex direction="column" alignItems="center" gap="size-150">
                    <FileText size={32} color="var(--spectrum-global-color-gray-400)" />
                    <Text UNSAFE_className="text-center text-gray-500 text-sm font-medium">
                      {searchTerm ? "No graphs found" : "No graphs created yet"}
                    </Text>
                    {!searchTerm && (
                      <Text UNSAFE_className="text-center text-gray-400 text-xs">
                        Click the + button to create your first graph
                      </Text>
                    )}
                  </Flex>
                </View>
              ) : (
                <View padding="size-150" UNSAFE_className="space-y-2">
                  {filteredGraphs.map((graph) => (
                    <TooltipTrigger key={graph.id} delay={0} placement="right">
                      <ActionButton
                        onPress={() => onSelectGraph(graph)}
                        isQuiet
                        UNSAFE_className={`w-full p-4 rounded-xl transition-all duration-200 group border ${
                          currentGraph?.id === graph.id
                            ? "bg-blue-100 border-blue-300 shadow-md"
                            : "bg-white hover:bg-gray-50 border-gray-200 hover:border-gray-300 hover:shadow-sm"
                        }`}
                      >
                        <Flex direction="row" alignItems="center" gap="size-150" width="100%">
                          <View 
                            UNSAFE_className={`p-2 rounded-lg ${
                              currentGraph?.id === graph.id
                                ? "bg-blue-200"
                                : "bg-gray-100 group-hover:bg-gray-200"
                            }`}
                          >
                            <FileText 
                              size={20} 
                              color={currentGraph?.id === graph.id 
                                ? "var(--spectrum-global-color-blue-700)" 
                                : "var(--spectrum-global-color-gray-600)"
                              } 
                            />
                          </View>
                          
                          <View flex="1 1 auto" UNSAFE_className="min-w-0 text-left">
                            {editingGraphId === graph.id ? (
                              <TextField
                                ref={editInputRef}
                                value={editingName}
                                onChange={setEditingName}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleSaveGraphName();
                                  }
                                }}
                                onBlur={handleSaveGraphName}
                                width="100%"
                              />
                            ) : (
                              <Flex direction="row" alignItems="center" gap="size-75">
                                <Text UNSAFE_className="text-sm font-semibold text-gray-900 truncate flex-1">
                                  {graph.component?.label || "Untitled Graph"}
                                </Text>
                                {!graph.id && (
                                  <View 
                                    backgroundColor="orange-400" 
                                    padding="size-25" 
                                    borderRadius="small"
                                    UNSAFE_className="flex-shrink-0"
                                  >
                                    <Text UNSAFE_className="text-xs text-white font-medium">
                                      NEW
                                    </Text>
                                  </View>
                                )}
                              </Flex>
                            )}
                          </View>
                          
                          {graph.id && (
                            <Flex 
                              direction="row" 
                              alignItems="center" 
                              gap="size-75"
                              UNSAFE_className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <TooltipTrigger>
                                <ActionButton
                                  isQuiet
                                  onPress={() => handleEditGraphName(graph)}
                                  UNSAFE_className="p-1.5 rounded-md hover:bg-gray-200 transition-colors"
                                >
                                  <Edit3 size={14} color="var(--spectrum-global-color-gray-600)" />
                                </ActionButton>
                                <Tooltip>Edit Name</Tooltip>
                              </TooltipTrigger>
                              
                              <TooltipTrigger>
                                <ActionButton
                                  isQuiet
                                  onPress={() => handleDeleteGraph(graph)}
                                  UNSAFE_className="p-1.5 rounded-md hover:bg-red-100 transition-colors"
                                >
                                  <Trash2 size={14} color="var(--spectrum-global-color-red-600)" />
                                </ActionButton>
                                <Tooltip>Delete Graph</Tooltip>
                              </TooltipTrigger>
                            </Flex>
                          )}
                        </Flex>
                      </ActionButton>
                      <Tooltip>
                        <Flex direction="column" gap="size-75">
                          <Text UNSAFE_className="font-semibold text-sm">
                            {graph.component?.label || "Untitled Graph"}
                          </Text>
                          <Text UNSAFE_className="text-xs text-gray-200 max-w-xs">
                            {graph.component?.description || "No description available"}
                          </Text>
                          {graph.component?.config.participants && (
                            <Flex direction="row" alignItems="center" gap="size-50">
                              <Users size={12} color="var(--spectrum-global-color-gray-200)" />
                              <Text UNSAFE_className="text-xs text-gray-200">
                                {graph.component.config.participants.length} agents
                              </Text>
                            </Flex>
                          )}
                        </Flex>
                      </Tooltip>
                    </TooltipTrigger>
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </View>

      {/* Gallery Manager Modal */}
      <DialogTrigger isOpen={galleryManagerVisible}>
        <Button variant="primary" isHidden>Gallery Manager</Button>
        <Dialog>
          <Heading>Gallery Manager</Heading>
          <Content>
            <div style={{ width: '800px', height: '600px' }}>
              {React.createElement(GalleryManager as any, {
                onSelectGallery: (gallery: Gallery) => {
                  setSelectedGallery(gallery);
                  closeGalleryManager();
                },
                selectedGallery: selectedGallery
              })}
            </div>
          </Content>
          <Button variant="secondary" onPress={closeGalleryManager}>
            Close
          </Button>
        </Dialog>
      </DialogTrigger>

      {/* Delete Confirmation Dialog */}
      <DialogTrigger isOpen={!!deleteDialogGraph}>
        <Button variant="primary" isHidden>Delete</Button>
        <AlertDialog
          title="Delete Graph"
          variant="destructive"
          primaryActionLabel="Delete"
          secondaryActionLabel="Cancel"
          onPrimaryAction={confirmDeleteGraph}
          onSecondaryAction={() => setDeleteDialogGraph(null)}
        >
          Are you sure you want to delete "{deleteDialogGraph?.component?.label}"?
        </AlertDialog>
      </DialogTrigger>
    </>
  );
}; 