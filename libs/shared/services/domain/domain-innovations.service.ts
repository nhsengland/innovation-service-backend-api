import type { DataSource, EntityManager, Repository } from 'typeorm';

import { ActivityLogEntity, InnovationActionEntity, InnovationEntity, InnovationExportRequestEntity, InnovationFileEntity, InnovationSectionEntity, InnovationSupportEntity, InnovationSupportLogEntity, InnovationThreadEntity, InnovationThreadMessageEntity, NotificationEntity, OrganisationUnitEntity } from '../../entities';
import { ActivityEnum, ActivityTypeEnum, EmailNotificationPreferenceEnum, EmailNotificationTypeEnum, InnovationActionStatusEnum, InnovationExportRequestStatusEnum, InnovationGroupedStatusEnum, InnovationStatusEnum, InnovationSupportLogTypeEnum, InnovationSupportStatusEnum, NotificationContextTypeEnum, ServiceRoleEnum } from '../../enums';
import { InnovationErrorsEnum, NotFoundError, UnprocessableEntityError } from '../../errors';
import type { ActivitiesParamsType, DomainContextType } from '../../types';

import { InnovationGroupedStatusViewEntity } from '../../entities/views/innovation-grouped-status.view.entity';
import { TranslationHelper } from '../../helpers';
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
    transactionManager: EntityManager,
    user: { id: string },
    innovations: { id: string, reason: null | string }[]
  ): Promise<{
    id: string,
    name: string,
    supportingUserIds: string[]
  }[]> {

    const toReturn: { id: string, name: string, supportingUserIds: string[] }[] = [];

    const dbInnovations = await this.innovationRepository.createQueryBuilder('innovations')
      .innerJoinAndSelect('innovations.innovationSupports', 'supports')
      .innerJoinAndSelect('supports.organisationUnitUsers', 'organisationUnitUsers')
      .innerJoinAndSelect('organisationUnitUsers.organisationUser', 'organisationUsers')
      .innerJoinAndSelect('organisationUsers.user', 'users')
      .andWhere('innovations.id IN (:...innovationIds)', { innovationIds: innovations.map(item => item.id) })
      .getMany();

    try {

      for (const innovation of dbInnovations) {

        const reason = innovations.find(item => item.id === innovation.id)?.reason || null;
        await this.withdrawInnovation(innovation, transactionManager, user, reason);

        toReturn.push({
          id: innovation.id,
          name: innovation.name,
          supportingUserIds: innovation.innovationSupports.flatMap(item =>
            item.organisationUnitUsers.map(su => su.organisationUser.user.id)
          )
        });

      }

      return toReturn;

    } catch (error) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_WIDTHRAW_ERROR);
    }

  }

  public async withdrawInnovation(innovation: InnovationEntity, transactionManager: EntityManager, user: { id: string; }, reason: null | string): Promise<{ id: string, name: string, supportingUserIds: string[] }> {
    const sections = await transactionManager
      .createQueryBuilder(InnovationSectionEntity, 'section')
      .select(["section.id"])
      .addSelect('section.innovation_id')
      .where('section.innovation_id = :innovationId', { innovationId: innovation.id })
      .getMany();
    const sectionsIds = sections.map(section => section.id);

    await transactionManager.createQueryBuilder().update(InnovationActionEntity)
      .set({ status: InnovationActionStatusEnum.DECLINED, updatedBy: user.id })
      .where('innovation_section_id IN (:...sectionsIds) AND status IN (:...innovationActionStatus)', {
        sectionsIds,
        innovationActionStatus: [InnovationActionStatusEnum.REQUESTED, InnovationActionStatusEnum.SUBMITTED]
      })
      .execute();

    await transactionManager.createQueryBuilder().update(InnovationActionEntity)
      .set({ updatedBy: user.id, deletedAt: new Date() })
      .where('innovation_section_id IN (:...sectionsIds)', { sectionsIds })
      .execute();

    // Reject all PENDING AND APPROVED export requests
    await transactionManager.createQueryBuilder(InnovationExportRequestEntity, 'request')
      .update({
        status: InnovationExportRequestStatusEnum.REJECTED,
        rejectReason: TranslationHelper.translate('DEFAULT_MESSAGES.EXPORT_REQUEST.WITHDRAW'),
        updatedBy: user.id
      })
      .where('innovation_id = :innovationId AND (status = :pendingStatus OR (status = :approvedStatus AND updated_at >= :expiredAt))',
        {
          innovationId: innovation.id,
          pendingStatus: InnovationExportRequestStatusEnum.PENDING,
          approvedStatus: InnovationExportRequestStatusEnum.APPROVED,
          expiredAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString()
        }
      )
      .execute()

    // supporting users without duplicates (handles users with multiple engaging organisation units)
    const supportingUserIds = [...(new Set(
      innovation.innovationSupports.flatMap(item => item.organisationUnitUsers
        .map(su => su.organisationUser.user.id)
      )))];

    // Update all supports to UNASSIGNED AND soft delete them.
    for (const innovationSupport of innovation.innovationSupports) {
      innovationSupport.status = InnovationSupportStatusEnum.UNASSIGNED;
      innovationSupport.organisationUnitUsers = [];
      innovationSupport.updatedBy = user.id;
      innovationSupport.deletedAt = new Date().toISOString();
      await transactionManager.save(InnovationSupportEntity, innovationSupport);
    }

    // Lastly, lets update innovations to WITHDRAWN.
    innovation.status = InnovationStatusEnum.WITHDRAWN;
    innovation.updatedBy = user.id;
    innovation.organisationShares = [];
    innovation.withdrawReason = reason;
    innovation.deletedAt = new Date().toISOString();
    await transactionManager.save(InnovationEntity, innovation);



    return {
      id: innovation.id,
      name: innovation.name,
      supportingUserIds,
    };
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
    configuration: { userId: string, innovationId: string, activity: T, domainContext: DomainContextType },
    params: ActivitiesParamsType<T>
  ): Promise<void> {

    const activityLog = ActivityLogEntity.new({
      innovation: InnovationEntity.new({ id: configuration.innovationId }),
      activity: configuration.activity,
      type: this.getActivityLogType(configuration.activity),
      createdBy: configuration.userId,
      updatedBy: configuration.userId,
      param: JSON.stringify({
        actionUserId: configuration.userId,
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
    id: string, identityId: string, name?: string, userRole: ServiceRoleEnum | undefined,
    organisationUnit: { id: string, acronym: string } | null,
    emailNotificationPreferences: { type: EmailNotificationTypeEnum, preference: EmailNotificationPreferenceEnum }[]
  }[]> {

    const connection = entityManager ?? this.sqlConnection.manager;

    const thread = connection.createQueryBuilder(InnovationThreadEntity, 'thread')
      .where('thread.id = :threadId', { threadId })
      .getOne();

    if (!thread) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_THREAD_NOT_FOUND);
    }

    const messages = await connection.createQueryBuilder(InnovationThreadMessageEntity, 'threadMessage')
      .innerJoinAndSelect('threadMessage.author', 'author')
      .leftJoinAndSelect('threadMessage.authorUserRole', 'authorRole')
      .leftJoinAndSelect('threadMessage.authorOrganisationUnit', 'organisation_unit')
      .leftJoinAndSelect('author.notificationPreferences', 'notificationPreferences')
      .where('threadMessage.innovation_thread_id = :threadId', { threadId })
      .andWhere('threadMessage.deleted_at IS NULL')
      .andWhere('threadMessage.innovation_thread_id = :threadId', { threadId })
      .getMany();

    const participants: {
      id: string, identityId: string, name?: string, userRole: ServiceRoleEnum | undefined,
      organisationUnit: { id: string, acronym: string } | null,
      emailNotificationPreferences: { type: EmailNotificationTypeEnum, preference: EmailNotificationPreferenceEnum }[]
    }[] = [];

    const authorIds = messages.map(m => m.author.identityId);

    const usersInfo = await this.identityProviderService.getUsersList(authorIds);

    for (const message of messages) {
      // filter duplicates based on user.id and organisationUnit.id
      if (!participants.find(p => p.id === message.author.id && p.organisationUnit?.id === message.authorOrganisationUnit?.id)) {

        participants.push({
          id: message.author.id,
          identityId: message.author.identityId,
          name: usersInfo.find(u => u.identityId === message.author.identityId)?.displayName ?? '',
          userRole: message.authorUserRole?.role,
          organisationUnit: message.authorOrganisationUnit ? {
            id: message.authorOrganisationUnit.id,
            acronym: message.authorOrganisationUnit.acronym
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
