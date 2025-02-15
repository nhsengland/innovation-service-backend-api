import {
  DocumentsStatisticsViewEntity,
  InnovationAssessmentEntity,
  InnovationExportRequestEntity,
  InnovationSectionEntity,
  InnovationSupportEntity,
  InnovationSurveyEntity,
  InnovationTaskEntity,
  InnovationThreadMessageEntity,
  NotificationEntity,
  NotificationUserEntity
} from '@innovations/shared/entities';
import {
  InnovationExportRequestStatusEnum,
  InnovationFileContextTypeEnum,
  InnovationSectionStatusEnum,
  InnovationSupportStatusEnum,
  InnovationTaskStatusEnum,
  ServiceRoleEnum
} from '@innovations/shared/enums';
import { NotFoundError, OrganisationErrorsEnum } from '@innovations/shared/errors';
import type { CurrentCatalogTypes } from '@innovations/shared/schemas/innovation-record';
import type { DomainService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { DomainContextType } from '@innovations/shared/types';
import { inject, injectable } from 'inversify';
import type { EntityManager } from 'typeorm';
import { BaseService } from './base.service';

@injectable()
export class StatisticsService extends BaseService {
  constructor(@inject(SHARED_SYMBOLS.DomainService) private domainService: DomainService) {
    super();
  }

  async getTasks(
    innovationId: string,
    statuses: InnovationTaskStatusEnum[],
    entityManager?: EntityManager
  ): Promise<{ updatedAt: Date; section: CurrentCatalogTypes.InnovationSections }[]> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const openTasks = await connection
      .createQueryBuilder(InnovationTaskEntity, 'task')
      .innerJoin('task.innovationSection', 'section')
      .innerJoin('section.innovation', 'innovation')
      .select('task.updatedAt', 'updatedAt')
      .addSelect('section.section', 'section')
      .where('innovation.id = :innovationId', { innovationId })
      .andWhere('task.status IN (:...statuses)', { statuses })
      .orderBy('task.createdAt', 'DESC')
      .getRawMany();

    return openTasks;
  }

  /**
   * This is the same logic as in getTasksCounter. If any chances are made here
   * it probably should be done on the other.
   */
  async getLastUpdatedTask(
    domainContext: DomainContextType,
    innovationId: string,
    statuses: InnovationTaskStatusEnum[],
    filters: { myTeam?: boolean; mine?: boolean },
    entityManager?: EntityManager
  ): Promise<{ id: string; updatedAt: Date; section: CurrentCatalogTypes.InnovationSections } | null> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const query = connection
      .createQueryBuilder(InnovationTaskEntity, 'task')
      .innerJoin('task.innovationSection', 'section')
      .innerJoin('section.innovation', 'innovation')
      .innerJoin('task.createdByUserRole', 'createdByUserRole')
      .select('task.id', 'id')
      .addSelect('task.updatedAt', 'updatedAt')
      .addSelect('section.section', 'section')
      .where('innovation.id = :innovationId', { innovationId })
      .andWhere('task.status IN (:...statuses)', { statuses })
      .orderBy('task.updatedAt', 'DESC');

    if (filters.myTeam) {
      if (domainContext.organisation?.organisationUnit?.id) {
        query.andWhere('createdByUserRole.organisation_unit_id = :organisationUnitId', {
          organisationUnitId: domainContext.organisation?.organisationUnit?.id
        });
      } else {
        query
          .andWhere('createdByUserRole.role = :role', { role: domainContext.currentRole.role })
          .andWhere('createdByUserRole.organisation_unit_id IS NULL');
      }
    }

    if (filters.mine) {
      query.andWhere('createdByUserRole.id = :roleId', { roleId: domainContext.currentRole.id });
    }

    return (await query.getRawOne()) ?? null;
  }

  // using type inference
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async getTasksCounter<T extends InnovationTaskStatusEnum[]>(
    domainContext: DomainContextType,
    innovationId: string,
    statuses: T
  ) {
    return this.domainService.innovations.getTasksCounter(domainContext, statuses, { innovationId, myTeam: true });
  }

  async getSubmittedSections(
    innovationId: string,
    entityManager?: EntityManager
  ): Promise<{ updatedAt: Date; section: CurrentCatalogTypes.InnovationSections }[]> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const sections = await connection
      .createQueryBuilder(InnovationSectionEntity, 'section')
      .innerJoin('section.innovation', 'innovation')
      .select('section.section', 'section')
      .addSelect('section.updatedAt', 'updatedAt')
      .where('innovation.id = :innovationId', { innovationId })
      .andWhere('section.status = :status', { status: InnovationSectionStatusEnum.SUBMITTED })
      .orderBy('section.updatedAt', 'DESC')
      .getRawMany();

    return sections;
  }

  async getUnreadMessages(
    innovationId: string,
    roleId: string,
    entityManager?: EntityManager
  ): Promise<{
    count: number;
    lastSubmittedAt: null | Date;
  }> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const unreadMessages = await connection
      .createQueryBuilder(NotificationEntity, 'notification')
      .innerJoin('notification.innovation', 'innovation')
      .innerJoin('notification.notificationUsers', 'users')
      .select('count(*)', 'count')
      .addSelect('max(notification.createdAt)', 'lastSubmittedAt')
      .where('innovation.id = :innovationId', { innovationId })
      .andWhere('notification.context_type = :context_type', { context_type: 'MESSAGES' })
      .andWhere('users.user_role_id = :roleId', { roleId })
      .andWhere('users.readAt IS NULL')
      .getRawOne();

    return unreadMessages;
  }

  async getSubmittedSectionsSinceSupportStart(
    innovationId: string,
    domainContext: DomainContextType,
    entityManager?: EntityManager
  ): Promise<{ section: CurrentCatalogTypes.InnovationSections; updatedAt: Date }[]> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const organisationUnit = domainContext.organisation?.organisationUnit?.id;

    if (!organisationUnit) {
      throw new NotFoundError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND);
    }

    const innovationSupport = await connection
      .createQueryBuilder(InnovationSupportEntity, 'innovationSupport')
      .innerJoin('innovationSupport.innovation', 'innovation')
      .innerJoin('innovationSupport.organisationUnit', 'organisationUnit')
      .where('innovation.id = :innovationId', { innovationId })
      .andWhere('organisationUnit.id = :organisationUnit', { organisationUnit })
      .andWhere('innovationSupport.status = :engagingStatus', { engagingStatus: InnovationSupportStatusEnum.ENGAGING })
      .getOne();

    const supportStartedAt = innovationSupport?.updatedAt;

    const sections = await connection
      .createQueryBuilder(InnovationSectionEntity, 'section')
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

  async getSubmittedSectionsSinceAssessmentStart(
    innovationId: string,
    entityManager?: EntityManager
  ): Promise<{ section: CurrentCatalogTypes.InnovationSections; updatedAt: Date }[]> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const assessment = await connection
      .createQueryBuilder(InnovationAssessmentEntity, 'assessment')
      .innerJoin('assessment.innovation', 'innovation')
      .where('innovation.id = :innovationId', { innovationId })
      .andWhere('assessment.id = innovation.current_assessment_id')
      .getOne();

    const assessmentStartedAt = assessment?.startedAt;

    const sections = await connection
      .createQueryBuilder(InnovationSectionEntity, 'section')
      .innerJoin('section.innovation', 'innovation')
      .select('section.section', 'section_section')
      .addSelect('section.updatedAt', 'section_updated_at')
      .where('innovation.id = :innovationId', { innovationId })
      .andWhere('section.status = :status', { status: InnovationSectionStatusEnum.SUBMITTED })
      .andWhere('section.updated_at >= :assessmentStartedAt', { assessmentStartedAt })
      .orderBy('section.updatedAt', 'DESC')
      .getMany();

    return sections;
  }

  async getUnreadMessagesInitiatedBy(
    innovationId: string,
    roleId: string,
    entityManager?: EntityManager
  ): Promise<{
    count: number;
    lastSubmittedAt: null | Date;
  }> {
    const connection = entityManager ?? this.sqlConnection.manager;

    // gets unread messages on this threads
    // the context id is always the thread id regardless if the detail is a message or a reply
    const unreadMessageThreads = await connection
      .createQueryBuilder()
      .select('thread.id', 'thread_id')
      .from(NotificationUserEntity, 'users')
      .innerJoin('users.notification', 'notification')
      .innerJoin(
        'innovation_thread',
        'thread',
        'thread.id = notification.context_id AND notification.context_type = :contextType',
        { contextType: 'MESSAGES' }
      )
      .where('users.user_role_id = :roleId', { roleId: roleId })
      .andWhere('users.read_at IS NULL')
      .andWhere('thread.innovation_id = :innovationId', { innovationId })
      .andWhere('thread.author_user_role_id = :roleId', { roleId: roleId })
      .getRawMany();

    const unreadMessages = unreadMessageThreads.length;

    // gets the latest message on the unread threads
    const latestMessage =
      unreadMessages > 0
        ? await connection
            .createQueryBuilder(InnovationThreadMessageEntity, 'message')
            .where('message.thread in (:...threadIds)', {
              threadIds: [...new Set(unreadMessageThreads.map(_ => _.thread_id))]
            })
            .orderBy('message.created_at', 'DESC')
            .limit(1)
            .getOne()
        : null;

    return {
      count: unreadMessages,
      lastSubmittedAt: latestMessage?.createdAt || null
    };
  }

  async getPendingExportRequests(innovationId: string, entityManager?: EntityManager): Promise<number> {
    const em = entityManager ?? this.sqlConnection.manager;

    const nPendingRequests = await em
      .createQueryBuilder(InnovationExportRequestEntity, 'request')
      .where('request.innovation_id = :innovationId', { innovationId })
      .andWhere('request.status = :requestStatus', { requestStatus: InnovationExportRequestStatusEnum.PENDING })
      .getCount();

    return nPendingRequests;
  }

  async getDocumentsStatistics(
    innovationId: string,
    entityManager?: EntityManager
  ): Promise<{
    uploadedByRoles: { role: ServiceRoleEnum; count: number }[];
    uploadedByUnits: { id: string; unit: string; count: number }[];
    locations: { location: InnovationFileContextTypeEnum; count: number }[];
  }> {
    const em = entityManager ?? this.sqlConnection.manager;

    const statistics = await em
      .createQueryBuilder(DocumentsStatisticsViewEntity, 'stats')
      .where('stats.innovation_id = :innovationId', { innovationId })
      .getOne();

    return {
      uploadedByRoles: statistics?.uploadedByRoles ?? [],
      uploadedByUnits: statistics?.uploadedByUnits ?? [],
      locations: statistics?.locations ?? []
    };
  }

  async getUnansweredSurveysByUnitStatistics(
    domainContext: DomainContextType,
    innovationId: string,
    entityManager?: EntityManager
  ): Promise<number> {
    const em = entityManager ?? this.sqlConnection.manager;

    const surveys = await em
      .createQueryBuilder(InnovationSurveyEntity, 'survey')
      .select(['survey.id', 'support.id', 'unit.name'])
      .innerJoin('survey.support', 'support')
      .innerJoin('support.organisationUnit', 'unit')
      .where('survey.innovation_id = :innovationId', { innovationId })
      .andWhere('survey.target_user_role_id = :targetRoleId', { targetRoleId: domainContext.currentRole.id })
      .andWhere('survey.answers IS NULL')
      .getMany();
    const uniqueUnits = new Set(surveys.map(s => s.support!.organisationUnit.name));

    return uniqueUnits.size;
  }
}
