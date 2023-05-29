import { inject, injectable } from 'inversify';
import type { DataSource } from 'typeorm';

import { AuditEntity } from '../../entities/general/audit.entity';
import type { SQLConnectionService } from '../storage/sql-connection.service';
import SHARED_SYMBOLS from '../symbols';
import { QueuesEnum, StorageQueueService } from './storage-queue.service';

export enum ActionEnum {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete'
}

export enum TargetEnum {
  ASSESSMENT = 'assessment',
  INNOVATION = 'innovation',
  SUPPORT = 'support',
  THREAD = 'thread',
  USER = 'user'
}

export type AuditEntry = {
  user: string;
  action: ActionEnum;
  target: TargetEnum;
  targetId: string | null;
  innovationId: string | null;
  date?: Date;
  invocationId?: string;
  functionName?: string;
  // correlationId?: string  // (if we have this in the future it might even be added into the context so that it could be used for logging purposes also)
};

@injectable()
export class AuditService {
  private sqlConnection: DataSource;

  constructor(
    @inject(SHARED_SYMBOLS.StorageQueueService) private readonly storageQueueService: StorageQueueService,
    @inject(SHARED_SYMBOLS.SQLConnectionService)
    private readonly sqlConnectionService: SQLConnectionService
  ) {
    this.sqlConnection = this.sqlConnectionService.getConnection();
  }

  /**
   * this function sends the audit entry to the audit queue
   * @param entry audit entry to be sent
   */
  async audit(entry: AuditEntry): Promise<void> {
    // Assign a timestamp if not provided
    entry.date = entry.date ?? new Date();

    try {
      await this.storageQueueService.sendMessage(QueuesEnum.AUDIT, entry, {
        ...(entry.invocationId && { invocationId: entry.invocationId })
      });
    } catch (err) {
      // TODO maybe handle errors sending audit message / retry strategy
    }
  }

  /**
   * this function creates an audit entry to the database
   * @param auditEntity enitty to be saved
   * @returns the saved entity
   */
  async create(auditEntity: Omit<AuditEntity, 'id'>): Promise<AuditEntity> {
    return await this.sqlConnection.getRepository(AuditEntity).save(auditEntity);
  }
}
