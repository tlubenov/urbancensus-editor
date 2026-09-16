// ugr: no "view on openstreetmap.org" / history link; only findLastModifiedChild is still used
import { osmRelation, osmWay } from '../osm';


// ugr: context is no longer used now that viewOnOSM only removes the link
export function uiViewOnOSM() {
    var _what;   // an osmEntity or osmNote


    function viewOnOSM(selection) {
        // ugr: no "view on openstreetmap.org" / history link
        selection.selectAll('.view-on-osm').remove();
        return;
    }


    viewOnOSM.what = function(_) {
        if (!arguments.length) return _what;
        _what = _;
        return viewOnOSM;
    };

    return viewOnOSM;
}


/**
 * @param {iD.Graph} graph
 * @param {iD.OsmEntity} feature
 */
uiViewOnOSM.findLastModifiedChild = (graph, feature) => {
    let latest = feature;

    /** @param {iD.OsmEntity} obj */
    function recurseChilds(obj) {
        if (obj.timestamp > latest.timestamp) {
            latest = obj;
        }
        if (obj instanceof osmWay) {
            obj.nodes
                .map(id => graph.hasEntity(id))
                .filter(Boolean)
                .forEach(recurseChilds);
        } else if (obj instanceof osmRelation) {
            obj.members
                .map(m => graph.hasEntity(m.id))
                .filter(e => e instanceof osmWay || e instanceof osmRelation)
                .forEach(recurseChilds);
        }
    }

    recurseChilds(feature);
    return latest;
};
