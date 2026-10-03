import { select as d3_select } from 'd3-selection';

describe('iD.ugrImportDialog', function () {
    var context, container;
    var rules = {
        version: 1,
        boundary: { type: 'MultiPolygon', coordinates: [[[[23.20, 42.60], [23.45, 42.60], [23.45, 42.80], [23.20, 42.80], [23.20, 42.60]]]] },
        presets: { 'ugr/tree': { geometry: ['point', 'vertex'], tags: { natural: 'tree' } } }
    };
    var good = 'id,x,y,crs,accuracy\nT1,321559.1776,4731436.0703,bgs2005,0.5\nT2,23.33,42.70,wgs84,1\n';

    beforeEach(function () {
        container = d3_select(document.createElement('div'));
        context = iD.coreContext().assetPath('../dist/').init();
        context.container(container);
        container.append('div').attr('class', 'main-map').call(context.map());
        context.mode = function () { return { id: 'browse' }; };   // the map's undo handler reads the mode
        iD.ugrSetRules(rules);
    });

    afterEach(function () {
        iD.ugrSetRules(null);
        iD.ugrSetPendingImport(null);
    });

    function created() {
        return context.history().difference().created().filter(function (e) { return e.type === 'node'; });
    }

    it('reports every problem by line and column and adds nothing', function () {
        var dialog = iD.ugrImportDialog(context, { displayName: 'Tester' });
        dialog.loadFile('trees.csv', 60, 'id,x,y,crs,accuracy\nA,abc,42.70,wgs84,1\nB,23.33,,wgs84,1\n');
        var items = container.selectAll('.ugr-import-problems li').nodes().map(function (n) { return n.textContent; });
        expect(items).toEqual(['Line 2, x: is not a number', 'Line 3, y: is empty']);
        expect(container.select('.ugr-import-add').classed('hide')).toBe(true);
        expect(container.select('.ugr-import-choose').classed('hide')).toBe(false);
        expect(created()).toHaveLength(0);
    });

    it('reports a file-level problem without a line', function () {
        var dialog = iD.ugrImportDialog(context, {});
        dialog.loadFile('trees.csv', 10, 'id,lon\nA,1');
        var items = container.selectAll('.ugr-import-problems li').nodes().map(function (n) { return n.textContent; });
        expect(items).toEqual(['Column y is missing']);
    });

    it('previews a clean file and adds its points as one undoable step', function () {
        var dialog = iD.ugrImportDialog(context, { displayName: 'Tester' });
        dialog.loadFile('trees.csv', good.length, good);
        expect(container.select('.ugr-import-summary').text()).toBe('2 points – tree: 2 – BGS2005: 1, WGS84: 1');
        expect(container.select('.ugr-import-add').text()).toBe('Add 2 points to the map');

        container.select('.ugr-import-add').node().click();
        expect(created()).toHaveLength(2);
        expect(context.history().undoAnnotation()).toBe('Imported 2 points from trees.csv.');
        expect(iD.ugrPendingImport(context.graph()).byCrs).toEqual({ bgs2005: 1, wgs84: 1 });
        expect(iD.ugrImportChangesetTags(context.graph()).comment).toMatch(/^Import of 2 points from trees\.csv \(1 BGS2005, 1 WGS84\) by Tester, /);

        context.undo();
        expect(created()).toHaveLength(0);
    });

    it('pre-fills the coordinate system from the numbers', function () {
        var dialog = iD.ugrImportDialog(context, {});
        dialog.loadFile('a.csv', 40, 'id,x,y,accuracy\nA,321559.1776,4731436.0703,1\n');
        expect(container.select('.ugr-import-crs').property('value')).toBe('bgs2005');
        expect(container.selectAll('.ugr-import-problems li').size()).toBe(0);
    });

    it('uses the default accuracy typed into the form', function () {
        var dialog = iD.ugrImportDialog(context, {});
        dialog.loadFile('a.csv', 30, 'id,x,y\nA,23.33,42.70\n');
        expect(container.selectAll('.ugr-import-problems li').size()).toBe(1);   // accuracy missing

        var input = container.select('.ugr-import-accuracy');
        input.property('value', '2');
        input.dispatch('input');
        expect(container.selectAll('.ugr-import-problems li').size()).toBe(0);

        container.select('.ugr-import-add').node().click();
        expect(created()[0].tags['ugr:precision_m']).toBe('2');
    });

    it('skips points already on the map unless told otherwise', function () {
        context.perform(iD.actionAddEntity(new iD.osmNode({
            loc: [23.33, 42.70], tags: { natural: 'tree', 'ugr:source_id': 'T2', 'ugr:source_file': 'trees.csv' }
        })));
        var dialog = iD.ugrImportDialog(context, {});
        dialog.loadFile('trees.csv', good.length, good);
        expect(container.select('.ugr-import-add').text()).toBe('Add 1 point to the map');

        var skip = container.select('.ugr-import-skip-duplicates');
        skip.property('checked', false);
        skip.dispatch('change');
        expect(container.select('.ugr-import-add').text()).toBe('Add 2 points to the map');
    });

    it('clears the file input after a pick so the same file can be chosen again', function () {
        iD.ugrImportDialog(context, {});
        var input = container.select('.ugr-import-file').node();
        var assigned = [];
        Object.defineProperty(input, 'files', { value: [new File(['id,x,y\n'], 'a.csv')] });
        Object.defineProperty(input, 'value', { get: function () { return 'a.csv'; }, set: function (v) { assigned.push(v); } });
        input.dispatchEvent(new Event('change'));
        expect(assigned).toEqual(['']);
    });
});
