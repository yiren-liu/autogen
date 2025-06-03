import React, { useState, useRef } from "react";
import { Button, Input, Menu, message, Modal, Popover, Tooltip } from "antd";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Trash2,
  Edit3,
  FolderOpen,
  Share,
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
  const [messageApi, contextHolder] = message.useMessage();
  const [galleryManagerVisible, setGalleryManagerVisible] = useState(false);
  const editInputRef = useRef<any>(null);

  const filteredGraphs = graphs.filter((graph) =>
    graph.component?.label?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateGraph = () => {
    const newGraph: Graph = {
      component: {
        provider: "autogen_agentchat.graphs.GraphChat",
        component_type: "graph",
        version: 1,
        component_version: 1,
        description: "A new graph-based conversation flow",
        label: "New Graph",
        config: {
          participants: [],
          graph: {
            nodes: {},
          },
        },
      },
    };
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
    Modal.confirm({
      title: "Delete Graph",
      content: `Are you sure you want to delete "${graph.component?.label}"?`,
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: () => {
        if (graph.id) {
          onDeleteGraph(graph.id);
        }
      },
    });
  };

  const openGalleryManager = () => {
    setGalleryManagerVisible(true);
  };

  const closeGalleryManager = () => {
    setGalleryManagerVisible(false);
  };

  return (
    <>
      {contextHolder}
      <div className="h-full bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-3 border-b border-gray-200 flex items-center gap-2">
          <Button
            type="text"
            icon={isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            onClick={onToggle}
            className="flex-shrink-0"
          />
          {isOpen && (
            <>
              <h2 className="text-sm font-semibold text-gray-900 flex-1">
                Graphs
              </h2>
              <Tooltip title="Create New Graph">
                <Button
                  type="text"
                  icon={<Plus size={16} />}
                  onClick={handleCreateGraph}
                  className="flex-shrink-0"
                />
              </Tooltip>
              <Tooltip title="Manage Galleries">
                <Button
                  type="text"
                  icon={<FolderOpen size={16} />}
                  onClick={openGalleryManager}
                  className="flex-shrink-0"
                />
              </Tooltip>
            </>
          )}
        </div>

        {isOpen && (
          <>
            {/* Search */}
            <div className="p-3 border-b border-gray-200">
              <Input
                placeholder="Search graphs..."
                prefix={<Search size={14} />}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-sm"
              />
            </div>

            {/* Gallery Info */}
            {selectedGallery && (
              <div className="p-3 border-b border-gray-200 bg-blue-50">
                <div className="text-xs text-blue-600 font-medium">
                  Gallery: {selectedGallery.config?.name}
                </div>
                <div className="text-xs text-blue-500 mt-1">
                  {selectedGallery.config?.metadata?.description}
                </div>
              </div>
            )}

            {/* Graph List */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="p-3 text-center text-gray-500 text-sm">
                  Loading graphs...
                </div>
              ) : filteredGraphs.length === 0 ? (
                <div className="p-3 text-center text-gray-500 text-sm">
                  {searchTerm ? "No graphs found" : "No graphs created yet"}
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {filteredGraphs.map((graph) => (
                    <div
                      key={graph.id}
                      className={`p-2 rounded cursor-pointer transition-colors ${
                        currentGraph?.id === graph.id
                          ? "bg-primary/10 border border-primary/20"
                          : "hover:bg-gray-50"
                      }`}
                      onClick={() => onSelectGraph(graph)}
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          {editingGraphId === graph.id ? (
                            <Input
                              ref={editInputRef}
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onPressEnter={handleSaveGraphName}
                              onBlur={handleSaveGraphName}
                              className="text-sm"
                            />
                          ) : (
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {graph.component?.label || "Untitled Graph"}
                              {!graph.id && (
                                <span className="text-xs text-orange-500 ml-1">
                                  (New)
                                </span>
                              )}
                            </div>
                          )}
                          <div className="text-xs text-gray-500 truncate">
                            {graph.component?.description ||
                              "No description available"}
                          </div>
                          {graph.component?.config.participants && (
                            <div className="text-xs text-gray-400 mt-1">
                              {graph.component.config.participants.length} agents
                            </div>
                          )}
                        </div>
                        {graph.id && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              type="text"
                              size="small"
                              icon={<Edit3 size={12} />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditGraphName(graph);
                              }}
                              className="p-1"
                            />
                            <Button
                              type="text"
                              size="small"
                              icon={<Trash2 size={12} />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteGraph(graph);
                              }}
                              className="p-1 text-red-500 hover:text-red-700"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Gallery Manager Modal */}
      <Modal
        title="Gallery Manager"
        open={galleryManagerVisible}
        onCancel={closeGalleryManager}
        width={800}
        footer={null}
        destroyOnClose
      >
        <GalleryManager
          onSelectGallery={(gallery) => {
            setSelectedGallery(gallery);
            closeGalleryManager();
          }}
          selectedGallery={selectedGallery}
        />
      </Modal>
    </>
  );
}; 