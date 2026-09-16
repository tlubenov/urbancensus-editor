import { select as d3_select } from 'd3-selection';

describe('iD.ugr OSM Notes removal', function () {
    it('keeps the notes layer disabled even when asked to enable it', function () {
        var context = iD.coreContext().assetPath('../dist/').init();
        d3_select(document.createElement('div'))
            .attr('class', 'main-map')
            .call(context.map());
        var notes = context.layers().layer('notes');
        expect(notes.enabled()).toBe(false);
        notes.enabled(true);
        expect(notes.enabled()).toBe(false);
    });
});
