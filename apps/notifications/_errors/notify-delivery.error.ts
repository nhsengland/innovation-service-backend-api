export class NotifyDeliveryError extends Error {
  constructor(
    public readonly status: number | undefined,
    public readonly retryAfterMs: number | undefined,
    public readonly retryable: boolean,
    message = 'GOV Notify email delivery failed'
  ) {
    super(message);
    this.name = 'NotifyDeliveryError';
  }
}
