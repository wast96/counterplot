# Archive → Unfinished edits

The former Drafts toolbar control now lives in Archive as the Unfinished edits
tab, alongside Archived pieces. Both tabs display their own counts; the sidebar
Archive count includes both collections. Existing project data keeps its `drafts`
field, so local saves, imported projects, account sync, and backups retain entries.

The inbox shows an edit's subject, type, up to three content previews, and its saved
time when recorded. Search includes all saved fields. Resume opens the appropriate
editor without applying the unfinished values to the story. Discard removes only
the selected unfinished entry and supports Undo. Export remains available.

Imported scenes use Add to story and move into a separate story piece in the same
undoable operation that removes their inbox entry. Other supported imported edits
reuse their original inbox identity when resumed. Unavailable editor targets keep
their saved fields available for export. Unsupported legacy records retain their
existing recovery editor rather than being discarded.

Successfully submitting a resumed form removes its inbox entry; failed submissions
keep it. Closing a form saves the latest input immediately, including input entered
inside the autosave debounce window. The Close button now dispatches through the
current recovery-aware close handler. Submission cleanup runs when the successful
handler closes the editor, avoiding microtasks that can fire before submission has
finished bubbling.

Empty archive operates only on Archived pieces. Opening Archive from navigation
or the unchanged floating Workshop bar selects Archived pieces. Global search
results for unfinished work lead to the new tab. Tabs support arrow, Home, and End
keys, and layouts were visually checked at desktop and narrow mobile widths.

Regression coverage is in `workshop/browser-tests/unfinished-edits.spec.js` and the
updated reload-recovery case in `workshop/browser-tests/workshop.spec.js`.
Screenshot evidence: `/workspace/counterplot-qa/unfinished-edits/`.
