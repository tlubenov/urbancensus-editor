import packageJSON from '../../../package.json';

describe('iD.ugrRelease', function () {
    it('names the fork release after the iD version it is based on', function () {
        expect(iD.ugrBaseVersion).toBe(packageJSON.version);
        expect(iD.ugrRelease).toBe('ugr-2.42.2-2');
    });
});
