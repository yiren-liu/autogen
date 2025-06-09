# Project Preferences

## Graph Builder Features Implemented
- Simplified node interface with clean, color-coded design
- Universal node connections - any node can connect to any other node
- Bidirectional edge rendering for immediate cycles (shows single edge with arrows on both ends)
- Visual status badges showing model names instead of generic "Has Model"
- Smooth transitions and hover effects for better UX
- Hover-to-add functionality on right handles: hover over source handle shows Add button with dropdown menu to add new agent nodes with automatic connection

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
