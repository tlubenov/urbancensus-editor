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
    // Multi-key and directional-combo fields dispatch a callback (tags => tags) rather than a tags
    // object. It runs against the current tags later, so there is nothing to filter here by key.
    if (typeof changed === 'function') return changed;
    const readOnly = ugrReadOnlyKeysFor(entityIDs, graph);
    const allowed = {};
    for (const key in changed) {
        if (key.startsWith('ugr:') || readOnly.includes(key)) continue;
        allowed[key] = changed[key];
    }
    return allowed;
}
