# Feature Implementations

## Hover-to-Add Functionality

### Right Handle Hover Detection
- Added hover state management with `isHovering` and `showAddMenu` state variables
- Wrapped source handle in container div with hover event handlers (`onMouseEnter`, `onMouseLeave`)
- Positioned hover area at right: -16px to extend beyond the handle for better UX

### Add Button Component
- Shows blue circular button with Plus icon on hover over right handle
- Uses Adobe Spectrum ActionButton with custom UNSAFE_className styling
- Button positioned 16px to the right of the handle using absolute positioning
- Smooth transitions with hover effects (bg-blue-500 → bg-blue-600)

### Dropdown Menu Integration
- Uses Adobe Spectrum MenuTrigger, Popover, Menu, and Item components
- Menu triggered by clicking the Add button
- Two options: "Add Agent" and "Cancel"
- Menu automatically closes when hovering away or selecting option

### Agent Creation Logic
- `createDefaultAgent()` function generates complete AssistantAgent configuration
- Uses timestamp for unique naming (assistant_agent_{timestamp})
- Includes default OpenAI model client (gpt-4o-mini)
- Includes standard model context, tools array, handoffs array
- Sets default system message for helpful assistant behavior

### Node Positioning and Connection
- New agent positioned 300px to the right of source node (`x: props.xPos + 300`)
- Maintains same vertical level (`y: props.yPos`) 
- Automatically creates connection edge from source node to new agent
- Uses store's `addNode(position, config, targetNodeId)` function
- History tracking automatically handled by store

### User Experience Features
- Hover area larger than visual handle for easier interaction
- Menu closes automatically when mouse leaves hover area
- Visual feedback with button hover states and transitions
- Consistent with existing node interaction patterns (edit, delete buttons)

### Technical Implementation Details
- Added Plus icon import from lucide-react
- Added Adobe Spectrum component imports (ActionButton, Menu, MenuTrigger, Item)
- Hover detection uses absolute positioned container around source handle
- z-index: 10 ensures hover area appears above other elements
- Menu state managed locally within component
- Integration with existing store actions for node creation and history
- Fixed MenuTrigger pattern: uses direct Menu child with onAction handler, no Popover wrapper needed
- Position access uses React Flow's positionAbsoluteX/Y properties for accurate node positioning

## Multi-Selection Implementation

### ReactFlow Multi-Selection Configuration
- Added `multiSelectionKeyCode={["Shift"]}` to enable Shift+click multi-selection
- Enabled `selectionOnDrag={true}` for drag-to-select range selection when Shift is held
- Set `selectionMode={SelectionMode.Full}` to select elements fully within selection box
- Configured `panOnDrag={true}` to allow canvas panning with left mouse button by default
- Set `selectionKeyCode={["Shift"]}` so selection box only appears when Shift is held
- Set `selectNodesOnDrag={false}` to prevent accidental selection during node dragging
- Added `panActivationKeyCode={null}` to ensure no special key required for panning

### Selection State Management
- Added `selectedNodesCount` and `selectedEdgesCount` state variables
- Created `handleSelectionChange` callback to track selection changes
- Integrated selection tracking with component editor opening logic
- Single node selection opens component editor, multiple selections close it

### Keyboard Shortcuts Implementation
- **Ctrl/Cmd+A**: Select all nodes and edges
- **Escape**: Clear all selections  
- **Delete/Backspace**: Delete all selected elements (bulk delete)
- Keyboard event handling with proper event.preventDefault() for browser shortcuts

### Visual Selection Feedback
- Selection status indicator shows count of selected nodes and edges
- Blue badge appears in toolbar when elements are selected
- Clear selection button (X) with tooltip showing Esc shortcut
- Proper pluralization for node/nodes and edge/edges display

### Bulk Operations Support
- `handleBulkDelete()` function for deleting multiple selected elements
- Separate handling for nodes (using store deleteNode method) and edges
- Proper history tracking for undo/redo functionality
- Enhanced delete key handling to work with bulk selections

### User Experience Enhancements
- Visual feedback with selection count display
- Keyboard shortcuts clearly indicated in tooltips
- Prevents component editor opening when multiple nodes selected
- Seamless integration with existing graph builder functionality
- Proper ReactFlow event handling without conflicts
- **Drag Selection Box**: Blue rounded selection box with semi-transparent background
- **Hover Feedback**: Ring highlights on hoverable elements during selection
- **Partial Selection Mode**: Selects elements even if only partially within selection box

### Technical Implementation Details
- Selection change handler updates both node and edge counts
- Bulk delete operations maintain store state consistency
- Keyboard shortcuts only active when graph builder is focused
- Selection state properly synchronized between ReactFlow and store
- Clear separation between single-selection and multi-selection behaviors

## Edge and Node Deletion via Keyboard

### Custom Edge Change Handler
- Created `handleEdgesChange` function to intercept ReactFlow edge changes
- Separates deletion changes (`type === 'remove'`) from other changes
- Uses store methods for deletions, allows ReactFlow to handle other changes
- Proper TypeScript typing with `EdgeChange<CustomEdge>[]`

### Store Integration for Edge Deletion
- Deletions update store state directly using `useGraphBuilderStore.getState().setEdges()`
- Automatically adds to history for undo/redo support
- Filtered edges exclude deleted edge IDs from current store state
- Non-deletion changes (selection, hover, etc.) passed through to ReactFlow's `onEdgesChange`

### Custom Node Change Handler
- Created `handleNodesChange` function to intercept ReactFlow node changes
- Separates deletion changes (`type === 'remove'`) from other changes
- Uses store's `deleteNode` method for deletions, allows ReactFlow to handle other changes
- Proper TypeScript typing with `NodeChange<CustomNode>[]`

### Store Integration for Node Deletion
- Node deletions use store's `deleteNode(nodeId)` method which handles:
  - Removing the node from nodes array
  - Removing connected edges automatically
  - Clearing selected node if it was deleted
  - Adding to history for undo/redo support
- Non-deletion changes (selection, hover, drag, etc.) passed through to ReactFlow's `onNodesChange`

### Implementation Pattern
```typescript
const handleEdgesChange = useCallback(
  (changes: EdgeChange<CustomEdge>[]) => {
    const deleteChanges = changes.filter((change) => change.type === 'remove');
    const otherChanges = changes.filter((change) => change.type !== 'remove');

    if (deleteChanges.length > 0) {
      const currentEdges = useGraphBuilderStore.getState().edges;
      const edgesToDelete = deleteChanges.map((change) => change.id);
      const filteredEdges = currentEdges.filter((edge) => !edgesToDelete.includes(edge.id));
      
      useGraphBuilderStore.getState().setEdges(filteredEdges);
      useGraphBuilderStore.getState().addToHistory();
    }

    if (otherChanges.length > 0) {
      onEdgesChange(otherChanges);
    }
  },
  [onEdgesChange]
);
```

### Integration Requirements
- Import `EdgeChange` and `NodeChange` from `@xyflow/react`
- Replace default handlers with custom handlers in ReactFlow component
- Maintains existing keyboard delete functionality (`deleteKeyCode={["Backspace", "Delete"]}`)
- Prevents store state from being overwritten by ReactFlow's direct state manipulation

## Component Migration from Builder to Graph-Builder

### Migration Pattern
When migrating components from `../builder` to graph-builder directory:
1. Copy the component files to graph-builder directory
2. Update imports to use local references (e.g., `../builder/types` → `./types`)
3. Update store imports from `useTeamBuilderStore` to `useGraphBuilderStore`
4. Convert Ant Design components to Adobe Spectrum where appropriate
5. Maintain the same directory structure for consistency

### Files Migrated
- `types.ts` - Direct copy (already existed)
- `nodes.tsx` - Updated store import to `useGraphBuilderStore`
- `component-editor/` directory with all field components
- Field components were copied as-is (still using Ant Design)

### Import Updates Made
- `graphbuilder.tsx`: Updated imports from `../builder/*` to `./*`
- `store.tsx`: Updated import from `../builder/types` to `./types`
- `nodes.tsx`: Updated store import to use local graph builder store

### Auto-Layout on Graph Load
- Added automatic layout application whenever graph is loaded/reloaded
- Uses `setTimeout(() => layoutNodes(), 100)` with small delay to ensure nodes are rendered
- Triggers after `loadFromJson()` sets initial nodes and edges
- Updated useEffect dependencies to include `layoutNodes` function
- Provides clean, organized visual representation automatically on graph load

## Group Management API Design (Simplified)

### API Specification Created
- **components.yml**: Comprehensive OpenAPI 3.0.3 specification for managing reusable groups and test cases
- **Two main API groups**: Groups (/groups), Test Cases (/test-cases)
- **Consistent patterns**: Following existing Team/Graph API patterns with status/data response format

### Unified Group Concept
- **Single abstraction**: Groups can contain one or more nodes (agents, models, tools, etc.) with their edges
- **No separate components**: Eliminates complexity by treating everything as a group
- **Embedded configurations**: Groups directly embed node configurations instead of referencing separate entities

### Groups API Features
- **CRUD operations**: List, Create, Get, Update, Delete reusable groups
- **Filtering**: By node_type (agent, model, tool, termination, graph) and search terms
- **Metadata support**: Tags, version control, public/private visibility
- **Layout preservation**: Both absolute and relative positioning, bounding boxes for groups
- **Node embedding**: Direct storage of node configurations within groups
- **Edge preservation**: Internal connections between nodes with conditions and data

### Test Cases API Features
- **Simplified targeting**: Test cases can target groups or entire graphs only
- **Test types**: Unit, integration, end-to-end, and performance testing support
- **Assertion framework**: Flexible assertion system with equals, contains, regex, custom types
- **Execution tracking**: Detailed results with execution time, logs, and assertion outcomes

### Data Model Design
- **Group schema**: Contains embedded nodes with full configs and positioning data
- **Node structure**: Each node has ID, type, config, label, and position information
- **Edge structure**: References nodes by string IDs with type and data
- **TestCase schema**: Targets groups or graphs with flexible test structure

### Key Design Decisions
- **Embedded design**: Groups contain full node configurations, not references
- **Unified abstraction**: Single node becomes a group with one element
- **Layout preservation**: Both absolute and relative positioning for reconstruction
- **Simplified targeting**: Test cases only need to target groups or graphs
- **Version control**: Built-in versioning and public/private sharing capabilities 