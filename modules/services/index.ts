import serviceOsmose from './osmose';
import serviceMapillary from './mapillary';
import serviceMapRules from './maprules';
import serviceNominatim from './nominatim';
import serviceNsi from './nsi';
import serviceKartaview from './kartaview';
import serviceVegbilder from './vegbilder';
import serviceOsm from './osm';
import serviceOsmWikibase from './osm_wikibase';
import serviceStreetside from './streetside';
import serviceTaginfo from './taginfo';
import serviceVectorTile from './vector_tile';
import serviceWikidata from './wikidata';
import serviceWikipedia from './wikipedia';
import serviceMapilio from './mapilio';
import servicePanoramax from './panoramax';
// ugr: OpenStreetMap-only and third-party services are removed
import { ugrPruneServices } from '../ugr/removals';


export let services = {
  geocoder: serviceNominatim,
  osmose: serviceOsmose,
  mapillary: serviceMapillary,
  nsi: serviceNsi,
  kartaview: serviceKartaview,
  vegbilder: serviceVegbilder,
  osm: serviceOsm,
  osmWikibase: serviceOsmWikibase,
  maprules: serviceMapRules,
  streetside: serviceStreetside,
  taginfo: serviceTaginfo,
  vectorTile: serviceVectorTile,
  wikidata: serviceWikidata,
  wikipedia: serviceWikipedia,
  mapilio: serviceMapilio,
  panoramax: servicePanoramax
};

// ugr: keep only our API and vector tiles
ugrPruneServices(services);

export {
  serviceOsmose,
  serviceMapillary,
  serviceMapRules,
  serviceNominatim,
  serviceNsi,
  serviceKartaview,
  serviceVegbilder,
  serviceOsm,
  serviceOsmWikibase,
  serviceStreetside,
  serviceTaginfo,
  serviceVectorTile,
  serviceWikidata,
  serviceWikipedia,
  serviceMapilio,
  servicePanoramax
};
