# Interactive first-use walkthrough

This replaces the earlier image-card onboarding with a walkthrough of the real controls, as requested by the user. `RoleGuide` mounts only in the authenticated manager and Surveyor shells. New accounts start on their role home; existing completed/skipped preferences remain respected, and Panduan singkat / Bantuan restarts the tour.

## Manager flow

Nine steps follow the actual UI: Buat survei, name, template, draft submission, Pertanyaan, Form, Surveyor invitation, Data, and Analisis. Next opens the real creation dialog and later switches the real editor tabs. Typing a name is checked with the existing native input validity rules. Selecting any template advances the guide. The submission step waits for the existing create request to succeed; a failed request or merely clicking submit cannot advance it. Native Enter submission also resumes in the editor after success. The real draft is created only by the user's explicit form submission. Next never publishes the form or creates/sends an invitation. Those actions remain normal visible controls for the user to choose.

## Surveyor flow

With an assigned task, the guide points to tasks, opens the real read-only question preview, closes it, highlights an enabled personal copy-link button when available, and shows response counts and Profile. If an enabled copy action exists on a later task, the initial guided preview prefers that task. No task produces a shorter tasks/counts/profile guide; unavailable preview or copy controls are not included. Next does not write to the clipboard; clicking the actual copy button keeps the normal success/error behavior.

## Controls and lifecycle

The current element has a fixed outline and nearby coach card. Four static dim panels leave the target visible; they do not intercept pointer input. Skip is always available; Escape also skips. During real dialog steps, the coach is portaled into a dedicated slot inside that Radix dialog, retaining the native focus scope and usable keyboard controls. The coach announces the current instruction and temporarily associates it with the real target via aria-describedby. Targets are scrolled into view; focus returns to a connected launcher or target when finishing. The guide can be restarted if a user closes or navigates away from an expected section.

ResizeObserver, MutationObserver and scroll/resize listeners run only while a walkthrough is active. Position updates are batched through requestAnimationFrame and observers/listeners are removed on exit. There is no polling timer, animation engine or additional dependency. The walkthrough itself loads no illustrations; the new clay assets remain on normal home/help/empty-state surfaces. Progress survives client navigation through the existing authenticated shell. A browser reload does not persist the current step; completion and skipping remain account-scoped durable preferences.

Saving a guide result uses the existing authenticated, origin-checked account API and unchanged schema/version. A failed save never traps the user in a tour; it offers a separate retry notice. Public direct and Surveyor respondent forms mount no tour and require no login.

## Verification boundary

All 61 repository tests pass, including six new walkthrough tests for creation gating, actual editor actions, empty and assigned Surveyor plans, clipboard/publication boundaries, and coach placement across mobile/desktop viewport sizes. Browser visual and interactive walkthrough execution remain unverified because the saved browser policy restriction still applies. Pure transition tests, source review and HTTP checks do not establish actual focus, scrolling or pointer behavior in a browser. Release continues under the user's prior explicit deferral; no browser or accessibility score is claimed.
