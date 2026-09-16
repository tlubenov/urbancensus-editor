import { t } from '../../core/localizer';
import { uiConfirm } from '../../ui/confirm';
import { ugrLoadRules, ugrRulesRequired } from './store';

// Loads the rules configuration at start-up. context.editable() stays false until it loads;
// on failure a blocking dialog offers a retry.
export function ugrStartRules(context) {
    if (!ugrRulesRequired()) return Promise.resolve(null);

    return ugrLoadRules()
        .then(rules => {
            context.map().pan([0, 0]);          // redraw: vertices and handles now that editing is allowed
            context.validator().validate();
            return rules;
        })
        .catch(() => {
            const dialog = uiConfirm(context.container());
            dialog.select('.modal-section.header')
                .append('h3')
                .call(t.append('ugr.rules.not_loaded'));
            dialog.select('.modal-section.buttons')
                .append('button')
                .attr('class', 'button ok-button action')
                .call(t.append('ugr.rules.retry'))
                .on('click', () => {
                    dialog.remove();
                    ugrStartRules(context);
                });
            return null;
        });
}
