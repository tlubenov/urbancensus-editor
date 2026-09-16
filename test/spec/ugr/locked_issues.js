describe('iD.ugr issues on locked features', function () {
    var context;
    var rules = {
        version: 1,
        boundary: { type: 'Polygon', coordinates: [[[23.20, 42.60], [23.45, 42.60], [23.45, 42.80], [23.20, 42.80], [23.20, 42.60]]] },
        presets: {}
    };

    beforeEach(function () {
        context = iD.coreContext().assetPath('../dist/').init();
    });

    afterEach(function () {
        iD.ugrSetRules(null);
        delete iD.services.osm;
        iD.prefs('validate-square-degrees', null);
    });

    function lockTags(tags, locked) {
        return locked ? Object.assign({ 'ugr:locked': 'yes' }, tags) : tags;
    }

    async function issuesOfType(type) {
        var validator = new iD.coreValidator(context);
        validator.init();
        await validator.validate();
        return validator.getIssues({ what: 'all', where: 'all' }).filter(function (issue) { return issue.type === type; });
    }

    // A closed way whose first two vertices are 0.11 m apart.
    function addWayWithCloseVertices(locked) {
        context.perform(
            iD.actionAddEntity(new iD.osmNode({ id: 'n-1', loc: [0, 0] })),
            iD.actionAddEntity(new iD.osmNode({ id: 'n-2', loc: [0.000001, 0] })),
            iD.actionAddEntity(new iD.osmNode({ id: 'n-3', loc: [0.0001, 0] })),
            iD.actionAddEntity(new iD.osmNode({ id: 'n-4', loc: [0.0001, 0.0001] })),
            iD.actionAddEntity(new iD.osmNode({ id: 'n-5', loc: [0, 0.0001] })),
            iD.actionAddEntity(new iD.osmWay({ id: 'w-1', nodes: ['n-1', 'n-2', 'n-3', 'n-4', 'n-5', 'n-1'], tags: lockTags({ landuse: 'residential' }, locked) }))
        );
    }

    // A building whose corners are about 4 degrees off square.
    function addAlmostSquareBuilding(locked) {
        iD.services.osm = { isDataLoaded: function () { return true; } };   // unsquare_way only checks loaded data
        iD.prefs('validate-square-degrees', '5');   // the issues pane's default; unset, the threshold would be 0
        context.perform(
            iD.actionAddEntity(new iD.osmNode({ id: 'n-1', loc: [0, 0] })),
            iD.actionAddEntity(new iD.osmNode({ id: 'n-2', loc: [0, 0.0001] })),
            iD.actionAddEntity(new iD.osmNode({ id: 'n-3', loc: [0.0001, 0.000107] })),
            iD.actionAddEntity(new iD.osmNode({ id: 'n-4', loc: [0.0001, 0] })),
            iD.actionAddEntity(new iD.osmWay({ id: 'w-1', nodes: ['n-1', 'n-2', 'n-3', 'n-4', 'n-1'], tags: lockTags({ building: 'yes', area: 'yes' }, locked) }))
        );
    }

    describe('the validator runs only our rules on a locked feature', function () {
        it('reports no close_nodes issue ("Merge points") on a locked way', async function () {
            addWayWithCloseVertices(true);
            expect(await issuesOfType('close_nodes')).toHaveLength(0);
        });

        it('still reports close_nodes on an editable way', async function () {
            addWayWithCloseVertices(false);
            expect(await issuesOfType('close_nodes')).not.toHaveLength(0);
        });

        it('reports no unsquare_way issue ("Square this feature") on a locked building', async function () {
            addAlmostSquareBuilding(true);
            expect(await issuesOfType('unsquare_way')).toHaveLength(0);
        });

        it('still reports unsquare_way on an editable building', async function () {
            addAlmostSquareBuilding(false);
            expect(await issuesOfType('unsquare_way')).toHaveLength(1);
        });
    });

    describe('our rule validations', function () {
        it('report nothing for a locked way or its untagged vertices outside the boundary', function () {
            iD.ugrSetRules(rules);
            addWayWithCloseVertices(true);   // at 0,0: far outside the boundary
            var validation = iD.validationUgrOutsideBoundary(context);
            var graph = context.graph();
            expect(validation(graph.entity('w-1'), graph)).toHaveLength(0);
            expect(validation(graph.entity('n-1'), graph)).toHaveLength(0);
        });

        it('still report an editable way and its vertices outside the boundary', function () {
            iD.ugrSetRules(rules);
            addWayWithCloseVertices(false);
            var validation = iD.validationUgrOutsideBoundary(context);
            var graph = context.graph();
            expect(validation(graph.entity('w-1'), graph)).toHaveLength(1);
            expect(validation(graph.entity('n-1'), graph)).toHaveLength(1);
        });
    });

    describe('fixes of iD issues that name a locked feature', function () {
        // A free hedge whose first vertex n-6 is 0.11 m from the corner n1 of a parcel; the hedge's close_nodes issue
        // names [w-2, n1, n-6] and its "Merge points" fix would move n1 to the middle.
        function addHedgeNextToParcelCorner(locked) {
            context.history().merge([
                new iD.osmNode({ id: 'n1', loc: [0, 0], version: '1' }),
                new iD.osmNode({ id: 'n2', loc: [0, 0.0001], version: '1' }),
                new iD.osmNode({ id: 'n3', loc: [0.0001, 0.0001], version: '1' }),
                new iD.osmWay({ id: 'w1', nodes: ['n1', 'n2', 'n3', 'n1'], version: '1', tags: lockTags({ landuse: 'residential' }, locked) })
            ]);
            context.perform(
                iD.actionAddEntity(new iD.osmNode({ id: 'n-6', loc: [0.000001, 0] })),
                iD.actionAddEntity(new iD.osmNode({ id: 'n-7', loc: [-0.0001, -0.0001] })),
                iD.actionAddEntity(new iD.osmWay({ id: 'w-2', nodes: ['n1', 'n-6', 'n-7'], tags: { barrier: 'hedge' } }))
            );
            var graph = context.graph();
            return iD.validationCloseNodes(context)(graph.entity('w-2'), graph);
        }

        function fixSummary(issue) {
            return issue.fixes(context).map(function (fix) {
                return [fix.title.stringId, !!fix.onClick, fix.disabledReason || null];
            });
        }

        it('are disabled, with the lock explained; ignoring the issue stays possible', function () {
            var issues = addHedgeNextToParcelCorner(true);
            expect(issues).toHaveLength(1);
            expect(issues[0].entityIds).toContain('n1');
            expect(fixSummary(issues[0])).toEqual([
                ['issues.fix.merge_points.title', false, 'Cadastre feature – read-only'],
                ['issues.fix.move_points_apart.title', false, null],
                ['issues.fix.ignore_issue.title', true, null]
            ]);
        });

        it('stay available when no named feature is locked', function () {
            var issues = addHedgeNextToParcelCorner(false);
            expect(fixSummary(issues[0])).toEqual([
                ['issues.fix.merge_points.title', true, null],
                ['issues.fix.move_points_apart.title', false, null],
                ['issues.fix.ignore_issue.title', true, null]
            ]);
        });

        it('stay available for our own rules, e.g. restoring a changed locked feature', function () {
            context.history().merge([
                new iD.osmNode({ id: 'n1', loc: [0, 0], version: '1' }),
                new iD.osmNode({ id: 'n2', loc: [0, 0.0001], version: '1' }),
                new iD.osmWay({ id: 'w1', nodes: ['n1', 'n2'], version: '1', tags: { 'ugr:locked': 'yes', landuse: 'residential' } })
            ]);
            context.perform(iD.actionChangeTags('w1', { 'ugr:locked': 'yes', landuse: 'grass' }));
            var graph = context.graph();
            var issues = iD.validationUgrLockedModified(context)(graph.entity('w1'), graph);
            expect(fixSummary(issues[0])).toEqual([['ugr.issues.fix.revert.title', true, null]]);
        });
    });
});
