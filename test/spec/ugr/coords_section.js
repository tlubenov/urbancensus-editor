describe('iD.ugrSectionCoordinates', function () {
    var context, entities;

    beforeEach(function () {
        entities = [
            new iD.osmNode({ id: 'n-tree', loc: [23.3219, 42.6977], tags: { natural: 'tree' } }),
            new iD.osmNode({ id: 'n-lockedpt', loc: [23.3, 42.6], tags: { 'ugr:locked': 'yes' } }),
            new iD.osmNode({ id: 'n-a', loc: [23.30, 42.60] }),
            new iD.osmNode({ id: 'n-b', loc: [23.31, 42.61] }),
            new iD.osmWay({ id: 'w1', nodes: ['n-a', 'n-b'] })
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
    });

    it('leaves the point where it was when the value is not a number', function () {
        selecting(['n-tree']);
        var section = iD.ugrSectionCoordinates(context);
        var before = context.entity('n-tree').loc;
        section.ugrSubmit('lat', 'abc');
        expect(context.entity('n-tree').loc).toEqual(before);
    });

    it('leaves the point where it was when the latitude is beyond the pole', function () {
        selecting(['n-tree']);
        var section = iD.ugrSectionCoordinates(context);
        var before = context.entity('n-tree').loc;
        section.ugrSubmit('lat', '91');
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

    it('the stub mode reports ids the way the real select mode does', function () {
        // If modeSelect ever stopped returning its ids from selectedIDs(), every test above would
        // still pass against a stub that does -- so pin the two together.
        expect(iD.modeSelect(context, ['n-tree']).selectedIDs()).toEqual(['n-tree']);
    });
});
