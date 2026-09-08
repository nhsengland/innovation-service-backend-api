jest.mock('redis', () => ({
  createClient: jest.fn()
}));

import { createClient } from 'redis';
import type { LoggerService } from '../integrations/logger.service';
import { RedisService } from './redis.service';

type RedisClientMock = {
  on: jest.Mock;
  connect: jest.Mock;
  sAdd: jest.Mock;
  sPop: jest.Mock;
  quit: jest.Mock;
};

const createClientMock = createClient as jest.MockedFunction<typeof createClient>;

describe('RedisService', () => {
  let redis: RedisClientMock;
  let logger: Pick<LoggerService, 'log' | 'error'>;
  let service: RedisService;

  beforeEach(() => {
    redis = {
      on: jest.fn(),
      connect: jest.fn().mockResolvedValue(undefined),
      sAdd: jest.fn().mockResolvedValue(1),
      sPop: jest.fn().mockResolvedValue([]),
      quit: jest.fn().mockResolvedValue(undefined)
    };
    logger = {
      log: jest.fn(),
      error: jest.fn()
    };

    createClientMock.mockReset();
    createClientMock.mockReturnValue(redis as unknown as ReturnType<typeof createClient>);
    service = new RedisService(logger as LoggerService);
  });

  it('does not call SADD for an empty member list', async () => {
    await service.addToSet('elasticsearch', []);

    expect(redis.sAdd).not.toHaveBeenCalled();
  });

  it('logs an enqueue failure without rejecting', async () => {
    const error = new Error('Redis unavailable');
    redis.sAdd.mockRejectedValue(error);

    await expect(service.addToSet('elasticsearch', 'innovation-id')).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('elasticsearch'), error);
  });

  it('returns null when SPOP succeeds with no members', async () => {
    redis.sPop.mockResolvedValue([]);

    await expect(service.popFromSet('elasticsearch')).resolves.toBeNull();
  });

  it('returns the first member when SPOP succeeds', async () => {
    redis.sPop.mockResolvedValue(['innovation-id']);

    await expect(service.popFromSet('elasticsearch')).resolves.toBe('innovation-id');
  });

  it('rethrows a pop failure after logging it', async () => {
    const error = new Error('Connection timeout');
    redis.sPop.mockRejectedValue(error);

    await expect(service.popFromSet('elasticsearch')).rejects.toBe(error);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('elasticsearch'), error);
  });

  it('logs an initial connection failure', async () => {
    const error = new Error('Connection timeout');
    redis.connect.mockRejectedValue(error);

    service = new RedisService(logger as LoggerService);
    await new Promise(resolve => setImmediate(resolve));

    expect(logger.error).toHaveBeenCalledWith('Redis connection failed', error);
  });

  it('configures bounded socket recovery without offline command queuing', () => {
    expect(createClientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        disableOfflineQueue: true,
        socket: expect.objectContaining({
          connectTimeout: 10000,
          reconnectStrategy: expect.any(Function)
        })
      })
    );
  });
});
