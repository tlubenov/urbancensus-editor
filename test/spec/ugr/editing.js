import { select as d3_select } from 'd3-selection';

describe('iD.ugr editing guards', function () {
    var graph;

    beforeEach(function () {
        // w1: locked parcel n1-n2-n3-n1; w2: free hedge n9-n8 whose end n9 is being dragged onto parcel corner n1
        graph = new iD.coreGraph([
            new iD.osmNode({ id: 'n1', loc: [0, 0] }),
            new iD.osmNode({ id: 'n2', loc: [0, 1] }),
            new iD.osmNode({ id: 'n3', loc: [1, 1] }),
            new iD.osmNode({ id: 'n8', loc: [5, 5] }),
            new iD.osmNode({ id: 'n9', loc: [0.0001, 0] }),
            new iD.osmNode({ id: 'n10', loc: [6, 6], tags: { natural: 'tree' } }),
            new iD.osmWay({ id: 'w1', nodes: ['n1', 'n2', 'n3', 'n1'], tags: { 'ugr:locked': 'yes', landuse: 'residential' } }),
            new iD.osmWay({ id: 'w2', nodes: ['n9', 'n8'], tags: { barrier: 'hedge' } })
        ]);
    });

    describe('ugrDragBlocked', function () {
        it('blocks dragging a node of a locked way', function () {
            expect(iD.ugrDragBlocked(graph.entity('n1'), graph)).toBe(true);
        });
        it('allows dragging a free node', function () {
            expect(iD.ugrDragBlocked(graph.entity('n9'), graph)).toBe(false);
        });
        it('blocks dragging a midpoint of a locked way', function () {
            expect(iD.ugrDragBlocked({ type: 'midpoint', parents: [graph.entity('w1')] }, graph)).toBe(true);
        });
        it('allows dragging a midpoint of a free way', function () {
            expect(iD.ugrDragBlocked({ type: 'midpoint', parents: [graph.entity('w2')] }, graph)).toBe(false);
        });
    });

    describe('ugrDrawTarget', function () {
        it('ignores a locked way, so the click places a free node instead of adding a vertex to it', function () {
            expect(iD.ugrDrawTarget(graph.entity('w1'), 'draw-line', graph)).toBe(null);
        });
        it('keeps a locked node while drawing a line, which only references the node', function () {
            expect(iD.ugrDrawTarget(graph.entity('n1'), 'draw-line', graph)).toBe(graph.entity('n1'));
        });
        it('ignores a locked node when adding a point, which would add tags to it', function () {
            expect(iD.ugrDrawTarget(graph.entity('n1'), 'add-point', graph)).toBe(null);
        });
        it('keeps free targets', function () {
            expect(iD.ugrDrawTarget(graph.entity('w2'), 'draw-line', graph)).toBe(graph.entity('w2'));
            expect(iD.ugrDrawTarget(undefined, 'draw-line', graph)).toBe(undefined);
        });
    });

    describe('ugrSnapNodes', function () {
        it('returns no snap nodes for a locked way segment', function () {
            var datum = { properties: { entity: graph.entity('w1'), nodes: [graph.entity('n1'), graph.entity('n2')] } };
            expect(iD.ugrSnapNodes(datum, graph)).toBe(undefined);
        });
        it('returns the snap nodes for a free way segment', function () {
            var nodes = [graph.entity('n9'), graph.entity('n8')];
            expect(iD.ugrSnapNodes({ properties: { entity: graph.entity('w2'), nodes: nodes } }, graph)).toBe(nodes);
        });
        it('returns undefined when there is no line target', function () {
            expect(iD.ugrSnapNodes({}, graph)).toBe(undefined);
            expect(iD.ugrSnapNodes(undefined, graph)).toBe(undefined);
        });
    });

    describe('ugrCanAttachToLocked', function () {
        it('allows an untagged node', function () {
            expect(iD.ugrCanAttachToLocked(graph.entity('n9'))).toBe(true);
        });
        it('refuses a tagged node, whose tags would merge into the locked node', function () {
            expect(iD.ugrCanAttachToLocked(graph.entity('n10'))).toBe(false);
        });
    });

    describe('ugrActionAttachToLocked', function () {
        it('replaces the dragged node with the locked node and leaves the locked features unchanged', function () {
            var parcel = graph.entity('w1');
            var corner = graph.entity('n1');
            var result = iD.ugrActionAttachToLocked('n1', 'n9')(graph);

            expect(result.entity('w2').nodes).toEqual(['n1', 'n8']);
            expect(result.hasEntity('n9')).toBe(undefined);
            expect(result.entity('w1')).toBe(parcel);
            expect(result.entity('n1')).toBe(corner);
        });

        it('deletes a way that collapses when its end is attached to a locked node it already contains', function () {
            var start = graph.replace(new iD.osmWay({ id: 'w3', nodes: ['n1', 'n9'], tags: { barrier: 'hedge' } }))
                .replace(graph.entity('w2').update({ nodes: ['n8'] }));
            var parcel = start.entity('w1');
            var result = iD.ugrActionAttachToLocked('n1', 'n9')(start);

            expect(result.hasEntity('w3')).toBe(undefined);
            expect(result.hasEntity('n9')).toBe(undefined);
            expect(result.entity('w1')).toBe(parcel);
            expect(result.entity('n1')).toBe(start.entity('n1'));
        });
    });

    describe('segments shared with a locked way', function () {
        // w1: locked parcel n1-n2-n3-n4-n1; w3: free hedge n1-n2 along the parcel's edge n1-n2; w4: free hedge n2-n5.
        // iD's actionAddMidpoint inserts a new vertex into every way that has the segment, not only the targeted one.
        var shared;

        function sharedEntities() {
            return [
                new iD.osmNode({ id: 'n1', loc: [0, 0], version: '1' }),
                new iD.osmNode({ id: 'n2', loc: [0, 0.001], version: '1' }),
                new iD.osmNode({ id: 'n3', loc: [0.001, 0.001], version: '1' }),
                new iD.osmNode({ id: 'n4', loc: [0.001, 0], version: '1' }),
                new iD.osmNode({ id: 'n5', loc: [-0.001, 0.002], version: '1' }),
                new iD.osmWay({ id: 'w1', nodes: ['n1', 'n2', 'n3', 'n4', 'n1'], version: '1', tags: { 'ugr:locked': 'yes', landuse: 'residential' } }),
                new iD.osmWay({ id: 'w3', nodes: ['n1', 'n2'], version: '1', tags: { barrier: 'hedge' } }),
                new iD.osmWay({ id: 'w4', nodes: ['n2', 'n5'], version: '1', tags: { barrier: 'hedge' } })
            ];
        }

        var parcelNodes = ['n1', 'n2', 'n3', 'n4', 'n1'];

        beforeEach(function () {
            shared = new iD.coreGraph(sharedEntities());
        });

        describe('ugrEdgeLocked', function () {
            it('is true for a segment of a locked way, in either node order', function () {
                expect(iD.ugrEdgeLocked(['n1', 'n2'], shared)).toBe(true);
                expect(iD.ugrEdgeLocked(['n2', 'n1'], shared)).toBe(true);
                expect(iD.ugrEdgeLocked(['n4', 'n1'], shared)).toBe(true);    // the closing segment
            });
            it('is false for a segment of free ways only', function () {
                expect(iD.ugrEdgeLocked(['n2', 'n5'], shared)).toBe(false);
            });
            it('is false for two nodes of a locked way that are not next to each other', function () {
                expect(iD.ugrEdgeLocked(['n1', 'n3'], shared)).toBe(false);
            });
            it('is false for a missing edge or node', function () {
                expect(iD.ugrEdgeLocked(undefined, shared)).toBe(false);
                expect(iD.ugrEdgeLocked(['n99', 'n1'], shared)).toBe(false);
            });
        });

        it('blocks dragging a midpoint whose segment a locked way shares, although its parents are only free ways', function () {
            expect(iD.ugrDragBlocked({ type: 'midpoint', edge: ['n1', 'n2'], parents: [shared.entity('w3')] }, shared)).toBe(true);
            expect(iD.ugrDragBlocked({ type: 'midpoint', edge: ['n2', 'n5'], parents: [shared.entity('w4')] }, shared)).toBe(false);
        });

        it('returns no snap nodes for a free way segment that a locked way shares', function () {
            var nodes = [shared.entity('n1'), shared.entity('n2')];
            expect(iD.ugrSnapNodes({ properties: { entity: shared.entity('w3'), nodes: nodes } }, shared)).toBe(undefined);
            var free = [shared.entity('n2'), shared.entity('n5')];
            expect(iD.ugrSnapNodes({ properties: { entity: shared.entity('w4'), nodes: free } }, shared)).toBe(free);
        });

        describe('ugrChosenEdgeLocked', function () {
            var projection = iD.geoRawMercator().scale(iD.geoZoomToScale(20));

            function pointOn(a, b) {
                return projection(iD.geoVecInterp(shared.entity(a).loc, shared.entity(b).loc, 0.5));
            }

            it('is true where a click on a free way would pick a segment that a locked way shares', function () {
                expect(iD.ugrChosenEdgeLocked(shared.entity('w3'), pointOn('n1', 'n2'), projection, undefined, shared)).toBe(true);
            });
            it('is true on the locked way itself', function () {
                expect(iD.ugrChosenEdgeLocked(shared.entity('w1'), pointOn('n3', 'n4'), projection, undefined, shared)).toBe(true);
            });
            it('is false on a segment of free ways only', function () {
                expect(iD.ugrChosenEdgeLocked(shared.entity('w4'), pointOn('n2', 'n5'), projection, undefined, shared)).toBe(false);
            });
        });

        it('leaves the parcel unchanged when a vertex is inserted only where the segment is not locked', function () {
            function insert(graph, edge) {
                var node = new iD.osmNode({ id: 'n-1' });
                var midpoint = { loc: iD.geoVecInterp(graph.entity(edge[0]).loc, graph.entity(edge[1]).loc, 0.5), edge: edge };
                return iD.ugrEdgeLocked(edge, graph) ? graph : iD.actionAddMidpoint(midpoint, node)(graph);
            }
            // unguarded, a vertex on the hedge's segment goes into the parcel as well
            var unguarded = iD.actionAddMidpoint({ loc: [0, 0.0005], edge: ['n1', 'n2'] }, new iD.osmNode({ id: 'n-1' }))(shared);
            expect(unguarded.entity('w1').nodes).toEqual(['n1', 'n-1', 'n2', 'n3', 'n4', 'n1']);

            expect(insert(shared, ['n1', 'n2']).entity('w1').nodes).toEqual(parcelNodes);
            var free = insert(shared, ['n2', 'n5']);
            expect(free.entity('w4').nodes).toEqual(['n2', 'n-1', 'n5']);
            expect(free.entity('w1').nodes).toEqual(parcelNodes);
        });

        describe('in the editor', function () {
            var context, container;

            beforeEach(function () {
                container = d3_select('body').append('div');   // attached, so pointer events reach window like in a browser
                context = iD.coreContext().assetPath('../dist/').init().container(container);
                container.append('div').attr('class', 'main-map').call(context.map())
                    .append('div').attr('class', 'inspector-wrap');
                context.map().centerZoom([0, 0.0005], 20);
                context.history().merge(sharedEntities());
                context.enter(iD.modeBrowse(context));
            });

            afterEach(function () {
                context.mode().exit();   // unbind the mode's document and window listeners
                container.remove();
            });

            // an element with the datum iD's line touch targets have (see svgSegmentWay)
            function segmentTarget(parent, wayID, a, b) {
                var graph = context.graph();
                return parent.append('div').datum({
                    type: 'Feature',
                    properties: { target: true, entity: graph.entity(wayID), nodes: [graph.entity(a), graph.entity(b)] }
                });
            }

            function screenPointOn(a, b) {
                return context.projection(iD.geoVecInterp(context.entity(a).loc, context.entity(b).loc, 0.5));
            }

            describe('behaviorDraw clicks', function () {
                var surface, draw, calls;

                beforeEach(function () {
                    calls = [];
                    draw = iD.behaviorDraw(context)
                        .on('click', function () { calls.push('click'); })
                        .on('clickWay', function (loc, edge) { calls.push('clickWay ' + edge.join('-')); })
                        .on('clickNode', function () { calls.push('clickNode'); });
                    surface = container.append('div');
                    surface.call(draw);
                });

                afterEach(function () {
                    draw.off(surface);
                    d3_select(window).on('click.draw-block', null);
                });

                function click(target, point) {
                    target.node().dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: point[0], clientY: point[1] }));
                    target.node().dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: point[0], clientY: point[1] }));
                }

                it('places a free node instead of adding a vertex on a free way segment that a locked way shares', function () {
                    click(segmentTarget(surface, 'w3', 'n1', 'n2'), screenPointOn('n1', 'n2'));
                    expect(calls).toEqual(['click']);
                });

                it('still adds a vertex on a segment of free ways only', function () {
                    click(segmentTarget(surface, 'w4', 'n2', 'n5'), screenPointOn('n2', 'n5'));
                    expect(calls).toEqual(['clickWay n2-n5']);
                });
            });

            describe('dropping a dragged node', function () {
                var end;

                beforeEach(function () {
                    context.perform(iD.actionAddEntity(new iD.osmNode({ id: 'n-9', loc: [-0.0001, 0.0005] })));
                    end = iD.modeDragNode(context).behavior.on('end');
                    context.perform(iD.actionNoop());   // what the drag start performs; the drop replaces it
                });

                function drop(target, point) {
                    context.map().mouse = function () { return point; };
                    end({ target: target.node() }, context.entity('n-9'));
                }

                it('leaves the node free on a free way segment that a locked way shares', function () {
                    drop(segmentTarget(container, 'w3', 'n1', 'n2'), screenPointOn('n1', 'n2'));
                    expect(context.entity('w1').nodes).toEqual(parcelNodes);
                    expect(context.entity('w3').nodes).toEqual(['n1', 'n2']);
                });

                it('still joins a segment of free ways only', function () {
                    drop(segmentTarget(container, 'w4', 'n2', 'n5'), screenPointOn('n2', 'n5'));
                    expect(context.entity('w4').nodes).toEqual(['n2', 'n-9', 'n5']);
                });
            });

            describe('double-clicking in select mode', function () {
                var doubleUp;

                beforeEach(function () {
                    context.enter(iD.modeSelect(context, ['w3']));
                    doubleUp = context.map().doubleUpHandler().on('doubleUp.modeSelect');
                });

                function doubleClick(datumTarget, point) {
                    datumTarget.classed('target', true);
                    doubleUp({ target: datumTarget.node() }, point);
                }

                it('adds no vertex to a free way segment that a locked way shares', function () {
                    doubleClick(segmentTarget(container, 'w3', 'n1', 'n2'), screenPointOn('n1', 'n2'));
                    expect(context.entity('w1').nodes).toEqual(parcelNodes);
                    expect(context.history().hasChanges()).toBe(false);
                });

                it('adds no vertex to a locked way', function () {
                    doubleClick(segmentTarget(container, 'w1', 'n3', 'n4'), screenPointOn('n3', 'n4'));
                    expect(context.entity('w1').nodes).toEqual(parcelNodes);
                    expect(context.history().hasChanges()).toBe(false);
                });

                it('adds no vertex through a midpoint whose segment a locked way shares', function () {
                    var midpoint = { type: 'midpoint', id: 'n1-n2', loc: [0, 0.0005], edge: ['n1', 'n2'], parents: [context.entity('w3')] };
                    var target = container.append('div').datum({ type: 'Feature', properties: { target: true, entity: midpoint } });
                    doubleClick(target, screenPointOn('n1', 'n2'));
                    expect(context.entity('w1').nodes).toEqual(parcelNodes);
                    expect(context.history().hasChanges()).toBe(false);
                });

                it('still adds a vertex to a segment of free ways only', function () {
                    doubleClick(segmentTarget(container, 'w4', 'n2', 'n5'), screenPointOn('n2', 'n5'));
                    expect(context.entity('w4').nodes).toHaveLength(3);
                });
            });
        });
    });
});
