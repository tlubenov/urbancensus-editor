import { t } from '../../core/localizer';
import { uiSection } from '../../ui/section';
import { actionMoveNode } from '../../actions/move_node';
import { ugrIsLocked } from '../locking/is_locked';
import { ugrCoordsFor, ugrLocFromBgs2005, ugrLocFromDegrees, ugrParseNumber } from './convert';

const FIELDS = ['lat', 'lon', 'x', 'y'];

export function ugrSectionCoordinates(context) {

    // The one selected node, or null for a way, a relation, a multi-selection or nothing. Every
    // other case is out of scope by C-D1, and `null` is what shouldDisplay reads.
    function selectedNode() {
        const ids = context.selectedIDs();
        if (ids.length !== 1) return null;
        const entity = context.hasEntity(ids[0]);
        if (!entity || entity.type !== 'node') return null;
        // A vertex belongs to a way, and typing one corner of a polygon is how a shape ends up
        // self-intersecting (C-D1: standalone points only).
        return context.graph().parentWays(entity).length ? null : entity;
    }

    function locked() {
        const node = selectedNode();
        return !!node && ugrIsLocked(node, context.graph());
    }

    // Which loc a submitted value means, given the other three stay as they are. Returns null when
    // the value is not a position, and the caller then leaves the point alone (C-D5).
    function locFor(which, text, shown) {
        const value = ugrParseNumber(text);
        if (value === null) return null;
        if (which === 'lat') return ugrLocFromDegrees(ugrParseNumber(shown.lon), value);
        if (which === 'lon') return ugrLocFromDegrees(value, ugrParseNumber(shown.lat));
        const x = which === 'x' ? value : ugrParseNumber(shown.x);
        const y = which === 'y' ? value : ugrParseNumber(shown.y);
        return ugrLocFromBgs2005(x, y);
    }

    const section = uiSection('ugr-coordinates', context)
        .label(() => t.append('ugr.coords.title'))
        .shouldDisplay(() => !!selectedNode())
        .disclosureContent(renderContent);

    // Exposed for the specs, and for the inputs below: typing is the only way in, so the behaviour
    // worth testing is "this value was submitted", not "this DOM event fired".
    section.ugrSubmit = function(which, text) {
        const node = selectedNode();
        if (!node || locked()) return false;
        const shown = ugrCoordsFor(node.loc);
        // Tabbing through a field re-submits the rounded display value, which would nudge the
        // point by a few centimetres and add an undo entry for nothing.
        // Compared as numbers, not text: a Bulgarian keyboard types a comma, which parses to the
        // value already shown and must not become a move to the identical location.
        if (ugrParseNumber(text) === ugrParseNumber(shown[which])) return false;
        const loc = locFor(which, text, shown);
        if (!loc) return false;
        // actionMoveNode is transitionable, and history.perform animates a transitionable action
        // asynchronously from t=0. A typed value should land at once -- and the field is re-read from
        // the node straight afterwards, which would otherwise show the old position.
        const move = actionMoveNode(node.id, loc);
        move.transitionable = false;
        context.perform(move, t('operations.move.annotation.point'));
        return true;
    };

    // The units each pair is read in: decimal degrees for WGS84, metres for BGS2005. They go in
    // iD's own `.label-textannotation`, which is the slot it uses for exactly this.
    const UNITS = { lat: 'dd', lon: 'dd', x: 'm', y: 'm' };

    function renderContent(selection) {
        const node = selectedNode();
        if (!node) return;
        const shown = ugrCoordsFor(node.loc);
        const isLocked = locked();

        let list = selection.selectAll('.ugr-coords').data([0]);
        list = list.enter().append('div').attr('class', 'ugr-coords').merge(list);

        // iD's own field markup, rather than a shape of our own: the labels, inputs and spacing then
        // come from the same stylesheet as every other field in the inspector, and the lock
        // affordance `.ugr-readonly .form-field-input-wrap` applies without a rule of its own.
        const rows = list.selectAll('.form-field').data(FIELDS, d => d);
        const entered = rows.enter()
            .append('div')
            .attr('class', d => 'form-field form-field-ugr-coord-' + d);
        const labelEnter = entered.append('label')
            .attr('class', 'field-label')
            .attr('for', d => 'ugr-coord-' + d);
        const textEnter = labelEnter.append('span').attr('class', 'label-text');
        textEnter.append('span').attr('class', 'label-textvalue').text(d => t('ugr.coords.' + d));
        textEnter.append('span').attr('class', 'label-textannotation').text(d => UNITS[d]);
        entered.append('div')
            .attr('class', 'form-field-input-wrap')
            .append('input')
            .attr('type', 'text')
            .attr('id', d => 'ugr-coord-' + d)
            .attr('inputmode', 'decimal')
            .on('change', function(d3_event, d) { onSubmit(d, this); })
            .on('blur', function(d3_event, d) { onSubmit(d, this); });

        const all = entered.merge(rows);
        // .ugr-readonly goes on the field, not the wrap: the existing rule is a DESCENDANT
        // selector, `.ugr-readonly .form-field-input-wrap`, and ugrApplyFieldLocks marks the
        // field for the same reason.
        all.classed('ugr-readonly', isLocked);
        all.select('input')
            .attr('disabled', isLocked ? 'disabled' : null)
            .attr('title', isLocked ? t('ugr.coords.locked') : null)
            .attr('aria-invalid', null)
            .property('value', d => shown[d]);
    }

    // A refusal puts the field back to the point's real value, so the box never shows a position the
    // map does not agree with.
    function onSubmit(which, input) {
        const node = selectedNode();
        const unchanged = !!node && ugrParseNumber(input.value) === ugrParseNumber(ugrCoordsFor(node.loc)[which]);
        const submitted = section.ugrSubmit(which, input.value);
        if (submitted) {
            input.removeAttribute('title');
            input.removeAttribute('aria-invalid');
        } else if (node) {
            input.value = ugrCoordsFor(node.loc)[which];
            if (unchanged) {
                input.removeAttribute('title');
                input.removeAttribute('aria-invalid');
            } else {
                // A locked feature refuses a perfectly valid value; "not a position" would mislead.
                input.title = t(locked() ? 'ugr.coords.locked' : 'ugr.coords.invalid');
                input.setAttribute('aria-invalid', 'true');
            }
        }
        // A successful move must redraw this section itself. A coordinate move sets only
        // didChange.geometry (modules/core/difference.ts), and the entity editor's historyChanged
        // (modules/ui/entity_editor.js) ignores a change without properties, addition or deletion,
        // so it never re-renders for us. Without this the field keeps the typed text and the blur
        // that follows re-submits it as a second undo entry.
        if (submitted) section.reRender();
    }

    return section;
}
