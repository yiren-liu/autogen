# Mistakes and Fixes

## Mistake: updateNode Function Type Mismatch
**Wrong**:
```
// Interface and implementation had type mismatch
updateNode: (nodeId: string, config: ComponentConfig) => void;

updateNode: (nodeId, config) => {
  // This was casting config incorrectly, causing data corruption
  component: config as Component<ComponentConfig>,
}
```

**Correct**:
```
// Fixed interface to accept partial updates
updateNode: (nodeId: string, updates: Partial<{ component: Component<ComponentConfig> }>) => void;

updateNode: (nodeId, updates) => {
  // Properly spread updates into data
  data: {
    ...node.data,
    ...updates,
  },
}
```

## Mistake: onConnect State Synchronization Issue
**Wrong**:
```
const onConnect = useCallback(
  (params: Connection) => {
    setEdges((eds: CustomEdge[]) => {
      // This only updated React Flow's local state, not the store
      // ... edge creation logic ...
      return addEdge(newEdge, eds);
    });
    
    // Add to history saved the old store state (without new edge)
    useGraphBuilderStore.getState().addToHistory();
  },
  [setEdges]
);

// This effect overwrote local changes with store state
React.useEffect(() => {
  const unsubscribe = useGraphBuilderStore.subscribe((state) => {
    setNodes(state.nodes);
    setEdges(state.edges);  // This overwrites local changes!
  });
  return unsubscribe;
}, [setNodes, setEdges]);
```

**Correct**:
```
const onConnect = useCallback(
  (params: Connection) => {
    const currentEdges = useGraphBuilderStore.getState().edges;
    
    // ... edge creation logic using currentEdges ...
    
    // Update the store's edges directly
    useGraphBuilderStore.getState().setEdges(updatedEdges);
    
    // Now addToHistory saves the correct state
    useGraphBuilderStore.getState().addToHistory();
  },
  []
);
```

## Mistake: ReactFlow State Synchronization During Ungrouping
**Wrong**:
```
// useDetachNodes hook was directly manipulating ReactFlow state
function useDetachNodes() {
  const { getNodes, setNodes } = useReactFlow();
  const addToHistory = useGraphBuilderStore((state) => state.addToHistory);

  return useCallback(
    (childNodeIds: string[], groupNodeId: string) => {
      // ... ungrouping logic ...
      
      // This bypassed the store and caused state sync issues
      setNodes(updatedNodes);
      addToHistory();
    },
    [getNodes, setNodes, addToHistory]
  );
}

// GroupNode component used detachNodes hook instead of store method
const onUngroup = () => {
  const childNodeIds = getNodes()
    .filter((node) => node.parentId === id)
    .map((node) => node.id);

  detachNodes(childNodeIds, id);
};
```

**Correct**:
```
// Use store's ungroupNodes method instead of detachNodes hook
function GroupNode({ id }: NodeProps<GroupNode>) {
  const ungroupNodes = useGraphBuilderStore((state) => state.ungroupNodes);

  const onUngroup = async () => {
    try {
      await ungroupNodes(id);
    } catch (error) {
      console.error('Failed to ungroup nodes:', error);
      // Ungrouping will continue locally even if API fails
    }
  };
}

// Store's ungroupNodes properly manages both local and API state
ungroupNodes: async (groupId) => {
  // ... proper ungrouping logic with state management ...
  set({ nodes: updatedNodes, edges: updatedEdges });
  get().addToHistory();
  
  // API call with error handling
  if (userId) {
    try {
      await groupAPI.deleteGroup(numericGroupId, userId);
    } catch (error) {
      console.error('Failed to delete group from backend:', error);
    }
  }
}
```

## Mistake: Store Subscription Overwriting ReactFlow Selection and Position State
**Wrong**:
```
React.useEffect(() => {
  const unsubscribe = useGraphBuilderStore.subscribe((state) => {
    setNodes(state.nodes);  // This overwrites local selection AND position state
    setEdges(state.edges);  // This overwrites local selection state
  });
  return unsubscribe;
}, [setNodes, setEdges]);
```

**Problem**: When a node is selected or moved, it triggers store updates (like `setSelectedNode`), which causes the subscription to overwrite local ReactFlow state with store state, losing both selection information and node positions, causing canvas to flash and nodes to snap back to original positions.

**Correct**:
```
React.useEffect(() => {
  const unsubscribe = useGraphBuilderStore.subscribe((state) => {
    // Preserve selection and position state when updating from store
    setNodes(currentNodes => {
      const selectionMap = new Map();
      const positionMap = new Map();
      currentNodes.forEach(node => {
        if (node.selected) selectionMap.set(node.id, true);
        positionMap.set(node.id, node.position);
      });
      
      return state.nodes.map(node => ({
        ...node,
        selected: selectionMap.has(node.id) || false,
        position: positionMap.get(node.id) || node.position
      }));
    });
    
    setEdges(currentEdges => {
      const edgeSelectionMap = new Map();
      currentEdges.forEach(edge => {
        if (edge.selected) edgeSelectionMap.set(edge.id, true);
      });
      
      return state.edges.map(edge => ({
        ...edge,
        selected: edgeSelectionMap.has(edge.id) || false
      }));
    });
  });
  return unsubscribe;
}, [setNodes, setEdges]);
```

**Solution**: Use functional updates to preserve current selection AND position state when applying store updates, preventing loss of ReactFlow state and eliminating canvas flashing and node position resets.

## Mistake: Duplicate Store Subscription in SelectionBox Component
**Problem**: The SelectionBox component had a duplicate store subscription that was conflicting with the main graphbuilder's subscription, causing canvas flashing and lost selections during shift+drag multi-select.

**Wrong**:
```typescript
// SelectionBox.tsx - This duplicate subscription caused the issue
React.useEffect(() => {
  const unsubscribe = useGraphBuilderStore.subscribe((state) => {
    // This overwrites ReactFlow's local selection state
    setNodes(currentNodes => { /* ... */ });
    setEdges(currentEdges => { /* ... */ });
  });
  return unsubscribe;
}, [setNodes, setEdges]);
```

**Correct**:
```typescript
// SelectionBox.tsx - Only handle selection UI, don't manage state sync
export default function SelectionBox() {
  const { setNodes, setEdges, deleteElements } = useReactFlow();
  const deleteNode = useGraphBuilderStore((state) => state.deleteNode);
  const addToHistory = useGraphBuilderStore((state) => state.addToHistory);
  
  // Use useStore to get selected elements (read-only)
  const selectedNodes = useStore((state) => {
    return state.nodes.filter((node: Node) => node.selected);
  });
  // ... rest of component only handles UI actions
}
```

**Key Fix**: Removed the duplicate store subscription from SelectionBox. State synchronization should only happen in one place (main graphbuilder component).

## Mistake: Overly Sensitive Drag Selection  
**Problem**: Drag selection was triggering with small mouse movements and selecting the entire graph unintentionally, causing flashy visual behavior.

**Wrong**:
```
selectionMode={SelectionMode.Partial}  // Too permissive
selectionOnDrag={true}                 // No activation constraints
```

**Correct**:
```
selectionMode={SelectionMode.Full}     // Requires full containment
selectionKeyCode={["Shift"]}           // Requires Shift key to activate
selectionOnDrag={true}                 // Still enabled but constrained
```

**Visual Improvements**:
- Reduced selection box border thickness and opacity
- Added subtle transition and backdrop-filter for smoother appearance
- Added user guidance tip: "Hold Shift + drag to select multiple elements"
- Made selection box less prominent to reduce visual flash

**User Experience**: Selection now requires intentional Shift+drag action, preventing accidental selections while maintaining powerful multi-selection capabilities.

## Follow-up Fix: Autolayout Blocked by Position Preservation
**Problem**: After implementing position preservation, the autolayout feature stopped working because it was preserving old local positions even when the layout function had calculated new organized positions.

**Solution**: Added intelligent detection of layout operations vs. normal updates:

```typescript
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

// Use store position if it's a layout operation, otherwise preserve current position
position: isLayoutOperation ? node.position : (currentPosition || node.position)
```

**Key Logic**: 
- **Individual Node Moves**: Preserve local positions (user is dragging)
- **Bulk Position Changes**: Use store positions (layout operation)
- **Threshold**: 30+ pixel movement on 50%+ of nodes indicates layout operation

## Invisible Graph Node Selection Fix

### Issue: Invisible "default_graph17" Node Always Selected
**Problem**: 
- `graphToVisualElements()` was creating a main graph node with id "graph" and label from sidebar
- `SimpleNode` component was set to return `null` for graph type nodes (invisible)
- Node existed in ReactFlow state and was selectable but invisible, causing selection issues

**Root Cause**:
- Sidebar creates graphs with labels like "default_graph17" 
- Store creates invisible main graph node with this label
- Node is selectable but not visible, confusing users

**Solution**:
- Removed main graph node creation entirely from `graphToVisualElements()`
- Updated `visualElementsToGraph()` to work without requiring a graph node
- Removed graph-to-termination edge creation (was connecting to removed graph node)
- Graph metadata now managed by component props instead of invisible node

**Changes Made**:
- Store's `graphToVisualElements()`: Removed mainNode creation and related edges
- Store's `visualElementsToGraph()`: No longer searches for graph node, creates default component
- Fixed edge creation logic that was connecting to the removed graph node
</rewritten_file> 