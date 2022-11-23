import { InnovationEntity } from '@users/shared/entities';
import { InnovationStatusEnum } from '@users/shared/enums';
import { injectable } from 'inversify';
import { BaseService } from './base.service';

@injectable()
export class StatisticsService  extends BaseService {

  constructor() {
    super();
  }

  async waitingAssessment(): Promise<{count: number, overdue: number}> {

    const query = await this.sqlConnection.createQueryBuilder(InnovationEntity, 'innovation')
      .leftJoinAndSelect('innovation.assessments', 'assessments')
      .where('innovation.status IN (:...assessmentInnovationStatus)', { assessmentInnovationStatus: [InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT] })
      .getCount();


    const overdueCount = await this.sqlConnection.createQueryBuilder(InnovationEntity, 'innovation')
      .leftJoinAndSelect('innovation.assessments', 'assessments')
      .where('innovation.status IN (:...assessmentInnovationStatus)', { assessmentInnovationStatus: [InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT] })
      .andWhere(`DATEDIFF(day, innovation.submitted_at, GETDATE()) > 7 AND assessments.finished_at IS NULL`)
      .getCount();

    return {
      count: query,
      overdue: overdueCount
    }
  }
}