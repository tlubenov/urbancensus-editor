import { select as d3_select } from 'd3-selection';

describe('iD.ugrStartRules', function () {
    var context, container;
    var rules = { version: 1, municipality: 'SOF46', presets: {} };

    beforeEach(function () {
        container = d3_select(document.createElement('div'));
        context = iD.coreContext().assetPath('../dist/').init();
        context.container(container);
        container.append('div').attr('class', 'main-map').call(context.map());
        iD.ugrRulesRequired(true);
    });

    afterEach(function () {
        iD.ugrRulesRequired(false);
        iD.ugrSetRules(null);
        delete iD.fileFetcher.cache().ugr_rules;
        iD.fileFetcher.fileMap().ugr_rules = 'data/ugr_rules.min.json';
    });

    it('covers the editor with a blocking loading overlay until the rules load', async function () {
        iD.fileFetcher.cache().ugr_rules = rules;
        var started = iD.ugrStartRules(context);
        expect(container.selectAll('.loading-modal').size()).toBe(1);
        expect(container.selectAll('.modal button.close').size()).toBe(0);

        await started;
        expect(container.selectAll('.loading-modal').size()).toBe(0);
        expect(iD.ugrRules()).toBe(rules);
    });

    it('shows a blocking retry dialog when the rules fail to load, and retrying loads them', async function () {
        iD.fileFetcher.fileMap().ugr_rules = 'data/does_not_exist.min.json';
        await iD.ugrStartRules(context);

        expect(container.selectAll('.loading-modal').size()).toBe(0);
        expect(container.selectAll('.ugr-rules-failed').size()).toBe(1);
        expect(container.selectAll('.ugr-rules-failed button.close').size()).toBe(0);
        expect(container.selectAll('.ugr-rules-retry').size()).toBe(1);

        iD.fileFetcher.cache().ugr_rules = rules;
        container.select('.ugr-rules-retry').dispatch('click');
        await new Promise(function (resolve) { setTimeout(resolve, 0); });

        expect(container.selectAll('.ugr-rules-failed').size()).toBe(0);
        expect(iD.ugrRules()).toBe(rules);
    });

    it('does nothing when rules are not required', async function () {
        iD.ugrRulesRequired(false);
        await expect(iD.ugrStartRules(context)).resolves.toBe(null);
        expect(container.selectAll('.loading-modal').size()).toBe(0);
    });
});
