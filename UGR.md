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

## Hooks in iD files

Order is not significant.

Generated with `grep -rn "ugr: " modules config data/core.yaml css .github | grep -v "^modules/ugr/"` at release ugr-2.42.2-1:

```
modules/index.ts:28:// ugr: Urban Green Register additions live in modules/ugr
modules/svg/tag_classes.ts:164:        // ugr: locked reference features get their own style (css/90_ugr.css)
modules/svg/notes.js:10:// ugr: OSM Notes are not part of this editor; the layer never starts enabled (ignores #notes=true)
modules/svg/notes.js:246:        // ugr: the notes layer can't be switched on
modules/svg/midpoints.ts:10:// ugr: locked ways get no midpoint handles
modules/svg/midpoints.ts:81:            // ugr: a midpoint handle would let the user add a vertex to a locked way
modules/modes/drag_node.js:30:// ugr: dragging obeys the lock on reference features
modules/modes/drag_node.js:150:        // ugr: locked nodes, and midpoints of locked ways, can't be dragged
modules/modes/drag_node.js:217:            // ugr: no snapping preview onto a locked way's segment
modules/modes/drag_node.js:402:        // ugr: a locked way never gains a vertex, also not through a segment it shares with the target; the node stays where it was dropped
modules/modes/drag_node.js:413:        // ugr: joining a locked node keeps it unchanged, or bounces back
modules/modes/select.js:24:// ugr: operations on locked features are disabled
modules/modes/select.js:26:// ugr: double-clicking never adds a vertex to a locked way
modules/modes/select.js:216:        // ugr: disable operations that would change a locked feature
modules/modes/select.js:344:                // ugr: nudging moves the selection, so it obeys the lock
modules/modes/select.js:448:                // ugr: not to a locked way, nor to a segment a locked way shares (the vertex would go into both)
modules/modes/select.js:458:                // ugr: nor through a midpoint of a segment a locked way has
modules/core/file_fetcher.ts:53:  // ugr: rules configuration served by the Urban Green Register backend
modules/core/file_fetcher.ts:117:    // ugr: default location; the editor page points this at the backend's rules file
modules/core/validator.js:9:// ugr: switched-off built-ins; our rules can't be disabled; locked features get only our rules
modules/core/validator.js:87:      // ugr: OSM-community validations are switched off in this editor
modules/core/validator.js:94:      // ugr: a stored preference can't disable our rules
modules/core/validator.js:429:    // ugr: our rules can't be toggled off
modules/core/validator.js:450:    // ugr: our rules can't be disabled
modules/core/validator.js:612:    // ugr: a locked feature gets only our rules, so no iD fix (e.g. "Square this feature") is offered to change it
modules/core/validation/models.ts:6:// ugr: iD's fixes can't change a locked feature
modules/core/validation/models.ts:95:        // ugr: fixes of an iD issue that names a locked feature are disabled (ignoring the issue, added below, stays possible)
modules/core/context.ts:25:// ugr: editing waits for the rules configuration
modules/core/context.ts:377:    // ugr: OSM Notes are removed; nothing loads or selects a note while the notes layer is off (always, in this editor)
modules/core/context.ts:558:    // ugr: no editing until the rules configuration has loaded (fail closed)
modules/behavior/draw_way.js:20:// ugr: no snapping preview onto locked ways
modules/behavior/draw_way.js:125:        // ugr: no snapping preview onto a locked way's segment
modules/behavior/draw.js:13:// ugr: drawing never changes a locked feature
modules/behavior/draw.js:172:        // ugr: clicks never add a vertex to a locked way or tags to a locked node
modules/behavior/draw.js:174:        // ugr: nor a vertex to a locked way through a segment it shares with the clicked way: the click places a free node
modules/validations/index.ts:20:// ugr: Urban Green Register validations (errors that block saving)
modules/behavior/hash.js:180:                    // ugr: OSM Notes are removed; ignore note/ ids
modules/behavior/hash.js:223:            // ugr: OSM Notes are removed; ignore note/ ids so this branch never runs
modules/renderer/features.js:101:    // ugr: locked reference features (cadastre) have their own toggle
modules/renderer/features.js:430:        // ugr: a locked feature belongs only to the ugr_locked toggle, so that toggle alone hides it
modules/actions/copy_entities.ts:5:// ugr: pasted copies are ordinary features
modules/actions/copy_entities.ts:20:            // ugr: drop ugr:* tags (such as ugr:locked) so a copied parcel becomes an editable feature
modules/ui/version.js:2:// ugr: our release and repository
modules/ui/version.js:15:            // ugr: show our release and link to our repository; the tooltip names the iD version
modules/ui/version.js:20:        // ugr: no "what's new" badge linking to iD releases
modules/ui/feature_list.js:265:                // ugr: no OSM Notes in search results
modules/ui/form_fields.js:6:// ugr: apply locked/read-only field state on every render, including after "Add field"
modules/ui/form_fields.js:55:        // ugr: apply locked/read-only field state on every render, including after "Add field"
modules/ui/success.js:25:    // ugr: no OpenStreetMap community index (it is fetched from a public CDN); the section never renders
modules/ui/entity_editor.js:9:// ugr: locked features and read-only fields can't be edited
modules/ui/entity_editor.js:78:        // ugr: a locked feature's type can't be changed
modules/ui/entity_editor.js:118:            // ugr: the raw tag editor shows locked and read-only tags as read-only
modules/ui/entity_editor.js:168:        // ugr: never change locked features, ugr:* tags or read-only tags. Some fields (e.g.
modules/ui/init.js:49:// ugr: load the rules configuration at start-up
modules/ui/init.js:51:// ugr: our issue tracker, welcome dialog and credits
modules/ui/init.js:321:        // ugr: credits for iD and the data sources
modules/ui/init.js:333:            // ugr: report problems to the register's issue tracker
modules/ui/init.js:341:        // ugr: no iD translation link; our wording is maintained in urban-green-register
modules/ui/init.js:444:            // ugr: load the rules configuration first; the welcome and restore prompt open only once rules are ready,
modules/ui/init.js:449:                        // ugr: our welcome dialog instead of iD's splash
modules/ui/init.js:475:        // ugr: the OpenStreetMap walkthrough is not offered, even via #walkthrough=true
modules/ui/preset_list.js:14:// ugr: a locked feature's type can't be changed; a type change keeps ugr:* and read-only tags
modules/ui/preset_list.js:410:            // ugr: a locked feature's type can't be changed (the list also opens for a locked way's untagged vertex)
modules/ui/preset_list.js:423:                        // ugr: the new type can't remove or change ugr:* and read-only tags, nor add them
modules/ui/view_on_osm.js:1:// ugr: no "view on openstreetmap.org" / history link; only findLastModifiedChild is still used
modules/ui/view_on_osm.js:5:// ugr: context is no longer used now that viewOnOSM only removes the link
modules/ui/view_on_osm.js:11:        // ugr: no "view on openstreetmap.org" / history link
modules/ui/commit.js:18:// ugr: deleting a locked feature can't be saved
modules/ui/commit.js:456:        // ugr: the validator never sees deleted entities, so a locked feature deleted through any path blocks saving here
modules/ui/sections/preset_fields.js:11:// ugr: fields of locked features and read-only fields are locked
modules/ui/sections/preset_fields.js:118:            // ugr: remember whether this field is locked; uiFormFields applies it to the DOM on every render
modules/ui/sections/validation_rules.js:8:// ugr: our rules are not listed as user toggles
modules/ui/sections/validation_rules.js:22:        // ugr: hide our rules, which can't be switched off
modules/ui/sections/feature_type.js:12:// ugr: a locked feature's type can't be changed
modules/ui/sections/feature_type.js:90:        // ugr: a locked feature's type can't be changed
modules/ui/sections/data_layers.js:71:        // ugr: no OSM Notes layer
modules/ui/sections/data_layers.js:134:        // ugr: no QA layers
modules/ui/panes/help.js:387:        // ugr: no OpenStreetMap walkthrough
modules/ui/panels/history.js:82:        // ugr: no OSMCha link (a third-party OpenStreetMap service that doesn't know our changesets)
modules/ui/panels/history.js:83:        // ugr: no Achavi link (a third-party OpenStreetMap service that doesn't know our changesets)
modules/ui/panels/history.js:193:        // ugr: no PeWu link (a third-party OpenStreetMap history viewer that doesn't know our features)
modules/services/index.ts:17:// ugr: OpenStreetMap-only and third-party services are removed
modules/services/index.ts:40:// ugr: keep only our API and vector tiles
css/90_ugr.css:1:/* ugr: locked reference features (cadastre): a thin, muted outline and no fill */
css/90_ugr.css:13:/* ugr: locked and read-only inspector fields can't be clicked or typed into */
.github/workflows/build.yml:6:# ugr: build our main branch, pull requests to it, and release tags
config/envs.js:20:  // ugr: no OpenStreetMap donation message unless explicitly enabled
data/core.yaml:919:    # ugr: toggle for locked reference features
data/core.yaml:1883:    # ugr: titles of our rules (used by iD's issues pane)
data/core.yaml:2319:  # ugr: Urban Green Register strings (modules/ugr); Bulgarian comes from urban-green-register/editor/wording
```

Every one of the 90 lines above is a hook marker comment (`// ugr:`, `# ugr:` or `/* ugr:`); none is a bare mention of `ugr:`-prefixed text (checked by confirming no line falls outside that pattern). Some markers' own comment text mentions tag names such as `ugr:*` or `ugr:locked` (e.g. `copy_entities.ts:20`, `preset_list.js:14`), but each of those lines is still a genuine hook marker.
