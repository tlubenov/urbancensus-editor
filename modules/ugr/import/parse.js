// Parses a points file: a header row, then one point per line. Pure: no iD imports.

const COLUMNS = {
    id: ['id'],
    x: ['x', 'lon', 'easting'],
    y: ['y', 'lat', 'northing'],
    crs: ['crs'],
    type: ['type'],
    accuracy: ['accuracy']
};

export const UGR_REQUIRED_COLUMNS = ['id', 'x', 'y'];

const NUMBER_LIKE = /^-?[0-9]+([.,][0-9]+)?$/;

// Cells split on `separator`; a cell that starts with a quote runs to the closing quote, and "" inside is a quote.
function splitLine(line, separator) {
    const cells = [];
    let cell = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (quoted) {
            if (c === '"' && line[i + 1] === '"') {
                cell += '"';
                i++;
            } else if (c === '"') {
                quoted = false;
            } else {
                cell += c;
            }
        } else if (c === '"' && cell.trim() === '') {
            quoted = true;
            cell = '';
        } else if (c === separator) {
            cells.push(cell);
            cell = '';
        } else {
            cell += c;
        }
    }
    cells.push(cell);
    return cells.map(value => value.trim());
}

// The separator that splits the header into the most cells; a tie goes to tab, then semicolon, then comma.
function detectSeparator(header) {
    let best = ',';
    let bestCount = 0;
    for (const separator of ['\t', ';', ',']) {
        const count = splitLine(header, separator).length - 1;
        if (count > bestCount) {
            best = separator;
            bestCount = count;
        }
    }
    return best;
}

export function ugrParsePoints(text) {
    const problems = [];
    const fileProblem = (code, column = null) => problems.push({ line: null, column, code });
    if (text.includes('�')) fileProblem('not_utf8');

    const lines = text.replace(/^\uFEFF/, '').split(/\r\n|\n|\r/);
    const headerIndex = lines.findIndex(line => line.trim() !== '');
    if (headerIndex === -1) {
        fileProblem('empty_file');
        return { separator: ',', columns: {}, ignored: [], rows: [], problems };
    }

    const separator = detectSeparator(lines[headerIndex]);
    const names = splitLine(lines[headerIndex], separator);
    const columns = {};
    const ignored = [];
    names.forEach((name, index) => {
        const key = Object.keys(COLUMNS).find(k => COLUMNS[k].includes(name.toLowerCase()));
        if (key && !(key in columns)) columns[key] = index;
        else ignored.push(name);
    });

    if (names.every(name => NUMBER_LIKE.test(name))) {
        fileProblem('no_header');
    } else {
        UGR_REQUIRED_COLUMNS.filter(key => !(key in columns)).forEach(key => fileProblem('missing_column', key));
    }

    const rows = [];
    for (let i = headerIndex + 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue;
        const cells = splitLine(lines[i], separator);
        const row = { line: i + 1, cells: {} };
        for (const [key, index] of Object.entries(columns)) row.cells[key] = cells[index] ?? '';
        rows.push(row);
    }
    if (!rows.length && !problems.length) fileProblem('empty_file');

    return { separator, columns, ignored, rows, problems };
}
