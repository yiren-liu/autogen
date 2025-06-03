# Project Preferences

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
