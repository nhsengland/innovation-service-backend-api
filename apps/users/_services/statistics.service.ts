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


 async assignedInnovations(userId: string): Promise<{count: number; total: number; overdue: number}> {

  const count = await this.sqlConnection.createQueryBuilder(InnovationEntity, 'innovation')
      .leftJoinAndSelect('innovation.assessments', 'assessments')
      .leftJoinAndSelect('assessments.assignTo', 'assignTo')
      .where('innovation.status IN (:...assessmentInnovationStatus)', { assessmentInnovationStatus: [InnovationStatusEnum.NEEDS_ASSESSMENT] })
      .andWhere('assignTo.id = :userId', { userId })
      .getCount();

    const total = await this.sqlConnection.createQueryBuilder(InnovationEntity, 'innovation')
      .leftJoinAndSelect('innovation.assessments', 'assessments')
      .leftJoinAndSelect('assessments.assignTo', 'assignTo')
      .where('innovation.status IN (:...assessmentInnovationStatus)', { assessmentInnovationStatus: [InnovationStatusEnum.NEEDS_ASSESSMENT] })

      .getCount();

    const overdueCount = await this.sqlConnection.createQueryBuilder(InnovationEntity, 'innovation')
      .leftJoinAndSelect('innovation.assessments', 'assessments')
      .leftJoinAndSelect('assessments.assignTo', 'assignTo')
      .where('innovation.status IN (:...assessmentInnovationStatus)', { assessmentInnovationStatus: [InnovationStatusEnum.NEEDS_ASSESSMENT] })
      .andWhere(`DATEDIFF(day, innovation.submitted_at, GETDATE()) > 7 AND assessments.finished_at IS NULL`)
      .getCount();


  return {
    count: count,
    total: total,
    overdue: overdueCount
  }
 }
}