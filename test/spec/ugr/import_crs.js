describe('iD.ugrToWgs84', function () {
    // pyproj 3.7, EPSG:4326 -> EPSG:7801, always_xy
    var reference = [
        { name: 'Sofia', easting: 321559.1776, northing: 4731436.0703, lon: 23.3219, lat: 42.6977 },
        { name: 'Varna', easting: 696180.9536, northing: 4789304.0894, lon: 27.9147, lat: 43.2141 },
        { name: 'Burgas', easting: 661286.7227, northing: 4709582.6022, lon: 27.4626, lat: 42.5048 },
        { name: 'Plovdiv', easting: 437607.6193, northing: 4666958.0223, lon: 24.7453, lat: 42.1354 },
        { name: 'Ruse', easting: 537460.0929, northing: 4855659.2023, lon: 25.9657, lat: 43.8356 },
        { name: 'Vidin', easting: 290029.9434, northing: 4876654.3883, lon: 22.8824, lat: 43.9962 },
        { name: 'Kardzhali', easting: 488894.6985, northing: 4612772.8991, lon: 25.3667, lat: 41.65 },
        { name: 'Sandanski', easting: 315103.9125, northing: 4605935.6638, lon: 23.2833, lat: 41.5667 },
        { name: 'Dobrich', easting: 687985.6553, northing: 4828919.9135, lon: 27.8273, lat: 43.5726 },
        { name: 'Kyustendil', easting: 268370.8681, northing: 4687022.3668, lon: 22.6911, lat: 42.2839 },
        { name: 'Shabla', easting: 745147.2158, northing: 4826364.0793, lon: 28.5333, lat: 43.5333 }
    ];

    reference.forEach(function (p) {
        it('agrees with pyproj within a millimetre at ' + p.name, function () {
            var loc = iD.ugrToWgs84('bgs2005', p.easting, p.northing);
            var metresPerDegreeLat = 111320;
            var metresPerDegreeLon = 111320 * Math.cos(p.lat * Math.PI / 180);
            expect(Math.abs(loc[0] - p.lon) * metresPerDegreeLon).toBeLessThan(0.001);
            expect(Math.abs(loc[1] - p.lat) * metresPerDegreeLat).toBeLessThan(0.001);
        });
    });

    it('passes WGS84 through unchanged', function () {
        expect(iD.ugrToWgs84('wgs84', 23.3219, 42.6977)).toEqual([23.3219, 42.6977]);
    });

    it('uses the EPSG:7801 definition pyproj gives', function () {
        expect(iD.UGR_BGS2005).toBe('+proj=lcc +lat_0=42.6678756833333 +lon_0=25.5 +lat_1=42 +lat_2=43.3333333333333 ' +
            '+x_0=500000 +y_0=4725824.3591 +ellps=GRS80 +units=m +no_defs');
    });
});

describe('iD.ugrNormalizeCrs', function () {
    it('accepts names and EPSG codes, ignoring case and spaces', function () {
        expect(['wgs84', 'WGS84', ' 4326 ', 'EPSG:4326'].map(iD.ugrNormalizeCrs)).toEqual(['wgs84', 'wgs84', 'wgs84', 'wgs84']);
        expect(['bgs2005', 'BGS2005', '7801', 'epsg:7801'].map(iD.ugrNormalizeCrs)).toEqual(['bgs2005', 'bgs2005', 'bgs2005', 'bgs2005']);
    });

    it('refuses anything else', function () {
        expect(['utm', '', 'epsg:32635', 'bgs'].map(iD.ugrNormalizeCrs)).toEqual([null, null, null, null]);
    });
});

describe('iD.ugrInBulgaria', function () {
    it('is true inside the country\'s bounding box and false outside', function () {
        expect(iD.ugrInBulgaria([23.3219, 42.6977])).toBe(true);
        expect(iD.ugrInBulgaria([13.40, 52.52])).toBe(false);     // Berlin
        expect(iD.ugrInBulgaria([42.6977, 23.3219])).toBe(false); // Sofia, axes swapped
        expect(iD.ugrInBulgaria([NaN, NaN])).toBe(false);
    });
});

describe('iD.ugrGuessCrs', function () {
    it('guesses WGS84 from degrees and BGS2005 from metres', function () {
        expect(iD.ugrGuessCrs([[23.3, 42.6], [27.9, 43.2]])).toBe('wgs84');
        expect(iD.ugrGuessCrs([[321559.1776, 4731436.0703], [696180.9536, 4789304.0894]])).toBe('bgs2005');
    });

    it('guesses nothing from a mix, from other numbers, or from no rows', function () {
        expect(iD.ugrGuessCrs([[23.3, 42.6], [321559.1776, 4731436.0703]])).toBe(null);
        expect(iD.ugrGuessCrs([[5000, 5000]])).toBe(null);
        expect(iD.ugrGuessCrs([])).toBe(null);
    });
});
