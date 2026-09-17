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
        common_allowed: ['natural'],
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

    describe('allowed keys and ranges', function () {
        var attributeRules = {
            version: 1,
            lock_tag: 'ugr:locked',
            presets: {
                'ugr/tree': { geometry: ['point', 'vertex'], tags: { natural: 'tree' }, required_any: [['species', 'genus']], read_only: ['condition'], allowed: ['height', 'ugr:stem_diameter_cm', 'start_date'] },
                'ugr/park': { geometry: ['area'], tags: { leisure: 'park' }, required: ['name'], allowed: ['ugr:maintenance_category'] }
            },
            common_allowed: ['note'],
            code_fields: { genus: 'genus' },
            code_lists: { genus: ['Tilia', 'unknown'] },
            ranges: {
                height: { min: 0, max: 60 },
                'ugr:stem_diameter_cm': { min: 1, max: 500, integer: true },
                start_date: { min: 1800, max: 2026, integer: true }
            }
        };

        function tree(tags) {
            return feature('point', Object.assign({ natural: 'tree', genus: 'Tilia' }, tags), [inside]);
        }

        it('allows preset tags, required, required_any, read_only, allowed, common and system keys', function () {
            expect(iD.ugrEvaluate(attributeRules, tree({ species: 'x', condition: 'good', height: '12', note: 'n', 'ugr:locked': 'no', area: 'yes', type: 'multipolygon' })))
                .toEqual([]);
            expect(iD.ugrEvaluate(attributeRules, feature('area', { leisure: 'park', name: 'Borisova', 'ugr:maintenance_category': 'I', note: 'n' }, [inside]))).toEqual([]);
        });

        it('flags a key that the matched type does not allow and names it', function () {
            var f = tree({ colour: 'green', 'name:bg': 'x' });
            expect(iD.ugrEvaluate(attributeRules, f)).toEqual(['ugr_tag_not_allowed']);
            expect(iD.ugrDisallowedKeys(attributeRules, f)).toEqual(['colour', 'name:bg']);
        });

        it('does not let one type use another type\'s allowed keys', function () {
            expect(iD.ugrDisallowedKeys(attributeRules, tree({ 'ugr:maintenance_category': 'I' }))).toEqual(['ugr:maintenance_category']);
        });

        it('allows only system and common keys on a feature that matches no type', function () {
            expect(iD.ugrEvaluate(attributeRules, feature('line', { area: 'yes', note: 'n' }, [inside]))).toEqual([]);
            expect(iD.ugrDisallowedKeys(attributeRules, feature('line', { building: 'yes', note: 'n' }, [inside]))).toEqual(['building']);
            expect(iD.ugrEvaluate(attributeRules, feature('vertex', {}, [inside]))).toEqual([]);
        });

        it('accepts numbers at the edges of a range, with surrounding spaces', function () {
            expect(iD.ugrEvaluate(attributeRules, tree({ height: '0', 'ugr:stem_diameter_cm': '500', start_date: '1800' }))).toEqual([]);
            expect(iD.ugrEvaluate(attributeRules, tree({ height: ' 60 ', 'ugr:stem_diameter_cm': '1', start_date: '2026' }))).toEqual([]);
            expect(iD.ugrEvaluate(attributeRules, tree({ height: '12.5' }))).toEqual([]);
        });

        it('flags values just outside a range', function () {
            expect(iD.ugrEvaluate(attributeRules, tree({ height: '60.1' }))).toEqual(['ugr_value_out_of_range']);
            expect(iD.ugrEvaluate(attributeRules, tree({ height: '-1' }))).toEqual(['ugr_value_out_of_range']);
            expect(iD.ugrEvaluate(attributeRules, tree({ start_date: '2027' }))).toEqual(['ugr_value_out_of_range']);
        });

        it('flags a blank value, a non-number and a decimal where a whole number is required', function () {
            expect(iD.ugrEvaluate(attributeRules, tree({ height: ' ' }))).toEqual(['ugr_value_out_of_range']);
            expect(iD.ugrEvaluate(attributeRules, tree({ height: 'tall' }))).toEqual(['ugr_value_out_of_range']);
            expect(iD.ugrEvaluate(attributeRules, tree({ height: '12,5' }))).toEqual(['ugr_value_out_of_range']);
            expect(iD.ugrEvaluate(attributeRules, tree({ 'ugr:stem_diameter_cm': '30.5' }))).toEqual(['ugr_value_out_of_range']);
            expect(iD.ugrEvaluate(attributeRules, tree({ height: '١٢' }))).toEqual(['ugr_value_out_of_range']);
        });

        it('returns every code sorted', function () {
            expect(iD.ugrEvaluate(attributeRules, feature('point', { natural: 'tree', colour: 'x', height: '99' }, [inside])))
                .toEqual(['ugr_missing_required', 'ugr_tag_not_allowed', 'ugr_value_out_of_range']);
        });

        it('treats missing sections as empty and still skips locked features', function () {
            expect(iD.ugrEvaluate({ presets: {} }, feature('point', { building: 'yes' }, [inside]))).toEqual(['ugr_tag_not_allowed']);
            expect(iD.ugrEvaluate(attributeRules, feature('area', { 'ugr:locked': 'yes', 'ugr:parcel': '1', landuse: 'residential' }, [inside]))).toEqual([]);
        });
    });
});
