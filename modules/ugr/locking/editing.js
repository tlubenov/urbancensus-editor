import { actionDeleteNode } from '../../actions/delete_node';
import { ugrHasLockTag, ugrIsLocked } from './is_locked';

// Dragging: a locked node can't move, and a midpoint of a locked way can't become a new vertex.
export function ugrDragBlocked(entity, graph) {
    if (!entity) return false;
    if (entity.type === 'midpoint') return (entity.parents || []).some(ugrHasLockTag);
    return ugrIsLocked(entity, graph);
}

// Drawing: drop a click target that would change a locked feature, so the click places a free node.
// A way would gain a vertex; in add-point mode a node would gain the new point's tags.
export function ugrDrawTarget(target, modeID, graph) {
    if (!target || !ugrIsLocked(target, graph)) return target;
    if (target.type === 'way' || modeID === 'add-point') return null;
    return target;
}

// Snapping previews while drawing or dragging: never onto a locked way's segment.
export function ugrSnapNodes(datum, graph) {
    const properties = datum && datum.properties;
    if (!properties || !properties.nodes) return undefined;
    if (properties.entity && ugrIsLocked(properties.entity, graph)) return undefined;
    return properties.nodes;
}

// A dragged node may join a locked node only if nothing would merge into the locked node.
export function ugrCanAttachToLocked(node) {
    return Object.keys(node.tags || {}).every(key => key.startsWith('ugr:'));
}

// Like actionConnect, but the locked node always survives unchanged.
export function ugrActionAttachToLocked(lockedID, nodeID) {
    return function (graph) {
        const node = graph.entity(nodeID);
        const locked = graph.entity(lockedID);
        graph.parentWays(node).forEach(way => {
            graph = graph.replace(way.replaceNode(node.id, locked.id));
        });
        graph.parentRelations(node).forEach(relation => {
            graph = graph.replace(relation.replaceMember(node, locked));
        });
        return actionDeleteNode(node.id)(graph);
    };
}
