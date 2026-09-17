import { select as d3_select } from 'd3-selection';

describe('iD.ugr preset changes', function () {
    var rules = {
        version: 1,
        presets: {
            'ugr/tree': { geometry: ['point', 'vertex'], tags: { natural: 'tree' }, read_only: ['condition'], allowed: ['ugr:location_type'] },
            'ugr/grass': { geometry: ['area'], tags: { landuse: 'grass' }, allowed: ['ugr:maintenance_category'] }
        }
    };

    function lockedParcelAndTree() {
        return [
            new iD.osmNode({ id: 'n1', loc: [0, 0], version: '1' }),
            new iD.osmNode({ id: 'n2', loc: [0, 0.001], version: '1' }),
            new iD.osmNode({ id: 'n3', loc: [0.001, 0.001], version: '1' }),
            new iD.osmWay({ id: 'w1', nodes: ['n1', 'n2', 'n3', 'n1'], version: '1', tags: { 'ugr:locked': 'yes', landuse: 'residential' } }),
            new iD.osmNode({ id: 'n4', loc: [0.002, 0], version: '1' }),
            new iD.osmNode({ id: 'n5', loc: [0.002, 0.001], version: '1' }),
            new iD.osmWay({ id: 'w2', nodes: ['n4', 'n5'], version: '1', tags: { barrier: 'hedge' } }),
            new iD.osmNode({ id: 'n6', loc: [0.003, 0], version: '1', tags: { natural: 'tree', species: 'Tilia cordata', condition: 'good', 'ugr:parcel': '12' } })
        ];
    }

    afterEach(function () {
        iD.ugrSetRules(null);
    });

    describe('ugrLockedDeletions', function () {
        var context;

        beforeEach(function () {
            context = iD.coreContext().assetPath('../dist/').init();
            context.history().merge(lockedParcelAndTree());
        });

        it('lists the entities that were locked in the base graph and have been deleted', function () {
            context.perform(iD.actionDeleteWay('w1'));
            expect(iD.ugrLockedDeletions(context).sort()).toEqual(['n1', 'n2', 'n3', 'w1']);
        });

        it('ignores deleted features that were not locked', function () {
            context.perform(iD.actionDeleteWay('w2'));
            expect(iD.ugrLockedDeletions(context)).toEqual([]);
        });

        it('still lists a locked feature deleted after its lock tag was removed', function () {
            context.perform(iD.actionChangeTags('w1', { landuse: 'residential' }));
            context.perform(iD.actionDeleteWay('w1'));
            expect(iD.ugrLockedDeletions(context)).toContain('w1');
        });
    });

    describe('ugrPreserveProtectedTags', function () {
        var graph;

        beforeEach(function () {
            iD.ugrSetRules(rules);
            graph = new iD.coreGraph(lockedParcelAndTree());
        });

        it('gives ugr:* and read-only keys back the values they had before the change', function () {
            var before = graph.entity('n6').tags;
            var after = { natural: 'shrub', species: 'Tilia cordata', condition: 'poor' };
            expect(iD.ugrPreserveProtectedTags(before, after, ['n6'], graph))
                .toEqual({ natural: 'shrub', species: 'Tilia cordata', condition: 'good', 'ugr:parcel': '12' });
        });

        it('removes ugr:* and read-only keys that the feature did not have before', function () {
            var before = { natural: 'tree', species: 'Tilia cordata' };
            var after = { natural: 'tree', species: 'Tilia cordata', condition: 'good', 'ugr:x': 'yes' };
            var entity = graph.entity('n6').update({ tags: before });
            expect(iD.ugrPreserveProtectedTags(before, after, ['n6'], graph.replace(entity)))
                .toEqual({ natural: 'tree', species: 'Tilia cordata' });
        });

        it('does not modify its arguments', function () {
            var before = Object.assign({}, graph.entity('n6').tags);
            var after = { natural: 'shrub' };
            iD.ugrPreserveProtectedTags(before, after, ['n6'], graph);
            expect(after).toEqual({ natural: 'shrub' });
            expect(before).toEqual(graph.entity('n6').tags);
        });

        it('lets the change set, alter or remove ugr: attributes that the rules declare, and still keeps the others', function () {
            var before = { natural: 'tree', species: 'Tilia cordata', 'ugr:parcel': '12', 'ugr:location_type': 'sidewalk' };
            var entity = graph.entity('n6').update({ tags: before });
            var changed = graph.replace(entity);
            expect(iD.ugrPreserveProtectedTags(before, { natural: 'shrub', species: 'Tilia cordata' }, ['n6'], changed))
                .toEqual({ natural: 'shrub', species: 'Tilia cordata', 'ugr:parcel': '12' });
            expect(iD.ugrPreserveProtectedTags(before, { natural: 'shrub', 'ugr:location_type': 'square', 'ugr:maintenance_category': 'I' }, ['n6'], changed))
                .toEqual({ natural: 'shrub', 'ugr:location_type': 'square', 'ugr:maintenance_category': 'I', 'ugr:parcel': '12' });
        });
    });

    describe('changing the feature type in the inspector', function () {
        var context, container, scrollTo;

        beforeEach(async function () {
            await iD.presetManager.ensureLoaded();
            container = d3_select(document.createElement('div'));
            context = iD.coreContext().assetPath('../dist/').init().container(container);
            iD.presetManager.merge({
                fields: {
                    'ugr-test-condition': { key: 'condition', type: 'text' },
                    'ugr-test-parcel': { key: 'ugr:parcel', type: 'text' }
                },
                presets: {
                    // like E1b's ugr/cadastre preset: it matches the lock tag, so its unsetTags would remove it
                    'ugr-test/cadastre': { name: 'Cadastre', tags: { 'ugr:locked': 'yes' }, geometry: ['line', 'area'] },
                    'ugr-test/grass': { name: 'Grass', tags: { landuse: 'grass' }, geometry: ['line', 'area'] },
                    'ugr-test/tree': { name: 'Tree', tags: { natural: 'tree' }, geometry: ['point', 'vertex'], fields: ['ugr-test-condition', 'ugr-test-parcel'] },
                    'ugr-test/shrub': { name: 'Shrub', tags: { natural: 'shrub' }, addTags: { natural: 'shrub', 'ugr:x': 'yes' }, geometry: ['point', 'vertex'] }
                }
            });
            vi.spyOn(iD.presetManager, 'setMostRecent').mockImplementation(function () {});   // keep recents out of other specs
            scrollTo = Element.prototype.scrollTo;
            Element.prototype.scrollTo = function () {};   // not implemented by jsdom
            iD.ugrSetRules(rules);
            context.history().merge(lockedParcelAndTree());
        });

        afterEach(function () {
            vi.restoreAllMocks();
            Element.prototype.scrollTo = scrollTo;
            iD.presetManager.merge({
                presets: { 'ugr-test/cadastre': null, 'ugr-test/grass': null, 'ugr-test/tree': null, 'ugr-test/shrub': null },
                fields: { 'ugr-test-condition': null, 'ugr-test-parcel': null }
            });
        });

        // Search the preset list the way a user does (the geometry fallbacks aren't addable), then click the result.
        async function choose(entityID, search, presetID) {
            var list = iD.uiPresetList(context).entityIDs([entityID]);
            var pane = container.append('div').call(list);
            pane.select('.preset-search-input').property('value', search).dispatch('input');
            await new Promise(function (resolve) { setTimeout(resolve, 10); });   // the search input is debounced
            var button = pane.select('.preset-list-item.preset-' + presetID + ' .preset-list-button');
            expect(button.empty()).toBe(false);
            button.dispatch('click');
        }

        it('refuses to change the type of a locked feature', async function () {
            var graph = context.graph();
            expect(iD.presetManager.match(graph.entity('w1'), graph).id).toBe('ugr-test/cadastre');

            await choose('w1', 'Grass', 'ugr-test-grass');

            expect(context.entity('w1').tags).toEqual({ 'ugr:locked': 'yes', landuse: 'residential' });
            expect(context.history().hasChanges()).toBe(false);
        });

        it('keeps ugr:* and read-only tags, and adds none, when an editable feature changes type', async function () {
            var graph = context.graph();
            expect(iD.presetManager.match(graph.entity('n6'), graph).id).toBe('ugr-test/tree');

            await choose('n6', 'Shrub', 'ugr-test-shrub');

            expect(context.entity('n6').tags).toEqual({ natural: 'shrub', species: 'Tilia cordata', condition: 'good', 'ugr:parcel': '12' });
        });

        it('disables the feature type buttons for a locked feature only', function () {
            function presetResetDisabled(entityID) {
                var selection = d3_select(document.createElement('div'));
                iD.uiEntityEditor(context).state('select').entityIDs([entityID])(selection);
                var buttons = selection.selectAll('.preset-reset');
                expect(buttons.size()).toBe(2);   // header button and the Feature Type section button
                return buttons.nodes().map(function (node) {
                    return [node.disabled, node.classList.contains('disabled')];
                });
            }
            expect(presetResetDisabled('w1')).toEqual([[true, true], [true, true]]);
            expect(presetResetDisabled('n6')).toEqual([[false, false], [false, false]]);
        });
    });
});
