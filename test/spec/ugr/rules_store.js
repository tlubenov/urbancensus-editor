describe('iD.ugr rules store', function () {
    var rules = { version: 1, municipality: 'SOF46', presets: {} };

    afterEach(function () {
        iD.ugrSetRules(null);
        iD.ugrRulesRequired(false);
        delete iD.fileFetcher.cache().ugr_rules;
    });

    it('does not require rules under the test runner by default', function () {
        expect(iD.ugrRulesRequired()).toBe(false);
        expect(iD.ugrRulesReady()).toBe(true);
    });

    it('is not ready while rules are required and not loaded (fail closed)', function () {
        iD.ugrRulesRequired(true);
        expect(iD.ugrRulesReady()).toBe(false);
        iD.ugrSetRules(rules);
        expect(iD.ugrRulesReady()).toBe(true);
    });

    it('loads the ugr_rules data file', async function () {
        iD.fileFetcher.cache().ugr_rules = rules;
        await expect(iD.ugrLoadRules()).resolves.toBe(rules);
        expect(iD.ugrRules()).toBe(rules);
    });

    it('rejects and stays unloaded when the file cannot be fetched', async function () {
        var fileMap = iD.fileFetcher.fileMap();
        var original = fileMap.ugr_rules;
        fileMap.ugr_rules = 'data/does_not_exist.min.json';
        try {
            await expect(iD.ugrLoadRules()).rejects.toBeTruthy();
            expect(iD.ugrRules()).toBe(null);
        } finally {
            fileMap.ugr_rules = original;
        }
    });

    describe('a malformed rules file counts as not loaded', function () {
        it('rejects an empty object and stays unloaded', async function () {
            iD.fileFetcher.cache().ugr_rules = {};
            await expect(iD.ugrLoadRules()).rejects.toBeTruthy();
            expect(iD.ugrRules()).toBe(null);
        });

        it('rejects a wrong version, presets, boundary or top-level type', async function () {
            var malformed = [
                { presets: {} },
                { version: '1', presets: {} },
                { version: 1 },
                { version: 1, presets: [] },
                { version: 1, presets: null },
                { version: 1, presets: {}, boundary: { type: 'Point', coordinates: [0, 0] } },
                { version: 1, presets: {}, boundary: null },
                [],
                'rules'
            ];
            for (var i = 0; i < malformed.length; i++) {
                iD.fileFetcher.cache().ugr_rules = malformed[i];
                await expect(iD.ugrLoadRules(), JSON.stringify(malformed[i])).rejects.toBeTruthy();
                expect(iD.ugrRules(), JSON.stringify(malformed[i])).toBe(null);
            }
        });

        it('accepts a Polygon or MultiPolygon boundary', async function () {
            var polygon = { version: 1, presets: {}, boundary: { type: 'Polygon', coordinates: [] } };
            iD.fileFetcher.cache().ugr_rules = polygon;
            await expect(iD.ugrLoadRules()).resolves.toBe(polygon);
            var multi = { version: 2, presets: {}, boundary: { type: 'MultiPolygon', coordinates: [] } };
            iD.fileFetcher.cache().ugr_rules = multi;
            await expect(iD.ugrLoadRules()).resolves.toBe(multi);
        });
    });

    it('registers the ugr_rules file id', function () {
        expect(iD.fileFetcher.fileMap().ugr_rules).toBe('data/ugr_rules.min.json');
    });
});
