import { t } from '../../core/localizer';
import { uiLoading } from '../../ui/loading';
import { uiModal } from '../../ui/modal';
import { ugrLoadRules, ugrRulesRequired } from './store';

// Fail closed. While the rules configuration loads, a blocking overlay covers the editor; if loading fails,
// a blocking dialog (no close button, Escape or click-outside) offers only a retry. context.editable()
// stays false until the rules load, as a second gate. `onReady` runs once, only once rules are ready
// (immediately if they aren't required, after a successful load, or after a successful retry) so callers
// that also open a start-up modal never stack it on top of the loading overlay or the retry dialog.
export function ugrStartRules(context, onReady) {
    const ready = rules => {
        // An exception in onReady (e.g. the welcome dialog) is logged: it must not reject start-up or show the retry
        // dialog, because the rules did load.
        try {
            if (onReady) onReady(rules);
        } catch (e) {
            console.error(e);  // eslint-disable-line no-console
        }
        return rules;
    };
    if (!ugrRulesRequired()) return Promise.resolve(ready(null));

    const loading = uiLoading(context).message(t.append('ugr.rules.loading')).blocking(true);
    context.container().call(loading);

    return ugrLoadRules().then(
        rules => {
            loading.close();
            context.map().pan([0, 0]);          // redraw: vertices and handles now that editing is allowed
            context.validator().validate();
            return ready(rules);
        },
        () => {
            loading.close();
            showRetryDialog(context, onReady);
            return null;
        }
    );
}

function showRetryDialog(context, onReady) {
    const dialog = uiModal(context.container(), true);
    dialog.select('.modal')
        .classed('modal-alert', true)
        .classed('ugr-rules-failed', true);

    const content = dialog.select('.content');
    content.append('div')
        .attr('class', 'modal-section header')
        .append('h3')
        .call(t.append('ugr.rules.not_loaded'));

    content.append('div')
        .attr('class', 'modal-section buttons cf')
        .append('button')
        .attr('class', 'button ok-button action ugr-rules-retry')
        .call(t.append('ugr.rules.retry'))
        .on('click', () => {
            dialog.remove();
            ugrStartRules(context, onReady);
        })
        .node()
        .focus();
}
