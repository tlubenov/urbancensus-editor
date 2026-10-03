import { t } from '../../core/localizer';
import { osmNode } from '../../osm';
import { uiModal } from '../../ui/modal';
import { ugrRules } from '../rules/store';
import { ugrActionImportPoints } from './action';
import { UGR_IMPORT_MAX_BYTES, ugrCheckImport, ugrGuessImportCrs, ugrImportCounts } from './check';
import { ugrFindDuplicates } from './duplicates';
import { ugrSetPendingImport } from './record';

const CRS_LABEL = { bgs2005: 'BGS2005', wgs84: 'WGS84' };

function formatCounts(counts, labels) {
    return Object.entries(counts).map(([key, n]) => `${labels ? labels[key] : key}: ${n}`).join(', ');
}

function problemText(problem) {
    const params = Object.assign({ column: problem.column }, problem.params);
    // A number param is shown with a thousands separator: a line number must not be.
    if (typeof params.line === 'number') params.line = String(params.line);
    const message = t('ugr.import.problem.' + problem.code, params);
    if (problem.line === null) return message;
    return problem.column ?
        t('ugr.import.at_line_column', { line: String(problem.line), column: problem.column, message }) :
        t('ugr.import.at_line', { line: String(problem.line), message });
}

// Upload form, problem report and preview. Adding the points is one history action; nothing is uploaded.
export function ugrImportDialog(context, { displayName = null } = {}) {
    const modal = uiModal(context.container());
    modal.select('.modal').classed('ugr-import-dialog', true);
    const content = modal.select('.content');

    content.append('div')
        .attr('class', 'modal-section header')
        .append('h3')
        .text(t('ugr.import.title'));

    const form = content.append('div').attr('class', 'modal-section ugr-import-form');
    form.append('p').text(t('ugr.import.file_help'));
    const fileInput = form.append('input')
        .attr('type', 'file')
        .attr('accept', '.csv,.txt,text/csv,text/plain')
        .attr('class', 'ugr-import-file')
        .on('change', function () {
            const file = this.files && this.files[0];
            if (file) readFile(file);
            // Browsers fire `change` only when the selection differs: clear it so picking the same (fixed) file again works.
            this.value = '';
        });
    form.append('p').text(t('ugr.import.axes'));

    const crsLabel = form.append('label');
    crsLabel.append('span').text(t('ugr.import.crs'));
    const crsSelect = crsLabel.append('select')
        .attr('class', 'ugr-import-crs')
        .on('change', recheck);
    crsSelect.selectAll('option')
        .data(['', 'wgs84', 'bgs2005'])
        .enter()
        .append('option')
        .attr('value', d => d)
        .text(d => t('ugr.import.crs_' + (d || 'none')));

    const accuracyLabel = form.append('label');
    accuracyLabel.append('span').text(t('ugr.import.accuracy'));
    const accuracyInput = accuracyLabel.append('input')
        .attr('type', 'text')
        .attr('inputmode', 'decimal')
        .attr('class', 'ugr-import-accuracy')
        .on('input', recheck);

    const report = content.append('div').attr('class', 'modal-section ugr-import-report');

    const buttons = content.append('div').attr('class', 'modal-section buttons');
    buttons.append('button')
        .attr('class', 'button cancel-button secondary-action ugr-import-cancel')
        .text(t('ugr.import.cancel'))
        .on('click', () => modal.close());
    const chooseButton = buttons.append('button')
        .attr('class', 'button secondary-action ugr-import-choose hide')
        .text(t('ugr.import.choose_another'))
        .on('click', () => fileInput.node().click());
    const addButton = buttons.append('button')
        .attr('class', 'button ok-button action ugr-import-add')
        .property('disabled', true)
        .text(t('ugr.import.add', { count: 0 }))
        .on('click', add);

    let _file = null;          // { name, size, text }
    let _result = null;
    let _duplicates = new Set();
    let _skip = true;

    function readFile(file) {
        // Too large is reported from the size alone, without reading the file.
        if (file.size > UGR_IMPORT_MAX_BYTES) return loadFile(file.name, file.size, '');
        const reader = new FileReader();
        reader.onload = () => loadFile(file.name, file.size, String(reader.result));
        reader.onerror = () => loadFile(file.name, file.size, null);
        reader.readAsText(file, 'utf-8');
    }

    // `text` is null when the file couldn't be read.
    function loadFile(name, size, text) {
        _file = { name, size, text };
        const guess = text === null ? null : ugrGuessImportCrs(text);
        if (guess) crsSelect.property('value', guess);
        recheck();
    }

    function maxPoints() {
        const osm = context.connection();
        return osm ? osm.maxChangesetElements() : 10000;
    }

    function recheck() {
        if (!_file) return;
        _result = ugrCheckImport({
            fileName: _file.name,
            size: _file.size,
            text: _file.text,
            rules: ugrRules() || { presets: {} },
            crs: crsSelect.property('value') || null,
            accuracy: accuracyInput.property('value'),
            maxPoints: maxPoints()
        });
        _duplicates = _result.problems.length ? new Set() : ugrFindDuplicates(context, _file.name, _result.points);
        render();
    }

    function pointsToAdd() {
        return _result.points.filter(point => !(_skip && _duplicates.has(point.id)));
    }

    function render() {
        report.html('');
        const problems = _result.problems;
        if (problems.length) {
            report.append('h4').text(t('ugr.import.problems_title', { n: problems.length }));
            report.append('ul')
                .attr('class', 'ugr-import-problems')
                .selectAll('li')
                .data(problems)
                .enter()
                .append('li')
                .text(problemText);
            addButton.classed('hide', true);
            chooseButton.classed('hide', false);
            return;
        }

        const counts = ugrImportCounts(_result.points);
        report.append('p')
            .attr('class', 'ugr-import-summary')
            .text(t('ugr.import.summary', {
                count: _result.points.length,
                types: formatCounts(counts.byType),
                crs: formatCounts(counts.byCrs, CRS_LABEL)
            }));
        if (_result.ignored.length) {
            report.append('p').text(t('ugr.import.ignored_columns', { columns: _result.ignored.join(', ') }));
        }
        if (_duplicates.size) {
            report.append('p').text(t('ugr.import.duplicates', {
                count: _duplicates.size,
                ids: Array.from(_duplicates).slice(0, 20).join(', ')
            }));
            const label = report.append('label');
            label.append('input')
                .attr('type', 'checkbox')
                .attr('class', 'ugr-import-skip-duplicates')
                .property('checked', _skip)
                .on('change', function () {
                    _skip = this.checked;
                    render();
                });
            label.append('span').text(t('ugr.import.skip_duplicates'));
        }

        const n = pointsToAdd().length;
        addButton
            .classed('hide', false)
            .property('disabled', n === 0)
            .text(t('ugr.import.add', { count: n }));
        chooseButton.classed('hide', true);
    }

    function add() {
        if (!_result || _result.problems.length) return;
        const points = pointsToAdd();
        if (!points.length) return;
        const nodes = points.map(point => new osmNode({ loc: point.loc, tags: point.tags }));
        context.perform(ugrActionImportPoints(nodes), t('ugr.import.annotation', { count: nodes.length, file: _file.name }));
        ugrSetPendingImport({
            file: _file.name,
            count: nodes.length,
            byCrs: ugrImportCounts(points).byCrs,
            time: new Date(),
            displayName,
            nodeIds: nodes.map(node => node.id)
        });
        // A changeset started before the import (then emptied by undo) must not keep its old comment.
        context.changeset = null;
        modal.close();
        // No visible map (e.g. a test without layout) means nothing to fit.
        const [width, height] = context.map().dimensions();
        if (width && height) context.map().zoomToEase(nodes);
    }

    fileInput.node().focus();
    return { modal, loadFile };
}
