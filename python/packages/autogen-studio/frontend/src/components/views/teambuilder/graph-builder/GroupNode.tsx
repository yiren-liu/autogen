import React, { memo } from 'react';
import {
  NodeProps,
  NodeToolbar,
  useStore,
  NodeResizer,
  useReactFlow,
  Position,
} from '@xyflow/react';
import { ActionButton, View, Flex } from '@adobe/react-spectrum';
import { Group, Ungroup } from 'lucide-react';
import { useGraphBuilderStore } from './store';
import { CustomNode } from './types';
import useDetachNodes from './useDetachNodes';

interface GroupNodeData {
  label: string;
  type: string;
  component: any; // Required by CustomNode but placeholder for groups
  groupedComponents: Array<{
    id: string;
    component: any;
    type: string;
    label: string;
  }>;
  groupedEdges: Array<{
    id: string;
    source: string;
    target: string;
    type: string;
    data?: any;
  }>;
  [key: string]: any; // Index signature for compatibility
}

interface GroupNode extends CustomNode {
  data: GroupNodeData;
}

function GroupNode({ id, data }: NodeProps<GroupNode>) {
  const detachNodes = useDetachNodes();
  const { getNodes } = useReactFlow();
  const setSelectedNode = useGraphBuilderStore((state) => state.setSelectedNode);

  const hasChildNodes = useStore((store) => {
    const childNodeCount = store.parentLookup.get(id)?.size ?? 0;
    return childNodeCount > 0;
  });

  const onUngroup = () => {
    const childNodeIds = getNodes()
      .filter((node) => node.parentId === id)
      .map((node) => node.id);

    detachNodes(childNodeIds, id);
  };

  return (
    <View
      UNSAFE_className="group-node bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg"
      UNSAFE_style={{
        minWidth: 200,
        minHeight: 150,
        padding: '8px',
      }}
    >
      <NodeResizer
        minWidth={200}
        minHeight={150}
        keepAspectRatio={false}
      />
      
      {/* Header */}
      <View 
        UNSAFE_className="group-header bg-blue-100 rounded p-2 mb-2"
        UNSAFE_style={{ marginBottom: '8px' }}
      >
        <Flex direction="row" alignItems="center" gap="size-100">
          <Group size={16} className="text-blue-600" />
          <View UNSAFE_className="font-medium text-blue-800 text-sm">
            {data.label || 'Component Group'}
          </View>
        </Flex>
      </View>

      {/* Components summary */}
      <View UNSAFE_className="text-xs text-gray-600 mb-2">
        {data.groupedComponents?.length || 0} components grouped
      </View>

      {/* Toolbar */}
      {hasChildNodes && (
        <NodeToolbar 
          className="nodrag"
          position={Position.Top}
          align="center"
        >
          <Flex direction="row" gap="size-100">
            <ActionButton
              onPress={onUngroup}
              UNSAFE_className="bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-50"
            >
              <Ungroup size={16} />
              <span className="ml-1">Ungroup</span>
            </ActionButton>
            
            <ActionButton
              onPress={() => setSelectedNode(id)}
              UNSAFE_className="bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-50"
            >
              <span>Edit</span>
            </ActionButton>
          </Flex>
        </NodeToolbar>
      )}
    </View>
  );
}

export default memo(GroupNode); 