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

export function ugrStripTags(tags) {
    const kept = {};
    for (const key in tags) {
        if (!key.startsWith('ugr:')) kept[key] = tags[key];
    }
    return kept;
}
