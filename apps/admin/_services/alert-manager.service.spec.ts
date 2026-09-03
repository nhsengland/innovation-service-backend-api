import {
  AlertManagerService,
  AzureTableAlertManagerThrottleStore,
  type AlertManagerThrottleEntity,
  type AlertManagerThrottleStore,
  type NormalizedAlertPayload
} from './alert-manager.service';

jest.mock('@azure/data-tables', () => {
  return {
    AzureNamedKeyCredential: jest.fn(),
    TableClient: Object.assign(
      jest.fn().mockImplementation(() => ({
        getEntity: jest.fn(),
        upsertEntity: jest.fn(),
        listEntities: jest.fn(),
        deleteEntity: jest.fn()
      })),
      {
        fromConnectionString: jest.fn().mockReturnValue({
          getEntity: jest.fn(),
          upsertEntity: jest.fn(),
          listEntities: jest.fn(),
          deleteEntity: jest.fn()
        })
      }
    )
  };
});

const alertRule = 'Innovation Service Main Website';
const alertRuleId =
  '/subscriptions/sub/resourceGroups/rg/providers/microsoft.insights/metricAlerts/Innovation Service Main Website';
const resourceId = '/subscriptions/sub/resourceGroups/rg/providers/microsoft.web/sites/site-prd';
const fixedNow = new Date('2026-06-04T10:00:00.000Z');
const alertRuleIdRowKey = '07b0887bcddd79db06f530ce99d602e3bf9bcfca5a3a8979f8e72568b0619c17';
const fallbackRowKey = 'b5ad45b3c0c3bd02c6af6e0a54cf2cdeee09e4210d491f30419c8011c0de58fa';

const buildPayload = (overrides?: {
  alertRule?: string;
  alertRuleId?: string;
  monitorCondition?: 'Fired' | 'Resolved' | string;
  resourceId?: string;
}): Record<string, any> => ({
  schemaId: 'azureMonitorCommonAlertSchema',
  data: {
    essentials: {
      alertId: 'alert-instance-id',
      alertRule: overrides?.alertRule ?? alertRule,
      ...((overrides && 'alertRuleId' in overrides ? overrides.alertRuleId : alertRuleId) && {
        alertRuleId: overrides && 'alertRuleId' in overrides ? overrides.alertRuleId : alertRuleId
      }),
      severity: 'Sev2',
      signalType: 'Metric',
      monitorCondition: overrides?.monitorCondition ?? 'Fired',
      alertTargetIDs: [overrides?.resourceId ?? resourceId],
      firedDateTime: '2026-06-04T09:59:00.000Z',
      description: 'Synthetic Azure Monitor test alert'
    },
    alertContext: {
      conditionType: 'SingleResourceMultipleMetricCriteria'
    }
  }
});

const createStore = (existingEntity?: Partial<AlertManagerThrottleEntity>): AlertManagerThrottleStore => {
  let entity = existingEntity;

  return {
    get: jest.fn(async () => (entity as AlertManagerThrottleEntity | undefined) ?? null),
    upsert: jest.fn(async updatedEntity => {
      entity = updatedEntity;
    }),
    deleteOldEntities: jest.fn(async () => undefined)
  };
};

const createService = (
  store: AlertManagerThrottleStore = createStore(),
  now = fixedNow
): {
  service: AlertManagerService;
  store: AlertManagerThrottleStore;
  sendManagerEmail: jest.Mock;
  logger: any;
} => {
  const sendManagerEmail = jest.fn(async (_alert: NormalizedAlertPayload, _recipients: string[]) => undefined);
  const logger = { log: jest.fn(), error: jest.fn(), info: jest.fn() } as any;
  const storageQueue = { sendMessage: jest.fn(async () => ({})) } as any;
  const service = new AlertManagerService({
    environment: 'prd',
    throttleMinutes: 4,
    managerRecipients: ['manager@example.com'],
    now: () => now,
    store,
    sendManagerEmail,
    logger,
    storageQueue
  });

  return { service, store, sendManagerEmail, logger };
};

describe('AlertManagerService', () => {
  describe('normalizePayload', () => {
    it('normalizes Azure Monitor common alert schema essentials', () => {
      const { service } = createService(createStore());

      const result = service.normalizePayload(buildPayload());

      expect(result).toStrictEqual({
        alertRule,
        alertRuleId,
        monitorCondition: 'Fired',
        severity: 'Sev2',
        resourceId,
        firedDateTime: '2026-06-04T09:59:00.000Z',
        description: 'Synthetic Azure Monitor test alert',
        alertContext: {
          conditionType: 'SingleResourceMultipleMetricCriteria'
        }
      });
    });

    it('rejects payloads that are not Azure Monitor common alert schema', () => {
      const { service } = createService(createStore());

      expect(() => service.normalizePayload({ schemaId: 'legacyMetricAlert', data: {} })).toThrow(
        'Unsupported Azure Monitor alert schema'
      );
    });

    it.each([
      ['alert rule', { data: { essentials: { ...buildPayload()['data'].essentials, alertRule: undefined } } }],
      [
        'monitor condition',
        { data: { essentials: { ...buildPayload()['data'].essentials, monitorCondition: undefined } } }
      ],
      ['target resource', { data: { essentials: { ...buildPayload()['data'].essentials, alertTargetIDs: [] } } }],
      ['fired date time', { data: { essentials: { ...buildPayload()['data'].essentials, firedDateTime: undefined } } }]
    ])('rejects payloads missing %s', (_field: string, partialPayload: Record<string, unknown>) => {
      const { service } = createService(createStore());

      expect(() =>
        service.normalizePayload({
          schemaId: 'azureMonitorCommonAlertSchema',
          ...partialPayload
        })
      ).toThrow('Invalid Azure Monitor common alert payload');
    });

    it('rejects unsupported monitor conditions', () => {
      const { service } = createService(createStore());

      expect(() => service.normalizePayload(buildPayload({ monitorCondition: 'Activated' }))).toThrow(
        'Unsupported Azure Monitor monitor condition'
      );
    });
  });

  describe('buildThrottleRowKey', () => {
    it('uses alert rule id and resource id when alert rule id exists', () => {
      const { service } = createService(createStore());
      const normalized = service.normalizePayload(buildPayload());

      expect(service.buildThrottleRowKey(normalized)).toBe(alertRuleIdRowKey);
    });

    it('falls back to alert rule name and resource id when alert rule id is missing', () => {
      const { service } = createService(createStore());
      const normalized = service.normalizePayload(buildPayload({ alertRuleId: undefined }));

      expect(service.buildThrottleRowKey(normalized)).toBe(fallbackRowKey);
    });
  });

  describe('handleAlert', () => {
    it('sends the first fired alert and stores throttle state', async () => {
      const store = createStore();
      const { service, sendManagerEmail } = createService(store);

      const result = await service.handleAlert(buildPayload());

      expect(result.action).toBe('sent');
      expect(sendManagerEmail).toHaveBeenCalledWith(expect.objectContaining({ alertRule, monitorCondition: 'Fired' }), [
        'manager@example.com'
      ]);
      expect(store.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          partitionKey: 'prd',
          rowKey: alertRuleIdRowKey,
          alertRuleName: alertRule,
          resourceId,
          currentMonitorCondition: 'Fired',
          incidentStartedAt: '2026-06-04T09:59:00.000Z',
          lastFiredEmailAt: fixedNow.toISOString()
        })
      );
    });

    it('suppresses duplicate fired alerts inside the throttle window', async () => {
      const store = createStore({
        partitionKey: 'prd',
        rowKey: alertRuleIdRowKey,
        lastFiredEmailAt: '2026-06-04T09:58:00.000Z'
      });
      const { service, sendManagerEmail } = createService(store);

      const result = await service.handleAlert(buildPayload());

      expect(result.action).toBe('suppressed');
      expect(sendManagerEmail).not.toHaveBeenCalled();
      expect(store.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          currentMonitorCondition: 'Fired',
          lastFiredEmailAt: '2026-06-04T09:58:00.000Z'
        })
      );
    });

    it('records resolved alerts without sending manager email', async () => {
      const store = createStore({
        partitionKey: 'prd',
        rowKey: alertRuleIdRowKey,
        lastFiredEmailAt: '2026-06-04T09:58:00.000Z'
      });
      const { service, sendManagerEmail } = createService(store);

      const result = await service.handleAlert(buildPayload({ monitorCondition: 'Resolved' }));

      expect(result.action).toBe('resolved_recorded');
      expect(sendManagerEmail).not.toHaveBeenCalled();
      expect(store.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          currentMonitorCondition: 'Resolved',
          lastResolvedEmailAt: fixedNow.toISOString(),
          lastFiredEmailAt: '2026-06-04T09:58:00.000Z'
        })
      );
    });

    it('suppresses fire/resolved/fire cycles inside the throttle window', async () => {
      const store = createStore({
        partitionKey: 'prd',
        rowKey: alertRuleIdRowKey,
        currentMonitorCondition: 'Resolved',
        lastFiredEmailAt: '2026-06-04T09:58:00.000Z',
        lastResolvedEmailAt: '2026-06-04T09:59:00.000Z'
      });
      const { service, sendManagerEmail } = createService(store);

      const result = await service.handleAlert(buildPayload({ monitorCondition: 'Fired' }));

      expect(result.action).toBe('suppressed');
      expect(sendManagerEmail).not.toHaveBeenCalled();
      expect(store.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          currentMonitorCondition: 'Fired',
          lastFiredEmailAt: '2026-06-04T09:58:00.000Z'
        })
      );
    });

    it('sends a reminder when a fired alert arrives after the throttle window', async () => {
      const store = createStore({
        partitionKey: 'prd',
        rowKey: alertRuleIdRowKey,
        currentMonitorCondition: 'Fired',
        lastFiredEmailAt: '2026-06-04T09:55:00.000Z'
      });
      const { service, sendManagerEmail } = createService(store);

      const result = await service.handleAlert(buildPayload());

      expect(result.action).toBe('sent');
      expect(sendManagerEmail).toHaveBeenCalledTimes(1);
      expect(store.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          currentMonitorCondition: 'Fired',
          lastFiredEmailAt: fixedNow.toISOString()
        })
      );
    });

    it('sends when the last fired email is exactly at the throttle boundary', async () => {
      const store = createStore({
        partitionKey: 'prd',
        rowKey: alertRuleIdRowKey,
        currentMonitorCondition: 'Fired',
        lastFiredEmailAt: '2026-06-04T09:56:00.000Z'
      });
      const { service, sendManagerEmail } = createService(store);

      const result = await service.handleAlert(buildPayload());

      expect(result.action).toBe('sent');
      expect(sendManagerEmail).toHaveBeenCalledTimes(1);
    });

    it('records lastUpdatedAt on every alert handled', async () => {
      const store = createStore();
      const { service } = createService(store);

      await service.handleAlert(buildPayload());

      expect(store.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          lastUpdatedAt: fixedNow.toISOString()
        })
      );
    });

    it('triggers opportunistic cleanup if the last cleanup was more than 24 hours ago', async () => {
      const store = createStore();
      // Provide a get mock that returns null for __cleanup__ to simulate it never having run
      store.get = jest.fn(async (_pk, rk) => {
        if (rk === '__cleanup__') return null;
        return null;
      });
      const { service } = createService(store);

      await service.handleAlert(buildPayload());

      expect(store.deleteOldEntities).toHaveBeenCalledWith('prd', 90);
      expect(store.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          rowKey: '__cleanup__',
          lastUpdatedAt: fixedNow.toISOString()
        })
      );
    });

    it('starts a new incident at the fired date time when there is no existing state', async () => {
      const store = createStore();
      const { service } = createService(store);

      await service.handleAlert(buildPayload());

      expect(store.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ incidentStartedAt: '2026-06-04T09:59:00.000Z' })
      );
    });

    it('preserves the original incident start when updating existing state', async () => {
      const store = createStore({
        partitionKey: 'prd',
        rowKey: alertRuleIdRowKey,
        currentMonitorCondition: 'Resolved',
        incidentStartedAt: '2026-06-04T08:00:00.000Z',
        lastFiredEmailAt: '2026-06-04T09:50:00.000Z'
      });
      const { service } = createService(store);

      await service.handleAlert(buildPayload({ monitorCondition: 'Resolved' }));

      expect(store.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ incidentStartedAt: '2026-06-04T08:00:00.000Z' })
      );
    });

    it('ignores alerts that are not approved for managers', async () => {
      const store = createStore();
      const { service, sendManagerEmail } = createService(store);

      const result = await service.handleAlert(buildPayload({ alertRule: 'http-5xx-errors-alert' }));

      expect(result.action).toBe('ignored');
      expect(store.upsert).not.toHaveBeenCalled();
      expect(sendManagerEmail).not.toHaveBeenCalled();
    });
  });
});

describe('AzureTableAlertManagerThrottleStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('deleteOldEntities', () => {
    it('queries table for old entities and deletes them, excluding the cleanup marker', async () => {
      const store = new AzureTableAlertManagerThrottleStore();

      const mockTableClient = (store as any).tableClient;
      mockTableClient.listEntities.mockReturnValue([
        { rowKey: 'old-record-1' },
        { rowKey: '__cleanup__' },
        { rowKey: 'old-record-2' }
      ]);

      await store.deleteOldEntities('prd', 90);

      // Verify listEntities was called with a filter looking for older than ~90 days
      expect(mockTableClient.listEntities).toHaveBeenCalledWith(
        expect.objectContaining({
          queryOptions: expect.objectContaining({
            filter: expect.stringMatching(/PartitionKey eq 'prd' and lastUpdatedAt lt '\d{4}-\d{2}-\d{2}T/)
          })
        })
      );

      // Verify deleteEntity was called only for the old records, not the marker
      expect(mockTableClient.deleteEntity).toHaveBeenCalledTimes(2);
      expect(mockTableClient.deleteEntity).toHaveBeenCalledWith('prd', 'old-record-1');
      expect(mockTableClient.deleteEntity).toHaveBeenCalledWith('prd', 'old-record-2');
      expect(mockTableClient.deleteEntity).not.toHaveBeenCalledWith('prd', '__cleanup__');
    });
  });
});
