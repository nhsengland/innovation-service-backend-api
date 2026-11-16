export const FILE_SCAN_STATES = [
  'legacy_allowed',
  'scanning',
  'ready',
  'rejected',
  'delayed',
  'scan_failed',
  'not_scanned',
  'removed',
  'unavailable'
] as const;

export type FileScanState = (typeof FILE_SCAN_STATES)[number];

export type FileScanStatus = {
  state: FileScanState;
  canDownload: boolean;
  retryAfterSeconds?: number;
};

export type FileDownloadAccess = {
  scanState: FileScanState;
  canDownload: boolean;
  url?: string;
};

export function classifyFileScan(input: {
  tags: Record<string, string>;
  exists: boolean;
  uploadedAtMs?: number;
  nowMs: number;
}): FileScanStatus {
  if (!input.exists) return { state: 'removed', canDownload: false };

  const resultKey = 'Malware Scanning scan result';
  const hasResult = Object.prototype.hasOwnProperty.call(input.tags, resultKey);
  const hasMarker = Object.prototype.hasOwnProperty.call(input.tags, 'ScanStatus');

  if (hasResult) {
    switch (input.tags[resultKey]) {
      case 'Malicious':
        return { state: 'rejected', canDownload: false };
      case 'No threats found':
        return { state: 'ready', canDownload: true };
      case 'Not scanned':
        return { state: 'not_scanned', canDownload: false };
      default:
        return { state: 'scan_failed', canDownload: false };
    }
  }

  // Agreed legacy exception: neither tag means allowed, not confirmed clean.
  if (!hasMarker) return { state: 'legacy_allowed', canDownload: true };
  if (input.tags['ScanStatus'] !== 'Pending') return { state: 'scan_failed', canDownload: false };

  const delayed =
    input.uploadedAtMs !== undefined &&
    Number.isFinite(input.uploadedAtMs) &&
    input.nowMs - input.uploadedAtMs >= 300_000;
  return delayed
    ? { state: 'delayed', canDownload: false }
    : { state: 'scanning', canDownload: false, retryAfterSeconds: 3 };
}
