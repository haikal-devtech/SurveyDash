# Soft Claymorphism + Gradient Design

The user requested a stronger clay visual direction after finding the people photography generic. Five bespoke matte clay illustrations now represent the actual workflow: a survey workshop, SKM clipboard, invitation envelope, personal link, and result chart with magnifier. All are generated with the built-in ImageGen tool, inspected, and exported to alpha-preserving WebP. The existing supplied logo is unchanged.

## Material and interaction

`src/app/soft-clay.css` defines shared surface, violet-gradient, raised-light and inset tokens under the `clay-ui` body class. Soft inset highlights, rounded corners, restrained outer shadows and static gradients appear on buttons, role cards, login, navigation selection, dashboard summaries, invitation panels, guides and help. Flat data tables, question inputs and task reading surfaces keep their structure. Primary actions retain clear labels and contrast; focus indicators remain visible. The gradient heading has a forced-colors fallback.

The mobile hero uses a compact side illustration, with the decorative hero omitted on the narrowest screens. Login's illustration remains hidden on phones. Surveyor task cards remain focused on the copy-link action; decorative art is confined to the empty state and optional guide. There are no moving backgrounds, animated shadows, custom image loaders, WebGL scenes, or new JavaScript dependencies. Reduced-motion preferences also disable the brief button/card transitions.

## Asset budget

| Asset        | Pixels     |  Bytes |
| ------------ | ---------- | -----: |
| hero.webp    | 1080 × 720 | 48,632 |
| create.webp  | 640 × 640  | 30,000 |
| invite.webp  | 640 × 640  | 23,002 |
| share.webp   | 640 × 640  | 33,534 |
| results.webp | 640 × 640  | 19,818 |

The complete set is 154,986 bytes (151.4 KiB), 78.4% smaller than the prior 716,940-byte photography set. This is a file-size comparison, not a browser performance score. Images are reused across roles and guide steps, use explicit aspect ratios and responsive `sizes`, and use Next.js native lazy loading. Only the home hero uses preload. The unused old public photos are removed; original source images remain in ignored local workspace folders. Prompts are in `CLAY_IMAGE_PROMPTS.md`.

Authentication, database schema, guide persistence/version, Surveyor invitation/attribution, and anonymous respondent submission are unchanged. Respondents still see no tutorial or login requirement. No migration, SMTP service or subscription activation is part of this visual revision.

## Verification

The optimized Next.js build and TypeScript checks pass; ESLint reports zero warnings. Forty local production-server HTTP checks cover both roles, guide state and guards, invitations, attributed and direct anonymous submissions, and all five assets. Fourteen delivery checks confirm the `clay-ui` document, emitted material CSS, absence of old photography references, exact delivered image sizes, and the complete image set below 200 KB. After removing the superseded card-guide styles, the material stylesheet is 12,262 bytes / 2,692 bytes gzip before bundling. No package or lockfile changes were made. These are delivery and functional checks, not browser paint or interaction measurements. The later interactive walkthrough is documented in `SURVEYDASH_GUIDED_TOUR.md`.

Browser visual and interactive QA remain deferred under the user's previous release decision and the saved browser policy restriction. Source and HTTP checks cannot establish a Lighthouse score, paint cost, or visual layout quality on an actual device.
