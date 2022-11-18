import { InnovationActionEntity, InnovationSectionEntity, InnovationThreadEntity, InnovationThreadMessageEntity, NotificationEntity } from '@innovations/shared/entities';
import { InnovationActionStatusEnum, InnovationSectionEnum, InnovationSectionStatusEnum } from '@innovations/shared/enums';
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

    const sortedUnsubmittedActions = openActions.filter(x => x.status === InnovationActionStatusEnum.REQUESTED).sort((a, b) => {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    const lastSubmittedAction = sortedUnsubmittedActions.find(_ => true);

    return {
      total: openActions.filter(action => action.status === InnovationActionStatusEnum.IN_REVIEW).length,
      from: openActions.length,
      lastSubmittedAt: lastSubmittedAction?.updatedAt || null,
    }

  }

  async getSubmittedSections(innovationId: string): Promise<{
    total: number;
    from: number;
    lastSubmittedAt: null | string;
  }> {
    const sections = await this.sqlConnection.createQueryBuilder(InnovationSectionEntity, 'section')
    .innerJoinAndSelect('section.innovation', 'innovation')
    .where('innovation.id = :innovationId', { innovationId })
    .andWhere('section.status = :status', { status: InnovationSectionStatusEnum.SUBMITTED })
    .orderBy('section.updatedAt', 'DESC')
    .getMany();

    return {
      total: sections.length,
      from: Object.keys(InnovationSectionEnum).length,
      lastSubmittedAt: sections.find(_ => true)?.updatedAt || null,
    }

  }

  async getUnreadMessages(innovationId: string, userId: string): Promise<{
    total: number;
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
        total: 0,
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
      total: unreadMessages.length,
      lastSubmittedAt: latestMessage?.createdAt || null,
    }
  }

}