# Design System and Styling

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

## Node Color Coding

### Color Scheme by Node Type
- **Graph**: Purple (#8B5CF6)
- **Team**: Blue (#3B82F6) 
- **Agent**: Green (#10B981)
- **Model**: Amber (#F59E0B)
- **Tool**: Red (#EF4444)
- **Termination**: Gray (#6B7280)

### Visual Hierarchy
- Color-coded borders and headers for quick identification
- Consistent color usage across all graph builder components
- Status badges use complementary colors for readability
- Hover states darken the base color for interaction feedback

## Graph Builder CSS

### Custom Styles Created
- Created `graph-builder.css` for graph-specific styles
- Handle styling with hover effects and transitions
- Connection line styling while dragging
- Edge hover and selection states
- Smooth transitions for all interactive elements

### Handle Styling
```css
.react-flow__handle {
  width: 10px;
  height: 10px;
  background: #555;
  border: 2px solid #fff;
}

.react-flow__handle:hover {
  background: #0084ff;
  transform: scale(1.2);
}
```

### Edge Styling
- Custom edge paths with smooth curves
- Hover states show thicker strokes
- Selection adds blue glow effect
- Bidirectional edges have markers on both ends

### Selection Box Styling
- Blue rounded selection box with semi-transparent background
- Subtle backdrop-filter for modern appearance
- Smooth transitions on appearance/disappearance
- Ring highlights on hoverable elements during selection

### Group Node Styling
- Dashed border style for group containers
- Blue-themed header with group icon
- Resize handles with custom styling
- Enhanced selection states for group nodes

## Integrated Panel Styling

### Panel Layout
- Fixed width of 400px when open, 0px when closed
- Smooth width transitions using CSS transitions
- Flexbox layout for proper content flow
- Shadow effects for depth perception

### Scroll Container Fixes
- Flexbox layout with `flex: 1, minHeight: 0` for proper scrolling
- Panel content height calculated as `calc(100% - 60px)` for header
- No nested overflow containers to prevent double scrollbars
- Consistent padding and spacing throughout

### Auto-Save Status Badges
- Green "Saved" badge with check icon
- Yellow "Saving..." badge during save process
- Red "Unsaved" badge for pending changes
- Positioned in component header with proper spacing

## Dark Mode Support

### Implementation
- All components use Tailwind's dark mode classes
- CSS variables switch between light and dark themes
- Proper contrast ratios maintained for accessibility
- Smooth transitions when switching themes

### Color Adjustments
- Background colors darken in dark mode
- Text colors lighten for readability
- Border colors adjust for visibility
- Shadow effects adapt to dark backgrounds 