# Dashboard motion and respondent experience

The later [motion/artwork refinement](SURVEYDASH_MOTION_ARTWORK.md) adds bounded dashboard arrivals, moving selection surfaces, real chart entrances and restored artwork following the user's request. Its budget and verification notes supersede the original no-arrival decision below.

## Scope and research

The requested motion applies to authenticated manager and surveyor dashboards. The later request also includes the respondent directory and public form. Respondents still have no login, onboarding, or tutorial.

- [iart-ai Micro-interaction skill](https://github.com/iart-ai/web-animation-skills/tree/main/skills/micro-interaction): short press/state feedback, enter/exit, reduced-motion alternatives, and CSS-first implementation.
- [Impeccable Animate reference](https://github.com/pbakaus/impeccable/blob/main/plugin/skills/impeccable/reference/animate.md): operate-mode motion should explain a real action without delaying routine work.
- [Radix animation documentation](https://www.radix-ui.com/primitives/docs/guides/animation): CSS keyframes with data-state preserve the primitive's exit lifecycle.
- [Element.animate](https://developer.mozilla.org/en-US/docs/Web/API/Element/animate): native, cancellable animations for dynamic list positions.

The micro-interaction skill and CSS reference were read directly. Its standalone-demo instructions are not applicable to this requested existing Next.js application. External scripts, binaries, hooks, CDNs, skill installation, and animation packages were not used. Implementation is original project code; guidance is referenced, not vendored.

## Motion plan

- Focal interaction: moving the survey filter's selection line, followed by the same records moving to their new positions. The surveyor navigation uses the same selection treatment.
- Continuity: a left-hand mobile menu moves from its actual edge. Dialogs enter in 220ms and leave in 140ms. Creation, survey-action, and surveyor-preview dialogs retain their content while closing. Navigating after actual success is never delayed for an animation.
- Feedback: immediate button compression, a finite drawn check after clipboard success, and an arriving success message. No fake count-ups, made-up activity, scroll reveals, parallax, or perpetual decorative loops.
- Budget: one native animation per visible record (at most the explorer's existing 20 records), 220ms, no stagger delay. Animate position only so wrapping text does not scale. Long moves fade in place. Typing cancels motion and filters immediately. Nothing measures layout every frame.
- Control: new CSS is scoped by the dashboard provider, including portal dialogs. Without JavaScript or the animation API, content stays visible. Active animations cancel on another list action, resize, hidden document, changed motion preference, and unmount. Reduced motion uses static selection, instant list updates, and short opacity-only dialog changes.

## Respondent pages

The directory now has title/institution search, open/closed status controls, legible survey rows, simulation labels, and a clear instruction to use a Surveyor's personal link when one was supplied. It receives only the already-sanitized public survey summary. Visibility filtering and form access remain on the server.

The form has a consistent reading column, numbered questions, large answer choices, a sticky native-accessible completion indicator, visible Surveyor attribution, and clear submitting/complete/closed/error states. Completion is derived from actual answers, including numeric zero. Optional questions remain optional. Missing required checkbox groups or whitespace-only answers are caught before sending, and the first missing control receives focus. Server validation and request-key idempotency remain authoritative.

The visible progress fill uses a short transform transition. Its native progress element exposes the real count to assistive technology. Reduced motion removes the transition. No answers are saved to browser storage, no draft is transmitted while typing, and no tutorial is loaded for respondents.

## Verification limits

Pure motion geometry and respondent completion tests complement the existing repository/API suite. Build, lint, source/HTTP delivery, anonymous direct and referral submission, and owner/role isolation are checked. They cannot establish visual smoothness, frame rate, pointer behavior, keyboard/focus interaction, reduced-motion rendering, or screen-reader output.

Browser interaction and visual QA remain unverified under the previously encountered browser restriction and the user's earlier release-before-visual-QA authorization. A device pass should cover repeated sort/filter/view changes while an animation is running, tab-line positioning after resize/font loading, closing a dialog during a tour, mobile keyboard with sticky progress, long question/answer text, checkbox validation, and success focus.

Latest validation: 71 unit/repository tests, ESLint with zero warnings, and the optimized Next.js production build/TypeScript checks passed. The final isolated production build passed 47 HTTP flow checks and 17 dashboard/respondent CSS delivery checks. Direct and referral submissions were anonymous and retained correct stored attribution. Browser visual/interaction/animation QA remains unverified.
