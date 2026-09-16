import { actionChangeTags } from '../../actions/change_tags';
import { t } from '../../core/localizer';
import { validationIssue, validationIssueFix } from '../../core/validation';
import { utilDisplayLabel } from '../../util/utilDisplayLabel';
import { ugrEvaluate, ugrMatchPreset } from '../rules/evaluate';
import { ugrFeatureFor } from '../rules/feature';
import { ugrRules } from '../rules/store';

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

function ugrRuleValidation(code) {
    // eslint-disable-next-line no-unused-vars -- intentional, to match the CreateValidator(context) signature
    return function (context) {
        const validation = function (entity, graph) {
            const rules = ugrRules();
            if (!rules) return [];
            const feature = ugrFeatureFor(entity, graph);
            if (!ugrEvaluate(rules, feature).includes(code)) return [];

            return [new validationIssue({
                type: code,
                severity: 'error',
                message: function (context) {
                    const current = context.hasEntity(this.entityIds[0]);
                    return current
                        ? t.append(`ugr.issues.${code}.message`, { feature: utilDisplayLabel(current, context.graph()) })
                        : '';
                },
                entityIds: [entity.id],
                dynamicFixes: () => unknownValueFixes(code, entity.id, rules, feature)
            })];
        };
        validation.type = code;
        return validation;
    };
}

export const validationUgrMissingRequired = ugrRuleValidation('ugr_missing_required');
export const validationUgrOutsideBoundary = ugrRuleValidation('ugr_outside_boundary');
export const validationUgrValueNotInList = ugrRuleValidation('ugr_value_not_in_list');
