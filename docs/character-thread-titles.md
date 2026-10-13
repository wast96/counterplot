# Character thread titles

Character (`C`) threads display an editable subject and one or more labelled starting/ending state pairs. The subject can be a character or a World group; participating characters remain a separate cast list. Other thread types and beats keep free titles and optional “Name from a change”.

`node.characterArc` stores `subjectId`, `legacyTitle`, and `changes`. Each change has an identity, kind, label, `from`, `to`, and optional additional `outcomes`. State fields store their wording and an optional building-block link. Additional outcomes have their own identity. Blank subjects and states are valid. `pieceTitle()` supplies the plain-text equivalent for search, navigation, and export.

Existing stories are interpreted without rewriting their histories. A matching legacy “From … to …” title chooses the subject and primary row; other changes to that subject become additional rows. Unstructured old titles remain available under Previous title. Explicit metadata is only persisted when the user edits the title.

Editing a linked state creates or updates a timed building-block record at the thread opening or closing, preserving the baseline. A fork creates a separate ending block, so its wording cannot overwrite another outcome. Title-only wording, clearing a field, and removing a displayed pair/outcome never delete recorded history. Undo covers each edit. The shared import/server validator validates arc metadata; archive purge and identity changes maintain its links.
