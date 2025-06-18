# Graph Builder Implementation

## Group API Integration Implementation

### Backend Group Persistence
**Implementation**:
- Modified `useGraphBuilderStore` to integrate with GroupAPI for persistence
- Added async `createGroup` and `ungroupNodes` functions that call backend APIs
- Added `userId` state tracking in store for API authentication
- Created proper Group data structure mapping from visual nodes/edges to database format

**API Integration Pattern**:
- `createGroup`: Maps visual nodes to GroupNode format with proper type casting and positioning
- `ungroupNodes`: Extracts numeric group ID for API deletion calls
- Error handling: Continues with local operations even if API calls fail
- User context integration: Uses appContext to get userId for API authentication

**Data Structure Mapping**:
- Visual nodes → GroupNode: Maps component configs, positions, and types properly
- Visual edges → GroupEdge: Maps source/target relationships and edge data
- Layout info: Calculates bounding boxes for group positioning
- Type safety: Proper casting of labels and component types for database storage

### Frontend User Context Integration
**SelectionBox Component Updates**:
- Added appContext import and usage for user authentication
- Modified handleGroup and handleUngroup to be async functions
- Added userId synchronization with store on user context changes
- Error handling with console logging while maintaining local functionality

**Authentication Flow**:
- SelectionBox component imports appContext and AppContextType
- useEffect hook syncs user.id with store.userId when user changes
- Store methods check userId availability before making API calls
- Graceful degradation: Local grouping continues even if API fails

## LLM-as-a-Judge Test Case System Implementation

### Database Model Redesign (db.py)
**Changed Fields**:
- `test_type` default to "llm_judge" with options: llm_judge, performance, integration
- Removed `input_data`, `expected_output`, `assertions` (old assertion-based testing)
- Added LLM-specific inputs: `context` (scenario background), `input_query` (user prompt), `oracles` (expected/negative examples), `scoring_rubrics` (criteria and ranges)
- Added `judge_config` for LLM model configuration (model, temperature, max_tokens, system_prompt)
- Added `latest_execution` field to store most recent test results with scores and rationales
- Increased default timeout to 120 seconds for LLM processing needs

### API Execution Workflow Redesign (test_cases.py)
**New Execution Flow**:
1. Run target system (group/graph) with input_query and context
2. Collect target_output (response + metadata)
3. Send context, input_query, target_output, oracles, and rubrics to LLM judge
4. Parse judge response for scores, rationales, and confidence
5. Store execution results in test case latest_execution field

**Result Structure**:
- `target_output`: {response: string, metadata: object} - What the system produced
- `judge_results`: {overall_score, scores_breakdown, judge_rationale, judge_confidence} - Judge evaluation
- `scores_breakdown`: Array of {rubric_name, score, max_score, rationale} for each criteria
- Support for judge_overrides parameter to test different evaluation approaches

### Frontend Types Redesign (datamodel.ts)
**New Interfaces**:
- `ScoringRubric`: name, description, max_score, criteria, score_ranges with min/max/description
- `JudgeConfig`: model, temperature, max_tokens, system_prompt
- `TestOracles`: expected_examples, negative_examples, reference_answers arrays
- `JudgeScoreResult`: rubric_name, score, max_score, rationale

**Updated TestCase Interface**:
- Includes context, input_query, oracles, scoring_rubrics, judge_config
- Results stored in latest_execution field for history tracking
- Proper TypeScript typing for all LLM judge evaluation structures

### OpenAPI Specification Update (components.yml)
**Schema Changes**:
- Updated TestCase schema to include LLM judge fields with detailed descriptions
- Added oracles object with expected/negative examples structure
- Added scoring_rubrics array with score ranges and criteria
- Updated TestExecutionResult schema with target_output and judge_results structure
- Changed status enums to reflect LLM evaluation workflow (completed, failed, error, timeout)
- Required fields now include context, input_query, oracles, scoring_rubrics, judge_config

### Key Design Decisions
- **Range-based scoring**: Replaced assertion-based testing with LLM judge scores and rationales
- **Comprehensive context**: Each test includes scenario context, user query, and example responses
- **Flexible rubrics**: Support multiple scoring criteria with defined ranges and descriptions
- **Judge configuration**: Customizable LLM models and parameters for different evaluation needs
- **Execution history**: Store latest results for tracking improvements over time
- **Override support**: Allow testing different judge configurations without modifying test case

### Error Handling Implementation
**Backend Error Handling (test_cases.py)**:
- Comprehensive validation of test case configuration before execution
- Separate error handling for target system execution vs LLM judge evaluation
- Timeout detection with configurable limits
- All errors saved to latest_execution field for debugging
- Proper HTTP status codes: 400 (validation), 404 (not found), 408 (timeout), 500 (execution errors)
- Error logs include detailed failure information and execution timeline

**Frontend Error Handling (api.ts)**:
- Enhanced error types with user-friendly messages: VALIDATION_ERROR, NOT_FOUND_ERROR, TIMEOUT_ERROR, EXECUTION_ERROR, NETWORK_ERROR
- Network error detection for connectivity issues
- Structured error objects with status codes, user messages, and original error context
- TypeScript-safe error handling with proper type guards
- Graceful degradation for different failure scenarios

**Error Data Structure**:
- Failed executions still saved to database with error_message and logs
- TestExecutionResult supports null target_output and judge_results for failure cases
- TestExecutionError interface provides structured error information for UI handling
- Error messages designed for both developer debugging and user feedback

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

## TODO items
- Migrate Builder components to GraphBuilder components (Done)
- Simplify node interface in graph builder mode (Done)
- Allow node in graph builder mode to be able to connect to each other (Done)
- Fix edit component drawer in graph builder mode (Done)
- Integrate component editor and test drawer as side panels (Done)
- Design data structures for component --> test suite --> test cases
- Implement conversational session support for graph workflows 
  - Modified session API to accept graph_id parameter (Done)
  - Frontend loads graph config when session has graph_id (Done)
  - Test drawer creates sessions directly with graph_id instead of temporary teams (Done)
  - Backend TeamManager already supports dict configs so graphs work seamlessly (Done)
  - Also support live-rendering + centering similar to Dify
- Onclick node opens the node edit panel directly (instead of having to click edit button) (Dones)
- Cursor moving over the right handle of each node will spawn a "Add" icon button, and if the user clicks, a drop-down menu will show up to allow user to choose "add an agent" or "cancel" as two options. If "add an agent" is chosen, add an new agent node to the graph connected to the node. (Done)
- Persist component grouping to backend DB (Done)


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

### Edge Condition Labels Implementation
- Created EdgeConditionLabel component for displaying and editing edge conditions
- Shows clickable labels with inline editing (Enter to save, Escape to cancel)
- Auto-positions labels at edge midpoints using SVG path calculations
- Supports both CustomEdge and BidirectionalEdge components
- Uses graph builder store for proper state management and history tracking
- Fixed: Edge condition changes now properly save when graph is saved (store vs React Flow state sync issue)

## Hover-to-Add Functionality Implementation

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

## Bidirectional Edge Condition Labels

### Implementation Details
- Created `BidirectionalEdgeConditionLabel` component for displaying two conditions on bidirectional edges
- In condition displayed at 1/3 of edge path with → arrow (green styling)
- Out condition displayed at 2/3 of edge path with ← arrow (blue styling)
- Each condition can be edited independently with click-to-edit interface
- Uses existing edge data structure: `condition` for in direction, `outCondition` for out direction
- Proper integration with graph builder store's `updateEdgeData` function
- Color coding: Green (bg-green-100) for In, Blue (bg-blue-100) for Out
- Keyboard shortcuts: Enter to save, Escape to cancel editing
- Visual indicators show direction flow with arrow symbols

## Node Grouping/Ungrouping Implementation

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

## Groups and Test Cases API Implementation

### Frontend Implementation (api.ts)
- **GroupAPI class**: Complete CRUD operations for groups with filtering by node_type and search
- **TestCaseAPI class**: Full test case management with execution capabilities
- **Type definitions**: Added Group, TestCase, TestExecutionResult interfaces to datamodel.ts
- **Exports**: groupAPI and testCaseAPI instances for use throughout the application

### Backend Implementation 
#### Database Models (datamodel/db.py)
- **Group model**: SQLModel with name, description, nodes (JSON), edges (JSON), layout_info, tags, is_public, group_version
- **TestCase model**: SQLModel with test metadata, target references, input/output data, assertions, execution settings
- **Exports**: Updated __init__.py to export Group and TestCase models

#### API Routes
- **groups.py**: Complete CRUD endpoints with filtering and search functionality
  - GET /groups/ - List groups with optional node_type and search filters
  - GET /groups/{id} - Get specific group
  - POST /groups/ - Create new group
  - PUT /groups/{id} - Update existing group
  - DELETE /groups/{id} - Delete group
- **test_cases.py**: Test case management endpoints
  - GET /test-cases/ - List test cases with optional group_id/graph_id filters
  - GET /test-cases/{id} - Get specific test case
  - POST /test-cases/ - Create test case
  - PUT /test-cases/{id} - Update test case
  - DELETE /test-cases/{id} - Delete test case
  - POST /test-cases/{id}/execute - Execute test case (placeholder implementation)

#### App Integration (web/app.py)
- **Route registration**: Added groups and test-cases routers to FastAPI application
- **API documentation**: Automatic OpenAPI docs generation for new endpoints
- **Consistent patterns**: Following same auth, error handling, and response patterns as existing APIs

### Implementation Features
- **Filtering support**: Groups can be filtered by node type and search terms
- **User isolation**: All operations scoped to user_id for security
- **Error handling**: Proper HTTP status codes and error messages
- **Data validation**: Pydantic/SQLModel validation for all inputs
- **Database integration**: Uses existing database connection and ORM patterns


## CSS Color Scheme Unification

### Issue: Inconsistent Color Schemes
**Problem**: 
- Two different color schemes in global.css using different variable naming conventions
- Top scheme used `--color-` prefix with hex colors
- Bottom scheme used shadcn/ui style variables with HSL values
- This caused visual inconsistency between components using different systems

**Solution**:
- Updated bottom color scheme variables to use same hex color values as top scheme
- Maintained variable naming but unified the actual color values
- Ensured both light and dark themes use consistent colors across both systems
- Kept accent color `#464feb` consistent throughout


### Follow-up: Tailwind Config HSL Removal
**Issue**: After converting CSS variables from HSL to hex format, Tailwind was still wrapping them in `hsl()` functions
**Solution**: Removed all `hsl()` wrappers from tailwind.config.js color definitions, except for chart colors which still use HSL format
**Result**: Tailwind now directly uses hex color values from CSS variables, ensuring consistent color rendering

## Edge Deletion via Keyboard Implementation

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
- Import `EdgeChange` from `@xyflow/react`
- Replace `onEdgesChange={onEdgesChange}` with `onEdgesChange={handleEdgesChange}` in ReactFlow component
- Maintains existing keyboard delete functionality (`deleteKeyCode={["Backspace", "Delete"]}`)
- Prevents store state from being overwritten by ReactFlow's direct state manipulation

## Node Deletion via Keyboard Implementation

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
const handleNodesChange = useCallback(
  (changes: NodeChange<CustomNode>[]) => {
    const deleteChanges = changes.filter((change) => change.type === 'remove');
    const otherChanges = changes.filter((change) => change.type !== 'remove');

    if (deleteChanges.length > 0) {
      const nodesToDelete = deleteChanges.map((change) => change.id);
      
      nodesToDelete.forEach((nodeId) => {
        deleteNode(nodeId);
      });
    }

    if (otherChanges.length > 0) {
      onNodesChange(otherChanges);
    }
  },
  [onNodesChange, deleteNode]
);
```

### Integration Requirements  
- Import `NodeChange` from `@xyflow/react`
- Import `deleteNode` from store methods
- Replace `onNodesChange={onNodesChange}` with `onNodesChange={handleNodesChange}` in ReactFlow component
- Store's `deleteNode` method automatically handles edge cleanup and selection state
- Maintains existing keyboard delete functionality (`deleteKeyCode={["Backspace", "Delete"]}`)

## Multi-Selection Implementation for Graph Builder

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

### SelectionBox Toolbar Component
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
