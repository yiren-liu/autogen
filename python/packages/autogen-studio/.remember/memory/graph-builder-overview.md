# Graph Builder Overview

## Architecture and Key Components

### Data Model
- Added `Graph` interface extending `DBModel` with `Component<GraphConfig>`
- `GraphConfig` includes participants, termination_condition, max_turns, and `graph: DiGraph`
- `DiGraph` structure has nodes with edges and activation patterns

### API Layer
- Created `GraphAPI` class similar to `TeamAPI` but for graphs
- Endpoints: listGraphs, getGraph, createGraph, deleteGraph
- Uses same validation patterns as teams

### Backend Implementation
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
├── types.ts             # TypeScript types
├── nodes.tsx            # Node components
└── component-editor/    # Component editor directory
    ├── component-editor.tsx  # Main editor (Adobe Spectrum version)
    ├── testresults.tsx      # Test results display
    ├── detailgroup.tsx      # Detail group component
    └── fields/              # Field components
```

### Store Pattern
- Uses Zustand with history management for undo/redo
- Converts between visual ReactFlow elements and DiGraph structure
- Helper functions: `graphToVisualElements()` and `visualElementsToGraph()`
- Graph-specific actions: addGraphEdge, removeGraphEdge, updateGraphEdge

### Key Differences from Team Builder
- Uses `GraphConfig` instead of `TeamConfig`
- Maps DiGraph nodes/edges to ReactFlow visual representation
- Supports conditional edges between agents
- Graph has directed flow with start node
- Removed invisible graph node that was causing selection issues

### Integration Features
- Updated eval.tsx to use graph components instead of team components
- Added sample graph configurations to default_gallery.json
- Maintains same validation and save patterns as team builder
- Conversational session support with graph_id parameter
- Automatic layout application on graph load

### Testing Integration
- Separate `testdrawer.tsx` specifically for graph-builder
- Creates temporary team wrapper around graph component for testing
- Uses existing session API with temporary team_id
- Proper cleanup of both session and temporary team resources 