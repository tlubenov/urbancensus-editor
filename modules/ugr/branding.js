import { prefs } from '../core/preferences';
import { t } from '../core/localizer';
import { uiModal } from '../ui/modal';
import { ugrRelease } from './release';

export const ugrIssuesUrl = 'https://github.com/tlubenov/urban-green-register/issues';
export const ugrRepositoryUrl = 'https://github.com/tlubenov/urbancensus-editor';

// Replaces iD's splash: product name, one sentence, a start button. Shown once per release.
export function ugrWelcome(context) {
    return function (selection) {
        // Like iD's splash: one modal at a time, and the restore prompt for unsaved edits takes precedence.
        if (context.history().hasRestorableChanges()) return;

        if (prefs('ugr-welcome-seen') === ugrRelease) return;
        prefs('ugr-welcome-seen', ugrRelease);

        // blocking: true - no close button, click-outside or Escape; only the start button dismisses it
        const modal = uiModal(selection, true);
        modal.select('.modal').classed('modal-splash', true).classed('ugr-welcome', true);

        const content = modal.select('.content');
        const intro = content.append('div').attr('class', 'modal-section');
        intro.append('h3').call(t.append('ugr.welcome.title'));
        intro.append('p').call(t.append('ugr.welcome.text'));

        content.append('div')
            .attr('class', 'modal-actions')
            .append('button')
            .attr('class', 'ugr-welcome-start')
            .call(t.append('ugr.welcome.start'))
            .on('click', () => modal.remove());
    };
}

// Footer credits: based on iD (ISC) and the data sources.
export function ugrAboutCredits() {
    return function (selection) {
        selection.append('span')
            .attr('class', 'ugr-about-credits')
            .call(t.append('ugr.about.credits'));
    };
}
