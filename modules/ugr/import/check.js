import { ugrPointInBoundary } from '../rules/evaluate';
import { ugrGuessCrs, ugrInBulgaria, ugrNormalizeCrs, ugrToWgs84 } from './crs';
import { UGR_REQUIRED_COLUMNS, ugrParsePoints } from './parse';

export const UGR_IMPORT_MAX_BYTES = 5 * 1024 * 1024;

// A plain decimal number; one decimal comma is read as a point.
function toNumber(text) {
    const normal = String(text).trim().replace(',', '.');
    return /^-?[0-9]+(\.[0-9]+)?$/.test(normal) ? Number(normal) : NaN;
}

function round7(value) {
    return Math.round(value * 1e7) / 1e7;
}

// The rules preset for a type name (`tree` is `ugr/tree`), if it can be a point.
function pointPreset(rules, type) {
    const preset = (rules.presets || {})[`ugr/${type}`];
    return preset && (!preset.geometry || preset.geometry.includes('point')) ? preset : null;
}

function result(problems, ignored = [], points = []) {
    return { problems, points: problems.length ? [] : points, ignored };
}

// `crs` and `accuracy` are the form's defaults for rows without their own (null and '' when unset).
export function ugrCheckImport({ fileName, size, text, rules, crs, accuracy, maxPoints }) {
    if (size > UGR_IMPORT_MAX_BYTES) return result([{ line: null, column: null, code: 'too_large' }]);

    const parsed = ugrParsePoints(text);
    if (parsed.problems.length) return result(parsed.problems, parsed.ignored);
    if (parsed.rows.length > maxPoints) {
        return result([{ line: null, column: null, code: 'too_many', params: { count: parsed.rows.length, max: maxPoints } }], parsed.ignored);
    }

    const defaultCrs = crs ? ugrNormalizeCrs(crs) : null;
    const problems = [];
    const points = [];
    const seen = new Map();

    for (const { line, cells } of parsed.rows) {
        const before = problems.length;
        const problem = (column, code, params) => problems.push(params ? { line, column, code, params } : { line, column, code });

        for (const column of UGR_REQUIRED_COLUMNS) {
            if (cells[column] === '') problem(column, 'required');
        }
        if (cells.id !== '') {
            if (seen.has(cells.id)) problem('id', 'duplicate_id', { line: seen.get(cells.id) });
            else seen.set(cells.id, line);
        }

        const x = toNumber(cells.x);
        const y = toNumber(cells.y);
        if (cells.x !== '' && isNaN(x)) problem('x', 'not_number');
        if (cells.y !== '' && isNaN(y)) problem('y', 'not_number');

        let rowCrs = defaultCrs;
        if (cells.crs) {
            rowCrs = ugrNormalizeCrs(cells.crs);
            if (!rowCrs) problem('crs', 'crs_unknown');
        } else if (!rowCrs) {
            problem('crs', 'crs_missing');
        }

        const type = (cells.type || 'tree').toLowerCase();
        const preset = pointPreset(rules, type);
        if (!preset) problem('type', 'type_unknown', { type });

        const accuracyText = cells.accuracy || String(accuracy || '').trim();
        const precision = toNumber(accuracyText);
        if (accuracyText === '') problem('accuracy', 'accuracy_missing');
        else if (!(precision > 0)) problem('accuracy', 'accuracy_invalid');

        if (problems.length > before) continue;

        const loc = ugrToWgs84(rowCrs, x, y);
        if (!ugrInBulgaria(loc)) {
            problem('x/y', ugrInBulgaria(ugrToWgs84(rowCrs, y, x)) ? 'maybe_swapped' : 'outside_bulgaria');
            continue;
        }
        if (rules.boundary && !ugrPointInBoundary(rules.boundary, loc)) {
            problem('x/y', 'outside_boundary');
            continue;
        }

        points.push({
            line,
            id: cells.id,
            crs: rowCrs,
            type,
            loc: [round7(loc[0]), round7(loc[1])],
            tags: Object.assign({}, preset.tags, {
                'ugr:source_id': cells.id,
                'ugr:source_file': fileName,
                'ugr:source_crs': rowCrs,
                'ugr:precision_m': String(precision)
            })
        });
    }

    return result(problems, parsed.ignored, points);
}

// The system the form should offer for the rows that don't name one.
export function ugrGuessImportCrs(text) {
    const pairs = ugrParsePoints(text).rows
        .filter(row => !row.cells.crs)
        .map(row => [toNumber(row.cells.x), toNumber(row.cells.y)])
        .filter(([x, y]) => !isNaN(x) && !isNaN(y));
    return ugrGuessCrs(pairs);
}

export function ugrImportCounts(points) {
    const byType = {};
    const byCrs = {};
    for (const point of points) {
        byType[point.type] = (byType[point.type] || 0) + 1;
        byCrs[point.crs] = (byCrs[point.crs] || 0) + 1;
    }
    return { byType, byCrs };
}
