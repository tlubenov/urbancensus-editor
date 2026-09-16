describe('iD.ugrIsLocked', function () {
    var graph;

    beforeEach(function () {
        // w1: locked parcel n1-n2-n3-n1; w2: free hedge n3-n4 (shares n3 with the parcel); r1 contains w1
        graph = new iD.coreGraph([
            new iD.osmNode({ id: 'n1', loc: [0, 0] }),
            new iD.osmNode({ id: 'n2', loc: [0, 1] }),
            new iD.osmNode({ id: 'n3', loc: [1, 1] }),
            new iD.osmNode({ id: 'n4', loc: [2, 2] }),
            new iD.osmNode({ id: 'n5', loc: [3, 3], tags: { 'ugr:locked': 'yes' } }),
            new iD.osmWay({ id: 'w1', nodes: ['n1', 'n2', 'n3', 'n1'], tags: { 'ugr:locked': 'yes', landuse: 'residential' } }),
            new iD.osmWay({ id: 'w2', nodes: ['n3', 'n4'], tags: { barrier: 'hedge' } }),
            new iD.osmRelation({ id: 'r1', members: [{ id: 'w1', type: 'way', role: 'outer' }], tags: { type: 'multipolygon' } })
        ]);
    });

    it('locks a way tagged ugr:locked=yes', function () {
        expect(iD.ugrIsLocked(graph.entity('w1'), graph)).toBe(true);
    });

    it('locks a node tagged ugr:locked=yes', function () {
        expect(iD.ugrIsLocked(graph.entity('n5'), graph)).toBe(true);
    });

    it('locks every node of a locked way, including nodes shared with free ways', function () {
        expect(iD.ugrIsLocked(graph.entity('n1'), graph)).toBe(true);
        expect(iD.ugrIsLocked(graph.entity('n3'), graph)).toBe(true);
    });

    it('does not lock free ways, their own nodes, or relations containing locked members', function () {
        expect(iD.ugrIsLocked(graph.entity('w2'), graph)).toBe(false);
        expect(iD.ugrIsLocked(graph.entity('n4'), graph)).toBe(false);
        expect(iD.ugrIsLocked(graph.entity('r1'), graph)).toBe(false);
    });

    it('only treats the exact value yes as locked', function () {
        var way = new iD.osmWay({ id: 'w9', tags: { 'ugr:locked': 'no' } });
        expect(iD.ugrHasLockTag(way)).toBe(false);
        expect(iD.ugrIsLocked(undefined, graph)).toBe(false);
    });

    it('reports whether any id in a selection is locked, ignoring missing ids', function () {
        expect(iD.ugrAnyLocked(['n4', 'w2'], graph)).toBe(false);
        expect(iD.ugrAnyLocked(['n4', 'n3'], graph)).toBe(true);
        expect(iD.ugrAnyLocked(['n404'], graph)).toBe(false);
    });

    it('strips ugr:* tags and keeps the rest', function () {
        expect(iD.ugrStripTags({ 'ugr:locked': 'yes', 'ugr:parcel': '1', landuse: 'grass' })).toEqual({ landuse: 'grass' });
    });

    it('names the lock key', function () {
        expect(iD.ugrLockKey).toBe('ugr:locked');
    });
});
