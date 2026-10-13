# UI system

The supplied workspace and form-builder images guide the visual direction: white surfaces, navy text, lavender accents, fine borders and restrained shadows. The home uses template starter tiles and a recent-survey table. Analytics belong inside the survey workspace.

Tokens: accent `#7549df`, ink `#20203d`, background `#fafafc`, border `#e9e9f0`. Inter Variable is served locally. The four-tile SVG brand and app icon remain sharp at small sizes. Buttons use the shared primary/secondary/ghost/danger component. Dialogs use Radix focus management and explicit titles; inputs have accessible names.

The workspace sidebar is persistent on desktop and an explicit menu on mobile. Editors hide the general sidebar to focus on content. The form editor supports seven question types, stable option IDs, reorder controls and autosave. Existing-response protections remain visible.

The presentation studio uses 1280 × 720 document coordinates. The viewport scales the canvas independently of persisted positions. Slide navigation and property/layer panels surround the canvas. On small screens the canvas appears above selectable slide/property panels. Pointer drag and resize snap to 8 pixels; Alt disables snapping. Keyboard shortcuts include arrows, Shift+arrows, Delete, Ctrl/Cmd+D, Ctrl/Cmd+Z, Shift+Ctrl/Cmd+Z and Ctrl/Cmd+S.

All save states are real. Empty charts explain the absence of data. Generated sample workspaces require an explicit action and show Data simulasi. Billing is an unavailable-state screen, not a mock checkout. Reduced-motion preferences are respected.
