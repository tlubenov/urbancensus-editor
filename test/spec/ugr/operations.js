describe('iD.ugrGuardOperation', function () {
    var graph, fakeContext;

    function stubOperation(id) {
        var operation = function () {};
        operation.id = id;
        operation.disabled = function () { return false; };
        operation.tooltip = function () { return 'original tooltip'; };
        return operation;
    }

    beforeEach(function () {
        graph = new iD.coreGraph([
            new iD.osmNode({ id: 'n1', loc: [0, 0] }),
            new iD.osmNode({ id: 'n2', loc: [0, 1] }),
            new iD.osmNode({ id: 'n3', loc: [1, 1] }),
            new iD.osmNode({ id: 'n4', loc: [2, 2] }),
            new iD.osmNode({ id: 'n5', loc: [3, 3] }),
            new iD.osmWay({ id: 'w1', nodes: ['n1', 'n2', 'n3'], tags: { 'ugr:locked': 'yes' } }),
            new iD.osmWay({ id: 'w2', nodes: ['n3', 'n4', 'n5'], tags: { barrier: 'hedge' } })
        ]);
        fakeContext = {
            graph: function () { return graph; },
            entity: function (id) { return graph.entity(id); },
            hasHiddenConnections: function () { return false; }
        };
    });

    ['circularize', 'continue', 'delete', 'disconnect', 'downgrade', 'extract', 'merge', 'move',
        'orthogonalize', 'reflect-long', 'reflect-short', 'reverse', 'rotate', 'split', 'straighten']
        .forEach(function (id) {
            it('disables ' + id + ' when the selection contains a locked feature', function () {
                var operation = iD.ugrGuardOperation(stubOperation(id), fakeContext, ['w1']);
                expect(operation.disabled()).toBe('ugr_locked');
                expect(operation.tooltip()).not.toBe('original tooltip');
            });
        });

    it('disables operations when a selected node belongs to a locked way', function () {
        var operation = iD.ugrGuardOperation(stubOperation('move'), fakeContext, ['n3']);
        expect(operation.disabled()).toBe('ugr_locked');
    });

    it('leaves operations on free features unchanged', function () {
        var operation = iD.ugrGuardOperation(stubOperation('move'), fakeContext, ['w2']);
        expect(operation.disabled()).toBe(false);
        expect(operation.tooltip()).toBe('original tooltip');
    });

    it('never guards copy, so a parcel can be copied into a new feature', function () {
        var operation = iD.ugrGuardOperation(stubOperation('copy'), fakeContext, ['w1']);
        expect(operation.disabled()).toBe(false);
    });

    it('guards a real iD operation', function () {
        var operation = iD.ugrGuardOperation(iD.operationStraighten(fakeContext, ['w1']), fakeContext, ['w1']);
        expect(operation.disabled()).toBe('ugr_locked');
    });

    it('re-checks the lock on every call, so an undo that unlocks re-enables the operation', function () {
        var operation = iD.ugrGuardOperation(stubOperation('move'), fakeContext, ['w1']);
        expect(operation.disabled()).toBe('ugr_locked');
        graph = graph.replace(graph.entity('w1').update({ tags: {} }));
        expect(operation.disabled()).toBe(false);
    });
});
