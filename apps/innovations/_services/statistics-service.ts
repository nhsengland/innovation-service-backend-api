import { InnovationActionEntity, InnovationSectionEntity, InnovationThreadEntity, InnovationThreadMessageEntity, NotificationEntity } from '@innovations/shared/entities';
import { InnovationActionStatusEnum, InnovationSectionStatusEnum } from '@innovations/shared/enums';
import { injectable } from 'inversify';
import { BaseService } from './base.service';

@injectable()
export class StatisticsService  extends BaseService {

  constructor() {
    super();
  }

  async getActions(innovationId: string, statuses: InnovationActionStatusEnum[]): Promise<InnovationActionEntity[]> {
    
    const openActions = await  this.sqlConnection.createQueryBuilder(InnovationActionEntity, 'action')
    .innerJoinAndSelect('action.innovationSection', 'section')
    .innerJoinAndSelect('section.innovation', 'innovation')
    .where('innovation.id = :innovationId', { innovationId })
    .andWhere('action.status IN(:...statuses)', { statuses })
    .orderBy('action.createdAt', 'DESC')
    .getMany();

    return openActions;
  }

  async getSubmittedSections(innovationId: string): Promise<InnovationSectionEntity[]> {
    const sections = await this.sqlConnection.createQueryBuilder(InnovationSectionEntity, 'section')
    .innerJoinAndSelect('section.innovation', 'innovation')
    .where('innovation.id = :innovationId', { innovationId })
    .andWhere('section.status = :status', { status: InnovationSectionStatusEnum.SUBMITTED })
    .orderBy('section.updatedAt', 'DESC')
    .getMany();

    return sections;
  }

  async getUnreadMessages(innovationId: string, userId: string): Promise<{
    count: number;
    lastSubmittedAt: null | string;
  }> {

    const unreadMessages = await this.sqlConnection.createQueryBuilder(NotificationEntity, 'notification')
    .innerJoinAndSelect('notification.innovation', 'innovation')
    .innerJoinAndSelect('notification.notificationUsers', 'users')
    .where('innovation.id = :innovationId', { innovationId })
    .andWhere('notification.context_type = :context_type', { context_type: 'THREAD' })
    .andWhere('users.user_id = :userId', { userId })
    .andWhere('users.readAt IS NULL')
    .getMany();

    if (unreadMessages.length === 0) {
      return {
        count: 0,
        lastSubmittedAt: null,
      }
    }

    const unreadThreads = await this.sqlConnection.createQueryBuilder(InnovationThreadEntity, 'thread')
    .where('thread.id IN(:...ids)', { ids: unreadMessages.map(x => x.contextId) })
    .orderBy('thread.created_at', 'DESC')
    .getMany();

    const unreadThreadMessages = await this.sqlConnection.createQueryBuilder(InnovationThreadMessageEntity, 'threadMessage')
    .where('threadMessage.id IN(:...ids)', { ids: unreadMessages.map(x => x.contextId) })
    .orderBy('threadMessage.created_at', 'DESC')
    .getMany();


    const latestMessage = [...unreadThreads, ...unreadThreadMessages].sort((a, b) => {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }).find(_ => true);

    return {
      count: unreadMessages.length,
      lastSubmittedAt: latestMessage?.createdAt || null,
    }
  }

}