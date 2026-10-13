# Visual polish and character-card timing — October 13, 2026

This pass responds to the raised beat badge and the request for newly added character cards to begin at the selected story moment. Tests use isolated synthetic stories; the user's live story was not edited.

## Changes

- Align thread and beat badges, first title lines, drag handles and header actions. Preserve the first-line alignment when titles wrap; keep hover geometry stable.
- Allow long titles to grow beyond the previous 220px clipping limit.
- Show the same Development story field in expanded/mobile details as in Outline and Refine. Label the separate planning note “Beat plan.” Mirror edits between visible controls bound to the same field.
- Clear closed mobile details editors when switching back to the workbench.
- Show transaction errors inside an open editor so validation failures are not hidden behind the modal.
- Resize story-field inputs while typing in browsers without native content sizing.
- New character cards default to the selected chronology moment. At the beginning they remain starting blocks; at a later moment they become timed additions in Their arc.
- Every character card has an “Appears at” control. Moving the first appearance preserves later changes, supports undo, and handles retained archived origins. Saved character snapshots retain their other cards and life status. A move past an existing change is rejected with an explanation.
- New-card timing choices and unfinished timing edits are recoverable through the existing draft system. Attachments and circumstances remain attached to the newly created card.

## Audit coverage

- 108 layouts: nine primary views × six widths (320, 390, 768, 1024, 1440, 1920) × normal and long-content stories.
- 72 additional layouts: nine views × empty/dense stories × four viewport sizes, including short landscape screens.
- 100 dialog/workflow configurations: 60 core editor cases and 40 additional flows.
- 12 character timing layouts and 24 timing/new-card dialogs: six widths × normal/long content.
- Keyboard focus and automated accessibility checks, including 36 additional accessibility scans for the timing UI. No violations found in those scans.
- Targeted regression coverage for header geometry, hover stability, title wrapping, field sizing, mirrored edits, first appearance, undo, reload and draft recovery. Model tests cover later changes, archived sources and saved snapshots.

The geometry reports retain raw observations. Offscreen timeline buttons are inside intentional horizontal scroll regions; the portrait's small plus badge intentionally extends four pixels beyond its button. These are not document overflow. Native select menus are rendered by the browser/OS, so their appearance cannot be guaranteed pixel-for-pixel across platforms.

Scripts for the broad matrix are in the adjacent `2026-10-13-beat-board-sweep` folder. `audit.cjs` here adds the new character timing checks. Raw results and representative screenshots accompany this report.

## Release validation

Build checks, server tests and all 19 Workshop model-test files passed. Firefox and WebKit passed the focused story-field workflows and all 14 final alignment/timing regression cases. The broad Chromium suite and release checks are required before merge.
