// Pure evaluation of the rules configuration. No imports: urban-green-register runs this file under Node
// against editor/rule-cases.json, and its Python upload validation must return the same codes.

const bboxes = new WeakMap();

function boundaryBBox(boundary) {
    if (!bboxes.has(boundary)) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const rings of polygonsOf(boundary)) {
            for (const [x, y] of rings[0]) {
                minX = Math.min(minX, x); minY = Math.min(minY, y);
                maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
            }
        }
        bboxes.set(boundary, [minX, minY, maxX, maxY]);
    }
    return bboxes.get(boundary);
}

function polygonsOf(boundary) {
    return boundary.type === 'Polygon' ? [boundary.coordinates] : boundary.coordinates;
}

function inRing(ring, [x, y]) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i];
        const [xj, yj] = ring[j];
        if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
}

export function ugrPointInBoundary(boundary, point) {
    const [minX, minY, maxX, maxY] = boundaryBBox(boundary);
    const [x, y] = point;
    if (x < minX || x > maxX || y < minY || y > maxY) return false;
    return polygonsOf(boundary).some(rings => inRing(rings[0], point) && !rings.slice(1).some(hole => inRing(hole, point)));
}

export function ugrMatchPreset(rules, feature) {
    const tags = feature.tags || {};
    let best = null;
    let bestSize = -1;
    for (const id of Object.keys(rules.presets || {}).sort()) {
        const preset = rules.presets[id];
        if (preset.geometry && !preset.geometry.includes(feature.geometry)) continue;
        const wanted = preset.tags || {};
        const keys = Object.keys(wanted);
        if (!keys.length || !keys.every(key => tags[key] === wanted[key])) continue;
        if (keys.length > bestSize) {
            best = id;
            bestSize = keys.length;
        }
    }
    return best;
}

export function ugrReadOnlyKeys(rules, feature) {
    const id = ugrMatchPreset(rules, feature);
    return id ? (rules.presets[id].read_only || []).slice() : [];
}

// Keys every feature may carry besides the lock tag: `type` (multipolygon relations) and `area` (iD adds it to some closed ways).
const SYSTEM_KEYS = ['type', 'area'];
// [0-9], not \d: the Python twin's \d also matches non-ASCII digits.
const NUMBER = /^-?[0-9]+(\.[0-9]+)?$/;
const INTEGER = /^-?[0-9]+$/;

function allowedKeys(rules, feature) {
    const allowed = new Set([rules.lock_tag || 'ugr:locked', ...SYSTEM_KEYS, ...(rules.common_allowed || [])]);
    const presetID = ugrMatchPreset(rules, feature);
    if (presetID) {
        const preset = rules.presets[presetID];
        [
            ...Object.keys(preset.tags || {}),
            ...(preset.required || []),
            ...(preset.required_any || []).flat(),
            ...(preset.read_only || []),
            ...(preset.allowed || [])
        ].forEach(key => allowed.add(key));
    }
    return allowed;
}

// The keys a feature may not carry, sorted. Callers skip locked features before asking.
export function ugrDisallowedKeys(rules, feature) {
    const allowed = allowedKeys(rules, feature);
    return Object.keys(feature.tags || {}).filter(key => !allowed.has(key)).sort();
}

function outOfRange(range, value) {
    const text = typeof value === 'string' ? value.trim() : '';
    if (!(range.integer ? INTEGER : NUMBER).test(text)) return true;
    const number = Number(text);
    return number < range.min || number > range.max;
}

export function ugrEvaluate(rules, feature) {
    const tags = feature.tags || {};
    if (tags[rules.lock_tag || 'ugr:locked'] === 'yes') return [];

    const codes = new Set();
    const has = key => typeof tags[key] === 'string' && tags[key].trim() !== '';

    const presetID = ugrMatchPreset(rules, feature);
    if (presetID) {
        const preset = rules.presets[presetID];
        if ((preset.required || []).some(key => !has(key))) codes.add('ugr_missing_required');
        if ((preset.required_any || []).some(group => !group.some(has))) codes.add('ugr_missing_required');
    }

    for (const [key, list] of Object.entries(rules.code_fields || {})) {
        if (tags[key] === undefined) continue;
        if (!((rules.code_lists || {})[list] || []).includes(tags[key])) codes.add('ugr_value_not_in_list');
    }

    if (ugrDisallowedKeys(rules, feature).length) codes.add('ugr_tag_not_allowed');

    for (const [key, range] of Object.entries(rules.ranges || {})) {
        if (tags[key] !== undefined && outOfRange(range, tags[key])) codes.add('ugr_value_out_of_range');
    }

    if (rules.boundary && (feature.coordinates || []).some(point => !ugrPointInBoundary(rules.boundary, point))) {
        codes.add('ugr_outside_boundary');
    }

    return [...codes].sort();
}
