# Counterplot workspace audit and approved implementation

Audited baseline: `d32eaedd5861e2237788c3aedec56cf753106e52`. Its HTML matched the live deployment byte for byte (SHA-256 `e52fea2716c0d1892848d9caaa2e29a4db8178ccfe2fac415af1ec482e9461f6`). Authenticated workflows were audited locally against isolated Pages/D1 accounts after production registration required a code. The user explicitly approved that substitution and subsequently approved the implementation plan with “yes”. No existing production projects were accessed or changed.

## Audit judgment

| Criterion | Weight | Baseline / 5 | Principal finding |
| --- | ---: | ---: | --- |
| Usefulness | 21% | 3.6 | Strong linked story material and historical states; generated questions largely repeated existing facts rather than helping discover a scene. |
| Intuitiveness | 19% | 2.7 | Hidden Outline controls, unclear account hierarchy, and apparently ineffective refresh made important tasks hard to understand. |
| Creative flexibility | 17% | 4.0 | Optional planning, free prose, character-free scenes and nonlinear orders work; generated no-viewpoint questions imposed human cognition on scenes. |
| Purposeful design | 16% | 2.8 | Repetitive advice, overlapping entry points and large question cards consumed attention without enough benefit. |
| Satisfying interaction | 14% | 2.9 | Strong editorial atmosphere, undermined by disappearing controls, obstructed writing and weak feedback. |
| Visual quality | 13% | 3.4 | Coherent typography and palette; account layout and dense small-screen scaffolding weakened the experience. |

Weighted baseline: **3.25/5**. Separate bug-freedom: **3.2/5**. This was a capable story application, not yet an exceptional creative environment. The main obstacle was the effort spent interpreting the tool instead of developing material. Scores are not automatically upgraded because changes shipped; a fresh end-to-end audit and real storyteller use are needed to judge the broader goal.

## Findings, changes and observed outcomes

| Finding / reproduction | Expected versus observed baseline | Approved change and verification |
| --- | --- | --- |
| B1: Open Want, Method, Value or Boundary and scroll through presets. | Search should remain legible and usable; preset cards painted over its sticky field and intercepted input. | Search now stays in normal flow. Repeated edits, custom wording and reload checked in all four dialogs; screenshot shows no floating field. |
| B2/D2: Refresh Explorer with unchanged context, then alter the aim and refresh. | A visible useful result or feedback; unchanged cards, with changed questions hidden elsewhere. | Removed runtime question cards and their refresh controls. Authored possibilities stay in the editor; old question payloads survive draft editing and JSON round trips. |
| B3: Inspect Explorer context and adjacent World actions with long labels. | Separate readable actions; zero gap made text run together. | Removed the redundant Explorer context row; spaced the equivalent World actions. Responsive page scans include World. |
| B4: Sign in without recovery codes and write a long scene. | Writing remains unobstructed; routine reminder covered prose and controls. | Recovery status lives inside Account. Urgent conflict notices reserve space below the editor; automated geometry and actual two-device conflict recovery verify it. |
| B5: Open Outline controls, switch plot, select a palette item. | Controls remain available; disclosures reset on redraw. | Plot/view controls and MICE bar are exposed in normal flow. Actual computed positioning is checked, not only visibility. |
| B6: Create Master-only material and reload. | Same lens and work remain visible; reload switched to A Plot. | Per-project plot/view preferences retain the chosen view, with a Master fallback. Search/contextual navigation still opens the relevant material. |
| B7/B8: Use Explorer without viewpoint; inspect muted text. | Neutral prompts and 4.5:1 normal-text contrast; anthropomorphic questions and 4.39:1 text. | Removed the low-value generated surface; optional author-written possibilities support any kind of story. |
| B9: Open World's earlier exploration disclosure. | Adequate target area; 21px target with insufficient adjacent spacing. | Increased target size. Legacy what-if tools remain accessible. |
| D1: Open Account while writing. | Familiar identity/status/recovery grouping; full-screen undifferentiated console. | Bounded Account dialog with clear sections, conditional retry feedback, loading/error states, focus containment and return to the same editor position. Slow responses cannot reopen a dismissed loading panel. |
| D3/D4/D5: Start an empty project, develop a character, write on mobile. | A quick route into material; repeated explanations and large toolbars displaced work. | Shorter empty states, optional example, leaner character margin and scene toolbar, compact mobile fields, restrained button feedback honoring reduced motion. |

## Preservation and scope

Workspace schema remains **3**. No backend, database migration, synchronization merge algorithm, stored narrative model, or historical-state model changed. Existing projects, scene links, references, drafts, authored possibilities and retained legacy exploration fields remain compatible. Regression tests cover older workspace import, export/import, character history, links, undo/redo, reading, continuation, search, browser navigation, unresolved conflicts and account recovery.

The product remains deliberately permissive: a blank viewpoint is valid; prompts and outcomes may stay unanswered; possibilities do not automatically become events; reading order, outline order and chronology remain distinct. Earlier rule-based exploration tools remain under World for existing workflows.

## Verification and evidence

**Local results: 64/64 browser cases passed with zero skips or retries; all three Node test files passed; syntax validation passed for 11 server modules and 10 inline scripts.** The regression suite checks user-visible results and underlying saved content. The visual capture script supplies screenshots for human inspection, including scrolled forms and populated fixtures. Responsive checks cover 320, 390, 768, 844 landscape and 1440 CSS-pixel widths. Axe checks cover all five main pages at four sizes plus Account; keyboard tests cover dialogs, focus return, browser navigation and editor use. No WCAG compliance claim is made solely from these results.

The actual local Pages/D1 test disconnects one browser, creates two conflicting endings, reconnects, verifies both versions after reload, then restores revision 2 as an additional project without overwriting either ending. See `evidence/local-sync-results.json`.

Run from the repository root:

```sh
npm ci
npx playwright install chromium
npm test
npm run check
npm run test:browser -- --workers=2
# Account recovery tests require an isolated Pages/D1 server:
TEST_SERVER_URL=http://127.0.0.1:8790 npm run test:browser -- --workers=2
TEST_SERVER_URL=http://127.0.0.1:8790 node scripts/verify-local-sync.mjs
node scripts/capture-workspace-audit.mjs
```

Use `CHROMIUM_PATH=/usr/bin/chromium` when using a system Chromium. CI runs the browser fixture tests; two real account-recovery cases are skipped without `TEST_SERVER_URL` and are exercised locally instead. Capture outputs default to ignored `test-results/`.

Limitations: production authenticated flows were not exercised because registration requires a code. Firefox failed before page load with “Could not find profile folder”; Safari/WebKit and assistive-technology sessions were not verified. Native browser zoom could not be driven in this environment. A supplementary CSS-zoom stress inspection is not equivalent to native zoom; responsive reflow at narrow widths was independently tested. These limits preclude a blanket browser-compatibility or WCAG 2.2 AA compliance claim.

The committed evidence uses synthetic story/account data. Credentials, cookies, private recovery codes, local databases, browser profiles, dependencies and temporary diagnostic files are deliberately excluded. All implementation sources, test changes, reproducible verification scripts and selected audit evidence are included in GitHub.
