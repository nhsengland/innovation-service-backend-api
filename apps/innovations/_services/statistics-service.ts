import { InnovationActionEntity } from '@innovations/shared/entities';
import { InnovationActionStatusEnum } from '@innovations/shared/enums';
import { injectable } from 'inversify';
import { BaseService } from './base.service';

@injectable()
export class StatisticsService  extends BaseService {

  constructor() {
    super();
  }

  async getUnsubmittedActions(innovationId: string): Promise<{
    total: number;
    from: number;
    lastSubmittedAt: null | string;
  }> {
    
    const openActions = await  this.sqlConnection.createQueryBuilder(InnovationActionEntity, 'action')
    .innerJoinAndSelect('action.innovationSection', 'section')
    .innerJoinAndSelect('section.innovation', 'innovation')
    .where('innovation.id = :innovationId', { innovationId })
    .andWhere('action.status IN(:...status)', { status: [InnovationActionStatusEnum.REQUESTED, InnovationActionStatusEnum.IN_REVIEW] })
    .getMany();

    const lastSubmittedAction = await  this.sqlConnection.createQueryBuilder(InnovationActionEntity, 'action')
    .innerJoinAndSelect('action.innovationSection', 'section')
    .innerJoinAndSelect('section.innovation', 'innovation')
    .where('innovation.id = :innovationId', { innovationId })
    .andWhere('action.status = :status', { status:  InnovationActionStatusEnum.IN_REVIEW })
    .orderBy('action.updated_at', 'DESC')
    .limit(1)
    .getOne();

    return {
      total: openActions.filter(action => action.status === InnovationActionStatusEnum.IN_REVIEW).length,
      from: openActions.length,
      lastSubmittedAt: lastSubmittedAction?.updatedAt || null,
    }

  }
}