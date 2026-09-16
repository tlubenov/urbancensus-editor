describe('iD.ugr inspector guards', function () {
    var graph;
    var rules = {
        version: 1,
        presets: { 'ugr/tree': { geometry: ['point', 'vertex'], tags: { natural: 'tree' }, read_only: ['condition'] } }
    };

    beforeEach(function () {
        iD.ugrSetRules(rules);
        graph = new iD.coreGraph([
            new iD.osmNode({ id: 'n1', loc: [0, 0] }),
            new iD.osmNode({ id: 'n2', loc: [0, 1] }),
            new iD.osmNode({ id: 'n3', loc: [5, 5], tags: { natural: 'tree', species: 'Tilia cordata', condition: 'good' } }),
            new iD.osmWay({ id: 'w1', nodes: ['n1', 'n2'], tags: { 'ugr:locked': 'yes', landuse: 'residential' } })
        ]);
    });

    afterEach(function () {
        iD.ugrSetRules(null);
    });

    function matchesAny(patterns, key) {
        return patterns.some(function (pattern) { return pattern.test(key); });
    }

    it('makes every tag of a locked feature read-only', function () {
        var patterns = iD.ugrReadOnlyTagPatterns(['w1'], graph);
        expect(matchesAny(patterns, 'landuse')).toBe(true);
        expect(matchesAny(patterns, 'anything')).toBe(true);
    });

    it('makes ugr:* tags and preset read-only keys read-only on editable features', function () {
        var patterns = iD.ugrReadOnlyTagPatterns(['n3'], graph);
        expect(matchesAny(patterns, 'condition')).toBe(true);
        expect(matchesAny(patterns, 'ugr:parcel')).toBe(true);
        expect(matchesAny(patterns, 'species')).toBe(false);
        expect(matchesAny(patterns, 'conditions')).toBe(false);
    });

    it('locks fields of locked features and read-only fields', function () {
        expect(iD.ugrFieldLocked({ key: 'landuse' }, ['w1'], graph)).toBe(true);
        expect(iD.ugrFieldLocked({ keys: ['condition'] }, ['n3'], graph)).toBe(true);
        expect(iD.ugrFieldLocked({ key: 'species' }, ['n3'], graph)).toBe(false);
    });

    it('drops tag changes to locked features, ugr:* keys and read-only keys', function () {
        expect(iD.ugrAllowedTagChanges({ landuse: 'grass' }, ['w1'], graph)).toEqual({});
        expect(iD.ugrAllowedTagChanges({ species: 'unknown', condition: 'poor', 'ugr:locked': 'yes' }, ['n3'], graph))
            .toEqual({ species: 'unknown' });
    });

    it('keeps key removals that are allowed', function () {
        expect(iD.ugrAllowedTagChanges({ species: undefined }, ['n3'], graph)).toEqual({ species: undefined });
    });
});
