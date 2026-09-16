// Only our own API (the OSM-compatible API in Django) and vector tiles stay. Everything else calls
// OpenStreetMap or third-party services: geocoding, QA layers, street-level photos, taginfo,
// name suggestions, Wikidata/Wikipedia.
export const ugrKeptServices = ['osm', 'vectorTile'];

export function ugrPruneServices(services) {
    Object.keys(services).forEach(key => {
        if (!ugrKeptServices.includes(key)) delete services[key];
    });
    return services;
}
