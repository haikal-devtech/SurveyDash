# SurveyDash interface direction

SurveyDash serves Indonesian survey managers, surveyors sharing assigned forms, and respondents completing a form without an account. Familiar controls and short, concrete labels take priority over decoration. The existing violet logo and a few clay illustrations remain the identity.

## Research used

- [Anthropic Frontend Design skill](https://github.com/anthropics/skills/tree/main/skills/frontend-design): deliberate layout and typography; remove repeated card treatments, gradient headlines, decorative labels, and copy that does not help someone act.
- [Impeccable mobile adaptation reference](https://github.com/pbakaus/impeccable/blob/main/plugin/skills/impeccable/reference/adapt.md): change the layout for touch and narrower screens rather than shrinking desktop; prioritize tasks, accessible tap areas, readable input text, and complete functionality.
- [Impeccable distillation reference](https://github.com/pbakaus/impeccable/blob/main/plugin/skills/impeccable/reference/distill.md): reduce competing decoration and repeated information while retaining the controls users need.

The Frontend Design skill was read directly. Impeccable was used as published design reference material; its executable, hooks, installer, and dependencies were not run. No third-party implementation code or assets were copied, and no global skill installation was needed.

## Design decisions

- Base `#f7f7f9`, surface `#ffffff`, text `#24222b`, secondary text `#686570`, border `#e4e3e9`, action violet `#6842b5`.
- Keep the existing locally hosted Inter Variable family for readable product screens without adding a font download. Page titles 28–32px, section titles 18–20px, mobile body text 14–16px. Small metadata is secondary, never the primary instruction.
- Clay remains in the logo, a single unframed home illustration on desktop, help illustrations, and a restrained gradient on primary buttons. Reading and working surfaces are flat.
- Home hierarchy: short introduction → role entry → account registration → anonymous respondent entry. Each role has a large link to its login and a separate registration link.
- Login is one form column on every device. No decorative side panel. Existing two-step surveyor registration, privacy consent, username validation, and invitation preservation stay in place.
- Manager home is a working page: greeting, create action, counts, team tools, templates, surveys. It has no illustrated welcome banner or duplicate blank-template tile.
- Mobile manager navigation has Beranda, Survei, Surveyor, and Menu. The full menu uses the existing Radix dialog for modal focus handling, Escape dismissal, and focus restoration to its opener. Editor and slide canvas retain their focused layout.
- The survey table reflows the same records into a readable mobile list, retaining status, response counts, both dates, actions, explicit table roles, and accessible column headers. No duplicate mobile data tree or viewport JavaScript.
- Mobile surveyor task actions and respondent answers use larger text and tap areas. Four rating answers reflow to two columns so their labels fit. Respondents still need neither login nor tutorial.
- Existing interactive tours, targets, persistence, Skip, and Next remain. Their coach uses a quieter white surface and larger close control.
- Home and surveyor welcome illustrations use CSS background images only in desktop media queries; mobile has no decorative request for those illustrations. No new dependency, image set, animation runtime, or backdrop blur was added.

## Verification and remaining limits

Use the existing lint, unit suite, production build, and isolated HTTP regression checks. Verify generated CSS and static asset delivery. These checks cannot establish rendered layout, keyboard behavior, touch behavior, or screen reader compatibility.

Visual browser QA remains deferred under the previously encountered browser restriction. Before claiming visual readiness, inspect the real site at 320, 390, 768, and 1440px, including long survey titles, long names, menu focus return, mobile keyboard with an open modal, and the guided tour over real controls.

Latest revision checks: 61 existing unit/repository tests passed; ESLint reported zero warnings; the optimized Next.js production build and TypeScript checks passed. An isolated production server passed 41 HTTP flow checks plus 14 CSS/image delivery checks. No visual browser, touch, focus, or screen-reader result is claimed.
