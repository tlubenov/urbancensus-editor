import { deepEqual } from 'fast-equals';

import { ugrDeclaredKeys, ugrReadOnlyKeys } from '../rules/evaluate';
import { ugrFeatureFor } from '../rules/feature';
import { ugrRules } from '../rules/store';
import { ugrAnyLocked, ugrBackendKeyTest } from './is_locked';

function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function ugrReadOnlyKeysFor(entityIDs, graph) {
    const rules = ugrRules();
    if (!rules) return [];
    const keys = new Set();
    entityIDs.forEach(id => {
        const entity = graph.hasEntity(id);
        if (entity) ugrReadOnlyKeys(rules, ugrFeatureFor(entity, graph)).forEach(key => keys.add(key));
    });
    return [...keys];
}

// The keys ugrBackendKeyTest accepts, as a pattern: ugr:* except the attributes the rules declare.
function backendKeyPattern() {
    const rules = ugrRules();
    const declared = rules ? [...ugrDeclaredKeys(rules)].filter(key => key.startsWith('ugr:')) : [];
    return declared.length ? new RegExp(`^(?!(?:${declared.map(escapeRegExp).join('|')})$)ugr:`) : /^ugr:/;
}

// Patterns for the raw tag editor's readOnlyTags(): everything for locked features; otherwise backend-owned ugr:* keys
// and read-only keys.
export function ugrReadOnlyTagPatterns(entityIDs, graph) {
    if (ugrAnyLocked(entityIDs, graph)) return [/.*/];
    return [backendKeyPattern()].concat(ugrReadOnlyKeysFor(entityIDs, graph).map(key => new RegExp(`^${escapeRegExp(key)}$`)));
}

export function ugrFieldLocked(field, entityIDs, graph) {
    if (ugrAnyLocked(entityIDs, graph)) return true;
    const readOnly = ugrReadOnlyKeysFor(entityIDs, graph);
    return [field.key].concat(field.keys || []).filter(Boolean).some(key => readOnly.includes(key));
}

// A copy of `after` in which backend-owned ugr:* keys and `readOnly` keys are as in `before`: a key present before gets
// its value back, a key absent before is removed.
function restoreProtectedKeys(before, after, readOnly) {
    const result = Object.assign({}, after);
    const protectedKeys = new Set(readOnly);
    Object.keys(before).concat(Object.keys(result))
        .filter(ugrBackendKeyTest())
        .forEach(key => protectedKeys.add(key));
    protectedKeys.forEach(key => {
        if (key in before) result[key] = before[key];
        else delete result[key];
    });
    return result;
}

// A change of feature type (actionChangePreset) may remove or add any key; backend-owned ugr:* keys and read-only keys
// stay as they were. Declared ugr: attributes are ordinary attributes here.
// `graph` is the graph before the change, where the read-only keys of `entityIDs` are looked up.
export function ugrPreserveProtectedTags(beforeTags, afterTags, entityIDs, graph) {
    return restoreProtectedKeys(beforeTags, afterTags, ugrReadOnlyKeysFor(entityIDs, graph));
}

// Wraps a tag-changing action on one entity (e.g. actionChangePreset) so that it keeps backend-owned ugr:* and read-only keys.
export function ugrActionPreserveProtectedTags(entityID, action) {
    return function (graph) {
        const before = graph.entity(entityID).tags;
        const result = action(graph);
        const entity = result.entity(entityID);
        const tags = ugrPreserveProtectedTags(before, entity.tags, [entityID], graph);
        return deepEqual(tags, entity.tags) ? result : result.replace(entity.update({ tags: tags }));
    };
}

// The "feature type" buttons (inspector header and Feature Type section) can't be used on a locked selection.
export function ugrApplyPresetChangeLock(buttons, entityIDs, graph) {
    const locked = ugrAnyLocked(entityIDs, graph);
    buttons
        .classed('disabled', locked)
        .property('disabled', locked);
}

// The last gate before the inspector changes tags: covers fields, the raw tag editor and its text view. Backend-owned
// ugr:* keys and read-only keys never change; ugr: attributes that the rules declare do.
export function ugrAllowedTagChanges(changed, entityIDs, graph) {
    if (ugrAnyLocked(entityIDs, graph)) return {};
    const readOnly = ugrReadOnlyKeysFor(entityIDs, graph);
    if (typeof changed === 'function') {
        // Function changes (multi-key and directional fields) may mutate their argument in place (e.g.
        // directional_combo.js, input.js) and return that same object, so the "prior" tags must be
        // captured before calling it, from a copy that the callback cannot touch.
        return function (tags) {
            const before = Object.assign({}, tags);
            const returned = changed(Object.assign({}, tags));
            return restoreProtectedKeys(before, returned === undefined ? before : returned, readOnly);
        };
    }
    const backendKey = ugrBackendKeyTest();
    const allowed = {};
    for (const key in changed) {
        if (backendKey(key) || readOnly.includes(key)) continue;
        allowed[key] = changed[key];
    }
    return allowed;
}

// Applies field.ugrLocked (set by preset_fields) to the rendered DOM on every form render, including "Add field".
// Only controls this function disabled are re-enabled, so iD's own locks (e.g. wikidata) stay intact.
export function ugrApplyFieldLocks(selection, fields) {
    fields.forEach(field => {
        const locked = !!field.ugrLocked;
        const wrap = selection.selectAll(`.wrap-form-field-${field.safeid}`)
            .classed('ugr-readonly', locked);
        if (locked) {
            wrap.selectAll('.form-field-input-wrap input, .form-field-input-wrap textarea, .form-field-input-wrap select, .form-field-input-wrap button, .field-label .remove-icon, .field-label .modified-icon')
                .property('disabled', true)
                .classed('disabled', true)
                .classed('ugr-disabled', true);
        } else {
            wrap.selectAll('.ugr-disabled')
                .property('disabled', false)
                .classed('disabled', false)
                .classed('ugr-disabled', false);
        }
    });
}
