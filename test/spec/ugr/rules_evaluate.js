describe('iD.ugrEvaluate', function () {
    var rules = {
        version: 1,
        municipality: 'SOF46',
        lock_tag: 'ugr:locked',
        boundary: {
            type: 'MultiPolygon',
            coordinates: [[
                [[23.20, 42.60], [23.45, 42.60], [23.45, 42.80], [23.20, 42.80], [23.20, 42.60]],
                [[23.30, 42.70], [23.31, 42.70], [23.31, 42.71], [23.30, 42.71], [23.30, 42.70]]
            ]]
        },
        presets: {
            'ugr/tree': { geometry: ['point', 'vertex'], tags: { natural: 'tree' }, required_any: [['species', 'genus']], read_only: ['condition'] },
            'ugr/hedge': { geometry: ['line', 'area'], tags: { barrier: 'hedge' } },
            'ugr/park': { geometry: ['area'], tags: { leisure: 'park' }, required: ['name'] }
        },
        code_fields: { genus: 'genus', species: 'species' },
        code_lists: { genus: ['Tilia', 'unknown'], species: ['Tilia cordata', 'unknown'] }
    };
    var inside = [23.3221, 42.6976];
    var outside = [27.9147, 43.2141];
    var inHole = [23.305, 42.705];

    function feature(geometry, tags, coordinates) {
        return { geometry: geometry, tags: tags, coordinates: coordinates };
    }

    it('accepts a tree with a genus inside the boundary', function () {
        expect(iD.ugrEvaluate(rules, feature('point', { natural: 'tree', genus: 'Tilia' }, [inside]))).toEqual([]);
    });

    it('flags a tree with neither species nor genus', function () {
        expect(iD.ugrEvaluate(rules, feature('point', { natural: 'tree' }, [inside]))).toEqual(['ugr_missing_required']);
    });

    it('treats a blank value as missing', function () {
        expect(iD.ugrEvaluate(rules, feature('vertex', { natural: 'tree', species: ' ' }, [inside])))
            .toEqual(['ugr_missing_required', 'ugr_value_not_in_list']);
    });

    it('accepts the explicit unknown value', function () {
        expect(iD.ugrEvaluate(rules, feature('point', { natural: 'tree', species: 'unknown' }, [inside]))).toEqual([]);
    });

    it('flags a missing key listed in required', function () {
        expect(iD.ugrEvaluate(rules, feature('area', { leisure: 'park' }, [inside]))).toEqual(['ugr_missing_required']);
    });

    it('flags a value that is not in its code list', function () {
        expect(iD.ugrEvaluate(rules, feature('point', { natural: 'tree', genus: 'Quercus' }, [inside]))).toEqual(['ugr_value_not_in_list']);
    });

    it('flags any coordinate outside the boundary, including inside a hole', function () {
        expect(iD.ugrEvaluate(rules, feature('line', { barrier: 'hedge' }, [inside, outside]))).toEqual(['ugr_outside_boundary']);
        expect(iD.ugrEvaluate(rules, feature('point', { natural: 'tree', genus: 'Tilia' }, [inHole]))).toEqual(['ugr_outside_boundary']);
    });

    it('checks the boundary for untagged vertices too', function () {
        expect(iD.ugrEvaluate(rules, feature('vertex', {}, [outside]))).toEqual(['ugr_outside_boundary']);
    });

    it('returns several codes sorted and unique', function () {
        expect(iD.ugrEvaluate(rules, feature('point', { natural: 'tree' }, [outside])))
            .toEqual(['ugr_missing_required', 'ugr_outside_boundary']);
    });

    it('skips locked features entirely', function () {
        expect(iD.ugrEvaluate(rules, feature('area', { 'ugr:locked': 'yes', natural: 'tree' }, [outside]))).toEqual([]);
    });

    it('does not apply a preset whose geometry does not match', function () {
        expect(iD.ugrEvaluate(rules, feature('area', { natural: 'tree' }, [inside]))).toEqual([]);
    });

    it('matches the preset with the most matching tags', function () {
        var more = Object.assign({}, rules, { presets: Object.assign({}, rules.presets, {
            'ugr/park_tree': { geometry: ['point'], tags: { natural: 'tree', leisure: 'park' } }
        }) });
        expect(iD.ugrMatchPreset(more, feature('point', { natural: 'tree', leisure: 'park' }, [inside]))).toBe('ugr/park_tree');
        expect(iD.ugrMatchPreset(more, feature('point', { natural: 'tree' }, [inside]))).toBe('ugr/tree');
        expect(iD.ugrMatchPreset(more, feature('point', { amenity: 'bench' }, [inside]))).toBe(null);
    });

    it('lists read-only keys of the matched preset', function () {
        expect(iD.ugrReadOnlyKeys(rules, feature('point', { natural: 'tree' }, [inside]))).toEqual(['condition']);
        expect(iD.ugrReadOnlyKeys(rules, feature('line', { barrier: 'hedge' }, [inside]))).toEqual([]);
    });

    it('supports a plain Polygon boundary', function () {
        var polygon = { type: 'Polygon', coordinates: rules.boundary.coordinates[0] };
        expect(iD.ugrPointInBoundary(polygon, inside)).toBe(true);
        expect(iD.ugrPointInBoundary(polygon, outside)).toBe(false);
    });
});
