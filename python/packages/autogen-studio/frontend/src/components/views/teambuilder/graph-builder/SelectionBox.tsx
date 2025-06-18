import React from 'react';
import {
  useNodes,
  useEdges,
  NodeToolbar,
  useReactFlow,
  useStore,
  Node,
  Edge,
  Position,
} from '@xyflow/react';
import { Trash2, Copy, AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter, Group, Ungroup } from 'lucide-react';
import { useGraphBuilderStore } from './store';
import { CustomNode, CustomEdge } from './types';

export default function SelectionBox() {
  const { getNodes, getEdges, setNodes, setEdges, deleteElements } = useReactFlow();
  const deleteNode = useGraphBuilderStore((state) => state.deleteNode);
  const addToHistory = useGraphBuilderStore((state) => state.addToHistory);
  const createGroup = useGraphBuilderStore((state) => state.createGroup);
  const ungroupNodes = useGraphBuilderStore((state) => state.ungroupNodes);

  // Use useStore to get selected elements without causing re-renders
  const selectedNodes = useStore((state) => {
    return state.nodes.filter((node: Node) => node.selected);
  });

  const selectedEdges = useStore((state) => {
    return state.edges.filter((edge: Edge) => edge.selected);
  });

  const totalSelected = selectedNodes.length + selectedEdges.length;

  if (totalSelected === 0) {
    return null;
  }

  const selectedNodeIds = selectedNodes.map((node) => node.id);
  const selectedEdgeIds = selectedEdges.map((edge) => edge.id);

  // Delete selected elements
  const handleDelete = () => {
    // Delete nodes using store method
    selectedNodeIds.forEach((nodeId) => {
      deleteNode(nodeId);
    });

    // Delete edges
    if (selectedEdgeIds.length > 0) {
      deleteElements({ edges: selectedEdges });
      addToHistory();
    }
  };

  // Duplicate selected nodes
  const handleDuplicate = () => {
    const newNodes: CustomNode[] = selectedNodes.map((node) => {
      const newId = `${node.id}_copy_${Date.now()}`;
      return {
        ...node,
        id: newId,
        position: {
          x: node.position.x + 50,
          y: node.position.y + 50,
        },
        selected: false,
      } as CustomNode;
    });

    setNodes((nodes) => [...nodes, ...newNodes]);
    addToHistory();
  };

  // Align nodes horizontally
  const handleAlignHorizontal = () => {
    if (selectedNodes.length < 2) return;

    const centerY = selectedNodes.reduce((sum, node) => sum + node.position.y, 0) / selectedNodes.length;

    setNodes((nodes) =>
      nodes.map((node) => {
        if (selectedNodeIds.includes(node.id)) {
          return {
            ...node,
            position: {
              ...node.position,
              y: centerY,
            },
          };
        }
        return node;
      })
    );
    addToHistory();
  };

  // Align nodes vertically
  const handleAlignVertical = () => {
    if (selectedNodes.length < 2) return;

    const centerX = selectedNodes.reduce((sum, node) => sum + node.position.x, 0) / selectedNodes.length;

    setNodes((nodes) =>
      nodes.map((node) => {
        if (selectedNodeIds.includes(node.id)) {
          return {
            ...node,
            position: {
              ...node.position,
              x: centerX,
            },
          };
        }
        return node;
      })
    );
    addToHistory();
  };

  // Distribute nodes horizontally
  const handleDistributeHorizontal = () => {
    if (selectedNodes.length < 3) return;

    const sortedNodes = [...selectedNodes].sort((a, b) => a.position.x - b.position.x);
    const leftMost = sortedNodes[0].position.x;
    const rightMost = sortedNodes[sortedNodes.length - 1].position.x;
    const spacing = (rightMost - leftMost) / (sortedNodes.length - 1);

    setNodes((nodes) =>
      nodes.map((node) => {
        const index = sortedNodes.findIndex((n) => n.id === node.id);
        if (index !== -1) {
          return {
            ...node,
            position: {
              ...node.position,
              x: leftMost + spacing * index,
            },
          };
        }
        return node;
      })
    );
    addToHistory();
  };

  // Distribute nodes vertically
  const handleDistributeVertical = () => {
    if (selectedNodes.length < 3) return;

    const sortedNodes = [...selectedNodes].sort((a, b) => a.position.y - b.position.y);
    const topMost = sortedNodes[0].position.y;
    const bottomMost = sortedNodes[sortedNodes.length - 1].position.y;
    const spacing = (bottomMost - topMost) / (sortedNodes.length - 1);

    setNodes((nodes) =>
      nodes.map((node) => {
        const index = sortedNodes.findIndex((n) => n.id === node.id);
        if (index !== -1) {
          return {
            ...node,
            position: {
              ...node.position,
              y: topMost + spacing * index,
            },
          };
        }
        return node;
      })
    );
    addToHistory();
  };

  // Group selected nodes
  const handleGroup = () => {
    if (selectedNodes.length < 2) return;
    
    const nodeIds = selectedNodes.map(node => node.id);
    const edgeIds = selectedEdges.map(edge => edge.id);
    
    const groupName = `Component ${selectedNodes.length}`;
    createGroup(nodeIds, edgeIds, groupName);
  };

  // Ungroup selected group nodes
  const handleUngroup = () => {
    const groupNodes = selectedNodes.filter(node => node.type === 'group');
    
    groupNodes.forEach(groupNode => {
      ungroupNodes(groupNode.id);
    });
  };

  return (
    <NodeToolbar
      nodeId={selectedNodeIds}
      isVisible
      position={Position.Top}
      align="center"
      className="nodrag nopan"
    >
      <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 px-2 py-1">
        {/* Selection count */}
        <div className="text-xs font-medium text-gray-600 dark:text-gray-400 px-2 border-r border-gray-200 dark:border-gray-700">
          {selectedNodes.length > 0 && `${selectedNodes.length} node${selectedNodes.length > 1 ? 's' : ''}`}
          {selectedNodes.length > 0 && selectedEdges.length > 0 && ', '}
          {selectedEdges.length > 0 && `${selectedEdges.length} edge${selectedEdges.length > 1 ? 's' : ''}`}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Delete */}
          <button
            onClick={handleDelete}
            className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            title="Delete selected (Del)"
          >
            <Trash2 size={16} />
          </button>

          {/* Only show node-specific actions if nodes are selected */}
          {selectedNodes.length > 0 && (
            <>
              {/* Duplicate */}
              <button
                onClick={handleDuplicate}
                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                title="Duplicate selected"
              >
                <Copy size={16} />
              </button>

              {/* Group - show if multiple nodes selected and none are already grouped */}
              {selectedNodes.length >= 2 && !selectedNodes.some(node => node.parentId) && (
                <button
                  onClick={handleGroup}
                  className="p-1.5 rounded hover:bg-blue-100 dark:hover:bg-blue-900/20 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  title="Group selected nodes"
                >
                  <Group size={16} />
                </button>
              )}

              {/* Ungroup - show if any group nodes are selected */}
              {selectedNodes.some(node => node.type === 'group') && (
                <button
                  onClick={handleUngroup}
                  className="p-1.5 rounded hover:bg-orange-100 dark:hover:bg-orange-900/20 text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                  title="Ungroup selected groups"
                >
                  <Ungroup size={16} />
                </button>
              )}

            </>
          )}
        </div>
      </div>
    </NodeToolbar>
  );
} 