import { select as d3_select } from 'd3-selection';

describe('iD.rendererFeatures', function() {
    var dimensions = [1000, 1000];
    var context, features;

    beforeEach(function() {
        context = iD.coreContext().assetPath('../dist/').init();
        d3_select(document.createElement('div'))
            .attr('class', 'main-map')
            .call(context.map());
        context.map().zoom(16);
        features = iD.rendererFeatures(context);
    });

    describe('#keys', function() {
        it('returns feature keys', function() {
            // toContain checks only its first argument, so the previous form of this assertion
            // listed twelve keys and verified one. The list is short enough to compare whole.
            expect(features.keys()).toEqual(['ugr_locked', 'points', 'landuse', 'others']);
        });
    });

    describe('#disable', function() {
        it('disables features', function() {
            features.disable('landuse');
            expect(features.disabled()).toContain('landuse');
            expect(features.enabled()).not.toContain('landuse');
        });
    });

    describe('#enable', function() {
        it('enables features', function() {
            features.disable('landuse');
            features.enable('landuse');
            expect(features.disabled()).not.toContain('landuse');
            expect(features.enabled()).toContain('landuse');
        });
    });

    describe('#toggle', function() {
        it('toggles features', function() {
            features.toggle('landuse');
            expect(features.disabled()).toContain('landuse');
            expect(features.enabled()).not.toContain('landuse');

            features.toggle('landuse');
            expect(features.disabled()).not.toContain('landuse');
            expect(features.enabled()).toContain('landuse');
        });
    });

    describe('#gatherStats', function() {
        it('counts features', function() {
            var graph = new iD.coreGraph([
                new iD.osmNode({id: 'point_bar', tags: {amenity: 'bar'}, version: 1}),
                new iD.osmNode({id: 'point_dock', tags: {waterway: 'dock'}, version: 1}),
                new iD.osmNode({id: 'point_rail_station', tags: {railway: 'station'}, version: 1}),
                new iD.osmNode({id: 'point_generator', tags: {power: 'generator'}, version: 1}),
                new iD.osmNode({id: 'point_old_rail_station', tags: {'disused:railway': 'station'}, version: 1}),
                new iD.osmWay({id: 'motorway', tags: {highway: 'motorway'}, version: 1}),
                new iD.osmWay({id: 'building_yes', tags: {area: 'yes', amenity: 'school', building: 'yes'}, version: 1}),
                new iD.osmWay({id: 'boundary', tags: {boundary: 'administrative'}, version: 1}),
                new iD.osmWay({id: 'fence', tags: {barrier: 'fence'}, version: 1})
            ]);
            var all = Object.values(graph.base().entities);
            var stats;

            features.gatherStats(all, graph, dimensions);
            stats = features.stats();

            // Four buckets remain. The five nodes are points; the four ways -- a motorway, a
            // building, a boundary and a fence -- are no longer sorted into roads, buildings and
            // boundaries, so they all land in `others`, which is why that catch-all is kept.
            expect(features.keys()).toEqual(['ugr_locked', 'points', 'landuse', 'others']);
            expect(stats.points).toEqual(5);
            expect(stats.others).toEqual(4);
            expect(stats.landuse).toEqual(0);
            expect(stats.ugr_locked).toEqual(0);
        });
    });

    describe('matching', function() {
        var graph = new iD.coreGraph([
            // Points
            new iD.osmNode({id: 'point_bar', tags: {amenity: 'bar'}, version: 1}),
            new iD.osmNode({id: 'point_dock', tags: {waterway: 'dock'}, version: 1}),
            new iD.osmNode({id: 'point_rail_station', tags: {railway: 'station'}, version: 1}),
            new iD.osmNode({id: 'point_generator', tags: {power: 'generator'}, version: 1}),
            new iD.osmNode({id: 'point_old_rail_station', tags: {'disused:railway': 'station'}, version: 1}),

            // Traffic Roads
            new iD.osmWay({id: 'motorway', tags: {highway: 'motorway'}, version: 1}),
            new iD.osmWay({id: 'motorway_link', tags: {highway: 'motorway_link'}, version: 1}),
            new iD.osmWay({id: 'trunk', tags: {highway: 'trunk'}, version: 1}),
            new iD.osmWay({id: 'trunk_link', tags: {highway: 'trunk_link'}, version: 1}),
            new iD.osmWay({id: 'primary', tags: {highway: 'primary'}, version: 1}),
            new iD.osmWay({id: 'primary_link', tags: {highway: 'primary_link'}, version: 1}),
            new iD.osmWay({id: 'secondary', tags: {highway: 'secondary'}, version: 1}),
            new iD.osmWay({id: 'secondary_link', tags: {highway: 'secondary_link'}, version: 1}),
            new iD.osmWay({id: 'tertiary', tags: {highway: 'tertiary'}, version: 1}),
            new iD.osmWay({id: 'tertiary_link', tags: {highway: 'tertiary_link'}, version: 1}),
            new iD.osmWay({id: 'residential', tags: {highway: 'residential'}, version: 1}),
            new iD.osmWay({id: 'unclassified', tags: {highway: 'unclassified'}, version: 1}),
            new iD.osmWay({id: 'living_street', tags: {highway: 'living_street'}, version: 1}),

            // Service Roads
            new iD.osmWay({id: 'service', tags: {highway: 'service'}, version: 1}),
            new iD.osmWay({id: 'road', tags: {highway: 'road'}, version: 1}),
            new iD.osmWay({id: 'track', tags: {highway: 'track'}, version: 1}),

            // Paths
            new iD.osmWay({id: 'path', tags: {highway: 'path'}, version: 1}),
            new iD.osmWay({id: 'footway', tags: {highway: 'footway'}, version: 1}),
            new iD.osmWay({id: 'cycleway', tags: {highway: 'cycleway'}, version: 1}),
            new iD.osmWay({id: 'bridleway', tags: {highway: 'bridleway'}, version: 1}),
            new iD.osmWay({id: 'steps', tags: {highway: 'steps'}, version: 1}),
            new iD.osmWay({id: 'pedestrian', tags: {highway: 'pedestrian'}, version: 1}),

            // Buildings
            new iD.osmWay({id: 'building_yes', tags: {area: 'yes', amenity: 'school', building: 'yes'}, version: 1}),
            new iD.osmWay({id: 'building_no', tags: {area: 'yes', amenity: 'school', building: 'no'}, version: 1}),
            new iD.osmWay({id: 'building_part', tags: { 'building:part': 'yes'}, version: 1}),
            new iD.osmWay({id: 'garage1', tags: {area: 'yes', amenity: 'parking', parking: 'multi-storey'}, version: 1}),
            new iD.osmWay({id: 'garage2', tags: {area: 'yes', amenity: 'parking', parking: 'sheds'}, version: 1}),
            new iD.osmWay({id: 'garage3', tags: {area: 'yes', amenity: 'parking', parking: 'carports'}, version: 1}),
            new iD.osmWay({id: 'garage4', tags: {area: 'yes', amenity: 'parking', parking: 'garage_boxes'}, version: 1}),
            new iD.osmWay({id: 'building_construction', tags: {building: 'construction'}, version: 1}),

            // Indoor
            new iD.osmWay({id: 'room', tags: {area: 'yes', indoor: 'room'}, version: 1}),
            new iD.osmWay({id: 'indoor_area', tags: {area: 'yes', indoor: 'area'}, version: 1}),
            new iD.osmWay({id: 'indoor_bar', tags: {area: 'yes', indoor: 'room', amenity: 'bar'}, version: 1}),
            new iD.osmWay({id: 'corridor', tags: {highway: 'corridor', indoor: 'yes'}, version: 1}),

            // Pistes
            new iD.osmWay({id: 'downhill_piste', tags: {'piste:type': 'downhill'}, version: 1}),
            new iD.osmWay({id: 'piste_track_combo', tags: {'piste:type': 'alpine', highway: 'track'}, version: 1}),

            // Climbing routes
            new iD.osmWay({id: 'climbing_route', tags: {'climbing': 'route'}, version: 1}),

            // Aerialways
            new iD.osmWay({id: 'gondola', tags: {aerialway: 'gondola'}, version: 1}),
            new iD.osmWay({id: 'zip_line', tags: {aerialway: 'zip_line'}, version: 1}),
            new iD.osmWay({id: 'aerialway_platform', tags: {public_transport: 'platform', aerialway: 'yes'}, version: 1}),
            new iD.osmWay({id: 'old_aerialway_station', tags: {area: 'yes', aerialway: 'station'}, version: 1}),

            // Landuse
            new iD.osmWay({id: 'forest', tags: {area: 'yes', landuse: 'forest'}, version: 1}),
            new iD.osmWay({id: 'scrub', tags: {area: 'yes', natural: 'scrub'}, version: 1}),
            new iD.osmWay({id: 'industrial', tags: {area: 'yes', landuse: 'industrial'}, version: 1}),
            new iD.osmWay({id: 'parkinglot', tags: {area: 'yes', amenity: 'parking', parking: 'surface'}, version: 1}),
            new iD.osmWay({id: 'park', tags: {area: 'yes', leisure: 'park', parking: 'surface'}, version: 1}),

            // Landuse Multipolygon
            new iD.osmWay({id: 'outer', version: 1}),
            new iD.osmWay({id: 'inner1', version: 1}),
            new iD.osmWay({id: 'inner2', tags: {barrier: 'fence'}, version: 1}),
            new iD.osmWay({id: 'inner3', tags: {highway: 'residential'}, version: 1}),
            new iD.osmRelation({id: 'retail', tags: {landuse: 'retail', type: 'multipolygon'},
                    members: [
                        {id: 'outer', role: 'outer', type: 'way'},
                        {id: 'inner1', role: 'inner', type: 'way'},
                        {id: 'inner2', role: 'inner', type: 'way'},
                        {id: 'inner3', role: 'inner', type: 'way'}
                    ],
                    version: 1
                }),

            // Boundaries
            new iD.osmWay({id: 'boundary', tags: {boundary: 'administrative'}, version: 1}),
            new iD.osmWay({id: 'boundary_road', tags: {boundary: 'administrative', highway: 'primary'}, version: 1}),

            new iD.osmWay({id: 'boundary_member', version: 1}),
            new iD.osmWay({id: 'boundary_member2', version: 1}),

            // Boundary relations
            new iD.osmRelation({id: 'boundary_relation', tags: {type: 'boundary', boundary: 'administrative'},
                    members: [
                        {id: 'boundary_member'},
                    ],
                    version: 1
                }),
            new iD.osmRelation({id: 'boundary_relation2', tags: {type: 'boundary', boundary: 'administrative'},
                    members: [
                        // ways can be members of multiple boundary relations
                        {id: 'boundary_member'},
                        {id: 'boundary_member2'}
                    ],
                    version: 1
                }),

            // Water
            new iD.osmWay({id: 'water', tags: {area: 'yes', natural: 'water'}, version: 1}),
            new iD.osmWay({id: 'coastline', tags: {natural: 'coastline'}, version: 1}),
            new iD.osmWay({id: 'bay', tags: {area: 'yes', natural: 'bay'}, version: 1}),
            new iD.osmWay({id: 'pond', tags: {area: 'yes', landuse: 'pond'}, version: 1}),
            new iD.osmWay({id: 'basin', tags: {area: 'yes', landuse: 'basin'}, version: 1}),
            new iD.osmWay({id: 'reservoir', tags: {area: 'yes', landuse: 'reservoir'}, version: 1}),
            new iD.osmWay({id: 'salt_pond', tags: {area: 'yes', landuse: 'salt_pond'}, version: 1}),
            new iD.osmWay({id: 'river', tags: {waterway: 'river'}, version: 1}),

            // Rail
            new iD.osmWay({id: 'railway', tags: {railway: 'rail'}, version: 1}),
            new iD.osmWay({id: 'rail_landuse', tags: {area: 'yes', landuse: 'railway'}, version: 1}),
            new iD.osmWay({id: 'rail_disused', tags: {railway: 'disused'}, version: 1}),
            new iD.osmWay({id: 'rail_streetcar', tags: {railway: 'tram', highway: 'residential'}, version: 1}),
            new iD.osmWay({id: 'rail_trail', tags: {railway: 'disused', highway: 'cycleway'}, version: 1}),

            // Power
            new iD.osmWay({id: 'power_line', tags: {power: 'line'}, version: 1}),

            // Past/Future
            new iD.osmWay({id: 'motorway_construction', tags: {highway: 'construction', construction: 'motorway'}, version: 1}),
            new iD.osmWay({id: 'cycleway_proposed', tags: {highway: 'proposed', proposed: 'cycleway'}, version: 1}),
            new iD.osmWay({id: 'landuse_construction', tags: {area: 'yes', landuse: 'construction'}, version: 1}),

            // Others
            new iD.osmWay({id: 'fence', tags: {barrier: 'fence'}, version: 1}),
            new iD.osmWay({id: 'pipeline', tags: {man_made: 'pipeline'}, version: 1}),

            // Site relation
            new iD.osmRelation({id: 'site', tags: {type: 'site'},
                    members: [
                        {id: 'fence', role: 'perimeter'},
                        {id: 'building_yes'}
                    ],
                    version: 1
                })

        ]);
        var all = Object.values(graph.base().entities);


        function doMatch(rule, ids) {
            ids.forEach(function(id) {
                var entity = graph.entity(id);
                var geometry = entity.geometry(graph);
                const matches = features.getMatches(entity, graph, geometry);
                expect(matches).toHaveProperty(rule);
            });
        }

        function dontMatch(rule, ids) {
            ids.forEach(function(id) {
                var entity = graph.entity(id);
                var geometry = entity.geometry(graph);
                const matches = features.getMatches(entity, graph, geometry);
                expect(matches).not.toHaveProperty(rule);
            });
        }


        it('matches points', function () {
            features.gatherStats(all, graph, dimensions);

            doMatch('points', [
                'point_bar', 'point_dock', 'point_rail_station',
                'point_generator', 'point_old_rail_station'
            ]);

            dontMatch('points', [
                'motorway', 'service', 'path', 'building_yes',
                'forest', 'boundary', 'boundary_member', 'water', 'railway', 'power_line',
                'motorway_construction', 'fence'
            ]);
        });


















        it('matches landuse', function () {
            features.gatherStats(all, graph, dimensions);

            doMatch('landuse', [
                'forest', 'scrub', 'industrial', 'parkinglot', 'building_no',
                'rail_landuse', 'landuse_construction', 'retail',
                'outer', 'inner1', 'inner2'  // non-interesting members of landuse multipolygon
            ]);

            dontMatch('landuse', [
                'point_bar', 'motorway', 'service', 'path', 'building_yes',
                'boundary', 'boundary_member', 'water', 'railway', 'power_line',
                'motorway_construction', 'fence'
                // inner3, a highway-tagged member of the landuse multipolygon, used to be listed
                // here: with no highway rule left it is no longer "interesting", so it inherits
                // the parent's landuse like the other members.
            ]);
        });












        it('matches others', function () {
            features.gatherStats(all, graph, dimensions);

            doMatch('others', [
                'fence', 'pipeline'
            ]);

            // Roads, buildings, water, rail and the rest have no rule of their own any more, so
            // they are `others` now. Only a point, or something a surviving rule claims, is not.
            doMatch('others', [
                'motorway', 'service', 'path', 'building_yes', 'boundary', 'water',
                'railway', 'power_line', 'motorway_construction'
            ]);

            dontMatch('others', [
                'point_bar', 'forest', 'retail', 'outer', 'inner1', 'inner2'
            ]);
        });
    });


    describe('hiding', function() {
        it('hides child vertices on a hidden way', function() {
            var a = new iD.osmNode({id: 'a', version: 1});
            var b = new iD.osmNode({id: 'b', version: 1});
            var w = new iD.osmWay({id: 'w', nodes: [a.id, b.id], tags: {highway: 'path'}, version: 1});
            var graph = new iD.coreGraph([a, b, w]);
            var geometry = a.geometry(graph);
            var all = Object.values(graph.base().entities);

            features.disable('others');
            features.gatherStats(all, graph, dimensions);

            expect(features.isHiddenChild(a, graph, geometry)).toBe(true);
            expect(features.isHiddenChild(b, graph, geometry)).toBe(true);
            expect(features.isHidden(a, graph, geometry)).toBe(true);
            expect(features.isHidden(b, graph, geometry)).toBe(true);
        });

        it('hides uninteresting (e.g. untagged or "other") member ways on a hidden multipolygon relation', function() {
            var outer = new iD.osmWay({id: 'outer', tags: {}, version: 1});
            var inner1 = new iD.osmWay({id: 'inner1', tags: {barrier: 'fence'}, version: 1});
            var inner2 = new iD.osmWay({id: 'inner2', version: 1});
            // Interesting in its own right, which is what #2887 is about. It was a residential
            // road until the Map Features list was reduced; a locked cadastre way is the kind of
            // member this register actually has, and the lock rule is what now makes it interesting.
            var inner3 = new iD.osmWay({id: 'inner3', tags: {'ugr:locked': 'yes'}, version: 1});
            var r = new iD.osmRelation({
                id: 'r',
                tags: {type: 'multipolygon', natural: 'wood'},
                members: [
                    {id: outer.id, role: 'outer', type: 'way'},
                    {id: inner1.id, role: 'inner', type: 'way'},
                    {id: inner2.id, role: 'inner', type: 'way'},
                    {id: inner3.id, role: 'inner', type: 'way'}
                ],
                version: 1
            });
            var graph = new iD.coreGraph([outer, inner1, inner2, inner3, r]);
            var all = Object.values(graph.base().entities);

            features.disable('landuse');
            features.gatherStats(all, graph, dimensions);

            expect(features.isHidden(outer, graph, outer.geometry(graph))).toBe(true);     // #2548
            expect(features.isHidden(inner1, graph, inner1.geometry(graph))).toBe(true);   // #2548
            expect(features.isHidden(inner2, graph, inner2.geometry(graph))).toBe(true);   // #2548
            expect(features.isHidden(inner3, graph, inner3.geometry(graph))).toBe(false);  // #2887
        });

        it('hides only versioned entities', function() {
            var a = new iD.osmNode({id: 'a', version: 1});
            var b = new iD.osmNode({id: 'b'});
            var graph = new iD.coreGraph([a, b]);
            var ageo = a.geometry(graph);
            var bgeo = b.geometry(graph);
            var all = Object.values(graph.base().entities);

            features.disable('points');
            features.gatherStats(all, graph, dimensions);

            expect(features.isHidden(a, graph, ageo)).toBe(true);
            expect(features.isHidden(b, graph, bgeo)).toBe(false);
        });

        it('#forceVisible', function() {
            var a = new iD.osmNode({id: 'a', version: 1});
            var graph = new iD.coreGraph([a]);
            var ageo = a.geometry(graph);
            var all = Object.values(graph.base().entities);

            features.disable('points');
            features.gatherStats(all, graph, dimensions);
            features.forceVisible(['a']);

            expect(features.isHidden(a, graph, ageo)).toBe(false);
        });

        it('auto-hides features', function() {
            var graph = new iD.coreGraph([]);
            var maxPoints = 200;
            var all, hidden, autoHidden, i, msg;

            for (i = 0; i < maxPoints; i++) {
                graph.rebase([new iD.osmNode({version: 1})], [graph]);
            }

            all = Object.values(graph.base().entities);
            features.gatherStats(all, graph, dimensions);
            hidden = features.hidden();
            autoHidden = features.autoHidden();
            msg = i + ' points';

            expect(hidden, msg).not.toContain('points');
            expect(autoHidden, msg).not.toContain('points');

            graph.rebase([new iD.osmNode({version: 1})], [graph]);

            all = Object.values(graph.base().entities);
            features.gatherStats(all, graph, dimensions);
            hidden = features.hidden();
            autoHidden = features.autoHidden();
            msg = (i + 1) + ' points';

            expect(hidden, msg).toContain('points');
            expect(autoHidden, msg).toContain('points');
        });

        it('doubles auto-hide threshold when doubling viewport size', function() {
            var graph = new iD.coreGraph([]);
            var maxPoints = 400;
            var dimensions = [2000, 1000];
            var all, hidden, autoHidden, i, msg;

            for (i = 0; i < maxPoints; i++) {
                graph.rebase([new iD.osmNode({version: 1})], [graph]);
            }

            all = Object.values(graph.base().entities);
            features.gatherStats(all, graph, dimensions);
            hidden = features.hidden();
            autoHidden = features.autoHidden();
            msg = i + ' points';

            expect(hidden, msg).not.toContain('points');
            expect(autoHidden, msg).not.toContain('points');

            graph.rebase([new iD.osmNode({version: 1})], [graph]);

            all = Object.values(graph.base().entities);
            features.gatherStats(all, graph, dimensions);
            hidden = features.hidden();
            autoHidden = features.autoHidden();
            msg = (i + 1) + ' points';

            expect(hidden, msg).toContain('points');
            expect(autoHidden, msg).toContain('points');
        });
    });

});
