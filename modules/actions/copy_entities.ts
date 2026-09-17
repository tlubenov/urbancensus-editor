import type { coreGraph } from '../core/graph';
import type { Action } from '../core/history';
import type { EntityId } from '../osm';
import type { OsmEntity } from '../osm/abstract-entity';
// ugr: pasted copies are ordinary features
import { ugrStripTags } from '../ugr/locking/is_locked';

export function actionCopyEntities(
    ids: EntityId[],
    fromGraph: coreGraph,
): Action {
    const _copies: Record<EntityId, OsmEntity> = {};

    const action: Action = function (graph) {
        ids.forEach(function (id) {
            fromGraph.entity(id).copy(fromGraph, _copies);
        });

        for (const id in _copies) {
            // ugr: drop backend-owned ugr:* tags (such as ugr:locked) so a copied parcel becomes an editable feature; declared ugr: attributes stay
            _copies[<EntityId>id] = _copies[<EntityId>id].update({ tags: ugrStripTags(_copies[<EntityId>id].tags) });
            graph = graph.replace(_copies[<EntityId>id]);
        }

        return graph;
    };

    action.copies = function () {
        return _copies;
    };

    return action;
}
