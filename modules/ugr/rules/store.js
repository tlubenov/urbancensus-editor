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

export function ugrLoadRules() {
    return fileFetcher.get('ugr_rules').then(rules => {
        _rules = rules;
        return rules;
    });
}
