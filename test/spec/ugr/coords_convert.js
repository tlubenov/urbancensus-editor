describe('iD.ugr coordinate conversion', function () {
    // A tree in Sofia. The BGS2005 pair is what the fork's own projection returns for it, so this
    // test and the point import cannot drift apart without one of them failing.
    var SOFIA_LON = 23.3219;
    var SOFIA_LAT = 42.6977;

    it('puts easting in x and northing in y', function () {
        var [x, y] = iD.ugrFromWgs84(SOFIA_LON, SOFIA_LAT);
        expect(x).toBeCloseTo(321559.18, 1);
        expect(y).toBeCloseTo(4731436.07, 1);
    });

    it('round-trips to better than a tenth of a metre', function () {
        var [x, y] = iD.ugrFromWgs84(SOFIA_LON, SOFIA_LAT);
        var [lon, lat] = iD.ugrToWgs84('bgs2005', x, y);
        expect(lon).toBeCloseTo(SOFIA_LON, 6);
        expect(lat).toBeCloseTo(SOFIA_LAT, 6);
    });

    it('formats degrees to six places and metres to two', function () {
        var shown = iD.ugrCoordsFor([SOFIA_LON, SOFIA_LAT]);
        expect(shown.lon).toBe('23.321900');
        expect(shown.lat).toBe('42.697700');
        expect(shown.x).toBe('321559.18');
        expect(shown.y).toBe('4731436.07');
    });

    it('reads a comma as a decimal point, because a Bulgarian keyboard types one', function () {
        expect(iD.ugrParseNumber('42,6977')).toBeCloseTo(42.6977, 6);
    });

    it('refuses text that is not a number', function () {
        expect(iD.ugrParseNumber('abc')).toBe(null);
        expect(iD.ugrParseNumber('')).toBe(null);
        expect(iD.ugrParseNumber('42.1.2')).toBe(null);
    });

    it('refuses a latitude beyond the pole', function () {
        expect(iD.ugrLocFromDegrees(23.3, 91)).toBe(null);
        expect(iD.ugrLocFromDegrees(23.3, -91)).toBe(null);
    });

    it('refuses a longitude beyond the meridian', function () {
        expect(iD.ugrLocFromDegrees(181, 42.6)).toBe(null);
        expect(iD.ugrLocFromDegrees(-181, 42.6)).toBe(null);
    });

    it('accepts a coordinate inside the degrees range', function () {
        expect(iD.ugrLocFromDegrees(SOFIA_LON, SOFIA_LAT)).toEqual([SOFIA_LON, SOFIA_LAT]);
    });

    it('refuses a BGS2005 pair outside the projection working range', function () {
        expect(iD.ugrLocFromBgs2005(50, 4731436)).toBe(null);
        expect(iD.ugrLocFromBgs2005(321559, 99)).toBe(null);
    });

    it('converts a BGS2005 pair back to the point it came from', function () {
        var [x, y] = iD.ugrFromWgs84(SOFIA_LON, SOFIA_LAT);
        var loc = iD.ugrLocFromBgs2005(x, y);
        expect(loc[0]).toBeCloseTo(SOFIA_LON, 6);
        expect(loc[1]).toBeCloseTo(SOFIA_LAT, 6);
    });
});
