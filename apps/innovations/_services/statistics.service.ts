import { InnovationActionEntity, InnovationAssessmentEntity, InnovationSectionEntity, InnovationSupportEntity, InnovationThreadMessageEntity, NotificationEntity, NotificationUserEntity } from '@innovations/shared/entities';
import { InnovationActionStatusEnum, InnovationSectionStatusEnum, InnovationSupportStatusEnum, NotificationContextDetailEnum, NotificationContextTypeEnum } from '@innovations/shared/enums';
import { OrganisationErrorsEnum, UnprocessableEntityError } from '@innovations/shared/errors';
import type { DateISOType, DomainUserInfoType } from '@innovations/shared/types';
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
    .andWhere('notification.context_type = :context_type', { context_type: NotificationContextTypeEnum.THREAD })
    .andWhere('notification.context_detail IN (:...context_detail)', { context_detail: [NotificationContextDetailEnum.THREAD_MESSAGE_CREATION, NotificationContextDetailEnum.THREAD_CREATION] })
    .andWhere('users.user_id = :userId', { userId })
    .andWhere('users.readAt IS NULL')
    .getMany();

    if (unreadMessages.length === 0) {
      return {
        count: 0,
        lastSubmittedAt: null,
      }
    }

    const latestMessage = unreadMessages.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }).find(_ => true);

    return {
      count: unreadMessages.length,
      lastSubmittedAt: latestMessage?.createdAt || null,
    }
  }

  async actionsToReview(
    innovationId: string,
    requestUser: DomainUserInfoType,
  ): Promise<{count: number, lastSubmittedSection: null | string, lastSubmittedAt: null | DateISOType}> {

    const organisationUnit = requestUser.organisations.find(_ => true)?.organisationUnits.find(_ => true)?.id;

    if (!organisationUnit) {
      throw new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND);
    }

    const baseQuery = this.sqlConnection.createQueryBuilder(InnovationActionEntity, 'actions')
    .innerJoinAndSelect('actions.innovationSupport', 'innovationSupport')
    .innerJoinAndSelect('actions.innovationSection', 'section')
    .where('innovationSupport.organisation_unit_id = :organisationUnit', { organisationUnit })
    .andWhere('innovationSupport.innovation_id = :innovationId', { innovationId })
    .andWhere('actions.status = :status', { status: InnovationActionStatusEnum.IN_REVIEW });
    
    const [myActions, myActionsCount] = await baseQuery.getManyAndCount();    

    return {
      count: myActionsCount,
      lastSubmittedSection: myActions.find(_ => true)?.innovationSection?.section || null,
      lastSubmittedAt: myActions.find(_ => true)?.updatedAt || null,
    }
  }

  async getSubmittedSectionsSinceSupportStart(innovationId: string, requestUser: DomainUserInfoType): Promise<[InnovationSectionEntity[], number]> {
   
    const organisationUnit = requestUser.organisations.find(_ => true)?.organisationUnits.find(_ => true)?.id;

    if (!organisationUnit) {
      throw new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND);
    }

    const innovationSupport  = await this.sqlConnection.createQueryBuilder(InnovationSupportEntity, 'innovationSupport')
      .innerJoinAndSelect('innovationSupport.innovation', 'innovation')
      .innerJoinAndSelect('innovationSupport.organisationUnit', 'organisationUnit')
      .where('innovation.id = :innovationId', { innovationId })
      .andWhere('organisationUnit.id = :organisationUnit', { organisationUnit })
      .andWhere('innovationSupport.status IN (:...status)', { status:[InnovationSupportStatusEnum.ENGAGING, InnovationSupportStatusEnum.FURTHER_INFO_REQUIRED] })
      .getOne();

    const supportStartedAt = innovationSupport?.updatedAt;
    
    const sections = await this.sqlConnection.createQueryBuilder(InnovationSectionEntity, 'section')
      .innerJoinAndSelect('section.innovation', 'innovation')
      .where('innovation.id = :innovationId', { innovationId })
      .andWhere('section.status = :status', { status: InnovationSectionStatusEnum.SUBMITTED })
      .andWhere('section.updated_at >= :supportStartedAt', { supportStartedAt })
      .orderBy('section.updatedAt', 'DESC')
      .getManyAndCount();

    return sections;
  }

  async getSubmittedSectionsSinceAssessmentStart(innovationId: string, requestUser: DomainUserInfoType): Promise<[InnovationSectionEntity[], number]> {
   
    const assessment = await this.sqlConnection.createQueryBuilder(InnovationAssessmentEntity, 'assessments')
      .innerJoinAndSelect('assessments.assignTo', 'assignTo')
      .innerJoinAndSelect('assessments.innovation', 'innovation')
      .where('innovation.id = :innovationId', { innovationId })
      .andWhere('assignTo.id = :userId', { userId: requestUser.id })
      .getOne();

    const assessmentStartedAt = assessment?.updatedAt;
 
    const sections = await this.sqlConnection.createQueryBuilder(InnovationSectionEntity, 'section')
      .innerJoinAndSelect('section.innovation', 'innovation')
      .where('innovation.id = :innovationId', { innovationId })
      .andWhere('section.status = :status', { status: InnovationSectionStatusEnum.SUBMITTED })
      .andWhere('section.updated_at >= :assessmentStartedAt', { assessmentStartedAt })
      .orderBy('section.updatedAt', 'DESC')
      .getManyAndCount();

    return sections;
  }

  async getUnreadMessagesInitiatedBy(innovationId: string, userId: string): Promise<{
    count: number;
    lastSubmittedAt: null | string;
  }> {
    // gets unread messages on this threads
    // the context id is always the thread id regardless if the detail is a message or a reply
    const unreadMessageThreads = (await this.sqlConnection.createQueryBuilder()
      .select('thread.id', 'thread_id')
      .from(NotificationUserEntity, 'users')
      .innerJoin('users.notification', 'notification')
      .innerJoin('innovation_thread', 'thread', 
        'thread.id = notification.context_id AND notification.context_type = :contextType AND notification.context_detail IN (:...contextDetail)',
        { contextType: NotificationContextTypeEnum.THREAD, contextDetail: [NotificationContextDetailEnum.THREAD_MESSAGE_CREATION, NotificationContextDetailEnum.THREAD_CREATION]}
      )
      .where('users.user_id = :userId', { userId })
      .andWhere('users.read_at IS NULL')
      .andWhere('thread.innovation_id = :innovationId', { innovationId })
      .andWhere('thread.created_by = :userId', { userId })
      .getRawMany());
    
    const unreadMessages = unreadMessageThreads.length;
    
    // gets the latest message on the unread threads
    const latestMessage = await this.sqlConnection.createQueryBuilder(InnovationThreadMessageEntity, 'message')
      .where('message.thread in (:...threadIds)', { threadIds: [...new Set(unreadMessageThreads.map(_ => _.thread_id))] })
      .orderBy('message.created_at', 'DESC')
      .limit(1)
      .getOne();

    return {
      count: unreadMessages,
      lastSubmittedAt: latestMessage?.createdAt || null,
    }
  }

  
}