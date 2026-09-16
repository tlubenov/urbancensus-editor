describe('iD.ugrPruneServices', function () {
    it('keeps only the OSM API connection and vector tiles', function () {
        var services = {
            geocoder: {}, osmose: {}, mapillary: {}, nsi: {}, kartaview: {}, vegbilder: {}, osm: {},
            osmWikibase: {}, maprules: {}, streetside: {}, taginfo: {}, vectorTile: {}, wikidata: {},
            wikipedia: {}, mapilio: {}, panoramax: {}
        };
        var result = iD.ugrPruneServices(services);
        expect(result).toBe(services);
        expect(Object.keys(result).sort()).toEqual(['osm', 'vectorTile']);
    });

    it('names the kept services', function () {
        expect(iD.ugrKeptServices).toEqual(['osm', 'vectorTile']);
    });
});
