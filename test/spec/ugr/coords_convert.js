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
        // The regex constrains what Number() accepts
        expect(iD.ugrParseNumber('1,2,3')).toBe(null);  // only first comma replaced, so '1.2,3' is NaN
        expect(iD.ugrParseNumber('0x10')).toBe(null);   // Number accepts hex, but regex rejects it
        expect(iD.ugrParseNumber('1e5')).toBe(null);    // Number accepts scientific notation, regex rejects it
        // Regex also rejects leading and trailing dots, which Number would accept
        expect(iD.ugrParseNumber('.5')).toBe(null);
        expect(iD.ugrParseNumber('42.')).toBe(null);
        // But trimming still works
        expect(iD.ugrParseNumber('  42.5  ')).toBeCloseTo(42.5, 6);
    });

    it('refuses a latitude beyond the pole', function () {
        expect(iD.ugrLocFromDegrees(23.3, 91)).toBe(null);
        expect(iD.ugrLocFromDegrees(23.3, -91)).toBe(null);
        // Boundary: exactly 90 and -90 are accepted
        expect(iD.ugrLocFromDegrees(23.3, 90)).toEqual([23.3, 90]);
        expect(iD.ugrLocFromDegrees(23.3, -90)).toEqual([23.3, -90]);
        // Just beyond the boundary is refused
        expect(iD.ugrLocFromDegrees(23.3, 90.000001)).toBe(null);
    });

    it('refuses a longitude beyond the meridian', function () {
        expect(iD.ugrLocFromDegrees(181, 42.6)).toBe(null);
        expect(iD.ugrLocFromDegrees(-181, 42.6)).toBe(null);
        // Boundary: exactly 180 and -180 are accepted
        expect(iD.ugrLocFromDegrees(180, 42.6)).toEqual([180, 42.6]);
        expect(iD.ugrLocFromDegrees(-180, 42.6)).toEqual([-180, 42.6]);
    });

    it('accepts a coordinate inside the degrees range', function () {
        expect(iD.ugrLocFromDegrees(SOFIA_LON, SOFIA_LAT)).toEqual([SOFIA_LON, SOFIA_LAT]);
    });

    it('refuses non-finite degrees values', function () {
        expect(iD.ugrLocFromDegrees(NaN, 42.6)).toBe(null);
        expect(iD.ugrLocFromDegrees(23.3, NaN)).toBe(null);
    });

    it('refuses a BGS2005 pair outside the projection working range', function () {
        expect(iD.ugrLocFromBgs2005(50, 4731436)).toBe(null);
        expect(iD.ugrLocFromBgs2005(321559, 99)).toBe(null);
        // Upper bounds must also be checked
        expect(iD.ugrLocFromBgs2005(1000001, 4731436)).toBe(null);
        expect(iD.ugrLocFromBgs2005(321559, 5000001)).toBe(null);
        // Exact boundaries are accepted: lower bounds
        var result = iD.ugrLocFromBgs2005(100000, 4731436);
        expect(result).not.toBe(null);
        result = iD.ugrLocFromBgs2005(321559, 4000000);
        expect(result).not.toBe(null);
        // Exact boundaries are accepted: upper bounds
        result = iD.ugrLocFromBgs2005(1000000, 4731436);
        expect(result).not.toBe(null);
        result = iD.ugrLocFromBgs2005(321559, 5000000);
        expect(result).not.toBe(null);
    });

    it('converts a BGS2005 pair back to the point it came from', function () {
        var [x, y] = iD.ugrFromWgs84(SOFIA_LON, SOFIA_LAT);
        var loc = iD.ugrLocFromBgs2005(x, y);
        expect(loc[0]).toBeCloseTo(SOFIA_LON, 6);
        expect(loc[1]).toBeCloseTo(SOFIA_LAT, 6);
    });

    it('refuses non-finite BGS2005 values', function () {
        expect(iD.ugrLocFromBgs2005(NaN, 4731436)).toBe(null);
        expect(iD.ugrLocFromBgs2005(321559, NaN)).toBe(null);
    });
});
