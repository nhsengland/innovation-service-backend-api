import { randText } from '@ngneat/falso';
import type { DeepPartial, EntityManager } from 'typeorm';
import { InnovationSupportLogEntity } from '../../entities/innovation/innovation-support-log.entity';
import { OrganisationUnitEntity } from '../../entities/organisation/organisation-unit.entity';
import { UserRoleEntity } from '../../entities/user/user-role.entity';
import { InnovationSupportLogTypeEnum, InnovationSupportStatusEnum } from '../../enums/innovation.enums';
import type { RoleType, SupportLogAssessmentSuggestion, SupportLogProgressUpdate } from '../../types';
import { BaseBuilder } from './base.builder';
import type { TestUserType } from './user.builder';

export type TestInnovationSupportLogType = {
  id: string;
  type: InnovationSupportLogTypeEnum;
  description: string;
  innovationSupportStatus?: string;
  createdBy: string;
  createdAt: Date;
  params?: SupportLogProgressUpdate['params'] | SupportLogAssessmentSuggestion['params'];
};

export class InnovationSupportLogBuilder extends BaseBuilder {
  supportLog: DeepPartial<InnovationSupportLogEntity> = {};

  constructor(entityManager: EntityManager) {
    super(entityManager);
    this.supportLog = {
      type: InnovationSupportLogTypeEnum.STATUS_UPDATE,
      innovationSupportStatus: InnovationSupportStatusEnum.SUGGESTED,
      description: randText({ charCount: 10 })
    };
  }

  setInnovation(innovationId: string): this {
    this.supportLog.innovation = { id: innovationId };
    return this;
  }

  setDescription(description: string): this {
    this.supportLog.description = description;
    return this;
  }

  setSupportStatus(status: InnovationSupportStatusEnum): this {
    this.supportLog.innovationSupportStatus = status;
    return this;
  }

  setCreatedBy(user: TestUserType, role: RoleType): this {
    this.supportLog.createdBy = user.id;
    this.supportLog.createdByUserRole = UserRoleEntity.new({ id: role.id });
    this.supportLog.organisationUnit = OrganisationUnitEntity.new({ id: role.organisationUnit?.id });
    return this;
  }

  setLogType(type: InnovationSupportLogTypeEnum): this {
    this.supportLog.type = type;
    return this;
  }

  setParams(params: SupportLogProgressUpdate['params'] | SupportLogAssessmentSuggestion['params']): this {
    this.supportLog.params = params;
    return this;
  }

  setSuggestedUnits(units: string[]): this {
    this.supportLog.suggestedOrganisationUnits = units.map(id => OrganisationUnitEntity.new({ id }));
    return this;
  }

  setOrganisationUnit(unitId: string): this {
    this.supportLog.organisationUnit = OrganisationUnitEntity.new({ id: unitId });
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
      innovationSupportStatus: savedLog.innovationSupportStatus ?? undefined,
      createdAt: savedLog.createdAt,
      createdBy: savedLog.createdBy,
      params: savedLog.params ? savedLog.params : undefined
    };
  }
}
