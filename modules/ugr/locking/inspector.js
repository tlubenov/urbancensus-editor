import { ugrReadOnlyKeys } from '../rules/evaluate';
import { ugrFeatureFor } from '../rules/feature';
import { ugrRules } from '../rules/store';
import { ugrAnyLocked } from './is_locked';

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

// Patterns for the raw tag editor's readOnlyTags(): everything for locked features; otherwise ugr:* and read-only keys.
export function ugrReadOnlyTagPatterns(entityIDs, graph) {
    if (ugrAnyLocked(entityIDs, graph)) return [/.*/];
    return [/^ugr:/].concat(ugrReadOnlyKeysFor(entityIDs, graph).map(key => new RegExp(`^${escapeRegExp(key)}$`)));
}

export function ugrFieldLocked(field, entityIDs, graph) {
    if (ugrAnyLocked(entityIDs, graph)) return true;
    const readOnly = ugrReadOnlyKeysFor(entityIDs, graph);
    return (field.keys || [field.key]).filter(Boolean).some(key => readOnly.includes(key));
}

// The last gate before the inspector changes tags: covers fields, the raw tag editor and its text view.
export function ugrAllowedTagChanges(changed, entityIDs, graph) {
    if (ugrAnyLocked(entityIDs, graph)) return {};
    const readOnly = ugrReadOnlyKeysFor(entityIDs, graph);
    if (typeof changed === 'function') {
        // Function changes (multi-key and directional fields) run against current tags; restore ugr:* and read-only keys afterwards.
        return function (tags) {
            const result = Object.assign({}, changed(tags));
            const protectedKeys = new Set(readOnly.concat(Object.keys(tags).filter(key => key.startsWith('ugr:'))));
            Object.keys(result).filter(key => key.startsWith('ugr:')).forEach(key => protectedKeys.add(key));
            protectedKeys.forEach(key => {
                if (key in tags) result[key] = tags[key];
                else delete result[key];
            });
            return result;
        };
    }
    const allowed = {};
    for (const key in changed) {
        if (key.startsWith('ugr:') || readOnly.includes(key)) continue;
        allowed[key] = changed[key];
    }
    return allowed;
}

// field.locked() alone doesn't disable most iD field types, so locked and read-only fields are made inert in the DOM.
export function ugrDisableLockedFields(selection, fields, entityIDs, graph) {
    fields.forEach(field => {
        const locked = ugrFieldLocked(field, entityIDs, graph);
        const wrap = selection.selectAll(`.wrap-form-field-${field.safeid}`)
            .classed('ugr-readonly', locked);
        wrap.selectAll('input, textarea, select, button')
            .property('disabled', locked)
            .classed('disabled', locked);
    });
}
