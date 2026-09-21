import crypto from 'crypto';
import { injectable, unmanaged } from 'inversify';
import { LoggerService } from '@admin/shared/services';
import SHARED_SYMBOLS from '@admin/shared/services/symbols';
import type { StorageQueueService } from '@admin/shared/services/integrations/storage-queue.service';
import { QueuesEnum } from '@admin/shared/services/integrations/storage-queue.service';
import { container } from '../_config';

import { AzureNamedKeyCredential, TableClient } from '@azure/data-tables';

type MonitorCondition = 'Fired' | 'Resolved';
type AlertManagerAction = 'sent' | 'suppressed' | 'resolved_recorded' | 'ignored';

export type NormalizedAlertPayload = {
  alertRule: string;
  alertRuleId?: string;
  monitorCondition: MonitorCondition;
  severity: string;
  resourceId: string;
  firedDateTime: string;
  description?: string;
  alertContext: Record<string, unknown>;
};

export type AlertManagerThrottleEntity = {
  partitionKey: string;
  rowKey: string;
  alertRuleName: string;
  resourceId: string;
  currentMonitorCondition: MonitorCondition;
  incidentStartedAt: string;
  lastFiredEmailAt?: string;
  lastResolvedEmailAt?: string;
  lastSeverity: string;
  lastPayloadSummary: string;
  lastUpdatedAt?: string;
};

export type AlertManagerThrottleStore = {
  get(partitionKey: string, rowKey: string): Promise<AlertManagerThrottleEntity | null>;
  upsert(entity: AlertManagerThrottleEntity): Promise<void>;
  deleteOldEntities(partitionKey: string, retentionDays: number): Promise<void>;
};

export type AlertManagerResult = {
  action: AlertManagerAction;
  reason: string;
};

type AlertManagerServiceOptions = {
  environment?: string;
  throttleMinutes?: number;
  retentionDays?: number;
  managerRecipients?: string[];
  logger?: LoggerService;
  storageQueue?: StorageQueueService;
  now?: () => Date;
  store?: AlertManagerThrottleStore;
  sendManagerEmail?: (alert: NormalizedAlertPayload, recipients: string[]) => Promise<void>;
};

const MANAGER_ALERT_ALLOW_LIST = new Set(
  [
    'Innovation Service Main Website',
    'Innovation Service Informational CPU',
    'Innovation Service Informational Memory',
    'Innovation Service App Gateway Unhealthy Hosts'
  ].map(s => s.toLowerCase())
);

export class AzureTableAlertManagerThrottleStore implements AlertManagerThrottleStore {
  private readonly tableClient: TableClient;

  constructor() {
    const connectionString = process.env['AZURE_STORAGE_CONNECTIONSTRING'] || '';
    const tableName = process.env['ALERT_MANAGER_TABLE_NAME'] || 'alertmanagerthrottle';

    if (connectionString.includes('AccountName=') && connectionString.includes('AccountKey=')) {
      this.tableClient = TableClient.fromConnectionString(connectionString, tableName);
      return;
    }

    const accountName = process.env['ALERT_MANAGER_STORAGE_ACCOUNT_NAME'] || '';
    const accountKey = process.env['ALERT_MANAGER_STORAGE_ACCOUNT_KEY'] || '';
    const endpoint = `https://${accountName}.table.core.windows.net`;
    this.tableClient = new TableClient(endpoint, tableName, new AzureNamedKeyCredential(accountName, accountKey));
  }

  async get(partitionKey: string, rowKey: string): Promise<AlertManagerThrottleEntity | null> {
    try {
      return await this.tableClient.getEntity<AlertManagerThrottleEntity>(partitionKey, rowKey);
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  async upsert(entity: AlertManagerThrottleEntity): Promise<void> {
    await this.tableClient.upsertEntity(entity, 'Merge');
  }

  async deleteOldEntities(partitionKey: string, retentionDays: number): Promise<void> {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

    const entities = this.tableClient.listEntities<AlertManagerThrottleEntity>({
      queryOptions: { filter: `PartitionKey eq '${partitionKey}' and lastUpdatedAt lt '${cutoffDate}'` }
    });

    for await (const entity of entities) {
      if (entity.rowKey !== '__cleanup__') {
        await this.tableClient.deleteEntity(partitionKey, entity.rowKey);
      }
    }
  }
}

@injectable()
export class AlertManagerService {
  private readonly environment: string;
  private readonly throttleMinutes: number;
  private readonly retentionDays: number;
  private readonly managerRecipients: string[];
  private readonly logger: LoggerService;
  private readonly storageQueue: StorageQueueService;
  private readonly now: () => Date;
  private readonly store: AlertManagerThrottleStore;
  private readonly sendManagerEmail: (alert: NormalizedAlertPayload, recipients: string[]) => Promise<void>;

  constructor(@unmanaged() options: AlertManagerServiceOptions = {}) {
    this.environment = options.environment ?? process.env['ALERT_MANAGER_ENVIRONMENT'] ?? 'local';
    this.throttleMinutes = options.throttleMinutes ?? Number(process.env['ALERT_MANAGER_THROTTLE_MINUTES'] || 4);
    this.retentionDays = options.retentionDays ?? Number(process.env['ALERT_MANAGER_RETENTION_DAYS'] || 90);
    this.managerRecipients =
      options.managerRecipients ??
      (process.env['ALERT_MANAGER_EMAIL_RECIPIENTS'] || '')
        .split(',')
        .map(email => email.trim())
        .filter(Boolean);
    this.logger = options.logger ?? new LoggerService();
    this.storageQueue = options.storageQueue ?? container.get<StorageQueueService>(SHARED_SYMBOLS.StorageQueueService);
    this.now = options.now ?? (() => new Date());
    this.store = options.store ?? new AzureTableAlertManagerThrottleStore();
    this.sendManagerEmail = options.sendManagerEmail ?? this.sendManagerEmailNotify.bind(this);
  }

  normalizePayload(payload: any): NormalizedAlertPayload {
    if (payload?.schemaId !== 'azureMonitorCommonAlertSchema') {
      throw new Error('Unsupported Azure Monitor alert schema');
    }

    const essentials = payload.data?.essentials;
    const alertRule = essentials?.alertRule;
    const monitorCondition = essentials?.monitorCondition;
    const resourceId = essentials?.alertTargetIDs?.[0];
    const firedDateTime = essentials?.firedDateTime;

    if (!alertRule || !monitorCondition || !resourceId || !firedDateTime) {
      throw new Error('Invalid Azure Monitor common alert payload');
    }

    if (!['Fired', 'Resolved'].includes(monitorCondition)) {
      throw new Error('Unsupported Azure Monitor monitor condition');
    }

    return {
      alertRule,
      ...(essentials.alertRuleId && { alertRuleId: essentials.alertRuleId }),
      monitorCondition,
      severity: essentials.severity ?? 'Unknown',
      resourceId,
      firedDateTime,
      ...(essentials.description && { description: essentials.description }),
      alertContext: payload.data?.alertContext ?? {}
    };
  }

  buildThrottleRowKey(alert: NormalizedAlertPayload): string {
    const keySource = `${alert.alertRuleId ?? alert.alertRule}${alert.resourceId}`;
    return crypto.createHash('sha256').update(keySource).digest('hex');
  }

  async handleAlert(payload: any): Promise<AlertManagerResult> {
    const alert = this.normalizePayload(payload);
    this.logger.log('[AlertManager] Handling alert', {
      alertRule: alert.alertRule,
      monitorCondition: alert.monitorCondition,
      resourceId: alert.resourceId
    });

    if (!MANAGER_ALERT_ALLOW_LIST.has((alert.alertRule || '').toLowerCase())) {
      return { action: 'ignored', reason: 'Alert is not manager-approved' };
    }

    const partitionKey = this.environment;
    const rowKey = this.buildThrottleRowKey(alert);
    const existing = await this.store.get(partitionKey, rowKey);
    const nowIso = this.now().toISOString();
    const baseEntity: AlertManagerThrottleEntity = {
      partitionKey,
      rowKey,
      alertRuleName: alert.alertRule,
      resourceId: alert.resourceId,
      currentMonitorCondition: alert.monitorCondition,
      incidentStartedAt: existing?.incidentStartedAt ?? alert.firedDateTime,
      lastFiredEmailAt: existing?.lastFiredEmailAt,
      lastResolvedEmailAt: existing?.lastResolvedEmailAt,
      lastSeverity: alert.severity,
      lastPayloadSummary: JSON.stringify({
        alertRule: alert.alertRule,
        severity: alert.severity,
        monitorCondition: alert.monitorCondition,
        firedDateTime: alert.firedDateTime
      }),
      lastUpdatedAt: nowIso
    };

    if (alert.monitorCondition === 'Resolved') {
      await this.store.upsert({ ...baseEntity, lastResolvedEmailAt: nowIso });
      await this.runOpportunisticCleanup(partitionKey);
      return { action: 'resolved_recorded', reason: 'Resolved alert recorded without manager email' };
    }

    if (this.shouldSuppress(existing?.lastFiredEmailAt)) {
      await this.store.upsert(baseEntity);
      await this.runOpportunisticCleanup(partitionKey);
      return { action: 'suppressed', reason: 'Manager email suppressed by throttle window' };
    }

    this.logger.log('[AlertManager] Fired alert will send manager email', {
      rowKey,
      recipients: this.managerRecipients,
      throttleMinutes: this.throttleMinutes
    });
    await this.sendManagerEmail(alert, this.managerRecipients);
    await this.store.upsert({ ...baseEntity, lastFiredEmailAt: nowIso });
    await this.runOpportunisticCleanup(partitionKey);

    return { action: 'sent', reason: 'Manager email sent' };
  }

  private async runOpportunisticCleanup(partitionKey: string): Promise<void> {
    try {
      const cleanupMarker = await this.store.get(partitionKey, '__cleanup__');
      const now = this.now();

      if (cleanupMarker?.lastUpdatedAt) {
        const lastCleanup = new Date(cleanupMarker.lastUpdatedAt);
        const hoursSinceLastCleanup = (now.getTime() - lastCleanup.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastCleanup < 24) {
          return;
        }
      }

      await this.store.deleteOldEntities(partitionKey, this.retentionDays);

      await this.store.upsert({
        partitionKey,
        rowKey: '__cleanup__',
        alertRuleName: '__cleanup__',
        resourceId: '__cleanup__',
        currentMonitorCondition: 'Resolved',
        incidentStartedAt: now.toISOString(),
        lastSeverity: 'Unknown',
        lastPayloadSummary: '{}',
        lastUpdatedAt: now.toISOString()
      });
    } catch (error) {
      this.logger.error('[AlertManager] Opportunistic cleanup failed', error);
    }
  }

  private shouldSuppress(lastFiredEmailAt?: string): boolean {
    if (!lastFiredEmailAt) {
      return false;
    }

    const elapsedMs = this.now().getTime() - new Date(lastFiredEmailAt).getTime();
    return elapsedMs < this.throttleMinutes * 60 * 1000;
  }

  private async sendManagerEmailNotify(alert: NormalizedAlertPayload, recipients: string[]): Promise<void> {
    for (const recipient of recipients) {
      try {
        await this.storageQueue.sendMessage(QueuesEnum.EMAIL, {
          data: {
            type: 'ADMIN_ALERT_MANAGER',
            to: recipient,
            params: {
              environment: this.environment.toUpperCase(),
              alertRule: alert.alertRule,
              status: alert.monitorCondition,
              severity: alert.severity,
              resourceId: alert.resourceId,
              firedDateTime: alert.firedDateTime,
              description: alert.description || 'No description provided'
            }
          }
        });
        this.logger.log(`Alert manager email queued via Storage Queue`, { recipient, alertRule: alert.alertRule });
      } catch (error) {
        this.logger.error(`Failed to queue alert manager email for ${recipient}`, error);
      }
    }
  }
}
