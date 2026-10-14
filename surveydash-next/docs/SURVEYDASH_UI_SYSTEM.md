# UI system

The supplied workspace and form-builder images guide the visual direction: white surfaces, navy text, lavender accents, fine borders and restrained shadows. The home uses template starter tiles and a recent-survey table. Analytics belong inside the survey workspace.

Tokens: accent `#7549df`, ink `#20203d`, background `#fafafc`, border `#e9e9f0`. Inter Variable is served locally. The supplied transparent PNG lockup and four-tile app icon are used through `Brand`. Buttons use the shared primary/secondary/ghost/danger component. Dialogs use Radix focus management and explicit titles; inputs have accessible names. Public navigation stays at the top and offers a Radix menu dialog on mobile.

The workspace sidebar is persistent on desktop and an explicit menu on mobile. Editors hide the general sidebar to focus on content. The form editor supports seven question types, stable option IDs, reorder controls and autosave. Existing-response protections remain visible.

The presentation studio uses 1280 × 720 document coordinates. The viewport scales the canvas independently of persisted positions. Slide navigation surrounds the canvas; the property/layer inspector opens on object selection and can be closed. Its opening is deferred until a pointer gesture ends to retain a stable viewport while dragging. On small screens the canvas appears above selectable slide/property panels. Pointer drag and resize snap to 8 pixels; Alt disables snapping. Keyboard shortcuts include arrows, Shift+arrows, Delete, Ctrl/Cmd+D, Ctrl/Cmd+Z, Shift+Ctrl/Cmd+Z and Ctrl/Cmd+S.

Generation loads actual source counts before creation, describes unavailable sections and prevents IKM selection on custom surveys. The Data table keeps server pagination/sorting/filtering under TanStack manual controls, labels sortable column buttons and exposes `aria-sort`. Profile upload and password recovery show actual loading/error/success states. New responsive behavior still needs browser QA; prior screenshots do not prove the revision layouts.

All save states are real. Empty charts explain the absence of data. Generated sample workspaces require an explicit action and show Data simulasi. Billing is an unavailable-state screen, not a mock checkout. Reduced-motion preferences are respected.
