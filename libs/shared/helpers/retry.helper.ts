export const parseRetryAfterMs = (value: unknown): number | undefined => {
  const rawValue = Array.isArray(value) ? value[0] : value;

  const seconds =
    typeof rawValue === 'number'
      ? rawValue
      : typeof rawValue === 'string' && rawValue.trim() !== ''
        ? Number(rawValue)
        : undefined;

  if (seconds !== undefined && Number.isFinite(seconds)) {
    return Math.max(0, seconds * 1000);
  }

  if (typeof rawValue !== 'string') {
    return undefined;
  }

  const date = Date.parse(rawValue);
  return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now());
};

export const getRetryAfterMsFromHeaders = (headers: unknown): number | undefined => {
  if (!headers || typeof headers !== 'object') {
    return undefined;
  }

  const headerValues = headers as Record<string, unknown>;
  return parseRetryAfterMs(headerValues['retry-after'] ?? headerValues['Retry-After']);
};

export const isRetryableHttpStatus = (status: number): boolean => status === 408 || status === 429 || status >= 500;

export const getExponentialBackoffMs = (retryNumber: number, maxBackoffMs: number): number =>
  Math.min(Math.pow(2, retryNumber) * 1000, maxBackoffMs);
