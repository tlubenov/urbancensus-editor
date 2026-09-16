import { fileFetcher } from '../../core/file_fetcher';

let _rules = null;
// Production fails closed: no editing until rules load. The test runner (window.VITEST) opts out by default.
let _required = !(typeof window !== 'undefined' && window.VITEST);

export function ugrRules() {
    return _rules;
}

export function ugrSetRules(rules) {
    _rules = rules;
}

export function ugrRulesRequired(val) {
    if (!arguments.length) return _required;
    _required = !!val;
}

export function ugrRulesReady() {
    return !_required || _rules !== null;
}

function isObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// The shape the editor relies on. A file that isn't a rules configuration (e.g. an error page's JSON) must not
// count as loaded, or editing would start without rules.
function isRulesShape(rules) {
    return isObject(rules) &&
        typeof rules.version === 'number' &&
        isObject(rules.presets) &&
        (!('boundary' in rules) || (isObject(rules.boundary) && ['Polygon', 'MultiPolygon'].includes(rules.boundary.type)));
}

export function ugrLoadRules() {
    return fileFetcher.get('ugr_rules').then(rules => {
        if (!isRulesShape(rules)) throw new Error('ugr_rules: not a rules configuration');
        _rules = rules;
        return rules;
    });
}
