# Retained-feature ledger

Workshop is the forward application. This ledger names the retained capabilities
without renumbering the earlier discussion's inventory. The one intentional
removal is **#32, rule-based scene alternatives and what-if comparisons**.

| Capability | Workshop implementation / treatment |
| --- | --- |
| Original project files and metadata | Original schema validator plus explicit schema-2 conversion; exact source retained outside the editable workspace; independent imports and duplicate notice |
| Projects and versions | Story shelf, rename/duplicate, retained version labels, separate conflict/recovered versions, Deleted stories, restore and permanent removal |
| MICE outline and ordinary beats | Workshop cards and nesting remain primary; cast/world links, plot membership, frame removal with writing retained, structural review |
| Tagged text outline | Original tagged nesting and closing words import through a preview; outline text exports from the current model |
| Free writing without a POV | Prose on threads/beats; optional planning fields, Write view, completion state, no required character to write |
| Continuous manuscript | Read view in separately saved manuscript order |
| Reading-order arrangement | Sequence drag handles and move controls, independent of outline and story chronology |
| Story chronology and date spans | Saved moment IDs/order, reorder controls, start/end dates, date sorting, detached historical moments |
| Scene craft | Goals, pressure/tension, turns, actions, gains/costs, responses/reactions, aftermath, next choices, reader expectations, internal beats, lane labels |
| Scene participants and POV | POV independent of scene-specific ensemble participation and roles; historical/archived references retained |
| Causal relationships and continuation | Primary/additional parents and continuation; cyclic causal edits rejected; changes do not reorder the manuscript |
| MICE/scene links | Multiple thread contributions and explicit opening/closing scenes; links remain editable |
| Inquiry evidence | Fact/scene evidence with supports/challenges/complicates interpretation and notes |
| Character building blocks | Workshop blocks, original vocabulary/content, pins, context/attachment fields, references, editable starting state and timed changes |
| Historical character selves | Gain/change/retire replay, life status/history, saved checkpoints, earlier-self insertion that preserves existing later selves |
| Cast arrangement and duplicates | Roster ordering controls and duplicates with independent identities; archive restores |
| Plot roles and prominence | Per-plot opening roles and timed changes, multiple protagonists, prominence history/checkpoints kept distinct from psychology and POV |
| World material and conditions | Original entity types, notes, tracked values/targets and changes; chronological view uses retained history |
| Knowledge and reader disclosure | Character/faction knowledge and acquisition timing distinct from first shown/reinterpreted reader appearances; archived references retained |
| Relationships and organizations | Directed wants, bond/notes, membership, position, leadership, visibility, directional ties, supporting facts, temporal terms |
| Faction building blocks and transitions | Wants/methods/values/boundaries/capabilities/obligations, timed changes/checkpoints, split/merge/absorb and membership transfers |
| Shared stakes | Structured attachments expose shared targets without declaring an automatic conflict |
| Scene consequences | Optional block/life/world/connection/prominence/role/faction/knowledge/reader changes committed and undone as one batch |
| Continuity review | Author accepts a current context snapshot; future-only character changes do not stale earlier scenes; old source-hashed scenes start with a first-review flag |
| Search, focus, references | Prose/craft/history/archive/draft search, branch/cast/review filters, Used here, image/research references |
| Unfinished editors | Debounced form journals, reload recovery, original draft mapping; less common legacy drafts have a field editor/download instead of their old modal layout |
| Archive and permanent deletion | Original archives migrate; characters and outline branches restore independently; links are pruned on permanent removal; history moments can remain detached |
| Undo, local saving, multiple tabs | Bounded Undo, native IndexedDB commit acknowledgement and CAS; quota/conflict recovery controls preserve the open copy |
| Exports | Story JSON, complete-library JSON, Markdown, portable local HTML, retained original file, independent recovered versions |
| Accounts and authentication | Existing API, passwords/pepper, session cookies, registration policy, logout, one-use recovery codes |
| Cross-device saving and history | Writer 5, owner-scoped caches/tutorials, revisions, durable in-flight IDs, chunks, history recovery, old-device unsent copy recovery, conflict forks |
| Tutorials and authoring | Workshop 22-stage/41-action MGS3 tutorial, custom definitions, sections, full-size authoring, draft journal, isolated Play and practice, owner-scoped sync |
| Contextual help | Current view guide and control highlighting, original Workshop teaching affordances; advanced fields stay in optional disclosures |
| #32: alternatives / what-if engine | Removed from active UI and execution. Authored scenes stay; old unaccepted suggestions become recoverable drafts. The old automatic path generator is not reintroduced. |

## Deliberate transition behavior

- Archived outline frames do not forcibly archive independent active manuscript
  scenes imported from the original version.
- Old continuity hashes cannot serve as the new model's exact comparison
  baseline. Imported source-hashed scenes require one explicit review. The old
  snapshots remain recoverable; accepting review does not replace writing.
- A complete-library import never silently overwrites a different tutorial
  definition/progress library. It retains the other library as a recovery file.
- Moving outline cards preserves the saved story chronology. To retime history,
  move moments in Chronology. Tutorial lesson examples now build on this model.
- A public archive branch can be excluded from Cloudflare deployment, but cannot
  be made unreadable to Cloudflare merely by renaming or protecting it.

Coverage varies by feature. See `VERIFICATION.md`; this ledger is not a claim
that every possible combination or every physical device has been tested.
