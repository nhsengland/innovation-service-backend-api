import type { DataSource, EntityManager, Repository } from 'typeorm';

import { ActivityLogEntity, InnovationActionEntity, InnovationEntity, InnovationExportRequestEntity, InnovationFileEntity, InnovationGroupedStatusViewEntity, InnovationSectionEntity, InnovationSupportEntity, InnovationSupportLogEntity, InnovationThreadEntity, InnovationThreadMessageEntity, NotificationEntity, OrganisationUnitEntity } from '../../entities';
import { ActivityEnum, ActivityTypeEnum, EmailNotificationPreferenceEnum, EmailNotificationTypeEnum, InnovationActionStatusEnum, InnovationExportRequestStatusEnum, InnovationGroupedStatusEnum, InnovationStatusEnum, InnovationSupportLogTypeEnum, InnovationSupportStatusEnum, NotificationContextTypeEnum, ServiceRoleEnum } from '../../enums';
import { InnovationErrorsEnum, NotFoundError, UnprocessableEntityError } from '../../errors';
import { TranslationHelper } from '../../helpers';
import type { ActivitiesParamsType, DomainContextType } from '../../types';
import type { FileStorageServiceType, IdentityProviderServiceType } from '../interfaces';


export class DomainInnovationsService {

  innovationRepository: Repository<InnovationEntity>;
  innovationSupportRepository: Repository<InnovationSupportEntity>;
  activityLogRepository: Repository<ActivityLogEntity>;

  constructor(
    private sqlConnection: DataSource,
    private fileStorageService: FileStorageServiceType,
    private identityProviderService: IdentityProviderServiceType
  ) {
    this.innovationRepository = this.sqlConnection.getRepository(InnovationEntity);
    this.innovationSupportRepository = this.sqlConnection.getRepository(InnovationSupportEntity);
    this.activityLogRepository = this.sqlConnection.getRepository(ActivityLogEntity);
  }


  async withdrawInnovations(
    entityManager: EntityManager,
    user: { id: string, roleId: string },
    innovations: { id: string, reason: null | string }[]
  ): Promise<{ id: string, name: string, supportingUserIds: string[] }[]> {

    const toReturn: { id: string, name: string, supportingUserIds: string[] }[] = [];

    const dbInnovations = await this.innovationRepository.createQueryBuilder('innovations')
      .leftJoinAndSelect('innovations.innovationSupports', 'supports')
      .leftJoinAndSelect('supports.organisationUnitUsers', 'organisationUnitUsers')
      .leftJoinAndSelect('organisationUnitUsers.organisationUser', 'organisationUsers')
      .leftJoinAndSelect('organisationUsers.user', 'users')
      .where('innovations.id IN (:...innovationIds)', { innovationIds: innovations.map(item => item.id) })
      .getMany();

    try {

      for (const dbInnovation of dbInnovations) {

        const reason = innovations.find(item => item.id === dbInnovation.id)?.reason || null;

        // Get all sections id's.
        const sections = await entityManager.createQueryBuilder(InnovationSectionEntity, 'section')
          .select(['section.id'])
          .where('section.innovation_id = :innovationId', { innovationId: dbInnovation.id })
          .getMany();
        const sectionsIds = sections.map(section => section.id);

        // Close opened actions, and deleted them all afterwards, hence 2 querys needed for both operations.
        await entityManager.createQueryBuilder().update(InnovationActionEntity)
          .set({ status: InnovationActionStatusEnum.DECLINED })
          .where('innovation_section_id IN (:...sectionsIds) AND status IN (:...innovationActionStatus)', {
            sectionsIds,
            innovationActionStatus: [InnovationActionStatusEnum.REQUESTED, InnovationActionStatusEnum.SUBMITTED]
          })
          .execute();

        await entityManager.createQueryBuilder().update(InnovationActionEntity)
          .set({ updatedBy: user.id, updatedByUserRole: user.roleId, deletedAt: new Date() })
          .where('innovation_section_id IN (:...sectionsIds)', { sectionsIds })
          .execute();

        // Reject all PENDING AND APPROVED export requests.
        await entityManager.createQueryBuilder().update(InnovationExportRequestEntity)
          .set({
            status: InnovationExportRequestStatusEnum.REJECTED,
            rejectReason: TranslationHelper.translate('DEFAULT_MESSAGES.EXPORT_REQUEST.WITHDRAW'),
            updatedBy: user.id
          })
          .where('innovation_id = :innovationId AND (status = :pendingStatus OR (status = :approvedStatus AND updated_at >= :expiredAt))', {
            innovationId: dbInnovation.id,
            pendingStatus: InnovationExportRequestStatusEnum.PENDING,
            approvedStatus: InnovationExportRequestStatusEnum.APPROVED,
            expiredAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString()
          })
          .execute();

        // Update all supports to UNASSIGNED AND delete them.
        for (const innovationSupport of dbInnovation.innovationSupports) {
          innovationSupport.status = InnovationSupportStatusEnum.UNASSIGNED;
          innovationSupport.organisationUnitUsers = [];
          innovationSupport.updatedBy = user.id;
          innovationSupport.deletedAt = new Date().toISOString();
          await entityManager.save(InnovationSupportEntity, innovationSupport);
        }

        // Update innovations to WITHDRAWN, removes all shares AND deleted them.
        dbInnovation.status = InnovationStatusEnum.WITHDRAWN;
        dbInnovation.updatedBy = user.id;
        dbInnovation.organisationShares = [];
        dbInnovation.withdrawReason = reason;
        dbInnovation.deletedAt = new Date().toISOString();
        await entityManager.save(InnovationEntity, dbInnovation);

        toReturn.push({
          id: dbInnovation.id,
          name: dbInnovation.name,
          // Return supporting users (without duplicates) for notifications.
          supportingUserIds: [...(new Set(
            dbInnovation.innovationSupports.flatMap(item => item.organisationUnitUsers.map(su => su.organisationUser.user.id))
          ))]
        });

      }

    } catch (error) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_WIDTHRAW_ERROR);
    }

    return toReturn;

  }


  /**
  * This is a legacy support that should be replaced by the activities log in due time.
  * For now it is still alive and is responsible fot storing the following actions:
  * - Accessors supports update
  * - Accessors suggesting other organisations/units.
  */
  async addSupportLog(
    transactionManager: EntityManager,
    user: { id: string, organisationUnitId: string },
    innovation: { id: string },
    supportStatus: InnovationSupportStatusEnum,
    supportLog: { type: InnovationSupportLogTypeEnum, description: string, suggestedOrganisationUnits: string[] }
  ): Promise<{ id: string }> {

    const supportLogData = InnovationSupportLogEntity.new({
      innovation: InnovationEntity.new({ id: innovation.id }),
      organisationUnit: OrganisationUnitEntity.new({ id: user.organisationUnitId }),
      innovationSupportStatus: supportStatus,
      description: supportLog.description,
      type: supportLog.type,
      suggestedOrganisationUnits: supportLog.suggestedOrganisationUnits?.map(id => OrganisationUnitEntity.new({ id })),
      createdBy: user.id,
      updatedBy: user.id
    });


    try {

      const savedSupportLog = await transactionManager.save(InnovationSupportLogEntity, supportLogData);
      return { id: savedSupportLog.id };

    } catch (error) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SUPPORT_LOG_ERROR);
    }

  }


  async addActivityLog<T extends ActivityEnum>(
    transactionManager: EntityManager,
    configuration: { innovationId: string, activity: T, domainContext: DomainContextType },
    params: ActivitiesParamsType<T>
  ): Promise<void> {

    const activityLog = ActivityLogEntity.new({
      innovation: InnovationEntity.new({ id: configuration.innovationId }),
      activity: configuration.activity,
      type: this.getActivityLogType(configuration.activity),
      createdBy: configuration.domainContext.id,
      updatedBy: configuration.domainContext.id,
      param: JSON.stringify({
        actionUserId: configuration.domainContext.id,
        actionUserRole: configuration.domainContext.currentRole.role,
        actionUserOrganisationUnit: configuration.domainContext.organisation?.organisationUnit?.id,
        ...params
      })
    });

    try {

      await transactionManager.save(ActivityLogEntity, activityLog);

    } catch (error) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_ACTIVITY_LOG_ERROR);
    }

  }

  private getActivityLogType(activity: ActivityEnum): ActivityTypeEnum {

    switch (activity) {
      case ActivityEnum.INNOVATION_CREATION:
      case ActivityEnum.INNOVATION_PAUSE:
      case ActivityEnum.OWNERSHIP_TRANSFER:
      case ActivityEnum.SHARING_PREFERENCES_UPDATE:
        return ActivityTypeEnum.INNOVATION_MANAGEMENT;

      case ActivityEnum.SECTION_DRAFT_UPDATE:
      case ActivityEnum.SECTION_SUBMISSION:
        return ActivityTypeEnum.INNOVATION_RECORD;

      case ActivityEnum.INNOVATION_SUBMISSION:
      case ActivityEnum.NEEDS_ASSESSMENT_START:
      case ActivityEnum.NEEDS_ASSESSMENT_COMPLETED:
      case ActivityEnum.NEEDS_ASSESSMENT_EDITED:
      case ActivityEnum.NEEDS_ASSESSMENT_REASSESSMENT_REQUESTED:
        return ActivityTypeEnum.NEEDS_ASSESSMENT;

      case ActivityEnum.ORGANISATION_SUGGESTION:
      case ActivityEnum.SUPPORT_STATUS_UPDATE:
        return ActivityTypeEnum.SUPPORT;

      case ActivityEnum.COMMENT_CREATION:
        return ActivityTypeEnum.COMMENTS;

      case ActivityEnum.THREAD_CREATION:
      case ActivityEnum.THREAD_MESSAGE_CREATION:
        return ActivityTypeEnum.THREADS;

      case ActivityEnum.ACTION_CREATION:
      case ActivityEnum.ACTION_STATUS_SUBMITTED_UPDATE:
      case ActivityEnum.ACTION_STATUS_DECLINED_UPDATE:
      case ActivityEnum.ACTION_STATUS_COMPLETED_UPDATE:
      case ActivityEnum.ACTION_STATUS_REQUESTED_UPDATE:
      case ActivityEnum.ACTION_STATUS_CANCELLED_UPDATE:
        return ActivityTypeEnum.ACTIONS;

      default:
        throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_ACTIVITY_LOG_INVALID_ITEM);
    }

  }


  async getUnreadNotifications(
    userId: string,
    contextIds: string[],
    entityManager?: EntityManager
  ): Promise<{ id: string, contextType: NotificationContextTypeEnum, contextId: string, params: string }[]> {

    const em = entityManager ?? this.sqlConnection.manager;

    const notifications = await em.createQueryBuilder(NotificationEntity, 'notification')
      .innerJoinAndSelect('notification.notificationUsers', 'notificationUsers')
      .innerJoinAndSelect('notificationUsers.user', 'user')
      .where('notification.context_id IN (:...contextIds)', { contextIds })
      .andWhere('user.id = :userId', { userId })
      .andWhere('notificationUsers.read_at IS NULL')
      .getMany();

    return notifications.map(item => ({
      id: item.id,
      contextType: item.contextType,
      contextId: item.contextId,
      params: item.params
    }));

  }


  async deleteInnovationFiles(transactionManager: EntityManager, files: InnovationFileEntity[]): Promise<void> {

    for (const file of files) {

      try {
        await transactionManager.softDelete(InnovationFileEntity, { id: file.id });
      } catch (error) {
        // TODO: Log this here!
        throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_FILE_DELETE_ERROR);
      }

      await this.fileStorageService.deleteFile(file.id, file.displayFileName);

    }
  }

  async getInnovationInfo(innovationId: string): Promise<InnovationEntity | null> {
    const innovation = await this.sqlConnection.createQueryBuilder(InnovationEntity, 'innovation')
      .innerJoinAndSelect('innovation.owner', 'owner')
      .where('innovation.id = :innovationId', { innovationId })
      .getOne();

    return innovation;
  }

  /**
   * Gets the intervinients of a thread, i.e. all the message authors and the context
   * in which the messages were created (organisationUnit) without duplicates
   * @param threadId
   * @param entityManager
   * @returns object with user info and organisation unit
   */
  async threadIntervenients(threadId: string, entityManager?: EntityManager): Promise<{
    id: string, identityId: string, name?: string, locked: boolean, isOwner?: boolean,
    userRole: { id: string, role: ServiceRoleEnum },
    organisationUnit: { id: string, acronym: string } | null,
    emailNotificationPreferences: { type: EmailNotificationTypeEnum, preference: EmailNotificationPreferenceEnum }[]
  }[]> {

    const connection = entityManager ?? this.sqlConnection.manager;

    const thread = await connection.createQueryBuilder(InnovationThreadEntity, 'thread')
      .select(['thread.id', 'innovation.id', 'owner.id'])
      .innerJoin('thread.innovation', 'innovation')
      .innerJoin('innovation.owner', 'owner')
      .where('thread.id = :threadId', { threadId })
      .getOne();

    if (!thread) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_THREAD_NOT_FOUND);
    }

    const messages = await connection.createQueryBuilder(InnovationThreadMessageEntity, 'threadMessage')
      .select([
        'threadMessage.id',
        'author.id', 'author.identityId', 'author.lockedAt',
        'authorRole.id', 'authorRole.role',
        'organisationUnit.id', 'organisationUnit.acronym',
        'notificationPreferences.notification_id', 'notificationPreferences.preference'
      ])
      .innerJoin('threadMessage.author', 'author')
      .innerJoin('threadMessage.authorUserRole', 'authorRole')
      .leftJoin('authorRole.organisationUnit', 'organisationUnit')
      .leftJoin('author.notificationPreferences', 'notificationPreferences')
      .where('threadMessage.innovation_thread_id = :threadId', { threadId })
      .andWhere('threadMessage.deleted_at IS NULL')
      .andWhere('threadMessage.innovation_thread_id = :threadId', { threadId })
      .getMany();

    const participants: Awaited<ReturnType<DomainInnovationsService['threadIntervenients']>> = [];
    const duplicateSet = new Set<string>();

    const authorIds = messages.map(m => m.author.identityId);

    const usersInfo = await this.identityProviderService.getUsersMap(authorIds);

    for (const message of messages) {
      // filter duplicates based on roleId
      if (!duplicateSet.has(message.authorUserRole.id)) {
        duplicateSet.add(message.authorUserRole.id);

        participants.push({
          id: message.author.id,
          identityId: message.author.identityId,
          name: usersInfo.get(message.author.identityId)?.displayName ?? '',
          locked: !!message.author.lockedAt,
          userRole: { id: message.authorUserRole.id, role: message.authorUserRole.role },
          ...message.authorUserRole.role === ServiceRoleEnum.INNOVATOR && { isOwner: message.author.id === thread.innovation.owner.id},
          organisationUnit: message.authorUserRole.organisationUnit ? {
            id: message.authorUserRole.organisationUnit.id,
            acronym: message.authorUserRole.organisationUnit.acronym
          } : null,
          emailNotificationPreferences: (await message.author.notificationPreferences).map(emailPreference => ({ type: emailPreference.notification_id, preference: emailPreference.preference }))
        });
      }
    }

    return participants;

  }

  async getInnovationsGroupedStatus(filters: { innovationIds?: string[], status?: InnovationGroupedStatusEnum }): Promise<Map<string, InnovationGroupedStatusEnum>> {
    const query = this.sqlConnection.createQueryBuilder(InnovationGroupedStatusViewEntity, 'innovationGroupedStatus');

    if (filters.innovationIds && filters.innovationIds.length) {
      query.andWhere('innovationGroupedStatus.innovationId IN (:...innovationIds)', { innovationIds: filters.innovationIds });
    }

    if (filters.status && filters.status.length) {
      query.andWhere('innovationGroupedStatus.groupedStatus IN (:...status)', { status: filters.status });
    }

    const groupedStatus = await query.getMany();

    return new Map(groupedStatus.map(cur => [cur.innovationId, cur.groupedStatus]));
  }

}
