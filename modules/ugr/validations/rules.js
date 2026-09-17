import { actionChangeTags } from '../../actions/change_tags';
import { t } from '../../core/localizer';
import { validationIssue, validationIssueFix } from '../../core/validation';
import { utilDisplayLabel } from '../../util/utilDisplayLabel';
import { ugrDisallowedKeys, ugrEvaluate, ugrMatchPreset } from '../rules/evaluate';
import { ugrFeatureFor } from '../rules/feature';
import { ugrRules } from '../rules/store';
import { ugrIsLocked } from '../locking/is_locked';

export const ugrUnknownValue = 'unknown';

// For each unmet required_any group, offer "<key>: unknown" for the first key whose code list allows it.
function unknownValueFixes(code, entityID, rules, feature) {
    if (code !== 'ugr_missing_required') return [];
    const presetID = ugrMatchPreset(rules, feature);
    const groups = presetID ? (rules.presets[presetID].required_any || []) : [];
    const lists = rules.code_lists || {};
    const fields = rules.code_fields || {};
    const keys = groups
        .filter(group => !group.some(key => feature.tags[key]))
        .map(group => group.find(key => (lists[fields[key]] || []).includes(ugrUnknownValue)))
        .filter(Boolean);

    return keys.map(key => new validationIssueFix({
        icon: 'iD-icon-plus',
        title: t.append(`ugr.issues.fix.set_unknown.${key}`, { default: `${key}: ${ugrUnknownValue}` }),
        onClick: function (context) {
            const current = context.hasEntity(entityID);
            if (!current) return;
            context.perform(
                actionChangeTags(entityID, Object.assign({}, current.tags, { [key]: ugrUnknownValue })),
                t('ugr.issues.fix.set_unknown.annotation')
            );
        }
    }));
}

// One undoable step that removes exactly the keys the feature's type doesn't allow.
function removeNotAllowedFixes(code, entityID, rules) {
    if (code !== 'ugr_tag_not_allowed') return [];
    return [new validationIssueFix({
        icon: 'iD-operation-delete',
        title: t.append('ugr.issues.fix.remove_not_allowed.title'),
        onClick: function (context) {
            const current = context.hasEntity(entityID);
            if (!current) return;
            const keys = ugrDisallowedKeys(rules, ugrFeatureFor(current, context.graph()));
            if (!keys.length) return;
            const tags = Object.assign({}, current.tags);
            keys.forEach(key => { delete tags[key]; });
            context.perform(actionChangeTags(entityID, tags), t('ugr.issues.fix.remove_not_allowed.annotation'));
        }
    })];
}

function ugrRuleValidation(code) {
    // eslint-disable-next-line no-unused-vars -- intentional, to match the CreateValidator(context) signature
    return function (context) {
        const validation = function (entity, graph) {
            const rules = ugrRules();
            // Cadastre data (locked features, including the untagged vertices of locked ways) never carries rule issues.
            if (!rules || ugrIsLocked(entity, graph)) return [];
            const feature = ugrFeatureFor(entity, graph);
            if (!ugrEvaluate(rules, feature).includes(code)) return [];

            return [new validationIssue({
                type: code,
                severity: 'error',
                message: function (context) {
                    const current = context.hasEntity(this.entityIds[0]);
                    if (!current) return '';
                    const graph = context.graph();
                    return t.append(`ugr.issues.${code}.message`, {
                        feature: utilDisplayLabel(current, graph),
                        keys: ugrDisallowedKeys(rules, ugrFeatureFor(current, graph)).join(', ')
                    });
                },
                entityIds: [entity.id],
                dynamicFixes: () => unknownValueFixes(code, entity.id, rules, feature)
                    .concat(removeNotAllowedFixes(code, entity.id, rules))
            })];
        };
        validation.type = code;
        return validation;
    };
}

export const validationUgrMissingRequired = ugrRuleValidation('ugr_missing_required');
export const validationUgrOutsideBoundary = ugrRuleValidation('ugr_outside_boundary');
export const validationUgrValueNotInList = ugrRuleValidation('ugr_value_not_in_list');
export const validationUgrTagNotAllowed = ugrRuleValidation('ugr_tag_not_allowed');
export const validationUgrValueOutOfRange = ugrRuleValidation('ugr_value_out_of_range');
