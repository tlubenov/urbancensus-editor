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
