describe('iD.ugrActionImportPoints', function () {
    it('adds every point in one history step', function () {
        var context = iD.coreContext().assetPath('../dist/').init();
        var a = new iD.osmNode({ loc: [23.32, 42.69], tags: { natural: 'tree' } });
        var b = new iD.osmNode({ loc: [23.33, 42.70], tags: { natural: 'tree' } });
        context.perform(iD.ugrActionImportPoints([a, b]), 'Imported');
        expect(context.hasEntity(a.id)).toBeTruthy();
        expect(context.hasEntity(b.id)).toBeTruthy();

        context.undo();
        expect(context.hasEntity(a.id)).toBeUndefined();
        expect(context.hasEntity(b.id)).toBeUndefined();
        expect(context.history().hasChanges()).toBe(false);
    });

    it('adds 10 000 points quickly', function () {
        var nodes = [];
        for (var i = 0; i < 10000; i++) nodes.push(new iD.osmNode({ loc: [23.3 + i * 1e-6, 42.7], tags: { natural: 'tree' } }));
        var base = new iD.coreGraph();
        var start = Date.now();
        var graph = iD.ugrActionImportPoints(nodes)(base);
        expect(Date.now() - start).toBeLessThan(1000);
        expect(nodes.every(function (node) { return graph.hasEntity(node.id) === node; })).toBe(true);
        expect(graph.frozen).toBe(true);
        expect(base.hasEntity(nodes[0].id)).toBeUndefined();
    });
});

describe('iD.ugrFindDuplicates', function () {
    var context;

    beforeEach(function () {
        context = iD.coreContext().assetPath('../dist/').init();
        context.perform(iD.actionAddEntity(new iD.osmNode({
            loc: [23.32, 42.69], tags: { natural: 'tree', 'ugr:source_id': 'T1', 'ugr:source_file': 'trees.csv' }
        })));
    });

    it('finds loaded points with the same id from a file of the same name', function () {
        var points = [{ id: 'T1', loc: [23.32, 42.69] }, { id: 'T2', loc: [23.321, 42.691] }];
        expect(Array.from(iD.ugrFindDuplicates(context, 'trees.csv', points))).toEqual(['T1']);
    });

    it('ignores the same id from another file', function () {
        expect(iD.ugrFindDuplicates(context, 'other.csv', [{ id: 'T1', loc: [23.32, 42.69] }]).size).toBe(0);
    });

    it('finds nothing for no points', function () {
        expect(iD.ugrFindDuplicates(context, 'trees.csv', []).size).toBe(0);
    });
});

describe('iD.ugrImportChangesetTags', function () {
    var context, a, b;

    beforeEach(function () {
        context = iD.coreContext().assetPath('../dist/').init();
        a = new iD.osmNode({ loc: [23.32, 42.69], tags: { natural: 'tree', 'ugr:source_file': 'trees.csv' } });
        b = new iD.osmNode({ loc: [23.33, 42.70], tags: { natural: 'tree', 'ugr:source_file': 'trees.csv' } });
        context.perform(iD.ugrActionImportPoints([a, b]), 'Imported');
    });

    afterEach(function () {
        iD.ugrSetPendingImport(null);
    });

    function pending(displayName) {
        iD.ugrSetPendingImport({
            file: 'trees.csv', count: 2, byCrs: { wgs84: 1, bgs2005: 1 }, time: new Date(2026, 9, 3, 14, 5),
            displayName: displayName, nodeIds: [a.id, b.id]
        });
    }

    it('is empty without a pending import', function () {
        expect(iD.ugrImportChangesetTags(context.graph())).toEqual({});
    });

    it('describes the pending import', function () {
        pending('Tester');
        expect(iD.ugrImportChangesetTags(context.graph())).toEqual({
            comment: 'Import of 2 points from trees.csv (1 BGS2005, 1 WGS84) by Tester, 2026-10-03 14:05',
            source: 'import',
            'ugr:import_file': 'trees.csv',
            'ugr:import_count': '2',
            'ugr:import_crs': 'bgs2005:1;wgs84:1'
        });
    });

    it('leaves the user out when unknown, and a system with no points out of the counts', function () {
        iD.ugrSetPendingImport({
            file: 'trees.csv', count: 2, byCrs: { wgs84: 2 }, time: new Date(2026, 9, 3, 9, 0), displayName: null, nodeIds: [a.id, b.id]
        });
        var tags = iD.ugrImportChangesetTags(context.graph());
        expect(tags.comment).toBe('Import of 2 points from trees.csv (2 WGS84), 2026-10-03 09:00');
        expect(tags['ugr:import_crs']).toBe('wgs84:2');
    });

    it('lapses when the import is undone and returns when it is redone', function () {
        pending('Tester');
        context.undo();
        expect(iD.ugrPendingImport(context.graph())).toBe(null);
        expect(iD.ugrImportChangesetTags(context.graph())).toEqual({});
        context.redo();
        expect(iD.ugrPendingImport(context.graph()).count).toBe(2);
    });

    it('ignores a record whose node ids now belong to points from another file', function () {
        pending('Tester');
        var other = context.graph().replace(a.mergeTags({ 'ugr:source_file': 'other.csv' })).replace(b.mergeTags({ 'ugr:source_file': 'other.csv' }));
        expect(iD.ugrPendingImport(other)).toBe(null);
    });
});

describe('iD.ugrDropStaleImportChangeset', function () {
    var context, a;
    var importTags = { comment: 'Import of 1 point from trees.csv (1 WGS84), 2026-10-03 09:00', source: 'import', 'ugr:import_file': 'trees.csv' };

    beforeEach(function () {
        context = iD.coreContext().assetPath('../dist/').init();
        context.mode = function () { return { id: 'browse' }; };
        a = new iD.osmNode({ loc: [23.32, 42.69], tags: { natural: 'tree', 'ugr:source_file': 'trees.csv' } });
        context.perform(iD.ugrActionImportPoints([a]), 'Imported');
        iD.ugrSetPendingImport({ file: 'trees.csv', count: 1, byCrs: { wgs84: 1 }, time: new Date(), displayName: null, nodeIds: [a.id] });
        context.changeset = new iD.osmChangeset({ tags: Object.assign({}, importTags) });
    });

    afterEach(function () {
        iD.ugrSetPendingImport(null);
        iD.prefs('comment', null);
    });

    it('drops a changeset left from an undone import and the remembered comment it matches', function () {
        iD.prefs('comment', importTags.comment);
        context.undo();
        iD.ugrDropStaleImportChangeset(context);
        expect(context.changeset).toBe(null);
        expect(iD.prefs('comment')).toBe(null);
    });

    it('keeps the changeset while the import is pending', function () {
        iD.prefs('comment', importTags.comment);
        var changeset = context.changeset;
        iD.ugrDropStaleImportChangeset(context);
        expect(context.changeset).toBe(changeset);
        expect(iD.prefs('comment')).toBe(importTags.comment);
    });

    it('leaves a changeset that is not an import\'s alone', function () {
        var changeset = new iD.osmChangeset({ tags: { comment: 'Planted trees' } });
        context.changeset = changeset;
        iD.prefs('comment', 'Planted trees');
        context.undo();
        iD.ugrDropStaleImportChangeset(context);
        expect(context.changeset).toBe(changeset);
        expect(iD.prefs('comment')).toBe('Planted trees');
    });

    it('leaves a remembered comment that differs alone', function () {
        iD.prefs('comment', 'Something else');
        context.undo();
        iD.ugrDropStaleImportChangeset(context);
        expect(context.changeset).toBe(null);
        expect(iD.prefs('comment')).toBe('Something else');
    });
});
