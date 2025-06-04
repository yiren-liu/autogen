# Graph Builder Implementation

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
