import { select as d3_select } from 'd3-selection';
import { uiTopToolbar } from '../../../modules/ui/top_toolbar';

describe('iD.ugrToolImport', function () {
    var context, container, div;

    beforeEach(function () {
        container = d3_select(document.createElement('div'));
        context = iD.coreContext().assetPath('../dist/').init();
        context.container(container);
        container.append('div').attr('class', 'main-map').call(context.map());
        div = container.append('div');
        iD.ugrSetRules({ version: 1, presets: {} });
    });

    afterEach(function () {
        iD.ugrRulesRequired(false);
        iD.ugrSetRules(null);
    });

    function button() {
        return div.select('.ugr-import-button');
    }

    function addNode() {
        context.perform(iD.actionAddEntity(new iD.osmNode({ loc: [23.32, 42.69] })), 'Added');
    }

    it('is enabled with rules loaded and no unsaved edits', function () {
        iD.ugrToolImport(context).render(div);
        expect(button().classed('disabled')).toBe(false);
    });

    it('is disabled while there are unsaved edits', function () {
        iD.ugrToolImport(context).render(div);
        addNode();
        expect(button().classed('disabled')).toBe(true);
        context.mode = function () { return { id: 'browse' }; };   // the map's undo handler reads the mode
        context.undo();
        expect(button().classed('disabled')).toBe(false);
    });

    it('is disabled until the rules load', function () {
        iD.ugrRulesRequired(true);
        iD.ugrSetRules(null);
        iD.ugrToolImport(context).render(div);
        expect(button().classed('disabled')).toBe(true);
        iD.ugrSetRules({ version: 1, presets: {} });
        context.enter(iD.modeBrowse(context));
        expect(button().classed('disabled')).toBe(false);
    });

    it('opens the import dialog when clicked', function () {
        iD.ugrToolImport(context).render(div);
        button().node().click();
        expect(container.selectAll('.ugr-import').size()).toBe(1);
    });

    it('does nothing when clicked while disabled', function () {
        iD.ugrToolImport(context).render(div);
        addNode();
        button().node().click();
        expect(container.selectAll('.ugr-import').size()).toBe(0);
    });

    it('sits in the top toolbar', function () {
        var bar = container.append('div').attr('class', 'top-toolbar');
        bar.call(uiTopToolbar(context));
        expect(bar.selectAll('.ugr-import-button').size()).toBe(1);
    });
});
