import proj4 from 'proj4';

// EPSG:7801, BGS2005 / CCS2005 (Lambert Conformal Conic on GRS80), as pyproj 3.7 writes it. No grid files.
export const UGR_BGS2005 = '+proj=lcc +lat_0=42.6678756833333 +lon_0=25.5 +lat_1=42 +lat_2=43.3333333333333 ' +
    '+x_0=500000 +y_0=4725824.3591 +ellps=GRS80 +units=m +no_defs';

const bgs2005ToWgs84 = proj4(UGR_BGS2005, 'WGS84');

// CCS2005's working range in metres. ugrGuessCrs recognises a BGS2005 pair by these bounds, and the
// coordinate editor refuses one outside them, so they live here where both can read the same numbers.
export const UGR_BGS2005_RANGE = { x: [100000, 1000000], y: [4000000, 5000000] };

// Bulgaria's bounding box, slightly generous: west, south, east, north.
const BULGARIA = [22.3, 41.2, 28.7, 44.3];

const ALIASES = {
    'wgs84': 'wgs84', '4326': 'wgs84', 'epsg:4326': 'wgs84',
    'bgs2005': 'bgs2005', '7801': 'bgs2005', 'epsg:7801': 'bgs2005'
};

export function ugrNormalizeCrs(value) {
    const key = String(value).trim().toLowerCase();
    return Object.prototype.hasOwnProperty.call(ALIASES, key) ? ALIASES[key] : null;
}

// x is the easting or longitude, y the northing or latitude.
export function ugrToWgs84(crs, x, y) {
    return crs === 'bgs2005' ? bgs2005ToWgs84.forward([x, y]) : [x, y];
}

// x is the easting, y the northing -- the order proj4 returns and the order ugrToWgs84 takes.
export function ugrFromWgs84(lon, lat) {
    return bgs2005ToWgs84.inverse([lon, lat]);
}

export function ugrInBulgaria([lon, lat]) {
    return lon >= BULGARIA[0] && lon <= BULGARIA[2] && lat >= BULGARIA[1] && lat <= BULGARIA[3];
}

// The system every pair fits: degrees for WGS84; CCS2005's metre ranges for BGS2005. Otherwise none.
export function ugrGuessCrs(pairs) {
    if (!pairs.length) return null;
    if (pairs.every(([x, y]) => Math.abs(x) <= 180 && Math.abs(y) <= 90)) return 'wgs84';
    const { x: [xmin, xmax], y: [ymin, ymax] } = UGR_BGS2005_RANGE;
    if (pairs.every(([x, y]) => x >= xmin && x <= xmax && y >= ymin && y <= ymax)) return 'bgs2005';
    return null;
}
