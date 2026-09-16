describe('iD.ugr editing guards', function () {
    var graph;

    beforeEach(function () {
        // w1: locked parcel n1-n2-n3-n1; w2: free hedge n9-n8 whose end n9 is being dragged onto parcel corner n1
        graph = new iD.coreGraph([
            new iD.osmNode({ id: 'n1', loc: [0, 0] }),
            new iD.osmNode({ id: 'n2', loc: [0, 1] }),
            new iD.osmNode({ id: 'n3', loc: [1, 1] }),
            new iD.osmNode({ id: 'n8', loc: [5, 5] }),
            new iD.osmNode({ id: 'n9', loc: [0.0001, 0] }),
            new iD.osmNode({ id: 'n10', loc: [6, 6], tags: { natural: 'tree' } }),
            new iD.osmWay({ id: 'w1', nodes: ['n1', 'n2', 'n3', 'n1'], tags: { 'ugr:locked': 'yes', landuse: 'residential' } }),
            new iD.osmWay({ id: 'w2', nodes: ['n9', 'n8'], tags: { barrier: 'hedge' } })
        ]);
    });

    describe('ugrDragBlocked', function () {
        it('blocks dragging a node of a locked way', function () {
            expect(iD.ugrDragBlocked(graph.entity('n1'), graph)).toBe(true);
        });
        it('allows dragging a free node', function () {
            expect(iD.ugrDragBlocked(graph.entity('n9'), graph)).toBe(false);
        });
        it('blocks dragging a midpoint of a locked way', function () {
            expect(iD.ugrDragBlocked({ type: 'midpoint', parents: [graph.entity('w1')] }, graph)).toBe(true);
        });
        it('allows dragging a midpoint of a free way', function () {
            expect(iD.ugrDragBlocked({ type: 'midpoint', parents: [graph.entity('w2')] }, graph)).toBe(false);
        });
    });

    describe('ugrDrawTarget', function () {
        it('ignores a locked way, so the click places a free node instead of adding a vertex to it', function () {
            expect(iD.ugrDrawTarget(graph.entity('w1'), 'draw-line', graph)).toBe(null);
        });
        it('keeps a locked node while drawing a line, which only references the node', function () {
            expect(iD.ugrDrawTarget(graph.entity('n1'), 'draw-line', graph)).toBe(graph.entity('n1'));
        });
        it('ignores a locked node when adding a point, which would add tags to it', function () {
            expect(iD.ugrDrawTarget(graph.entity('n1'), 'add-point', graph)).toBe(null);
        });
        it('keeps free targets', function () {
            expect(iD.ugrDrawTarget(graph.entity('w2'), 'draw-line', graph)).toBe(graph.entity('w2'));
            expect(iD.ugrDrawTarget(undefined, 'draw-line', graph)).toBe(undefined);
        });
    });

    describe('ugrSnapNodes', function () {
        it('returns no snap nodes for a locked way segment', function () {
            var datum = { properties: { entity: graph.entity('w1'), nodes: [graph.entity('n1'), graph.entity('n2')] } };
            expect(iD.ugrSnapNodes(datum, graph)).toBe(undefined);
        });
        it('returns the snap nodes for a free way segment', function () {
            var nodes = [graph.entity('n9'), graph.entity('n8')];
            expect(iD.ugrSnapNodes({ properties: { entity: graph.entity('w2'), nodes: nodes } }, graph)).toBe(nodes);
        });
        it('returns undefined when there is no line target', function () {
            expect(iD.ugrSnapNodes({}, graph)).toBe(undefined);
            expect(iD.ugrSnapNodes(undefined, graph)).toBe(undefined);
        });
    });

    describe('ugrCanAttachToLocked', function () {
        it('allows an untagged node', function () {
            expect(iD.ugrCanAttachToLocked(graph.entity('n9'))).toBe(true);
        });
        it('refuses a tagged node, whose tags would merge into the locked node', function () {
            expect(iD.ugrCanAttachToLocked(graph.entity('n10'))).toBe(false);
        });
    });

    describe('ugrActionAttachToLocked', function () {
        it('replaces the dragged node with the locked node and leaves the locked features unchanged', function () {
            var parcel = graph.entity('w1');
            var corner = graph.entity('n1');
            var result = iD.ugrActionAttachToLocked('n1', 'n9')(graph);

            expect(result.entity('w2').nodes).toEqual(['n1', 'n8']);
            expect(result.hasEntity('n9')).toBe(undefined);
            expect(result.entity('w1')).toBe(parcel);
            expect(result.entity('n1')).toBe(corner);
        });
    });
});
