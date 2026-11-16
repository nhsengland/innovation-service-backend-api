import { classifyFileScan, type FileScanStatus } from './file-scan-policy';

describe('classifyFileScan', () => {
  const resultKey = 'Malware Scanning scan result';
  const nowMs = 1_000_000;
  const classify = (tags: Record<string, string>, uploadedAtMs?: number, exists = true): FileScanStatus =>
    classifyFileScan({ tags, uploadedAtMs, exists, nowMs });

  it.each([
    ['No threats found', 'ready', true],
    ['Malicious', 'rejected', false],
    ['Not scanned', 'not_scanned', false],
    ['Error', 'scan_failed', false],
    ['Skipped', 'scan_failed', false],
    ['', 'scan_failed', false],
    ['unknown', 'scan_failed', false],
    ['no threats found', 'scan_failed', false],
    ['NO THREATS FOUND', 'scan_failed', false],
    ['No threats found ', 'scan_failed', false],
    ['malicious', 'scan_failed', false],
    ['not scanned', 'scan_failed', false]
  ])('classifies exact Azure result %j as %s', (result, state, canDownload) => {
    expect(classify({ [resultKey]: result as string })).toEqual({ state, canDownload });
  });

  it.each(['Pending', 'unexpected'])('Azure result overrides marker %s', marker => {
    expect(classify({ [resultKey]: 'Malicious', ScanStatus: marker })).toEqual({
      state: 'rejected',
      canDownload: false
    });
    expect(classify({ [resultKey]: 'No threats found', ScanStatus: marker })).toEqual({
      state: 'ready',
      canDownload: true
    });
  });

  it('explicitly allows untagged legacy files without declaring them clean', () => {
    expect(classify({})).toEqual({ state: 'legacy_allowed', canDownload: true });
    expect(classify({ unrelated: 'value' }, 0)).toEqual({ state: 'legacy_allowed', canDownload: true });
  });

  it.each(['pending', '', 'Complete', 'Error', 'Skipped'])('fails closed for marker %j', ScanStatus => {
    expect(classify({ ScanStatus })).toEqual({ state: 'scan_failed', canDownload: false });
  });

  it.each([0, 299_999, -1])('keeps pending age %dms scanning', age => {
    expect(classify({ ScanStatus: 'Pending' }, nowMs - age)).toEqual({
      state: 'scanning',
      canDownload: false,
      retryAfterSeconds: 3
    });
  });

  it.each([300_000, 300_001, 900_000])('marks pending age %dms delayed', age => {
    expect(classify({ ScanStatus: 'Pending' }, nowMs - age)).toEqual({ state: 'delayed', canDownload: false });
  });

  it.each([undefined, NaN, Infinity, -Infinity])('keeps missing/invalid creation time %s blocked', uploadedAtMs => {
    expect(classify({ ScanStatus: 'Pending' }, uploadedAtMs)).toEqual({
      state: 'scanning',
      canDownload: false,
      retryAfterSeconds: 3
    });
  });

  it.each<Record<string, string>>([{}, { [resultKey]: 'No threats found' }, { ScanStatus: 'Pending' }])(
    'missing blob overrides tags %j',
    tags => {
      expect(classify(tags, 0, false)).toEqual({ state: 'removed', canDownload: false });
    }
  );

  it('does not accept inherited clean tags or inherited pending markers', () => {
    expect(classify(Object.create({ [resultKey]: 'No threats found', ScanStatus: 'Pending' }))).toEqual({
      state: 'legacy_allowed',
      canDownload: true
    });
  });
});
