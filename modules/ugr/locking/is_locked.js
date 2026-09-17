import { ugrDeclaredKeys } from '../rules/evaluate';
import { ugrRules } from '../rules/store';

// Reference features (e.g. cadastre) arrive tagged ugr:locked=yes and must never change in the editor.
export const ugrLockKey = 'ugr:locked';

export function ugrHasLockTag(entity) {
    return !!(entity && entity.tags && entity.tags[ugrLockKey] === 'yes');
}

// A node is also locked when any way it belongs to is locked: moving it would change that way.
export function ugrIsLocked(entity, graph) {
    if (!entity) return false;
    if (ugrHasLockTag(entity)) return true;
    if (entity.type === 'node' && graph) {
        return graph.parentWays(entity).some(ugrHasLockTag);
    }
    return false;
}

export function ugrAnyLocked(entityIDs, graph) {
    return entityIDs.some(id => ugrIsLocked(graph.hasEntity(id), graph));
}

// A test for backend-owned keys, from the loaded rules: every ugr:* key (e.g. ugr:locked, ugr:parcel) except the
// attributes the rules declare. Without rules every ugr:* key is backend-owned.
export function ugrBackendKeyTest() {
    const rules = ugrRules();
    const declared = rules ? ugrDeclaredKeys(rules) : new Set();
    return key => key.startsWith('ugr:') && !declared.has(key);
}

// Tags without the backend-owned keys.
export function ugrStripTags(tags) {
    const backendKey = ugrBackendKeyTest();
    const kept = {};
    for (const key in tags) {
        if (!backendKey(key)) kept[key] = tags[key];
    }
    return kept;
}
