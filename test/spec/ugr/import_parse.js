describe('iD.ugrParsePoints', function () {
    it('reads comma, semicolon and tab separated files', function () {
        ['id,x,y\nA,1,2', 'id;x;y\nA;1;2', 'id\tx\ty\nA\t1\t2'].forEach(function (text) {
            var parsed = iD.ugrParsePoints(text);
            expect(parsed.problems).toEqual([]);
            expect(parsed.rows).toEqual([{ line: 2, cells: { id: 'A', x: '1', y: '2' } }]);
        });
    });

    it('keeps a separator and doubled quotes inside quoted cells', function () {
        var parsed = iD.ugrParsePoints('id,x,y\n"A, 1",1,2\n"B ""q""",3,4');
        expect(parsed.rows.map(function (row) { return row.cells.id; })).toEqual(['A, 1', 'B "q"']);
    });

    it('ignores a byte-order mark', function () {
        expect(iD.ugrParsePoints('﻿id,x,y\nA,1,2').columns).toEqual({ id: 0, x: 1, y: 2 });
    });

    it('matches column names ignoring case, and accepts lon/lat and easting/northing', function () {
        expect(iD.ugrParsePoints('ID;Lon;Lat\nA;1;2').columns).toEqual({ id: 0, x: 1, y: 2 });
        expect(iD.ugrParsePoints('id,easting,northing,CRS,Type,Accuracy\nA,1,2,,,').columns)
            .toEqual({ id: 0, x: 1, y: 2, crs: 3, type: 4, accuracy: 5 });
    });

    it('names the columns it ignores', function () {
        expect(iD.ugrParsePoints('id,x,y,Species\nA,1,2,Tilia').ignored).toEqual(['Species']);
    });

    it('numbers rows by their line in the file and skips blank lines', function () {
        var parsed = iD.ugrParsePoints('id,x,y\n\nA,1,2\r\nB,3,4\n');
        expect(parsed.rows.map(function (row) { return row.line; })).toEqual([3, 4]);
    });

    it('gives a missing trailing cell as empty', function () {
        expect(iD.ugrParsePoints('id,x,y\nA,1').rows[0].cells).toEqual({ id: 'A', x: '1', y: '' });
    });

    it('reports each missing required column', function () {
        expect(iD.ugrParsePoints('id,lon\nA,1').problems).toEqual([{ line: null, column: 'y', code: 'missing_column' }]);
    });

    it('reports a first row of numbers as a missing header', function () {
        expect(iD.ugrParsePoints('1,23.3,42.6\n2,23.4,42.7').problems).toEqual([{ line: null, column: null, code: 'no_header' }]);
    });

    it('reports a file with no points', function () {
        expect(iD.ugrParsePoints('').problems).toEqual([{ line: null, column: null, code: 'empty_file' }]);
        expect(iD.ugrParsePoints('id,x,y\n\n').problems).toEqual([{ line: null, column: null, code: 'empty_file' }]);
    });

    it('reports text that was not UTF-8', function () {
        expect(iD.ugrParsePoints('id,x,y\nD�b,1,2').problems).toEqual([{ line: null, column: null, code: 'not_utf8' }]);
    });
});
