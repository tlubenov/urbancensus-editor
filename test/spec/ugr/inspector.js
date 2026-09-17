import { select as d3_select } from 'd3-selection';

describe('iD.ugr inspector guards', function () {
    var graph;
    var rules = {
        version: 1,
        presets: {
            'ugr/tree': { geometry: ['point', 'vertex'], tags: { natural: 'tree' }, read_only: ['condition'], allowed: ['ugr:location_type'] },
            'ugr/park': { geometry: ['area'], tags: { leisure: 'park' }, allowed: ['ugr:maintenance_category'] }
        }
    };

    beforeEach(function () {
        iD.ugrSetRules(rules);
        graph = new iD.coreGraph([
            new iD.osmNode({ id: 'n1', loc: [0, 0] }),
            new iD.osmNode({ id: 'n2', loc: [0, 1] }),
            new iD.osmNode({ id: 'n3', loc: [5, 5], tags: { natural: 'tree', species: 'Tilia cordata', condition: 'good' } }),
            new iD.osmWay({ id: 'w1', nodes: ['n1', 'n2'], tags: { 'ugr:locked': 'yes', landuse: 'residential' } })
        ]);
    });

    afterEach(function () {
        iD.ugrSetRules(null);
    });

    function matchesAny(patterns, key) {
        return patterns.some(function (pattern) { return pattern.test(key); });
    }

    it('makes every tag of a locked feature read-only', function () {
        var patterns = iD.ugrReadOnlyTagPatterns(['w1'], graph);
        expect(matchesAny(patterns, 'landuse')).toBe(true);
        expect(matchesAny(patterns, 'anything')).toBe(true);
    });

    it('makes ugr:* tags and preset read-only keys read-only on editable features', function () {
        var patterns = iD.ugrReadOnlyTagPatterns(['n3'], graph);
        expect(matchesAny(patterns, 'condition')).toBe(true);
        expect(matchesAny(patterns, 'ugr:parcel')).toBe(true);
        expect(matchesAny(patterns, 'ugr:locked')).toBe(true);
        expect(matchesAny(patterns, 'species')).toBe(false);
        expect(matchesAny(patterns, 'conditions')).toBe(false);
    });

    it('leaves ugr: attributes that the rules declare, for any type, editable in the tag editor', function () {
        var patterns = iD.ugrReadOnlyTagPatterns(['n3'], graph);
        expect(matchesAny(patterns, 'ugr:location_type')).toBe(false);
        expect(matchesAny(patterns, 'ugr:maintenance_category')).toBe(false);
        expect(matchesAny(patterns, 'ugr:location_type_code')).toBe(true);
        expect(matchesAny(patterns, 'ugr:location')).toBe(true);
    });

    it('makes every ugr:* tag read-only when no rules are loaded', function () {
        iD.ugrSetRules(null);
        expect(matchesAny(iD.ugrReadOnlyTagPatterns(['n3'], graph), 'ugr:location_type')).toBe(true);
    });

    it('locks fields of locked features and read-only fields', function () {
        expect(iD.ugrFieldLocked({ key: 'landuse' }, ['w1'], graph)).toBe(true);
        expect(iD.ugrFieldLocked({ keys: ['condition'] }, ['n3'], graph)).toBe(true);
        expect(iD.ugrFieldLocked({ key: 'species' }, ['n3'], graph)).toBe(false);
    });

    it('drops tag changes to locked features, ugr:* keys and read-only keys', function () {
        expect(iD.ugrAllowedTagChanges({ landuse: 'grass' }, ['w1'], graph)).toEqual({});
        expect(iD.ugrAllowedTagChanges({ species: 'unknown', condition: 'poor', 'ugr:locked': 'yes', 'ugr:parcel': '1' }, ['n3'], graph))
            .toEqual({ species: 'unknown' });
    });

    it('keeps changes to ugr: attributes that the rules declare, for any type', function () {
        expect(iD.ugrAllowedTagChanges({ 'ugr:location_type': 'sidewalk', 'ugr:maintenance_category': 'I', 'ugr:parcel': '1' }, ['n3'], graph))
            .toEqual({ 'ugr:location_type': 'sidewalk', 'ugr:maintenance_category': 'I' });
        expect(iD.ugrAllowedTagChanges({ 'ugr:location_type': undefined }, ['n3'], graph)).toEqual({ 'ugr:location_type': undefined });
        expect(iD.ugrAllowedTagChanges({ 'ugr:location_type': 'sidewalk' }, ['w1'], graph)).toEqual({});
    });

    it('drops changes to every ugr:* key when no rules are loaded', function () {
        iD.ugrSetRules(null);
        expect(iD.ugrAllowedTagChanges({ 'ugr:location_type': 'sidewalk', species: 'unknown' }, ['n3'], graph)).toEqual({ species: 'unknown' });
    });

    it('keeps key removals that are allowed', function () {
        expect(iD.ugrAllowedTagChanges({ species: undefined }, ['n3'], graph)).toEqual({ species: undefined });
    });

    it('drops a function change to a locked feature', function () {
        expect(iD.ugrAllowedTagChanges(function (tags) { return tags; }, ['w1'], graph)).toEqual({});
    });

    it('wraps a mutating function change so it cannot alter ugr:* or read-only keys of an editable feature', function () {
        var change = function (tags) {
            tags.species = 'unknown';
            tags.condition = 'poor';
            tags['ugr:parcel'] = '1';
            return tags;
        };
        var original = Object.assign({}, graph.entity('n3').tags);
        var working = Object.assign({}, original);
        var allowed = iD.ugrAllowedTagChanges(change, ['n3'], graph);
        expect(allowed(working)).toEqual({ natural: 'tree', species: 'unknown', condition: 'good' });
    });

    it('lets a function change set and remove declared ugr: attributes', function () {
        var allowed = iD.ugrAllowedTagChanges(function (tags) {
            tags['ugr:location_type'] = 'sidewalk';
            tags['ugr:parcel'] = '1';
            return tags;
        }, ['n3'], graph);
        expect(allowed({ natural: 'tree' })).toEqual({ natural: 'tree', 'ugr:location_type': 'sidewalk' });

        var removal = iD.ugrAllowedTagChanges(function (tags) {
            delete tags['ugr:location_type'];
            delete tags['ugr:parcel'];
            return tags;
        }, ['n3'], graph);
        expect(removal({ natural: 'tree', 'ugr:location_type': 'sidewalk', 'ugr:parcel': '1' })).toEqual({ natural: 'tree', 'ugr:parcel': '1' });
    });

    it('treats a function change that returns nothing as no change', function () {
        var allowed = iD.ugrAllowedTagChanges(function () {}, ['n3'], graph);
        expect(allowed({ natural: 'tree', condition: 'good' })).toEqual({ natural: 'tree', condition: 'good' });
    });

    it('locks a field whose fallback key is read-only even when it has alternate keys', function () {
        expect(iD.ugrFieldLocked({ key: 'condition', keys: ['condition:left', 'condition:right'] }, ['n3'], graph)).toBe(true);
    });

    it('applies field locks to input controls and label buttons, and re-enables only what it disabled', function () {
        var form = d3_select(document.createElement('div'));
        var wrap = form.append('div').attr('class', 'wrap-form-field wrap-form-field-landuse');
        var label = wrap.append('div').attr('class', 'field-label');
        label.append('button').attr('class', 'remove-icon');
        label.append('button').attr('class', 'tag-reference-button');
        wrap.append('div').attr('class', 'form-field-input-wrap').append('input');
        var other = form.append('div').attr('class', 'wrap-form-field wrap-form-field-brand');
        other.append('div').attr('class', 'form-field-input-wrap').append('input').classed('disabled', true);   // iD's own wikidata lock

        var landuse = { safeid: 'landuse', ugrLocked: true };
        var brand = { safeid: 'brand', ugrLocked: false };
        iD.ugrApplyFieldLocks(form, [landuse, brand]);

        expect(wrap.classed('ugr-readonly')).toBe(true);
        expect(wrap.select('.form-field-input-wrap input').property('disabled')).toBe(true);
        expect(wrap.select('.form-field-input-wrap input').classed('disabled')).toBe(true);
        expect(wrap.select('.remove-icon').property('disabled')).toBe(true);
        expect(wrap.select('.tag-reference-button').property('disabled')).toBe(false);
        expect(other.select('input').classed('disabled')).toBe(true);        // untouched

        landuse.ugrLocked = false;
        iD.ugrApplyFieldLocks(form, [landuse, brand]);
        expect(wrap.classed('ugr-readonly')).toBe(false);
        expect(wrap.select('.form-field-input-wrap input').property('disabled')).toBe(false);
        expect(wrap.select('.form-field-input-wrap input').classed('disabled')).toBe(false);
        expect(other.select('input').classed('disabled')).toBe(true);        // still untouched
    });
});
