import { UGR_BGS2005_RANGE, ugrFromWgs84, ugrToWgs84 } from '../import/crs';

// Six decimal degrees is about 0.1 m at this latitude -- finer than any precision class the register
// records. Two decimal metres is what the point import accepts. Showing more would imply an accuracy
// the data does not have.
export const UGR_DEGREE_PLACES = 6;
export const UGR_METRE_PLACES = 2;

export function ugrFormatDegrees(value) {
    return Number(value).toFixed(UGR_DEGREE_PLACES);
}

export function ugrFormatMetres(value) {
    return Number(value).toFixed(UGR_METRE_PLACES);
}

// A Bulgarian keyboard types a comma for the decimal point, and the register has been bitten by that
// before: an f-string writes dots while a template float takes the locale's comma, and iD then fails
// to parse the hash. Accept both, emit dots.
export function ugrParseNumber(text) {
    const cleaned = String(text == null ? '' : text).trim().replace(',', '.');
    if (!/^[+-]?\d+(\.\d+)?$/.test(cleaned)) return null;
    const value = Number(cleaned);
    return Number.isFinite(value) ? value : null;
}

// The point's own loc is the source of truth; the other pair is recomputed for display rather than
// stored, so the two can never drift apart (C-D8).
export function ugrCoordsFor(loc) {
    const [lon, lat] = loc;
    const [x, y] = ugrFromWgs84(lon, lat);
    return {
        lat: ugrFormatDegrees(lat),
        lon: ugrFormatDegrees(lon),
        x: ugrFormatMetres(x),
        y: ugrFormatMetres(y)
    };
}

export function ugrLocFromDegrees(lon, lat) {
    if (lon === null || lat === null) return null;
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
    return [lon, lat];
}

export function ugrLocFromBgs2005(x, y) {
    if (x === null || y === null) return null;
    const { x: [xmin, xmax], y: [ymin, ymax] } = UGR_BGS2005_RANGE;
    if (x < xmin || x > xmax || y < ymin || y > ymax) return null;
    return ugrToWgs84('bgs2005', x, y);
}
