import type { DeepPartial, EntityManager } from 'typeorm';
import { InnovationSupportLogEntity } from '../../entities/innovation/innovation-support-log.entity';
import { BaseBuilder } from './base.builder';
import { InnovationSupportLogTypeEnum, InnovationSupportStatusEnum } from '../../enums/innovation.enums';
import { randText } from '@ngneat/falso';
import type { TestInnovationType } from './innovation.builder';
import type { TestUserType } from './user.builder';

export type TestInnovationSupportLogType = {
  id: string;
  type: InnovationSupportLogTypeEnum;
  description: string;
  innovationSupportStatus: string;
  createdBy: string;
  createdAt: Date;
};

export class InnovationSupportLogBuilder extends BaseBuilder {
  supportLog: DeepPartial<InnovationSupportLogEntity> = {};

  constructor(entityManager: EntityManager) {
    super(entityManager);
    this.supportLog = {
      innovationSupportStatus: InnovationSupportStatusEnum.UNASSIGNED,
      description: randText({ charCount: 10 })
    };
  }

  setInnovation(innovation: TestInnovationType): this {
    this.supportLog.innovation = { id: innovation.id };
    return this;
  }

  setSupportStatus(status: InnovationSupportStatusEnum): this {
    this.supportLog.innovationSupportStatus = status;
    return this;
  }

  setCreatedBy(user: TestUserType): this {
    this.supportLog.createdBy = user.id;
    return this;
  }

  async save(): Promise<TestInnovationSupportLogType> {
    const savedLog = await this.getEntityManager().getRepository(InnovationSupportLogEntity).save(this.supportLog);
    const log = await this.getEntityManager()
      .createQueryBuilder(InnovationSupportLogEntity, 'log')
      .where('log.id = :logId', { logId: savedLog.id })
      .getOne();

    if (!log) {
      throw new Error('Error saving/retrieving support log information.');
    }

    return {
      id: savedLog.id,
      type: savedLog.type,
      description: savedLog.description,
      innovationSupportStatus: savedLog.innovationSupportStatus,
      createdAt: savedLog.createdAt,
      createdBy: savedLog.createdBy
    };
  }
}
