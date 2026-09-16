import { t } from '../core/localizer';
// ugr: our release and repository
import { ugrRelease } from '../ugr/release';
import { ugrRepositoryUrl } from '../ugr/branding';


export function uiVersion(context) {

    var currVersion = context.version;

    return function(selection) {
        selection
            .append('a')
            .attr('target', '_blank')
            // ugr: show our release and link to our repository; the tooltip names the iD version
            .attr('href', ugrRepositoryUrl)
            .attr('title', t('ugr.about.version', { version: currVersion }))
            .text(ugrRelease);

        // ugr: no "what's new" badge linking to iD releases
    };
}
