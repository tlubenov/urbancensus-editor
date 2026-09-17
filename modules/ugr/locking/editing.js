import { actionDeleteNode } from '../../actions/delete_node';
import { actionDeleteWay } from '../../actions/delete_way';
import { geoChooseEdge } from '../../geo/geom';
import { ugrBackendKeyTest, ugrHasLockTag, ugrIsLocked } from './is_locked';

// A segment [nodeIDa, nodeIDb] (either order) is locked when a locked way has the two nodes next to each other.
// iD's actionAddMidpoint inserts the new vertex into every way with that segment, not only the targeted way.
export function ugrEdgeLocked(edge, graph) {
    const node = edge && graph.hasEntity(edge[0]);
    if (!node) return false;
    return graph.parentWays(node).some(way => ugrHasLockTag(way) && way.areAdjacent(edge[0], edge[1]));
}

// Whether the segment of `way` that a click or drop at screen `point` would add a vertex to is locked
// (chosen with geoChooseEdge, as behaviorDraw and modeDragNode choose it).
export function ugrChosenEdgeLocked(way, point, projection, activeID, graph) {
    const choice = geoChooseEdge(graph.childNodes(way), point, projection, activeID);
    return !!choice && ugrEdgeLocked([way.nodes[choice.index - 1], way.nodes[choice.index]], graph);
}

// Dragging: a locked node can't move, and a midpoint of a locked way (or of a segment a locked way shares) can't
// become a new vertex.
export function ugrDragBlocked(entity, graph) {
    if (!entity) return false;
    if (entity.type === 'midpoint') return (entity.parents || []).some(ugrHasLockTag) || ugrEdgeLocked(entity.edge, graph);
    return ugrIsLocked(entity, graph);
}

// Drawing: drop a click target that would change a locked feature, so the click places a free node.
// A way would gain a vertex; in add-point mode a node would gain the new point's tags.
export function ugrDrawTarget(target, modeID, graph) {
    if (!target || !ugrIsLocked(target, graph)) return target;
    if (target.type === 'way' || modeID === 'add-point') return null;
    return target;
}

// Snapping previews while drawing or dragging: never onto a locked way's segment, nor onto a free way's segment
// that a locked way shares.
export function ugrSnapNodes(datum, graph) {
    const properties = datum && datum.properties;
    if (!properties || !properties.nodes) return undefined;
    if (properties.entity && ugrIsLocked(properties.entity, graph)) return undefined;
    const [a, b] = properties.nodes;
    if (a && b && ugrEdgeLocked([a.id, b.id], graph)) return undefined;
    return properties.nodes;
}

// A dragged node may join a locked node only if nothing would merge into the locked node: it carries no tags but
// backend-owned ugr:* keys, which the attach drops.
export function ugrCanAttachToLocked(node) {
    return Object.keys(node.tags || {}).every(ugrBackendKeyTest());
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
        graph = actionDeleteNode(node.id)(graph);
        // Like actionConnect: delete ways that collapsed because they already contained the locked node.
        // The locked node's own locked ways are unchanged, so they are never degenerate here.
        graph.parentWays(locked).forEach(way => {
            if (way.isDegenerate()) graph = actionDeleteWay(way.id)(graph);
        });
        return graph;
    };
}
