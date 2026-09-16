import { ugrIsLocked } from '../locking/is_locked';

// OSM-community validations switched off in this editor (spec §3).
export const ugrDisabledValidations = [
    'help_request',
    'incompatible_source',
    'maprules',
    'mutually_exclusive_tags',
    'outdated_tags',
    'private_data',
    'suspicious_name'
];

export function ugrValidationDisabled(key) {
    return ugrDisabledValidations.includes(key);
}

// Our own rules block saving and can never be switched off by the user.
export function ugrIsOwnRule(key) {
    return key.startsWith('ugr_');
}

// A locked feature is checked only by our rules: iD's issue fixes (e.g. "Square this feature" on unsquare_way,
// "Merge points" on close_nodes) would change it, and cadastre data carries no iD warnings.
export function ugrRuleKeysFor(keys, entity, graph) {
    return ugrIsLocked(entity, graph) ? keys.filter(ugrIsOwnRule) : keys;
}
