# UI Components Implementation

## Integrated Panel Implementation

### Right Panel Integration
- Replaced overlay drawers with integrated side panel in GraphBuilder
- Used state management with `rightPanelMode` enum: 'none', 'component', 'test'
- Added smooth width transitions with CSS transitions
- Panel width: 400px when open, 0px when closed

### Layout Structure
- Main content area uses `calc(100% - ${rightPanelWidth})` for responsive width
- Right panel positioned using Flexbox layout
- Panel header with title and close button using Adobe Spectrum components
- Panel content area with scrollable overflow

### Component Editor Integration
- Automatically opens when a node is selected (selectedNodeId changes)
- Uses existing ComponentEditor component without modifications
- Maintains navigation and editing functionality
- Auto-saves changes when component is updated

### Test Drawer Integration  
- Converted from Ant Design Drawer to embedded View component
- Replaced message notifications with AlertDialog error handling
- Removed drawer wrapper and converted to standard component layout
- Maintains session creation and cleanup functionality
- Checkbox control for delete-on-close behavior integrated into panel

### User Experience Improvements
- Unified workspace: graph, editing, and testing in same view
- No modal overlays disrupting workflow
- Smooth transitions between panel states
- Consistent Adobe Spectrum styling throughout
- Close button (X icon) in panel header for intuitive closing

### Technical Implementation
- Panel mode controlled by `rightPanelMode` state
- Automatic opening when nodes selected via useEffect
- Width calculation using CSS calc() for responsive behavior
- Error handling with Adobe Spectrum AlertDialog
- Proper cleanup of resources when panels are closed

### Scroll Container Fixes
- Fixed double scrollbars by removing nested overflow containers
- Used flexbox layout with `flex: 1, minHeight: 0` for proper scrolling
- Panel content height calculated as `calc(100% - 60px)` to account for header
- ComponentEditor and TestDrawer converted to non-nested scroll containers
- Removed Cancel/Save buttons from ComponentEditor (auto-saves on change)
- Fixed bottom gap issue with proper flex layout structure

### Auto-Save Implementation (Local State)
- Added auto-save functionality to ComponentEditor with 1-second delay for LOCAL changes
- Save status tracking: 'saved', 'saving', 'unsaved' states for local graph state
- Visual save status indicator in component header with colored badges:
  - Green "Saved" badge with check icon (changes saved to local graph state)
  - Yellow "Saving..." badge (during local save process)
  - Red "Unsaved" badge (when changes are pending locally)
- Auto-save updates local graph state only (not API save)
- API save is separate and triggered by main Save button in toolbar
- Tooltip clarifies: "Changes saved locally (use main Save button to persist)"
- Fixed debounced save implementation to prevent timeout cancellation issues
- Proper cleanup of debounced function on component unmount

## Simplified Node Interface

### Node Design Simplification
- Created unified `SimpleNode` component replacing complex `TeamNode` and `AgentNode`
- Removed complex sections (Model, Tools, Agents, Terminations dropzones)
- Made nodes more compact with cleaner interface
- Added color coding by node type for better visual distinction
- Used status badges instead of complex nested sections

### Node Features
- Simplified to show: Icon, Name, Type Subtitle, Description, Status Badges
- Width reduced to 256px (w-64) for more compact layout
- Color-coded borders and headers by node type:
  - Graph: Purple (#8B5CF6)
  - Team: Blue (#3B82F6)
  - Agent: Green (#10B981)
  - Model: Amber (#F59E0B)
  - Tool: Red (#EF4444)
  - Termination: Gray (#6B7280)

### Connection Implementation
- Added source and target handles to all node types
- Handles positioned on left (target) and right (source) sides
- Updated `onConnect` to allow connections between all node types
- All connections use "graph-connection" edge type
- Added history tracking for undo/redo support

### Styling Improvements
- Created `graph-builder.css` for graph-specific styles
- Styled handles with hover effects and transitions
- Added connection line styling while dragging
- Improved edge hover and selection states
- Added smooth transitions for all interactive elements

### Helper Functions Created
- `getNodeColor()`: Returns color based on node type
- `getNodeSubtitle()`: Provides descriptive subtitle for each node type

### Node Rendering Controls
- Added conditional rendering in `SimpleNode` to skip rendering graph type nodes
- Graph nodes return `null` to prevent display while maintaining ReactFlow node registry
- `getNodeBadges()`: Shows relevant status information as compact badges

## Edge Components

### Bidirectional Edge Implementation
- Detects when two nodes have edges pointing to each other (immediate cycles)
- Renders a single edge with arrows on both ends instead of two separate edges
- Prevents duplicate edges when bidirectional connection already exists

### Implementation Details
1. **BidirectionalEdge Component**: Created custom edge component with markers on both ends
2. **Edge Type**: Added "bidirectional" to EdgeTypes enum
3. **Connection Logic**: Updated `onConnect` in graphbuilder to:
   - Check for existing reverse edges
   - Replace two unidirectional edges with one bidirectional edge
   - Prevent duplicate connections
4. **Store Updates**:
   - `graphToVisualElements`: Detects bidirectional connections when loading
   - `visualElementsToGraph`: Properly saves bidirectional edges as two entries
   - Uses Set to track processed pairs to avoid duplicates

### Visual Improvements
- Bidirectional edges show arrows on both ends using SVG markers
- Consistent hover and selection styling
- Cleaner graph visualization with fewer overlapping edges

### Edge Condition Labels
- Created EdgeConditionLabel component for displaying and editing edge conditions
- Shows clickable labels with inline editing (Enter to save, Escape to cancel)
- Auto-positions labels at edge midpoints using SVG path calculations
- Supports both CustomEdge and BidirectionalEdge components
- Uses graph builder store for proper state management and history tracking
- Fixed: Edge condition changes now properly save when graph is saved

### Bidirectional Edge Condition Labels
- Created `BidirectionalEdgeConditionLabel` component for displaying two conditions on bidirectional edges
- In condition displayed at 1/3 of edge path with → arrow (green styling)
- Out condition displayed at 2/3 of edge path with ← arrow (blue styling)
- Each condition can be edited independently with click-to-edit interface
- Uses existing edge data structure: `condition` for in direction, `outCondition` for out direction
- Proper integration with graph builder store's `updateEdgeData` function
- Color coding: Green (bg-green-100) for In, Blue (bg-blue-100) for Out
- Keyboard shortcuts: Enter to save, Escape to cancel editing
- Visual indicators show direction flow with arrow symbols

## Node Grouping/Ungrouping

### Core Components Created
- **useDetachNodes.tsx**: Custom hook for detaching child nodes from group nodes
- **GroupNode.tsx**: Adobe Spectrum-based group node component with resizing and toolbar
- **Group node type**: Added to nodeTypes registry as 'group' type

### Store Integration
- **createGroup()**: Creates group node from selected nodes/edges, calculates bounding box, sets parent relationships
- **ungroupNodes()**: Restores grouped nodes to absolute positions, restores internal edges
- Both functions include proper history tracking for undo/redo support

### User Interface Features
- **SelectionBox integration**: Group/Ungroup buttons appear when appropriate selections are made
- **Group button**: Shows when 2+ nodes selected AND none are already grouped, creates group with auto-generated name  
- **Ungroup button**: Shows when group nodes selected, ungroups all selected groups
- **Visual feedback**: Color-coded hover states (blue for group, orange for ungroup)
- **Double grouping prevention**: Cannot group nodes that are already part of a group (have parentId)

### Group Node Features
- **Resizable container**: Uses ReactFlow NodeResizer with minimum 200x150 dimensions
- **Component preservation**: Stores original component data, edges, and metadata
- **Visual design**: Blue-themed with dashed border, header with group icon and name
- **Child node management**: Positions child nodes relatively within group bounds
- **Toolbar actions**: Ungroup and Edit buttons with Adobe Spectrum styling

### Technical Implementation
- **Bounding box calculation**: Auto-sizes group based on contained nodes with padding
- **Position management**: Converts absolute positions to relative during grouping
- **Edge handling**: Preserves internal edges within group data, removes from main graph
- **Parent-child relationships**: Uses ReactFlow's parentId and extent properties
- **Data structure**: GroupNodeData interface stores grouped components and edges for later access

### CSS Styling
- **Group node styles**: Custom styling for group containers, headers, and resize controls
- **Selection feedback**: Enhanced selection and hover states for group nodes
- **Child node positioning**: Proper z-index handling for nested nodes
- **Toolbar styling**: Consistent Adobe Spectrum button styling within node toolbars

## SelectionBox Toolbar Component
- Created `SelectionBox.tsx` component that appears above selected elements
- Uses ReactFlow's `NodeToolbar` component positioned at top of selection
- Features provided:
  - **Selection count display**: Shows number of selected nodes and edges
  - **Delete**: Remove selected elements with proper store integration
  - **Duplicate**: Copy selected nodes with 50px offset
  - **Align horizontal/vertical**: Center-align multiple nodes (2+ nodes)
  - **Distribute horizontal/vertical**: Evenly space multiple nodes (3+ nodes)
- Styling:
  - Tailwind CSS for dark mode support
  - Smooth slide-down animation on appearance
  - Hover states for all action buttons
  - Grouped actions with visual separators
- Integration:
  - Uses `useStore` hook to track selections without re-renders
  - Integrates with `useGraphBuilderStore` for proper history tracking
  - Positioned using `Position.Top` enum from ReactFlow
  - Added `nodrag` and `nopan` classes to prevent toolbar interaction issues
- Replaced old selection indicator in header with new floating toolbar 