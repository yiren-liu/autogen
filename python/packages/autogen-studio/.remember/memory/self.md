# Graph Builder Implementation

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

## TODO items
- Migrate Builder components to GraphBuilder components (Done)
- Simplify node interface in graph builder mode (Done)
- Allow node in graph builder mode to be able to connect to each other (Done)
- Fix edit component drawer in graph builder mode (Done)
- Integrate component editor and test drawer as side panels (Done)
- Design data structures for component --> test suite --> test cases
- Implement conversational session support for graph workflows
  - Also support live-rendering + centering similar to Dify

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

## Key Components Created

### Data Model Changes
- Added `Graph` interface extending `DBModel` with `Component<GraphConfig>`
- `GraphConfig` includes participants, termination_condition, max_turns, and `graph: DiGraph`
- `DiGraph` structure has nodes with edges and activation patterns

### API Layer
- Created `GraphAPI` class similar to `TeamAPI` but for graphs
- Endpoints: listGraphs, getGraph, createGraph, deleteGraph
- Uses same validation patterns as teams

### Backend API Implementation
- Added `Graph` model to `autogenstudio/datamodel/db.py`
- Created `autogenstudio/web/routes/graphs.py` with full CRUD operations
- Registered graphs router in `autogenstudio/web/app.py` with `/graphs` prefix
- Updated `GalleryComponents` in `types.py` to include graphs
- Enhanced `GalleryBuilder` with `add_graph()` method and graphs support

### Frontend Components Structure
```
graph-builder/
├── graphbuilder.tsx      # Main builder component (like TeamBuilder)
├── store.tsx            # Zustand store for graph state management  
├── toolbar.tsx          # Toolbar with fullscreen, undo/redo, layout controls
├── sidebar.tsx          # Graph list sidebar with search and gallery integration
├── testdrawer.tsx       # Separate test drawer for graph components
├── types.ts             # TypeScript types (copied from ../builder/types.ts)
├── nodes.tsx            # Node components (copied with updated imports)
└── component-editor/    # Component editor directory
    ├── component-editor.tsx  # Main editor (Adobe Spectrum version)
    ├── testresults.tsx      # Test results display
    ├── detailgroup.tsx      # Detail group component
    └── fields/              # Field components (copied from builder)
```

### Store Pattern
- Uses Zustand with history management
- Converts between visual ReactFlow elements and DiGraph structure
- Helper functions: `graphToVisualElements()` and `visualElementsToGraph()`
- Graph-specific actions: addGraphEdge, removeGraphEdge, updateGraphEdge

### Key Differences from Team Builder
- Uses `GraphConfig` instead of `TeamConfig`
- Maps DiGraph nodes/edges to ReactFlow visual representation
- Supports conditional edges between agents
- Graph has directed flow with start node

### Integration
- Updated eval.tsx to use graph components instead of team components
- Added sample graph configurations to default_gallery.json
- Maintains same validation and save patterns as team builder

### Graph Test Drawer Implementation
- Separate `testdrawer.tsx` specifically for graph-builder
- Creates temporary team wrapper around graph component for testing
- Uses existing session API with temporary team_id
- Proper cleanup of both session and temporary team resources
- Props: `isVisible`, `component: Component<GraphConfig>`, `onClose`

### TypeScript Fixes
- Fixed component config type errors in store by using `(config as any)?.name`
- Handled union types properly when accessing agent name properties
- Used type assertions for ComponentConfig access patterns

## Simplified Node Interface Implementation

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

## Bidirectional Edge Implementation

### Edge Rendering Logic
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

## Adobe Spectrum Overhaul

### Component Replacements Made
**GraphBuilder (graphbuilder.tsx):**
- Replaced `Button`, `Switch`, `Tooltip`, `Layout`, `message` from Ant Design
- Used `Button`, `Switch`, `TooltipTrigger`, `Tooltip`, `Flex`, `View`, `AlertDialog`, `ActionButton` from Adobe Spectrum
- Replaced message notifications with error state management
- Used `DialogTrigger` pattern for error alerts

**Toolbar (toolbar.tsx):**
- Replaced Ant Design `Button` and `Tooltip` components
- Used Adobe Spectrum `ActionButton`, `TooltipTrigger`, `Tooltip`, `Flex`, `View`
- Maintained same functionality with Adobe Spectrum interaction patterns

**Sidebar (sidebar.tsx):**
- Replaced Ant Design `Button`, `Input`, `Modal`, `message` components
- Used Adobe Spectrum `ActionButton`, `SearchField`, `DialogTrigger`, `Dialog`, `AlertDialog`, `TextField`
- Replaced Modal.confirm with `AlertDialog` component
- Used proper Adobe Spectrum color values (`gray-50`, `blue-400`, `gray-400`)

**TestDrawer (testdrawer.tsx):**
- Replaced Ant Design `Drawer`, `Button`, `message`, `Checkbox`
- Used Adobe Spectrum `DialogTrigger`, `Dialog`, `Button`, `Checkbox`, `AlertDialog`
- Converted drawer pattern to dialog pattern with proper sizing

**ComponentEditor (component-editor.tsx):**
- Replaced Ant Design `Button`, `Breadcrumb`, `message`, `Tooltip`
- Used Adobe Spectrum `Button`, `Breadcrumbs`, `Item`, `View`, `ActionButton`, `TooltipTrigger`, `Tooltip`, `Flex`, `AlertDialog`, `DialogTrigger`
- Replaced message.useMessage with AlertDialog state management
- Updated Breadcrumb to use Adobe Spectrum Breadcrumbs with Item components



### Color Value Corrections
- `backgroundColor="gray-25"` → `backgroundColor="gray-50"`
- `borderColor="gray"` → `borderColor="gray-400"`
- `backgroundColor="blue-100"` → `backgroundColor="blue-400"`

### Event Handling Updates
- `onClick` → `onPress` for Adobe Spectrum components
- Ant Design `onChange` patterns → Adobe Spectrum controlled component patterns
- `stopPropagation()` removed as not available in Adobe Spectrum PressEvent

### Component Structure Changes
- Replaced div-based layouts with Adobe Spectrum `View` and `Flex` components
- Used Adobe Spectrum sizing tokens (`size-100`, `size-150`, `size-200`)
- Applied `UNSAFE_className` for custom CSS when needed

### Accessibility Improvements
- Adobe Spectrum components provide built-in accessibility features
- Proper ARIA labels and keyboard navigation support
- Screen reader compatibility out of the box

### Known Issues
- GalleryManager component props interface required TypeScript casting workaround
- Some complex custom styling may require `UNSAFE_className` usage
- Adobe Spectrum components have different event signatures than Ant Design

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
