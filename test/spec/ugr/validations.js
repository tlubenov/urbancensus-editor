describe('iD.validationUgr', function () {
    var context;
    var rules = {
        version: 1,
        municipality: 'SOF46',
        lock_tag: 'ugr:locked',
        boundary: { type: 'MultiPolygon', coordinates: [[[[23.20, 42.60], [23.45, 42.60], [23.45, 42.80], [23.20, 42.80], [23.20, 42.60]]]] },
        presets: {
            'ugr/tree': { geometry: ['point', 'vertex'], tags: { natural: 'tree' }, required_any: [['species', 'genus']], read_only: ['condition'] },
            'ugr/hedge': { geometry: ['line', 'area'], tags: { barrier: 'hedge' } }
        },
        code_fields: { genus: 'genus', species: 'species' },
        code_lists: { genus: ['Tilia', 'unknown'], species: ['Tilia cordata', 'unknown'] }
    };

    beforeEach(function () {
        context = iD.coreContext().assetPath('../dist/').init();
        iD.ugrSetRules(rules);
    });

    afterEach(function () {
        iD.ugrSetRules(null);
        context.validator().disableRules([]);   // don't leak the disabled-rules preference into other specs
    });

    function issues(validationFn) {
        var validation = validationFn(context);
        var changes = context.history().changes();
        return changes.modified.concat(changes.created).flatMap(function (entity) {
            return validation(entity, context.graph());
        });
    }

    function addTree(tags, loc) {
        context.perform(iD.actionAddEntity(new iD.osmNode({ id: 'n-1', loc: loc || [23.3221, 42.6976], tags: tags })));
    }

    it('flags a new tree without species or genus as an error', function () {
        addTree({ natural: 'tree' });
        var found = issues(iD.validationUgrMissingRequired);
        expect(found).toHaveLength(1);
        expect(found[0].type).toBe('ugr_missing_required');
        expect(found[0].severity).toBe('error');
        expect(found[0].entityIds).toEqual(['n-1']);
    });

    it('offers a fix that sets species to unknown', function () {
        addTree({ natural: 'tree' });
        var fixes = issues(iD.validationUgrMissingRequired)[0].fixes(context);
        expect(fixes).toHaveLength(1);
        fixes[0].onClick(context);
        expect(context.entity('n-1').tags.species).toBe('unknown');
        expect(issues(iD.validationUgrMissingRequired)).toHaveLength(0);
    });

    it('flags a feature outside the municipality boundary', function () {
        addTree({ natural: 'tree', genus: 'Tilia' }, [27.9147, 43.2141]);
        expect(issues(iD.validationUgrOutsideBoundary).map(function (i) { return i.type; })).toEqual(['ugr_outside_boundary']);
    });

    it('flags a value that is not in the code list', function () {
        addTree({ natural: 'tree', genus: 'Quercus' });
        expect(issues(iD.validationUgrValueNotInList)).toHaveLength(1);
    });

    it('reports nothing when no rules are loaded', function () {
        iD.ugrSetRules(null);
        addTree({ natural: 'tree' });
        expect(issues(iD.validationUgrMissingRequired)).toHaveLength(0);
    });

    it('flags a changed locked feature and can revert it', function () {
        var n1 = new iD.osmNode({ id: 'n1', loc: [23.30, 42.70], version: '1' });
        var n2 = new iD.osmNode({ id: 'n2', loc: [23.31, 42.70], version: '1' });
        var w1 = new iD.osmWay({ id: 'w1', nodes: ['n1', 'n2'], version: '1', tags: { 'ugr:locked': 'yes', landuse: 'residential' } });
        context.history().merge([n1, n2, w1]);
        context.perform(iD.actionChangeTags('w1', { 'ugr:locked': 'yes', landuse: 'grass' }));

        var found = issues(iD.validationUgrLockedModified);
        expect(found).toHaveLength(1);
        expect(found[0].type).toBe('ugr_locked_modified');
        found[0].fixes(context)[0].onClick(context);
        expect(context.entity('w1').tags.landuse).toBe('residential');
    });

    it('builds an evaluation feature from nodes and ways', function () {
        context.perform(
            iD.actionAddEntity(new iD.osmNode({ id: 'n-1', loc: [1, 2] })),
            iD.actionAddEntity(new iD.osmNode({ id: 'n-2', loc: [3, 4] })),
            iD.actionAddEntity(new iD.osmWay({ id: 'w-1', nodes: ['n-1', 'n-2'], tags: { barrier: 'hedge' } }))
        );
        var graph = context.graph();
        expect(iD.ugrFeatureFor(graph.entity('w-1'), graph)).toEqual({ geometry: 'line', tags: { barrier: 'hedge' }, coordinates: [[1, 2], [3, 4]] });
        expect(iD.ugrFeatureFor(graph.entity('n-1'), graph).geometry).toBe('vertex');
    });

    it('switches off the OSM-community validations and keeps ours', function () {
        var keys = context.validator().getRuleKeys();
        iD.ugrDisabledValidations.forEach(function (key) { expect(keys).not.toContain(key); });
        ['ugr_missing_required', 'ugr_outside_boundary', 'ugr_value_not_in_list', 'ugr_locked_modified']
            .forEach(function (key) { expect(keys).toContain(key); });
    });

    it('names every switched-off validation by its real type', function () {
        var types = [iD.validationOutdatedTags, iD.validationSuspiciousName, iD.validationIncompatibleSource,
            iD.validationHelpRequest, iD.validationPrivateData, iD.validationMaprules, iD.validationMutuallyExclusiveTags]
            .map(function (fn) { return fn(context).type; });
        expect(types.sort()).toEqual(iD.ugrDisabledValidations.slice().sort());
    });

    it('never lets the user disable our rules', function () {
        context.validator().toggleRule('ugr_missing_required');
        context.validator().disableRules(['ugr_outside_boundary', 'close_nodes']);
        expect(context.validator().isRuleEnabled('ugr_missing_required')).toBe(true);
        expect(context.validator().isRuleEnabled('ugr_outside_boundary')).toBe(true);
        expect(context.validator().isRuleEnabled('close_nodes')).toBe(false);
    });
});
