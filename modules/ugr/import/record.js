import { t } from '../../core/localizer';

let _record = null;

// { file, count, byCrs, time, displayName, nodeIds } for the import just added, or null.
export function ugrSetPendingImport(record) {
    _record = record;
}

// The import whose points are still unsaved in `graph`: none once it is undone or saved (the ids are gone),
// or if its ids now belong to other points.
export function ugrPendingImport(graph) {
    if (!_record) return null;
    const alive = _record.nodeIds.some(id => {
        const entity = graph.hasEntity(id);
        return entity && entity.tags['ugr:source_file'] === _record.file;
    });
    return alive ? _record : null;
}

const CRS_ORDER = ['bgs2005', 'wgs84'];
const CRS_LABEL = { bgs2005: 'BGS2005', wgs84: 'WGS84' };

function pad(n) {
    return String(n).padStart(2, '0');
}

function localTime(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// The changeset tags that say what was imported, from which file, by whom and when.
export function ugrImportChangesetTags(graph) {
    const record = ugrPendingImport(graph);
    if (!record) return {};
    const used = CRS_ORDER.filter(crs => record.byCrs[crs]);
    const params = {
        count: record.count,
        file: record.file,
        crs: used.map(crs => `${record.byCrs[crs]} ${CRS_LABEL[crs]}`).join(', '),
        user: record.displayName,
        time: localTime(record.time)
    };
    return {
        comment: t(record.displayName ? 'ugr.import.comment' : 'ugr.import.comment_no_user', params),
        source: 'import',
        'ugr:import_file': record.file,
        'ugr:import_count': String(record.count),
        'ugr:import_crs': used.map(crs => `${crs}:${record.byCrs[crs]}`).join(';')
    };
}
