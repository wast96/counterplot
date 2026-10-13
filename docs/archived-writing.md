# Write and Read

Write and Read are archived behind `WORKSPACE_FEATURES.drafting` in `workshop/src/app.js`.
Their UI, stored prose, closing prose, statuses, reading settings, import/export, and history are retained.

To restore them, change the feature switch to `true`, run `npm run build:workshop`, and run the normal checks. This restores the two tabs, drafting buttons, original shortcut destinations, and writing tutorial steps together. Existing stories do not need migration.

While archived, drafting shortcuts open Refine; old requests for Write or Read also resolve to Refine. Outline, Sequence, Choices, continuation creation, recovered drafts, and tutorial navigation remain usable. The practice guide omits goals that require prose editing without changing the stored lesson definitions.

The retained implementations are `writing()` in `workshop/src/app.js` and `readingView()` in `workshop/src/integration-ui.js`. Regression tests call `workshop/browser-tests/archived-writing.cjs` to enable the switch only in their local browser response, updating its CSP hash. Production does not expose a hidden setting or browser-storage override.
