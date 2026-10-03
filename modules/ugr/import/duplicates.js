import { geoExtent } from '../../geo';

// The source ids of rows that a loaded point already carries, from a file of the same name.
export function ugrFindDuplicates(context, fileName, points) {
    const found = new Set();
    if (!points.length) return found;
    const ids = new Set(points.map(point => point.id));
    const extent = points
        .reduce((ext, point) => ext.extend(point.loc), geoExtent(points[0].loc))
        .padByMeters(10);
    for (const entity of context.history().intersects(extent)) {
        const tags = entity.tags || {};
        if (entity.type === 'node' && tags['ugr:source_file'] === fileName && ids.has(tags['ugr:source_id'])) {
            found.add(tags['ugr:source_id']);
        }
    }
    return found;
}
