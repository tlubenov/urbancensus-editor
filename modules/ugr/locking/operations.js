import { t } from '../../core/localizer';
import { ugrIsOwnRule } from '../validations/disabled';
import { ugrAnyLocked } from './is_locked';

// Copying a locked feature creates a new, editable feature, so copy stays available.
const unguarded = new Set(['copy']);

export function ugrGuardOperation(operation, context, selectedIDs) {
    if (unguarded.has(operation.id)) return operation;

    const disabled = operation.disabled;
    const tooltip = operation.tooltip;
    const locked = () => ugrAnyLocked(selectedIDs, context.graph());

    operation.disabled = function () {
        return locked() ? 'ugr_locked' : disabled.apply(operation, arguments);
    };
    operation.tooltip = function () {
        return locked() ? t.append('ugr.locked.tooltip') : tooltip.apply(operation, arguments);
    };
    return operation;
}

// iD's issue fixes can change any feature an issue names, e.g. "Merge points" on a free hedge's close_nodes issue moves
// the locked parcel corner next to it. Fixes of an iD issue that names a locked feature are shown disabled with the
// lock tooltip; ignoring the issue (added by validationIssue.fixes afterwards) and our own rules' fixes stay available.
export function ugrDisableLockedFixes(issue, fixes, context) {
    if (ugrIsOwnRule(issue.type) || !ugrAnyLocked(issue.entityIds || [], context.graph())) return fixes;
    fixes.forEach(fix => {
        if (!fix.onClick) return;
        fix.onClick = undefined;
        fix.disabledReason = t('ugr.locked.tooltip');
    });
    return fixes;
}
