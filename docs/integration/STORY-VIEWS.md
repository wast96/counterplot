# Sequence, Chronology, and Choices — 2026-10-05

Sequence now includes thread openings, individual beats, and thread closings.
Closings show the thread's closing text and offer an editor for that text. They
can be dragged or nudged independently, with Undo/Redo and durable local/account
storage. Opening rows still open the existing manuscript editor.

Chronology is a vertical timeline with a connecting line, opening/closing markers,
MICE colors, dates, participants, and compact editing controls. Its default order
is the saved story history. Group by date is a presentation option: dragging and
nudge controls are absent in that mode because moving an item within a sorted
display would misleadingly appear to change its date. Return to Story order to
retime history. Dates are labels; spacing does not represent elapsed duration.

Choices uses compact cards with participants and labeled Goal, Choice, Gain, Cost,
Reaction, and After fields when available. Open scene craft sits on the right on
desktop and wraps beneath the content on narrow screens. All three views retain
the original floating MICE / Beat / Archive bar without modifying it.

## Data compatibility

- `readingSequence` is an additive list of `nodeId:open` / `nodeId:close` keys.
  The existing `readingOrder` continues to hold piece IDs for manuscript prose,
  exports, reader knowledge, and older tabs.
- First conversion preserves all existing opening positions relative to one
  another. Each thread initially closes after its last descendant in reading
  order. Custom closing positions are subsequently preserved.
- Moving an opening updates the piece order too. Moving a closing alone never
  changes piece order, outline nesting, or chronology. Older-tab piece-order edits
  are reconciled into opening slots without removing saved closing positions.
- New pieces, continuation, archive/restore, permanent deletion, tutorial resets,
  and identity changes account for the new keys. Archived moments retain positions
  for restoration but do not appear in Sequence.
- Browser and server share the generated validator. No existing prose or historical
  moment records are converted into new text fields; closing edits use the same
  closing text as the Outline view.

## Verification

Seven targeted model regressions cover migration, custom order, independent
closing moves, reload, archives, identity changes, new pieces, continuation,
invalid references, and older-tab edits. All ten Workshop test files and all five
server test files pass, as do build consistency and syntax checks.

Browser coverage includes closing edits, drag/drop, nudges, Undo/Redo, reload
persistence, timeline grouping, independent chronology movement, Choices editing,
and responsive card bounds across desktop Chromium, mobile Chromium, Firefox,
and WebKit; all 80 browser tests pass. The full 22-stage tutorial workflow also passes without JavaScript
errors. Screenshot review covers all three views at 320, 390, 768, and 1440 pixels.
Computed styles and dimensions of the floating bar and its descendants match
the original integration at all four widths.

Evidence: `/workspace/counterplot-qa/story-views/`; browser regression tests:
`workshop/browser-tests/story-views.spec.js`.
