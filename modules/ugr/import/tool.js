import { t } from '../../core/localizer';
import { svgIcon } from '../../svg/icon';
import { uiTooltip } from '../../ui/tooltip';
import { ugrRulesReady } from '../rules/store';
import { ugrImportDialog } from './dialog';

// The toolbar button. Disabled until the rules load and while there are unsaved edits, so an import's changeset
// holds only the import.
export function ugrToolImport(context) {
    const tool = {
        id: 'ugr_import',
        label: t.append('ugr.import.button')
    };
    let button = null;
    let _opening = false;   // signing in or fetching the user: further clicks would open a second dialog

    function disabledReason() {
        if (!ugrRulesReady()) return 'ugr.import.disabled_rules';
        if (context.history().hasChanges()) return 'ugr.import.disabled_edits';
        return null;
    }

    function update() {
        if (button) button.classed('disabled', !!disabledReason());
    }

    // The changeset comment names the user, so sign in first when there is a connection.
    function open() {
        if (_opening) return;
        const osm = context.connection();
        const show = user => {
            _opening = false;
            ugrImportDialog(context, { displayName: user ? user.display_name : null });
        };
        if (!osm) return show(null);
        _opening = true;
        const withDetails = () => osm.userDetails((err, user) => show(err ? null : user));
        if (osm.authenticated()) {
            withDetails();
        } else {
            osm.authenticate(err => {
                if (err) _opening = false;
                else withDetails();
            });
        }
    }

    tool.render = function (selection) {
        const tooltip = uiTooltip()
            .placement('bottom')
            .title(() => t.append(disabledReason() || 'ugr.import.tooltip'))
            .scrollContainer(context.container().select('.top-toolbar'));

        button = selection.append('button')
            .attr('class', 'bar-button ugr-import-button')
            .on('click', d3_event => {
                d3_event.preventDefault();
                if (!disabledReason()) open();
            })
            .call(tooltip);
        button.call(svgIcon('#iD-icon-load'));

        update();
        context.history().on('change.ugrImport', update);
        context.validator().on('validated.ugrImport', update);
        context.on('enter.ugrImport', update);
    };

    tool.uninstall = function () {
        context.history().on('change.ugrImport', null);
        context.validator().on('validated.ugrImport', null);
        context.on('enter.ugrImport', null);
        button = null;
    };

    return tool;
}
