import { InnovationActionEntity, InnovationAssessmentEntity, InnovationSectionEntity, InnovationSupportEntity, InnovationThreadMessageEntity, NotificationEntity, NotificationUserEntity } from '@innovations/shared/entities';
import { InnovationActionStatusEnum, InnovationSectionStatusEnum, InnovationSupportStatusEnum, NotificationContextDetailEnum, NotificationContextTypeEnum } from '@innovations/shared/enums';
import { OrganisationErrorsEnum, UnprocessableEntityError } from '@innovations/shared/errors';
import type { CurrentCatalogTypes } from '@innovations/shared/schemas/innovation-record';
import type { DomainContextType, DomainUserInfoType } from '@innovations/shared/types';
import { injectable } from 'inversify';
import { BaseService } from './base.service';

@injectable()
export class StatisticsService extends BaseService {

  constructor() {
    super();
  }

  async getActions(innovationId: string, statuses: InnovationActionStatusEnum[]): Promise<{ updatedAt: Date, section: CurrentCatalogTypes.InnovationSections }[]> {

    const openActions = await this.sqlConnection.createQueryBuilder(InnovationActionEntity, 'action')
      .innerJoin('action.innovationSection', 'section')
      .innerJoin('section.innovation', 'innovation')
      .select('action.updatedAt', 'updatedAt')
      .addSelect('section.section', 'section')
      .where('innovation.id = :innovationId', { innovationId })
      .andWhere('action.status IN(:...statuses)', { statuses })
      .orderBy('action.createdAt', 'DESC')
      .getRawMany();

    return openActions;
  }

  async getSubmittedSections(innovationId: string): Promise<{ updatedAt: Date, section: CurrentCatalogTypes.InnovationSections }[]> {
    const sections = await this.sqlConnection.createQueryBuilder(InnovationSectionEntity, 'section')
      .innerJoin('section.innovation', 'innovation')
      .select('section.section', 'section')
      .addSelect('section.updatedAt', 'updatedAt')
      .where('innovation.id = :innovationId', { innovationId })
      .andWhere('section.status = :status', { status: InnovationSectionStatusEnum.SUBMITTED })
      .orderBy('section.updatedAt', 'DESC')
      .getRawMany();

    return sections;
  }

  async getUnreadMessages(innovationId: string, roleId: string): Promise<{
    count: number;
    lastSubmittedAt: null | Date;
  }> {

    const unreadMessages = await this.sqlConnection.createQueryBuilder(NotificationEntity, 'notification')
      .innerJoin('notification.innovation', 'innovation')
      .innerJoin('notification.notificationUsers', 'users')
      .select('count(*)', 'count')
      .addSelect('max(notification.createdAt)', 'lastSubmittedAt')
      .where('innovation.id = :innovationId', { innovationId })
      .andWhere('notification.context_type = :context_type', { context_type: NotificationContextTypeEnum.THREAD })
      .andWhere('notification.context_detail IN (:...context_detail)', { context_detail: [NotificationContextDetailEnum.THREAD_MESSAGE_CREATION, NotificationContextDetailEnum.THREAD_CREATION] })
      .andWhere('users.user_role_id = :roleId', { roleId })
      .andWhere('users.readAt IS NULL')
      .getRawOne();

    return unreadMessages;
  }

  async actionsToReview(
    innovationId: string,
    domainContext: DomainContextType,
  ): Promise<{ count: number, lastSubmittedSection: null | string, lastSubmittedAt: null | Date }> {

    const organisationUnit = domainContext.organisation?.organisationUnit?.id;

    if (!organisationUnit) {
      throw new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND);
    }

    const baseQuery = this.sqlConnection.createQueryBuilder(InnovationActionEntity, 'actions')
      .innerJoin('actions.innovationSupport', 'innovationSupport')
      .innerJoin('actions.innovationSection', 'section')
      .select('actions.updatedAt', 'updatedAt')
      .addSelect('section.section', 'section')
      .where('innovationSupport.organisation_unit_id = :organisationUnit', { organisationUnit })
      .andWhere('innovationSupport.innovation_id = :innovationId', { innovationId })
      .andWhere('actions.status = :status', { status: InnovationActionStatusEnum.SUBMITTED })
      .orderBy('actions.createdAt', 'DESC');

    const actions = await baseQuery.getRawMany();

    return {
      count: actions.length,
      lastSubmittedSection: actions.length > 0 ? actions[0].section : null,
      lastSubmittedAt: actions.length > 0 ? actions[0].updatedAt : null,
    };
  }

  async getSubmittedSectionsSinceSupportStart(innovationId: string, domainContext: DomainContextType): Promise<{ section: CurrentCatalogTypes.InnovationSections, updatedAt: Date }[]> {

    const organisationUnit = domainContext.organisation?.organisationUnit?.id;

    if (!organisationUnit) {
      throw new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND);
    }

    const innovationSupport = await this.sqlConnection.createQueryBuilder(InnovationSupportEntity, 'innovationSupport')
      .innerJoin('innovationSupport.innovation', 'innovation')
      .innerJoin('innovationSupport.organisationUnit', 'organisationUnit')
      .where('innovation.id = :innovationId', { innovationId })
      .andWhere('organisationUnit.id = :organisationUnit', { organisationUnit })
      .andWhere('innovationSupport.status IN (:...status)', { status: [InnovationSupportStatusEnum.ENGAGING, InnovationSupportStatusEnum.FURTHER_INFO_REQUIRED] })
      .getOne();

    const supportStartedAt = innovationSupport?.updatedAt;

    const sections = await this.sqlConnection.createQueryBuilder(InnovationSectionEntity, 'section')
      .innerJoin('section.innovation', 'innovation')
      .select('section.section', 'section_section')
      .addSelect('section.updatedAt', 'section_updated_at')
      .where('innovation.id = :innovationId', { innovationId })
      .andWhere('section.status = :status', { status: InnovationSectionStatusEnum.SUBMITTED })
      .andWhere('section.updated_at >= :supportStartedAt', { supportStartedAt })
      .orderBy('section.updatedAt', 'DESC')
      .getMany();

    return sections;
  }

  async getSubmittedSectionsSinceAssessmentStart(innovationId: string, requestUser: DomainUserInfoType): Promise<{ section: CurrentCatalogTypes.InnovationSections, updatedAt: Date }[]> {

    const assessment = await this.sqlConnection.createQueryBuilder(InnovationAssessmentEntity, 'assessments')
      .innerJoin('assessments.assignTo', 'assignTo')
      .innerJoin('assessments.innovation', 'innovation')
      .where('innovation.id = :innovationId', { innovationId })
      .andWhere('assignTo.id = :userId', { userId: requestUser.id })
      .getOne();

    const assessmentStartedAt = assessment?.updatedAt;

    const sections = await this.sqlConnection.createQueryBuilder(InnovationSectionEntity, 'section')
      .innerJoinAndSelect('section.innovation', 'innovation')
      .select('section.section', 'section_section')
      .addSelect('section.updatedAt', 'section_updated_at')
      .where('innovation.id = :innovationId', { innovationId })
      .andWhere('section.status = :status', { status: InnovationSectionStatusEnum.SUBMITTED })
      .andWhere('section.updated_at >= :assessmentStartedAt', { assessmentStartedAt })
      .orderBy('section.updatedAt', 'DESC')
      .getMany();

    return sections;
  }

  async getUnreadMessagesInitiatedBy(innovationId: string, roleId: string): Promise<{
    count: number;
    lastSubmittedAt: null | Date;
  }> {
    // gets unread messages on this threads
    // the context id is always the thread id regardless if the detail is a message or a reply
    const unreadMessageThreads = (await this.sqlConnection.createQueryBuilder()
      .select('thread.id', 'thread_id')
      .from(NotificationUserEntity, 'users')
      .innerJoin('users.notification', 'notification')
      .innerJoin('innovation_thread', 'thread',
        'thread.id = notification.context_id AND notification.context_type = :contextType AND notification.context_detail IN (:...contextDetail)',
        { contextType: NotificationContextTypeEnum.THREAD, contextDetail: [NotificationContextDetailEnum.THREAD_MESSAGE_CREATION, NotificationContextDetailEnum.THREAD_CREATION] }
      )
      .where('users.user_role_id = :roleId', { roleId: roleId })
      .andWhere('users.read_at IS NULL')
      .andWhere('thread.innovation_id = :innovationId', { innovationId })
      .andWhere('thread.author_user_role_id = :roleId', { roleId: roleId })
      .getRawMany());

    const unreadMessages = unreadMessageThreads.length;

    // gets the latest message on the unread threads
    const latestMessage = unreadMessages > 0 ? await this.sqlConnection.createQueryBuilder(InnovationThreadMessageEntity, 'message')
      .where('message.thread in (:...threadIds)', { threadIds: [...new Set(unreadMessageThreads.map(_ => _.thread_id))] })
      .orderBy('message.created_at', 'DESC')
      .limit(1)
      .getOne() : null;

    return {
      count: unreadMessages,
      lastSubmittedAt: latestMessage?.createdAt || null,
    };
  }


}
