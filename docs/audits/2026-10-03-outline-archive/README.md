# Outline archive and immediate deletion

Delete buttons and dragging to Trash delete immediately, preserving nested pieces and offering the existing Undo. Clicking Trash opens a persistent picker for repeated deletions. The floating toolbar groups MICE | Beat | Archive / Trash.

Archive keeps canonical branch IDs, inner pieces and all links in the workspace. Archived branches are hidden from outline lenses, chronology and plain-text outline export. JSON backups, sync and history retain them. Drag a branch onto Archive, or choose Arrange → Archive branch. Restore with a drag, keyboard placement or Restore. Restore opens the master view so branches remain visible regardless of their plot memberships.

Character block options put the custom type last. Character name and evolution headings share the same vertical spacing.

Validation: complete Chromium desktop/mobile suite (106 passed; six account-dependent cases skipped), separate actual Pages/D1 two-device deletion/Undo/archive/restore tests (two passed), focused Firefox suite (nine passed), server tests and generated-runtime/syntax checks. Local hosted smoke covers five viewport sizes, CSP execution, archive/restore/delete/Undo and scene editor with no runtime errors. Safari unavailable in this environment.

Rollback: tag `backup/pre-outline-archive-2026-10-03` preserves the preceding release. Source archive: `/workspace/backups/counterplot-before-outline-archive-2026-10-03/source.tar.gz`.
