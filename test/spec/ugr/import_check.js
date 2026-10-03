describe('iD.ugrCheckImport', function () {
    var rules = {
        version: 1,
        boundary: { type: 'MultiPolygon', coordinates: [[[[23.20, 42.60], [23.45, 42.60], [23.45, 42.80], [23.20, 42.80], [23.20, 42.60]]]] },
        presets: {
            'ugr/tree': { geometry: ['point', 'vertex'], tags: { natural: 'tree' } },
            'ugr/hedge': { geometry: ['line', 'area'], tags: { barrier: 'hedge' } }
        }
    };

    function check(text, options) {
        return iD.ugrCheckImport(Object.assign({
            fileName: 'trees.csv', size: text.length, text: text, rules: rules, crs: 'wgs84', accuracy: '1', maxPoints: 10000
        }, options));
    }

    function codes(result) {
        return result.problems.map(function (p) { return [p.line, p.column, p.code]; });
    }

    it('turns a clean file into points with their tags', function () {
        var result = check('id,x,y,crs,accuracy\nT1,321559.1776,4731436.0703,bgs2005,0.5\nT2,23.33,42.70,wgs84,3\n', { crs: null, accuracy: '' });
        expect(result.problems).toEqual([]);
        expect(result.points).toHaveLength(2);
        expect(result.points[0].loc[0]).toBeCloseTo(23.3219, 6);
        expect(result.points[0].loc[1]).toBeCloseTo(42.6977, 6);
        expect(result.points[0].tags).toEqual({
            natural: 'tree', 'ugr:source_id': 'T1', 'ugr:source_file': 'trees.csv', 'ugr:source_crs': 'bgs2005', 'ugr:precision_m': '0.5'
        });
        expect(result.points[1]).toEqual({
            line: 3, id: 'T2', crs: 'wgs84', type: 'tree', loc: [23.33, 42.7],
            tags: { natural: 'tree', 'ugr:source_id': 'T2', 'ugr:source_file': 'trees.csv', 'ugr:source_crs': 'wgs84', 'ugr:precision_m': '3' }
        });
    });

    it('rounds coordinates to 7 decimal places', function () {
        expect(check('id,x,y\nA,23.330000049,42.700000051').points[0].loc).toEqual([23.33, 42.7000001]);
    });

    it('lets a row\'s crs win over the form\'s', function () {
        var point = check('id,x,y,crs\nA,321559.1776,4731436.0703,7801', { crs: 'wgs84' }).points[0];
        expect(point.crs).toBe('bgs2005');
        expect(point.loc[0]).toBeCloseTo(23.3219, 6);
    });

    it('gives empty accuracy cells the form\'s default', function () {
        expect(check('id,x,y,accuracy\nA,23.33,42.70,\nB,23.34,42.71,4', { accuracy: '2' }).points
            .map(function (p) { return p.tags['ugr:precision_m']; })).toEqual(['2', '4']);
    });

    it('accepts a decimal comma', function () {
        var point = check('id;x;y;accuracy\nA;23,33;42,70;0,5').points[0];
        expect(point.loc).toEqual([23.33, 42.7]);
        expect(point.tags['ugr:precision_m']).toBe('0.5');
    });

    it('reads an empty type as tree and matches types ignoring case', function () {
        expect(check('id,x,y,type\nA,23.33,42.70,\nB,23.34,42.71,Tree').points
            .map(function (p) { return p.type; })).toEqual(['tree', 'tree']);
    });

    it('reports an empty required cell', function () {
        expect(codes(check('id,x,y\n,23.33,42.70'))).toEqual([[2, 'id', 'required']]);
    });

    it('reports a repeated id with the line it first appeared on', function () {
        var result = check('id,x,y\nA,23.33,42.70\nA,23.34,42.71');
        expect(codes(result)).toEqual([[3, 'id', 'duplicate_id']]);
        expect(result.problems[0].params).toEqual({ line: 2 });
    });

    it('reports a coordinate that is not a number', function () {
        expect(codes(check('id,x,y\nA,abc,42.70'))).toEqual([[2, 'x', 'not_number']]);
    });

    it('reports an unknown crs, and a missing one when the form has none', function () {
        expect(codes(check('id,x,y,crs\nA,23.33,42.70,utm'))).toEqual([[2, 'crs', 'crs_unknown']]);
        expect(codes(check('id,x,y\nA,23.33,42.70', { crs: null }))).toEqual([[2, 'crs', 'crs_missing']]);
    });

    it('reports a type that is not a point type in the rules', function () {
        var result = check('id,x,y,type\nA,23.33,42.70,hedge');
        expect(codes(result)).toEqual([[2, 'type', 'type_unknown']]);
        expect(result.problems[0].params).toEqual({ type: 'hedge' });
    });

    it('reports a bad accuracy, and a missing one when the form has no default', function () {
        expect(codes(check('id,x,y,accuracy\nA,23.33,42.70,0'))).toEqual([[2, 'accuracy', 'accuracy_invalid']]);
        expect(codes(check('id,x,y,accuracy\nA,23.33,42.70,-1'))).toEqual([[2, 'accuracy', 'accuracy_invalid']]);
        expect(codes(check('id,x,y\nA,23.33,42.70', { accuracy: '' }))).toEqual([[2, 'accuracy', 'accuracy_missing']]);
    });

    it('reports a point outside Bulgaria, suggesting swapped axes when that would fit', function () {
        expect(codes(check('id,x,y\nA,13.40,52.52'))).toEqual([[2, 'x/y', 'outside_bulgaria']]);
        expect(codes(check('id,x,y\nA,42.70,23.33'))).toEqual([[2, 'x/y', 'maybe_swapped']]);
        expect(codes(check('id,x,y\nA,4731436.0703,321559.1776', { crs: 'bgs2005' }))).toEqual([[2, 'x/y', 'maybe_swapped']]);
    });

    it('reports a point outside the municipality', function () {
        expect(codes(check('id,x,y\nA,27.9147,43.2141'))).toEqual([[2, 'x/y', 'outside_boundary']]);
    });

    it('reports every problem in the file and returns no points', function () {
        var result = check('id,x,y\nA,23.33,42.70\nB,abc,42.70\nC,27.9147,43.2141');
        expect(codes(result)).toEqual([[3, 'x', 'not_number'], [4, 'x/y', 'outside_boundary']]);
        expect(result.points).toEqual([]);
    });

    it('refuses a file over 5 MB without reading it', function () {
        expect(codes(check('id,x,y\nA,23.33,42.70', { size: iD.UGR_IMPORT_MAX_BYTES + 1 }))).toEqual([[null, null, 'too_large']]);
    });

    it('refuses more points than one changeset holds', function () {
        var result = check('id,x,y\nA,23.33,42.70\nB,23.34,42.71', { maxPoints: 1 });
        expect(codes(result)).toEqual([[null, null, 'too_many']]);
        expect(result.problems[0].params).toEqual({ count: 2, max: 1 });
    });

    it('passes on the parser\'s file problems', function () {
        expect(codes(check('id,lon\nA,1'))).toEqual([[null, 'y', 'missing_column']]);
    });

    it('names the columns it ignores', function () {
        expect(check('id,x,y,species\nA,23.33,42.70,Tilia').ignored).toEqual(['species']);
    });
});

describe('iD.ugrGuessImportCrs', function () {
    it('guesses from the rows without a crs', function () {
        expect(iD.ugrGuessImportCrs('id,x,y\nA,321559.1776,4731436.0703')).toBe('bgs2005');
        expect(iD.ugrGuessImportCrs('id,x,y,crs\nA,321559.1776,4731436.0703,bgs2005\nB,23.33,42.70,')).toBe('wgs84');
        expect(iD.ugrGuessImportCrs('id,x,y\nA,abc,42.70')).toBe(null);
    });
});

describe('iD.ugrImportCounts', function () {
    it('counts points by type and by system', function () {
        expect(iD.ugrImportCounts([{ type: 'tree', crs: 'bgs2005' }, { type: 'tree', crs: 'wgs84' }, { type: 'tree', crs: 'wgs84' }]))
            .toEqual({ byType: { tree: 3 }, byCrs: { bgs2005: 1, wgs84: 2 } });
    });
});
