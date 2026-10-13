# Character thread titles

Character (`C`) threads have a free editable title and compact inline state fields. Starting states appear at the opening, intermediate changes on beats, and ending states at the closing. The subject can be a character or a World group; participating characters remain a separate cast list. Every thread type and beat keeps a free title. The former “Name from a change” generator is removed. Previously saved titles are retained.

`node.characterArc` stores `subjectId`, `legacyTitle`, optional independent `title`, and `changes`. Each change has an identity, kind, label, `from`, `to`, and optional additional `outcomes`. State fields store their wording and an optional building-block link. Additional outcomes have their own identity. Blank subjects and states are valid. `pieceTitle()` supplies the plain-text equivalent for search, navigation, and export.

Existing stories are interpreted without rewriting their histories. A matching legacy “From … to …” title chooses the subject and primary row; other changes to that subject become additional rows. Unstructured old titles stay editable as the title. Explicit metadata is persisted when the user edits the title or applies a bulk edit, so adding participants cannot change the inferred arc subject.

Editing a linked state creates or updates a timed building-block record at the thread opening or closing, preserving the baseline. A fork creates a separate ending block, so its wording cannot overwrite another outcome. Title-only wording, clearing a field, and removing a displayed pair/outcome never delete recorded history. Undo covers each edit. The shared import/server validator validates arc metadata; archive purge and identity changes maintain its links.

State fields support direct typing and existing-state suggestions; a small options control retains the full editor. Title changes and state changes are independent, including blank titles. Beat rows show the actual timed character, World, and connection transitions; editing the ending value updates that record without changing the initial state.

# All MICE threads and parallel states

Milieu, Inquiry, and Event threads use the same compact opening/closing pattern, with independent titles and optional notes. Milieu has World / Entering / Leaving fields, Inquiry has Question / Known / Answer, and Event has Disruption / Before / Resolution. Blank fields and additional closing outcomes are valid. `node.threadPlans` stores a separate plan for each type, so switching types preserves previous wording. These planning fields do not silently change character or World histories.

“Add change” at an opening, beat, or closing records an actual character block, group block, World state, or connection change. Timed states remain separate from baseline definitions. Existing fields are editable directly and autosave, including on navigation or page exit. The plus beside a building-block state forks it into a parallel block while keeping the source. Undo and export include these edits.

`recordedThreadStates()` reconciles stored character-arc fields with actual timed state. Changes introduced on nested or explicitly linked beats appear at enclosing thread closings, including forks created after arc metadata was saved. Related parallel states already present when a later character arc opens remain visible alongside the tracked source. New forks retain `forkedFrom`; older forks can be recognized from saved arc outcome links. States already displayed by the character arc are not repeated. Editing a closing writes at that closing, preserving intermediate beat states.

# Beats while nested threads remain open

“Beat here” adds a beat before the current thread closes and asks which threads it advances. The chain control on an existing piece edits these links. A beat can advance multiple threads, including an outer character arc while nested Inquiry and Event threads remain open.

Position and meaning are independent: `parentId` retains the beat's structural position, while `miceLinks` identifies the threads it advances. Choosing links does not move the beat, close any thread, or reorder story chronology. The outline aligns the beat with the outermost linked ancestor and labels the threads that remain open. Its original position between surrounding openings and closings remains intact. Links to other threads are also supported without moving the piece.

Dragging a beat deeper inside its current larger thread preserves that thread automatically, even if it was previously implied only by placement. The same rule applies to precise move controls. Drop onto a nested closing to place the beat immediately before that closing, or into a gap among its contents. The landing hint states which larger thread stays linked. Existing chosen links, chronology, and recorded state history remain unchanged; unrelated thread moves keep their ordinary placement behavior.

# Bulk planning edits

“Select pieces” is available in Outline, Sequence, Chronology, and Choices. Checkbox selection is independent of the inspector and deduplicates a thread's opening and closing in moment views. Shift-click selects a visible range on desktop; Select all in view includes only rendered pieces. Collapsed descendants are not implicitly selected. A new story or entering Refine clears selection.

The bulk editor adds people, World links, and plot memberships without replacing existing lists. Viewpoint and outline status use explicit unchanged/replace choices; viewpoint can also be cleared. A chosen POV character joins the cast. Cast, World links, and viewpoint apply to both ends of selected threads, while their nested pieces remain unchanged unless selected. `applyBulk()` validates all references before mutation; the UI wraps the entire batch in one saved undo action. No character or World history is rewritten.

## Custom building-block labels

A custom label belongs to the building block across its history. State snapshots from older saves can omit that label; character-state resolution inherits the starting block's current label without changing stored state text, dates, or IDs. Forks inherit their source label, including older arc outcomes saved before `forkedFrom` existed. An independently named fork keeps its own label.

Editing a starting block's label updates its saved snapshots and linked arc labels, including archived changes and checkpoints. Clearing that label restores the default kind name. Profiles, arc history, beat changes, and thread state controls use the same label resolution.
