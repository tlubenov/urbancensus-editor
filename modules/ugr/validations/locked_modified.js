import { actionRevert } from '../../actions/revert';
import { t } from '../../core/localizer';
import { validationIssue, validationIssueFix } from '../../core/validation';
import { ugrIsLocked } from '../locking/is_locked';

// Safety net: an entity that was locked in the base graph must be unchanged. It should never fire;
// if an unhooked iD edit path changes a locked feature, saving stays blocked and the server refuses anyway.
export function validationUgrLockedModified(context) {
    const type = 'ugr_locked_modified';

    const validation = function (entity) {
        const base = context.history().base();
        const original = base.hasEntity(entity.id);
        if (!original || original === entity || !ugrIsLocked(original, base)) return [];

        return [new validationIssue({
            type: type,
            severity: 'error',
            message: () => t.append('ugr.issues.ugr_locked_modified.message'),
            entityIds: [entity.id],
            dynamicFixes: () => [new validationIssueFix({
                icon: 'iD-icon-undo',
                title: t.append('ugr.issues.fix.revert.title'),
                onClick: function (context) {
                    context.perform(actionRevert(entity.id), t('ugr.issues.fix.revert.annotation'));
                }
            })]
        })];
    };

    validation.type = type;
    return validation;
}

// Safety net for deletions, which the validator never sees (it validates only entities still in the graph): the ids of
// entities that were locked in the base graph and are deleted in the edited graph. The commit panel blocks saving
// while there are any.
export function ugrLockedDeletions(context) {
    const history = context.history();
    const base = history.base();
    return history.difference().deleted()
        .filter(entity => ugrIsLocked(entity, base))
        .map(entity => entity.id);
}
