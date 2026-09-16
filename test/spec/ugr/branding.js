import { select as d3_select } from 'd3-selection';

describe('iD.ugr branding', function () {
    var container;

    beforeEach(function () {
        iD.coreContext().assetPath('../dist/').init();   // loads the English strings
        container = d3_select(document.createElement('div'));
        iD.prefs('ugr-welcome-seen', null);
    });

    it('points issue reports and the version link at our repositories', function () {
        expect(iD.ugrIssuesUrl).toBe('https://github.com/tlubenov/urban-green-register/issues');
        expect(iD.ugrRepositoryUrl).toBe('https://github.com/tlubenov/urbancensus-editor');
    });

    it('shows the welcome dialog once per release', function () {
        container.call(iD.ugrWelcome());
        expect(container.selectAll('.ugr-welcome').size()).toBe(1);
        expect(iD.prefs('ugr-welcome-seen')).toBe(iD.ugrRelease);

        container.selectAll('.shaded').remove();
        container.call(iD.ugrWelcome());
        expect(container.selectAll('.ugr-welcome').size()).toBe(0);
    });

    it('closes the welcome dialog with its start button', function () {
        container.call(iD.ugrWelcome());
        container.select('.ugr-welcome-start').dispatch('click');
        expect(container.selectAll('.ugr-welcome').size()).toBe(0);
    });

    it('renders the About credits', function () {
        container.call(iD.ugrAboutCredits());
        expect(container.selectAll('.ugr-about-credits').size()).toBe(1);
    });
});
