// The evaluation feature for an iD entity: its geometry, tags and coordinates ([lon, lat]).
// Relations carry no coordinates; their member ways are validated on their own.
export function ugrFeatureFor(entity, graph) {
    let coordinates = [];
    if (entity.type === 'node') {
        coordinates = [entity.loc];
    } else if (entity.type === 'way') {
        coordinates = graph.childNodes(entity).map(node => node.loc);
    }
    return { geometry: entity.geometry(graph), tags: entity.tags, coordinates };
}
