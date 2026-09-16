# urbancensus-editor

The Urban Green Register's editor: a fork of [iD](https://github.com/openstreetmap/iD) (ISC licence, see `LICENSE.md`).
Design: `docs/superpowers/specs/2026-09-16-editor-fork-design.md` in `urban-green-register`.

## Layout

- Our code: `modules/ugr/`; tests: `test/spec/ugr/`; styles: `css/90_ugr.css`; English strings: the `ugr:` block at the end of `data/core.yaml`.
- Every change to an iD file is marked on the line above with `// ugr:` (JS/TS), `# ugr:` (YAML) or `/* ugr: */` (CSS).
  List them all with: `grep -rn "ugr: " modules config data/core.yaml css .github | grep -v "^modules/ugr/"`

## Running things

The host has no Node; use `scripts/ugr-docker.sh`, e.g. `scripts/ugr-docker.sh npm run test`.

## Merging an upstream iD release

1. `git fetch upstream --tags`
2. `git merge vX.Y.Z` (never rebase `main`)
3. Resolve conflicts at the `ugr:` markers; files iD renamed (e.g. `.js` → `.ts`) need their hooks moved.
4. Update `ugrBaseVersion` in `modules/ugr/release.js` and reset the release counter to 1.
5. `scripts/ugr-docker.sh npm ci && scripts/ugr-docker.sh npm run all && scripts/ugr-docker.sh npm run test`

## Releasing

1. Bump `ugrRelease` in `modules/ugr/release.js`.
2. Full test run.
3. `git tag -a ugr-<iD version>-<n> -m "urbancensus-editor ugr-<iD version>-<n>"` and push the tag.
4. Point `EDITOR_VERSION` in `urban-green-register` at the new tag.
