import { select as d3_select } from 'd3-selection';

describe('iD.ugr presentation of locked features', function () {
    it('pastes copies of locked features without ugr:* tags', function () {
        var graph = new iD.coreGraph([
            new iD.osmNode({ id: 'n1', loc: [0, 0] }),
            new iD.osmNode({ id: 'n2', loc: [0, 1] }),
            new iD.osmNode({ id: 'n3', loc: [1, 1] }),
            new iD.osmWay({ id: 'w1', nodes: ['n1', 'n2', 'n3', 'n1'], tags: { 'ugr:locked': 'yes', 'ugr:parcel': '68134.409.76', landuse: 'residential' } })
        ]);
        var action = iD.actionCopyEntities(['w1'], graph);
        var head = action(graph);
        var copy = head.entity(action.copies().w1.id);
        expect(copy.tags).toEqual({ landuse: 'residential' });
        expect(head.entity('w1').tags['ugr:locked']).toBe('yes');
    });

    it('keeps the ugr: attributes that the rules declare on pasted copies', function () {
        iD.ugrSetRules({ version: 1, presets: { 'ugr/grass': { geometry: ['area'], tags: { landuse: 'grass' }, allowed: ['ugr:maintenance_category'] } } });
        try {
            var graph = new iD.coreGraph([
                new iD.osmNode({ id: 'n1', loc: [0, 0] }),
                new iD.osmNode({ id: 'n2', loc: [0, 1] }),
                new iD.osmNode({ id: 'n3', loc: [1, 1] }),
                new iD.osmWay({ id: 'w1', nodes: ['n1', 'n2', 'n3', 'n1'], tags: { 'ugr:reference': 'R-1', 'ugr:maintenance_category': 'II', landuse: 'grass' } })
            ]);
            var action = iD.actionCopyEntities(['w1'], graph);
            var head = action(graph);
            expect(head.entity(action.copies().w1.id).tags).toEqual({ 'ugr:maintenance_category': 'II', landuse: 'grass' });
        } finally {
            iD.ugrSetRules(null);
        }
    });

    it('adds the tag-ugr-locked class', function () {
        var classes = iD.svgTagClasses().getClassesString({ 'ugr:locked': 'yes', landuse: 'residential' }, 'way area stroke');
        expect(classes.split(' ')).toContain('tag-ugr-locked');
    });

    describe('Cadastre feature filter', function () {
        var context, features;

        beforeEach(function () {
            context = iD.coreContext().assetPath('../dist/').init();
            d3_select(document.createElement('div'))
                .attr('class', 'main-map')
                .call(context.map());
            context.map().zoom(16);
            features = iD.rendererFeatures(context);
        });

        it('defines the ugr_locked feature key', function () {
            expect(features.keys()).toContain('ugr_locked');
        });

        it('matches locked features only to ugr_locked, so the toggle alone hides them', function () {
            var n1 = new iD.osmNode({ id: 'n1', loc: [0, 0] });
            var n2 = new iD.osmNode({ id: 'n2', loc: [0, 1] });
            var n3 = new iD.osmNode({ id: 'n3', loc: [1, 1] });
            var w1 = new iD.osmWay({ id: 'w1', nodes: ['n1', 'n2', 'n3', 'n1'], tags: { 'ugr:locked': 'yes', landuse: 'residential' } });
            var graph = new iD.coreGraph([n1, n2, n3, w1]);
            expect(features.getMatches(w1, graph, 'area')).toEqual({ ugr_locked: true });
        });
    });
});
