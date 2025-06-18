import { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useGraphBuilderStore } from './store';

function useDetachNodes() {
  const { getNodes, setNodes } = useReactFlow();
  const addToHistory = useGraphBuilderStore((state) => state.addToHistory);

  return useCallback(
    (childNodeIds: string[], groupNodeId: string) => {
      const nodes = getNodes();
      const groupNode = nodes.find((node) => node.id === groupNodeId);
      
      if (!groupNode) return;

      // Calculate positions for detached nodes relative to group position
      const detachedNodes = childNodeIds.map((childId, index) => {
        const childNode = nodes.find((node) => node.id === childId);
        if (!childNode) return null;

        return {
          ...childNode,
          parentId: undefined,
          extent: undefined,
          position: {
            x: groupNode.position.x + (index % 3) * 250, // Arrange in grid
            y: groupNode.position.y + Math.floor(index / 3) * 150,
          },
        };
      }).filter(Boolean);

      // Remove the group node and update child nodes
      const updatedNodes = nodes
        .filter((node) => node.id !== groupNodeId)
        .map((node) => {
          const detachedNode = detachedNodes.find(
            (detached) => detached && detached.id === node.id
          );
          return detachedNode || node;
        });

      setNodes(updatedNodes);
      addToHistory();
    },
    [getNodes, setNodes, addToHistory]
  );
}

export default useDetachNodes; 