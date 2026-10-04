describe('iD.ugrSectionCoordinates', function () {
    var context, entities;

    beforeEach(function () {
        entities = [
            new iD.osmNode({ id: 'n-tree', loc: [23.3219, 42.6977], tags: { natural: 'tree' } }),
            new iD.osmNode({ id: 'n-lockedpt', loc: [23.3, 42.6], tags: { 'ugr:locked': 'yes' } }),
            new iD.osmNode({ id: 'n-a', loc: [23.30, 42.60] }),
            new iD.osmNode({ id: 'n-b', loc: [23.31, 42.61] }),
            new iD.osmWay({ id: 'w1', nodes: ['n-a', 'n-b'] }),
            new iD.osmWay({ id: 'w-locked', nodes: ['n-c', 'n-d'], tags: { 'ugr:locked': 'yes' } }),
            new iD.osmNode({ id: 'n-c', loc: [23.40, 42.60] }),
            new iD.osmNode({ id: 'n-d', loc: [23.41, 42.61] })
        ];
        context = iD.coreContext().assetPath('../dist/').init();
        context.history().merge(entities);
    });


    // modeSelect's enter reaches the edit menu, which needs a map surface this harness has no
    // business building. The section only ever asks context.selectedIDs(), and that delegates to
    // whatever mode is current -- so a stub mode exercises the real delegation without the DOM.
    function selecting(ids) {
        context.enter({ id: 'select', enter: function () {}, exit: function () {}, selectedIDs: function () { return ids; } });
    }

    function selectingNothing() {
        context.enter({ id: 'browse', enter: function () {}, exit: function () {}, selectedIDs: function () { return []; } });
    }

    it('shows for a single selected point', function () {
        selecting(['n-tree']);
        expect(iD.ugrSectionCoordinates(context).shouldDisplay()()).toBe(true);
    });

    it('does not show for a way', function () {
        selecting(['w1']);
        expect(iD.ugrSectionCoordinates(context).shouldDisplay()()).toBe(false);
    });

    it('does not show for two selected points', function () {
        selecting(['n-a', 'n-b']);
        expect(iD.ugrSectionCoordinates(context).shouldDisplay()()).toBe(false);
    });

    it('does not show when nothing is selected', function () {
        selectingNothing();
        expect(iD.ugrSectionCoordinates(context).shouldDisplay()()).toBe(false);
    });

    it('moves the point when a valid latitude is submitted', function () {
        selecting(['n-tree']);
        var section = iD.ugrSectionCoordinates(context);
        section.ugrSubmit('lat', '42.700000');
        expect(context.entity('n-tree').loc[1]).toBeCloseTo(42.7, 6);
        expect(context.entity('n-tree').loc[0]).toBeCloseTo(23.3219, 6);
    });

    it('moves the point when a valid BGS2005 easting is submitted', function () {
        selecting(['n-tree']);
        var section = iD.ugrSectionCoordinates(context);
        var before = context.entity('n-tree').loc;
        section.ugrSubmit('x', '321659.18');   // 100 m east
        expect(context.entity('n-tree').loc[0]).toBeGreaterThan(before[0]);
        // The grid is not aligned with the meridians, so a pure easting move shifts the latitude by a
        // few metres. What must hold is that the northing is the one it had.
        expect(iD.ugrCoordsFor(context.entity('n-tree').loc).y).toBe(iD.ugrCoordsFor(before).y);
    });

    it('leaves the point where it was when the value is not a number', function () {
        selecting(['n-tree']);
        var section = iD.ugrSectionCoordinates(context);
        var before = context.entity('n-tree').loc;
        expect(section.ugrSubmit('lat', 'abc')).toBe(false);
        expect(context.entity('n-tree').loc).toEqual(before);
    });

    it('leaves the point where it was when the latitude is beyond the pole', function () {
        selecting(['n-tree']);
        var section = iD.ugrSectionCoordinates(context);
        var before = context.entity('n-tree').loc;
        expect(section.ugrSubmit('lat', '91')).toBe(false);
        expect(context.entity('n-tree').loc).toEqual(before);
    });

    it('refuses to move a locked feature even with a valid value', function () {
        selecting(['n-lockedpt']);
        var section = iD.ugrSectionCoordinates(context);
        var before = context.entity('n-lockedpt').loc;
        section.ugrSubmit('lat', '42.650000');
        expect(context.entity('n-lockedpt').loc).toEqual(before);
    });

    it('accepts a coordinate outside the municipality, which the validator catches at save', function () {
        // C-D6: refusing here as well would mean two refusals with two messages for one mistake,
        // and the boundary rule already exists as ugr_outside_boundary.
        selecting(['n-tree']);
        var section = iD.ugrSectionCoordinates(context);
        section.ugrSubmit('lat', '48.000000');   // well north of Bulgaria
        expect(context.entity('n-tree').loc[1]).toBeCloseTo(48, 6);
    });

    it('one undo puts the point back, which is what proves actionMoveNode was used', function () {
        selecting(['n-tree']);
        var section = iD.ugrSectionCoordinates(context);
        var before = context.entity('n-tree').loc;
        section.ugrSubmit('lat', '42.700000');
        context.history().undo();
        expect(context.entity('n-tree').loc).toEqual(before);
    });

    it('moves the point when a valid longitude is submitted', function () {
        selecting(['n-tree']);
        var section = iD.ugrSectionCoordinates(context);
        expect(section.ugrSubmit('lon', '23.330000')).toBe(true);
        expect(context.entity('n-tree').loc[0]).toBeCloseTo(23.33, 6);
        expect(context.entity('n-tree').loc[1]).toBeCloseTo(42.6977, 6);
    });

    it('moves the point when a valid BGS2005 northing is submitted', function () {
        selecting(['n-tree']);
        var section = iD.ugrSectionCoordinates(context);
        var before = context.entity('n-tree').loc;
        expect(section.ugrSubmit('y', '4731536.07')).toBe(true);   // 100 m north
        expect(context.entity('n-tree').loc[1]).toBeGreaterThan(before[1]);
        expect(iD.ugrCoordsFor(context.entity('n-tree').loc).x).toBe(iD.ugrCoordsFor(before).x);
    });

    it('refuses a longitude beyond the antimeridian', function () {
        selecting(['n-tree']);
        var section = iD.ugrSectionCoordinates(context);
        var before = context.entity('n-tree').loc;
        expect(section.ugrSubmit('lon', '181')).toBe(false);
        expect(context.entity('n-tree').loc).toEqual(before);
    });

    it('refuses an empty field', function () {
        selecting(['n-tree']);
        var section = iD.ugrSectionCoordinates(context);
        var before = context.entity('n-tree').loc;
        expect(section.ugrSubmit('lat', '')).toBe(false);
        expect(context.entity('n-tree').loc).toEqual(before);
    });

    it('does not move the point or add an undo entry when the displayed value is submitted back', function () {
        selecting(['n-tree']);
        var section = iD.ugrSectionCoordinates(context);
        var before = context.entity('n-tree').loc;
        var shown = iD.ugrCoordsFor(before).lat;
        expect(section.ugrSubmit('lat', shown)).toBe(false);
        expect(context.entity('n-tree').loc).toEqual(before);
        expect(context.history().undoAnnotation()).toBeFalsy();
    });

    it('does not show for a vertex of an unlocked way', function () {
        selecting(['n-a']);
        expect(iD.ugrSectionCoordinates(context).shouldDisplay()()).toBe(false);
    });

    it('refuses to move a vertex of an unlocked way', function () {
        selecting(['n-a']);
        var section = iD.ugrSectionCoordinates(context);
        var before = context.entity('n-a').loc;
        expect(section.ugrSubmit('lat', '42.650000')).toBe(false);
        expect(context.entity('n-a').loc).toEqual(before);
    });

    it('refuses to move a vertex of a locked way', function () {
        selecting(['n-c']);
        var section = iD.ugrSectionCoordinates(context);
        var before = context.entity('n-c').loc;
        expect(section.ugrSubmit('lat', '42.650000')).toBe(false);
        expect(context.entity('n-c').loc).toEqual(before);
    });

    it('the stub mode reports ids the way the real select mode does', function () {
        // If modeSelect ever stopped returning its ids from selectedIDs(), every test above would
        // still pass against a stub that does -- so pin the two together.
        expect(iD.modeSelect(context, ['n-tree']).selectedIDs()).toEqual(['n-tree']);
    });
});
