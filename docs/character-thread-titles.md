# Character thread titles

Character (`C`) threads have a free editable title and compact inline state fields. Starting states appear at the opening, intermediate changes on beats, and ending states at the closing. The subject can be a character or a World group; participating characters remain a separate cast list. Other thread types and beats keep free titles and optional “Name from a change”.

`node.characterArc` stores `subjectId`, `legacyTitle`, optional independent `title`, and `changes`. Each change has an identity, kind, label, `from`, `to`, and optional additional `outcomes`. State fields store their wording and an optional building-block link. Additional outcomes have their own identity. Blank subjects and states are valid. `pieceTitle()` supplies the plain-text equivalent for search, navigation, and export.

Existing stories are interpreted without rewriting their histories. A matching legacy “From … to …” title chooses the subject and primary row; other changes to that subject become additional rows. Unstructured old titles stay editable as the title. Explicit metadata is persisted when the user edits the title or applies a bulk edit, so adding participants cannot change the inferred arc subject.

Editing a linked state creates or updates a timed building-block record at the thread opening or closing, preserving the baseline. A fork creates a separate ending block, so its wording cannot overwrite another outcome. Title-only wording, clearing a field, and removing a displayed pair/outcome never delete recorded history. Undo covers each edit. The shared import/server validator validates arc metadata; archive purge and identity changes maintain its links.

State fields support direct typing and existing-state suggestions; a small options control retains the full editor. Title changes and state changes are independent, including blank titles. Beat rows show the actual timed character, World, and connection transitions; editing the ending value updates that record without changing the initial state.

# Bulk planning edits

“Select pieces” is available in Outline, Sequence, Chronology, and Choices. Checkbox selection is independent of the inspector and deduplicates a thread's opening and closing in moment views. Shift-click selects a visible range on desktop; Select all in view includes only rendered pieces. Collapsed descendants are not implicitly selected. A new story or entering Refine clears selection.

The bulk editor adds people, World links, and plot memberships without replacing existing lists. Viewpoint and outline status use explicit unchanged/replace choices; viewpoint can also be cleared. A chosen POV character joins the cast. Cast, World links, and viewpoint apply to both ends of selected threads, while their nested pieces remain unchanged unless selected. `applyBulk()` validates all references before mutation; the UI wraps the entire batch in one saved undo action. No character or World history is rewritten.
