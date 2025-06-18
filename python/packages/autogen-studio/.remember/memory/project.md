# Project Preferences

## Graph Builder Features Implemented
- Simplified node interface with clean, color-coded design
- Universal node connections - any node can connect to any other node
- Bidirectional edge rendering for immediate cycles (shows single edge with arrows on both ends)
- Visual status badges showing model names instead of generic "Has Model"
- Smooth transitions and hover effects for better UX
- Hover-to-add functionality on right handles: hover over source handle shows Add button with dropdown menu to add new agent nodes with automatic connection
- Multi-selection support: Hold Shift to select multiple nodes/edges with visual feedback and bulk operations (Ctrl+A to select all, Esc to clear, Delete for bulk delete)
- Natural canvas interaction: Drag to pan canvas by default, Shift+drag for multi-selection (intuitive workflow)
- SelectionBox toolbar: Floating toolbar appears above selected elements with actions (delete, duplicate, align, distribute) for enhanced node management
- Node grouping/ungrouping: Select multiple nodes and group them into resizable containers named "Component X". Groups preserve original component data and edges for later access and computation. Prevents double grouping for cleaner organization. Internal edges remain visible within groups.
- Group persistence: Simplified API design for saving, managing, and reusing groups (single or multiple nodes) with associated test cases across different graphs.

## Code Architecture Patterns
- Follow existing teambuilder structure when creating new builders
- Use Zustand for state management with history support
- Separate concerns: API layer, components, store, types
- Use ReactFlow for visual graph building
- Maintain same validation patterns across different builders

## Component Structure Preferences
- Keep similar save/fetch/validation logic across different builders (teams vs graphs)
- Use separate directory structures for different builder types
- Reuse existing components (validation, Monaco editor, toolbars) where possible
- Maintain consistent UI patterns and layouts

## Data Model Patterns
- Extend DBModel for database entities
- Use Component<ConfigType> pattern for different component types
- Keep GraphConfig and TeamConfig separate but similar in structure
- Use gallery system for default configurations

## User Interface Preferences
- Maintain ReactFlow visual editor
- Keep sidebar with search and gallery integration
- Use consistent breadcrumb navigation
- Preserve same toolbar functionality (save, validate, run, etc.)
- Support both visual and JSON editing modes

## Design System Integration
- Adobe Spectrum Provider integrated at layout level with automatic dark/light theme switching
- Ant Design ConfigProvider coexists for AntD components
- Both design systems respect the global darkMode context
- Adobe Spectrum components available throughout the application without additional setup
- When developing the GraphBuilder, use Adobe Specturm components as much as possible

## Group Management Architecture (Simplified)
- Single unified "Group" concept - no separate component entities
- Groups can contain one or more nodes (agents, models, tools, etc.) with their edges
- Node configurations embedded directly within groups
- Layout information stored with both absolute and relative positioning
- Test cases can target groups or entire graphs only
- Version control and public/private sharing built into group system
- Maintain consistency with existing Team/Graph API patterns (status/data responses)

## LLM-as-a-Judge Test Case System
- Redesigned for range-based scoring instead of assertion-based testing
- Test cases include: context (scenario), input_query (prompt), oracles (expected/negative examples), scoring_rubrics (criteria/ranges)
- Judge configuration supports different LLM models with temperature and prompt customization
- Execution workflow: target system → collect output → LLM judge evaluation → scores/rationales
- Results structure includes overall scores, rubric-specific breakdowns, judge rationale, and confidence levels
- Test case history stored in latest_execution field for tracking improvements over time
- API supports judge overrides for testing different evaluation approaches
