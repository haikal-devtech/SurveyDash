# Dashboard charts, presentation layouts and themes

The analytics tab now includes response totals, target progress, field completion, a WIB response timeline, optional SKM indicators and a card for each enabled question. Use **Atur chart** to enable or hide a question, or use **Tampilkan chart** in the question editor. Both visibility and category chart style are saved with the survey and survive reloads. Hidden questions are excluded when generating new presentation charts; existing slide documents keep their reviewed content.

Seven category views are available: horizontal bars, columns, donut, pie, 100% proportions, lollipop and a count/percentage table. Two time-series views, line and area, use response timestamps rather than connecting unrelated answer categories. Timelines retain all valid history, include zero-response gaps, and group long periods into at most 60 buckets in Asia/Jakarta. Category tails are combined explicitly without dropping their counts. Checkbox percentages use selections, not respondent counts.

Imported text fields are explored only when the authenticated workspace user enables their chart. The overview endpoint does not automatically return free-text categories. Exact source values remain unchanged; long text or more than 50 categories prompts the user to inspect the Data tab. Numeric questions use a bounded histogram. Raw text charts cannot be published through presentation links. Response timelines in shared slides contain dates and aggregate counts only; saved bindings are refreshed from server data before publishing.

Presentation editing includes the chart gallery, a source selector, three visual theme swatches and six editable layouts: cover, summary, chart focus, two-chart comparison, section divider and closing. Empty category sources fall back to the response timeline. Existing drag/resize, undo/redo, templates, export and explicit sharing remain in place. UI light/dark changes do not recolor saved slide content, exported material, avatars or uploaded photographs.

The global appearance control offers Light, Dark and System. The setting is local to the device and synchronizes across open tabs. A small bootstrap applies the preference before page paint; system changes are followed when System is selected. Dark styling covers public pages, authentication, manager/surveyor workspaces, forms, dialogs and the presentation editor. Branding switches to the icon and a light wordmark; decorative clay imagery gets a darker treatment. No extra image generation or image download is needed for this styling.

Existing CSS has checked-in semantic dark overrides generated with `node scripts/generate-dark-surfaces.mjs` from the installed Tailwind/PostCSS toolchain. Regenerate and format the result when adding literal UI colors. The generator excludes slide content and theme swatches; its output adds no runtime package. Charts use native SVG/HTML, and export libraries still load only on demand.

## Design references

- [shadcn/ui](https://github.com/shadcn-ui/ui), MIT: compact chart controls, clear card hierarchy, labels and tabular supporting data. [Chart documentation](https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/components/base/chart.mdx).
- [Tremor](https://github.com/tremorlabs/tremor), Apache-2.0: dashboard composition, restrained color, readable bar lists and legends.
- [PPTist](https://github.com/pipipi-pikachu/PPTist), AGPL-3.0: editor workflow reference only (slide rail, canvas, inspector). No source code, assets or components from PPTist were copied or linked into SurveyDash.

All newly added chart renderers, layout builders, theme controls and CSS are original implementation against the existing SurveyDash stack. No new production dependencies were added.

## Verification scope

Automated checks cover WIB bucketing/count conservation, zero/empty data, categorical and checkbox denominators, raw-text limits, numeric histogram boundaries, saved visibility/style settings after responses, owner isolation, all chart renderers through server rendering, layout validation, authoritative saved chart data, timeline templates, sharing restrictions and theme resolution. Browser screenshot/interaction QA and actual browser-driven PDF/PPTX rendering remain unverified because browser access is blocked by the saved approval policy.

Validation on 21 October 2026: all 86 unit/repository tests passed, strict ESLint passed, and the optimized Next.js build (including TypeScript) passed. An isolated production-mode HTTP run passed 50 checks: all nine chart bindings saved/reloaded and were recalculated from real stored synthetic responses; hidden chart settings persisted; anonymous, Surveyor and foreign-owner reads were rejected; text-sharing protection and share revocation held; theme controls and compiled styles were delivered on ten public/auth/manager/Surveyor/form routes. This verifies server rendering and HTTP behavior, not browser interaction or visual appearance. No production respondent data was used in these fixtures.
