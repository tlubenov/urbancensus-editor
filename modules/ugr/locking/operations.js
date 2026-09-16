import { t } from '../../core/localizer';
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
