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
        if (text === shown[which]) return false;
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

    function renderContent(selection) {
        const node = selectedNode();
        if (!node) return;
        const shown = ugrCoordsFor(node.loc);
        const isLocked = locked();

        let list = selection.selectAll('.ugr-coords').data([0]);
        list = list.enter().append('div').attr('class', 'ugr-coords').merge(list);

        const rows = list.selectAll('.ugr-coord-row').data(FIELDS, d => d);
        const entered = rows.enter().append('div').attr('class', 'ugr-coord-row');
        entered.append('label').attr('for', d => 'ugr-coord-' + d).text(d => t('ugr.coords.' + d));
        entered.append('input')
            .attr('type', 'text')
            .attr('id', d => 'ugr-coord-' + d)
            .attr('inputmode', 'decimal')
            .on('change', function(d3_event, d) { onSubmit(d, this); })
            .on('blur', function(d3_event, d) { onSubmit(d, this); });

        entered.merge(rows).select('input')
            .attr('disabled', isLocked ? 'disabled' : null)
            .attr('title', isLocked ? t('ugr.coords.locked') : null)
            .attr('aria-invalid', null)
            .property('value', d => shown[d]);
    }

    // A refusal puts the field back to the point's real value, so the box never shows a position the
    // map does not agree with.
    function onSubmit(which, input) {
        const node = selectedNode();
        const unchanged = !!node && input.value === ugrCoordsFor(node.loc)[which];
        if (section.ugrSubmit(which, input.value)) {
            input.removeAttribute('title');
            input.removeAttribute('aria-invalid');
        } else if (node) {
            input.value = ugrCoordsFor(node.loc)[which];
            if (unchanged) {
                input.removeAttribute('title');
                input.removeAttribute('aria-invalid');
            } else {
                input.title = t('ugr.coords.invalid');
                input.setAttribute('aria-invalid', 'true');
            }
        }
        // No sidebar redraw here: perform fires a history change, and the entity editor re-renders
        // from that, which re-runs renderContent and reformats the field.
    }

    return section;
}
