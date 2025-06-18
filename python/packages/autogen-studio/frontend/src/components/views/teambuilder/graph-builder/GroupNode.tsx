import React, { memo } from 'react';
import {
  NodeProps,
  NodeToolbar,
  useStore,
  NodeResizer,
  Position,
} from '@xyflow/react';
import { ActionButton, View, Flex } from '@adobe/react-spectrum';
import { Group, Ungroup } from 'lucide-react';
import { useGraphBuilderStore } from './store';
import { CustomNode } from './types';

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

function GroupNode({ id }: NodeProps<GroupNode>) {
  const ungroupNodes = useGraphBuilderStore((state) => state.ungroupNodes);

  const hasChildNodes = useStore((store) => {
    const childNodeCount = store.parentLookup.get(id)?.size ?? 0;
    return childNodeCount > 0;
  });

  const onUngroup = async () => {
    try {
      await ungroupNodes(id);
    } catch (error) {
      console.error('Failed to ungroup nodes:', error);
      // Ungrouping will continue locally even if API fails
    }
  };

  return (
    <div
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
            Component Group
          </View>
        </Flex>
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
            
          </Flex>
        </NodeToolbar>
      )}
    </div>
  );
}

export default memo(GroupNode); 