import React, { useCallback, useEffect, useState, useContext } from "react";
import { message, Modal } from "antd";
import { ChevronRight } from "lucide-react";
import { appContext } from "../../../hooks/provider";
import { graphAPI } from "./api";
import { GraphSidebar } from "./graph-builder/sidebar";
import { Gallery, type Graph } from "../../types/datamodel";
import { GraphBuilder } from "./graph-builder/graphbuilder";
import { GalleryAPI } from "../gallery/api";
import { getLocalStorage } from "../../utils/utils";

export const EvalScope: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [graphs, setGraphs] = useState<Graph[]>([]);
  const [currentGraph, setCurrentGraph] = useState<Graph | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("graphSidebar");
      return stored !== null ? JSON.parse(stored) : true;
    }
  });

  const [selectedGallery, setSelectedGallery] = useState<Gallery | null>(null);
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [isLoadingGalleries, setIsLoadingGalleries] = useState(false);
  
  const { user } = useContext(appContext);
  const [messageApi, contextHolder] = message.useMessage();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Persist sidebar state
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("graphSidebar", JSON.stringify(isSidebarOpen));
    }
  }, [isSidebarOpen]);

  const fetchGraphs = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      const data = await graphAPI.listGraphs(user.id);
      setGraphs(data);
      if (!currentGraph && data.length > 0) {
        setCurrentGraph(data[0]);
      }
    } catch (error) {
      console.error("Error fetching graphs:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, currentGraph]);

  useEffect(() => {
    fetchGraphs();
  }, [fetchGraphs]);


    // Fetch galleries
    const fetchGalleries = async () => {
      if (!user?.id) return;
      setIsLoadingGalleries(true);
      try {
        const galleryAPI = new GalleryAPI();
        const data = await galleryAPI.listGalleries(user.id);
        setGalleries(data);
  
        // Check localStorage for a previously saved gallery ID
        const savedGalleryId = getLocalStorage(`selectedGalleryId_${user.id}`);
  
        if (savedGalleryId && data.length > 0) {
          const savedGallery = data.find((g) => g.id === savedGalleryId);
          if (savedGallery) {
            setSelectedGallery(savedGallery);
          } else if (!selectedGallery && data.length > 0) {
            setSelectedGallery(data[0]);
          }
        } else if (!selectedGallery && data.length > 0) {
          setSelectedGallery(data[0]);
        }
      } catch (error) {
        console.error("Error fetching galleries:", error);
      } finally {
        setIsLoadingGalleries(false);
      }
    };
    // Fetch galleries on mount
    React.useEffect(() => {
      fetchGalleries();
    }, [user?.id]);

  // Handle URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const graphId = params.get("graphId");

    if (graphId && !currentGraph) {
      handleSelectGraph({ id: parseInt(graphId) } as Graph);
    }
  }, []);

  const handleSelectGraph = async (selectedGraph: Graph) => {
    if (!user?.id || !selectedGraph.id) return;

    if (hasUnsavedChanges) {
      Modal.confirm({
        title: "Unsaved Changes",
        content: "You have unsaved changes. Do you want to discard them?",
        okText: "Discard",
        cancelText: "Go Back",
        onOk: () => {
          switchToGraph(selectedGraph.id);
        },
      });
    } else {
      await switchToGraph(selectedGraph.id);
    }
  };

  const switchToGraph = async (graphId: number | undefined) => {
    if (!graphId || !user?.id) return;
    setIsLoading(true);
    try {
      const data = await graphAPI.getGraph(graphId, user.id!);
      setCurrentGraph(data);
      window.history.pushState({}, "", `?graphId=${graphId}`);
    } catch (error) {
      console.error("Error loading graph:", error);
      messageApi.error("Failed to load graph");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteGraph = async (graphId: number) => {
    if (!user?.id) return;

    try {
      await graphAPI.deleteGraph(graphId, user.id);
      setGraphs(graphs.filter((g) => g.id !== graphId));
      if (currentGraph?.id === graphId) {
        setCurrentGraph(null);
      }
      messageApi.success("Graph deleted");
    } catch (error) {
      console.error("Error deleting graph:", error);
      messageApi.error("Error deleting graph");
    }
  };

  const handleCreateGraph = (newGraph: Graph) => {
    setCurrentGraph(newGraph);
    handleSaveGraph(newGraph);
  };

  const handleSaveGraph = async (graphData: Partial<Graph>) => {
    if (!user?.id) return;

    try {
      const sanitizedGraphData = {
        ...graphData,
        created_at: undefined,
        updated_at: undefined,
      };

      const savedGraph = await graphAPI.createGraph(sanitizedGraphData, user.id);
      messageApi.success(
        `Graph ${graphData.id ? "updated" : "created"} successfully`
      );

      if (graphData.id) {
        setGraphs(graphs.map((g) => (g.id === savedGraph.id ? savedGraph : g)));
        if (currentGraph?.id === savedGraph.id) {
          setCurrentGraph(savedGraph);
        }
      } else {
        setGraphs([savedGraph, ...graphs]);
        setCurrentGraph(savedGraph);
      }
    } catch (error) {
      throw error;
    }
  };

  return (
    <div className="relative flex h-full w-full">
      {contextHolder}
      {/* Sidebar */}
      <div
        className={`absolute left-0 top-0 h-full transition-all duration-200 ease-in-out ${
          isSidebarOpen ? "w-64" : "w-12"
        }`}
      >
        <GraphSidebar
          isOpen={isSidebarOpen}
          graphs={graphs}
          currentGraph={currentGraph}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          onSelectGraph={handleSelectGraph}
          onCreateGraph={handleCreateGraph}
          onEditGraph={setCurrentGraph}
          onDeleteGraph={handleDeleteGraph}
          isLoading={isLoading}
          setSelectedGallery={setSelectedGallery}
          selectedGallery={selectedGallery}
        />
      </div>

      {/* Main Content */}
      <div
        className={`flex-1 transition-all -mr-6 duration-200 ${
          isSidebarOpen ? "ml-64" : "ml-12"
        }`}
      >
        <div className="p-4 pt-2">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-4 text-sm">
            <span className="text-primary font-medium">Graphs</span>
            {currentGraph && (
              <>
                <ChevronRight className="w-4 h-4 text-secondary" />
                <span className="text-secondary">
                  {currentGraph.component?.label}
                  {currentGraph.id ? (
                    ""
                  ) : (
                    <span className="text-xs text-orange-500"> (New)</span>
                  )}
                </span>
              </>
            )}
          </div>

          {/* Content Area */}
          {currentGraph ? (
            <GraphBuilder
              graph={currentGraph}
              onChange={handleSaveGraph}
              onDirtyStateChange={setHasUnsavedChanges}
              selectedGallery={selectedGallery}
            />
          ) : (
            <div className="flex items-center justify-center h-[calc(100vh-190px)] text-secondary">
              Select a graph from the sidebar or create a new one
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EvalScope;
