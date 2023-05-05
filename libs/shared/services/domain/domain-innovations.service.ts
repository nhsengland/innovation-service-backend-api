import { DataSource, EntityManager, In, Repository } from 'typeorm';

import { EXPIRATION_DATES } from '../../constants';
import {
  ActivityLogEntity,
  InnovationActionEntity,
  InnovationAssessmentEntity,
  InnovationCollaboratorEntity,
  InnovationEntity,
  InnovationExportRequestEntity,
  InnovationFileEntity,
  InnovationGroupedStatusViewEntity,
  InnovationSectionEntity,
  InnovationSupportEntity,
  InnovationSupportLogEntity,
  InnovationThreadEntity,
  InnovationThreadMessageEntity,
  InnovationTransferEntity,
  NotificationEntity,
  NotificationUserEntity,
  OrganisationUnitEntity,
} from '../../entities';
import {
  ActivityEnum,
  ActivityTypeEnum,
  EmailNotificationPreferenceEnum,
  EmailNotificationTypeEnum,
  InnovationActionStatusEnum,
  InnovationCollaboratorStatusEnum,
  InnovationExportRequestStatusEnum,
  InnovationGroupedStatusEnum,
  InnovationStatusEnum,
  InnovationSupportLogTypeEnum,
  InnovationSupportStatusEnum,
  InnovationTransferStatusEnum,
  NotificationContextTypeEnum,
  NotifierTypeEnum,
  ServiceRoleEnum,
} from '../../enums';
import { InnovationErrorsEnum, NotFoundError, UnprocessableEntityError } from '../../errors';
import { TranslationHelper } from '../../helpers';
import type { ActivitiesParamsType, DomainContextType } from '../../types';
import type { NotifierService } from '../integrations/notifier.service';
import type { FileStorageServiceType, IdentityProviderServiceType } from '../interfaces';

export class DomainInnovationsService {
  innovationRepository: Repository<InnovationEntity>;
  innovationSupportRepository: Repository<InnovationSupportEntity>;
  activityLogRepository: Repository<ActivityLogEntity>;

  constructor(
    private sqlConnection: DataSource,
    private fileStorageService: FileStorageServiceType,
    private identityProviderService: IdentityProviderServiceType,
    private notifierService: NotifierService
  ) {
    this.innovationRepository = this.sqlConnection.getRepository(InnovationEntity);
    this.innovationSupportRepository = this.sqlConnection.getRepository(InnovationSupportEntity);
    this.activityLogRepository = this.sqlConnection.getRepository(ActivityLogEntity);
  }

  /**
   * withdraws all expired innovations.
   * This method is used by the cron job.
   * @param entityManager optional entity manager
   */
  async withdrawExpiredInnovations(entityManager?: EntityManager): Promise<void> {
    const em = entityManager ?? this.sqlConnection.manager;

    const dbInnovations = await em
      .createQueryBuilder(InnovationEntity, 'innovations')
      .select(['innovations.id'])
      .where('innovations.expires_at < :now', { now: new Date().toISOString() })
      .getMany();

    await this.withdrawInnovations(
      { id: '', roleId: '' },
      dbInnovations.map((item) => ({ id: item.id, reason: null }))
    );
  }

  async withdrawExpiredInnovationsTransfers(entityManager?: EntityManager): Promise<void> {
    const em = entityManager ?? this.sqlConnection.manager;

    const transfersToExpire = await em
      .createQueryBuilder(InnovationTransferEntity, 'transfers')
      .select(['transfers.id', 'innovation.id'])
      .innerJoin('transfers.innovation', 'innovation')
      .where('DATEDIFF(day, transfers.created_at, GETDATE()) > :date', {
        date: EXPIRATION_DATES.transfersDays,
      })
      .andWhere('transfers.status = :status', { status: InnovationTransferStatusEnum.PENDING })
      .getMany();

    if (transfersToExpire.length) {
      const transferIds = transfersToExpire.map((item) => item.id);

      await em
        .createQueryBuilder(InnovationTransferEntity, 'transfers')
        .update()
        .set({
          finishedAt: new Date(),
          status: InnovationTransferStatusEnum.EXPIRED,
        })
        .where('id IN (:...ids)', { ids: transferIds })
        .execute();

      for (const dbTransfer of transfersToExpire) {
        // Send the notifications
        await this.notifierService.sendSystemNotification(
          NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_EXPIRATION,
          {
            innovationId: dbTransfer.innovation.id,
            transferId: dbTransfer.id,
          }
        );
      }
    }
  }

  /**
   * remind  all innovations that are about to expire.
   * - this enforces the emailCount to be the same to avoid sending double emails.
   * @param days number of days before expiration (default: 7)
   * @param emailCount number of email previously sent (default: 1)
   * @param entityManager optional entityManager
   */
  async remindInnovationsTransfers(
    days = 7,
    emailCount = 1,
    entityManager?: EntityManager
  ): Promise<void> {
    const em = entityManager ?? this.sqlConnection.manager;

    const transfersToExpire = await em
      .createQueryBuilder(InnovationTransferEntity, 'transfers')
      .select(['transfers.id', 'transfers.email', 'innovation.id', 'innovation.name'])
      .innerJoin('transfers.innovation', 'innovation')
      .where('DATEDIFF(day, transfers.created_at, GETDATE()) = :date', {
        date: days,
      })
      .andWhere('transfers.status = :status', { status: InnovationTransferStatusEnum.PENDING })
      .andWhere('transfers.emailCount = :emailCount', { emailCount })
      .getMany();

    if (transfersToExpire.length) {
      const transferIds = transfersToExpire.map((item) => item.id);

      await em
        .createQueryBuilder(InnovationTransferEntity, 'transfers')
        .update()
        .set({ emailCount: emailCount + 1 })
        .where('id IN (:...ids)', { ids: transferIds })
        .execute();

      for (const dbTransfer of transfersToExpire) {
        // Send the notifications
        await this.notifierService.sendSystemNotification(
          NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_REMINDER,
          {
            innovationId: dbTransfer.innovation.id,
            innovationName: dbTransfer.innovation.name,
            transferId: dbTransfer.id,
            recipientEmail: dbTransfer.email,
          }
        );
      }
    }
  }

  async withdrawInnovations(
    user: { id: string; roleId: string },
    innovations: { id: string; reason: null | string }[],
    entityManager?: EntityManager
  ): Promise<
    {
      id: string;
      name: string;
      affectedUsers: {
        userId: string;
        userType: ServiceRoleEnum;
        organisationId?: string;
        organisationUnitId?: string;
      }[];
    }[]
  > {
    if (!innovations.length) {
      return [];
    }
    const em = entityManager ?? this.sqlConnection.manager;

    const toReturn: {
      id: string;
      name: string;
      affectedUsers: {
        userId: string;
        userType: ServiceRoleEnum;
        organisationId?: string;
        organisationUnitId?: string;
      }[];
    }[] = [];

    const dbInnovations = await this.innovationRepository
      .createQueryBuilder('innovations')
      .withDeleted()
      .leftJoinAndSelect('innovations.owner', 'owner')
      .leftJoinAndSelect('owner.serviceRoles', 'roles')
      .leftJoinAndSelect('innovations.innovationSupports', 'supports')
      .leftJoinAndSelect('supports.organisationUnitUsers', 'organisationUnitUsers')
      .leftJoinAndSelect('supports.organisationUnit', 'organisationUnit')
      .leftJoinAndSelect('organisationUnitUsers.organisationUser', 'organisationUsers')
      .leftJoinAndSelect('organisationUsers.user', 'users')
      .where('innovations.id IN (:...innovationIds)', {
        innovationIds: innovations.map((item) => item.id),
      })
      .getMany();

    try {
      for (const dbInnovation of dbInnovations) {
        const userId = user.id === '' ? dbInnovation.owner.id : user.id;
        const innovationOwnerRole = dbInnovation.owner.serviceRoles.find(
          (r) => r.role === ServiceRoleEnum.INNOVATOR
        );
        let roleId = user.roleId;

        if (innovationOwnerRole && user.roleId === '') {
          roleId = innovationOwnerRole.id;
        }

        const affectedUsers: {
          userId: string;
          userType: ServiceRoleEnum;
          organisationId?: string;
          organisationUnitId?: string;
        }[] = [];

        if (dbInnovation.status === InnovationStatusEnum.NEEDS_ASSESSMENT) {
          const assignedNa = await em
            .createQueryBuilder(InnovationAssessmentEntity, 'assessment')
            .select(['assessment.id', 'assignedUser.id'])
            .innerJoin('assessment.assignTo', 'assignedUser')
            .where('assessment.innovation_id = :innovationId', { innovationId: dbInnovation.id })
            .andWhere('assessment.finished_at IS NULL')
            .getOne();

          if (assignedNa) {
            affectedUsers.push({
              userId: assignedNa.assignTo.id,
              userType: ServiceRoleEnum.ASSESSMENT,
            });
          }
        }

        // This is needed to send activeCollaborator notification
        const activeCollaborators = await em
          .createQueryBuilder(InnovationCollaboratorEntity, 'collaborator')
          .select(['collaborator.id', 'collaborator.innovation_id', 'user.id'])
          .innerJoin('collaborator.user', 'user')
          .where('collaborator.innovation_id = :innovationId', { innovationId: dbInnovation.id })
          .andWhere('collaborator.status = :collaboratorActiveStatus', {
            collaboratorActiveStatus: InnovationCollaboratorStatusEnum.ACTIVE,
          })
          .getMany();

        if (activeCollaborators.length > 0) {
          affectedUsers.push(
            ...activeCollaborators.map((c) => ({
              userId: c.user?.id ?? '',
              userType: ServiceRoleEnum.INNOVATOR,
            }))
          );
        }

        // Update innovation collaborators status
        await this.bulkUpdateCollaboratorStatusByInnovation(
          em,
          { id: userId },
          {
            current: InnovationCollaboratorStatusEnum.ACTIVE,
            next: InnovationCollaboratorStatusEnum.REMOVED,
          },
          dbInnovation.id
        );
        await this.bulkUpdateCollaboratorStatusByInnovation(
          em,
          { id: userId },
          {
            current: InnovationCollaboratorStatusEnum.PENDING,
            next: InnovationCollaboratorStatusEnum.CANCELLED,
          },
          dbInnovation.id
        );

        const reason = innovations.find((item) => item.id === dbInnovation.id)?.reason || null;

        // Get all sections id's.
        const sections = await em
          .createQueryBuilder(InnovationSectionEntity, 'section')
          .select(['section.id'])
          .where('section.innovation_id = :innovationId', { innovationId: dbInnovation.id })
          .getMany();
        const sectionsIds = sections.map((section) => section.id);

        // Close opened actions, and deleted them all afterwards, hence 2 querys needed for both operations.
        await em
          .createQueryBuilder()
          .update(InnovationActionEntity)
          .set({ status: InnovationActionStatusEnum.DECLINED })
          .where(
            'innovation_section_id IN (:...sectionsIds) AND status IN (:...innovationActionStatus)',
            {
              sectionsIds,
              innovationActionStatus: [
                InnovationActionStatusEnum.REQUESTED,
                InnovationActionStatusEnum.SUBMITTED,
              ],
            }
          )
          .execute();

        await em
          .createQueryBuilder()
          .update(InnovationActionEntity)
          .set({ updatedBy: userId, updatedByUserRole: roleId, deletedAt: new Date() })
          .where('innovation_section_id IN (:...sectionsIds)', { sectionsIds })
          .execute();

        // Reject all PENDING AND APPROVED export requests.
        await em
          .createQueryBuilder()
          .update(InnovationExportRequestEntity)
          .set({
            rejectReason: TranslationHelper.translate('DEFAULT_MESSAGES.EXPORT_REQUEST.WITHDRAW'),
            status: InnovationExportRequestStatusEnum.REJECTED,
            updatedBy: userId,
          })
          .where(
            'innovation_id = :innovationId AND (status = :pendingStatus OR (status = :approvedStatus AND updated_at >= :expiredAt))',
            {
              approvedStatus: InnovationExportRequestStatusEnum.APPROVED,
              expiredAt: new Date(Date.now() - EXPIRATION_DATES.exportRequests).toISOString(),
              innovationId: dbInnovation.id,
              pendingStatus: InnovationExportRequestStatusEnum.PENDING,
            }
          )
          .execute();

        // Reject PENDING transfer requests
        await em.getRepository(InnovationTransferEntity).update(
          {
            innovation: { id: dbInnovation.id },
            status: InnovationTransferStatusEnum.PENDING,
          },
          {
            finishedAt: new Date().toISOString(),
            status: InnovationTransferStatusEnum.CANCELED,
            updatedBy: userId,
          }
        );

        // Delete all unopened notifications related with this innovation
        const unopenedNotificationsIds = await em
          .createQueryBuilder(NotificationUserEntity, 'userNotification')
          .select(['userNotification.id'])
          .innerJoin('userNotification.notification', 'notification')
          .innerJoin('notification.innovation', 'innovation')
          .where('innovation.id = :innovationId', { innovationId: dbInnovation.id })
          .andWhere('userNotification.read_at IS NULL')
          .getMany();

        await em.softDelete(NotificationUserEntity, {
          id: In(unopenedNotificationsIds.map((c) => c.id)),
        });

        affectedUsers.push(
          ...dbInnovation.innovationSupports.flatMap((item) =>
            item.organisationUnitUsers.map((su) => ({
              userId: su.organisationUser.user.id,
              userType: su.organisationUser.role as unknown as ServiceRoleEnum,
              organisationId: item.organisationUnit.organisationId,
              organisationUnitId: item.organisationUnit.id,
            }))
          )
        );

        // Update all supports to UNASSIGNED AND delete them.
        for (const innovationSupport of dbInnovation.innovationSupports) {
          innovationSupport.status = InnovationSupportStatusEnum.UNASSIGNED;
          innovationSupport.organisationUnitUsers = [];
          innovationSupport.updatedBy = userId;
          innovationSupport.deletedAt = new Date();
          await em.save(InnovationSupportEntity, innovationSupport);
        }

        // Update innovations to WITHDRAWN, removes all shares AND deleted them.
        dbInnovation.status = InnovationStatusEnum.WITHDRAWN;
        dbInnovation.updatedBy = userId;
        dbInnovation.organisationShares = [];
        dbInnovation.withdrawReason = reason;
        dbInnovation.deletedAt = new Date();
        dbInnovation.expires_at = null;
        await em.save(InnovationEntity, dbInnovation);

        toReturn.push({
          id: dbInnovation.id,
          name: dbInnovation.name,
          affectedUsers: [...new Map(affectedUsers.map((item) => [item['userId'], item])).values()], // remove duplicates
        });
      }
    } catch (error) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_WIDTHRAW_ERROR);
    }

    return toReturn;
  }

  async bulkUpdateCollaboratorStatusByEmail(
    entityManager: EntityManager,
    user: { id: string; email: string },
    status: { current: InnovationCollaboratorStatusEnum; next: InnovationCollaboratorStatusEnum }
  ): Promise<void> {
    await entityManager.getRepository(InnovationCollaboratorEntity).update(
      {
        email: user.email,
        status: status.current,
      },
      {
        updatedBy: user.id,
        status: status.next,
      }
    );
  }

  /**
   * This is a legacy support that should be replaced by the activities log in due time.
   * For now it is still alive and is responsible fot storing the following actions:
   * - Accessors supports update
   * - Accessors suggesting other organisations/units.
   */
  async addSupportLog(
    transactionManager: EntityManager,
    user: { id: string; organisationUnitId: string },
    innovation: { id: string },
    supportStatus: InnovationSupportStatusEnum,
    supportLog: {
      type: InnovationSupportLogTypeEnum;
      description: string;
      suggestedOrganisationUnits: string[];
    }
  ): Promise<{ id: string }> {
    const supportLogData = InnovationSupportLogEntity.new({
      innovation: InnovationEntity.new({ id: innovation.id }),
      organisationUnit: OrganisationUnitEntity.new({ id: user.organisationUnitId }),
      innovationSupportStatus: supportStatus,
      description: supportLog.description,
      type: supportLog.type,
      suggestedOrganisationUnits: supportLog.suggestedOrganisationUnits?.map((id) =>
        OrganisationUnitEntity.new({ id })
      ),
      createdBy: user.id,
      updatedBy: user.id,
    });

    try {
      const savedSupportLog = await transactionManager.save(
        InnovationSupportLogEntity,
        supportLogData
      );
      return { id: savedSupportLog.id };
    } catch (error) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SUPPORT_LOG_ERROR);
    }
  }

  async addActivityLog<T extends ActivityEnum>(
    transactionManager: EntityManager,
    configuration: { innovationId: string; activity: T; domainContext: DomainContextType },
    params: ActivitiesParamsType<T>
  ): Promise<void> {
    const activityLog = ActivityLogEntity.new({
      innovation: InnovationEntity.new({ id: configuration.innovationId }),
      activity: configuration.activity,
      type: this.getActivityLogType(configuration.activity),
      createdBy: configuration.domainContext.id,
      updatedBy: configuration.domainContext.id,
      userRole: {
        id: configuration.domainContext.currentRole.id,
      },
      param: {
        actionUserId: configuration.domainContext.id,
        actionUserRole: configuration.domainContext.currentRole.role,
        actionUserOrganisationUnit: configuration.domainContext.organisation?.organisationUnit?.id,
        ...params,
      },
    });

    try {
      await transactionManager.save(ActivityLogEntity, activityLog);
    } catch (error) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_ACTIVITY_LOG_ERROR);
    }
  }

  async getUnreadNotifications(
    roleId: string,
    contextIds: string[],
    entityManager?: EntityManager
  ): Promise<
    {
      id: string;
      contextType: NotificationContextTypeEnum;
      contextId: string;
      params: Record<string, unknown>;
    }[]
  > {
    const em = entityManager ?? this.sqlConnection.manager;

    const notifications = await em
      .createQueryBuilder(NotificationEntity, 'notification')
      .select([
        'notification.id',
        'notification.contextType',
        'notification.contextId',
        'notification.params',
      ])
      .innerJoin('notification.notificationUsers', 'notificationUsers')
      .where('notification.context_id IN (:...contextIds)', { contextIds })
      .andWhere('notificationUsers.user_role_id = :roleId', { roleId })
      .andWhere('notificationUsers.read_at IS NULL')
      .getMany();

    return notifications.map((item) => ({
      id: item.id,
      contextType: item.contextType,
      contextId: item.contextId,
      params: item.params,
    }));
  }

  async deleteInnovationFiles(transactionManager: EntityManager, files: string[]): Promise<void>;
  async deleteInnovationFiles(
    transactionManager: EntityManager,
    files: InnovationFileEntity[]
  ): Promise<void>;
  async deleteInnovationFiles(
    transactionManager: EntityManager,
    files: InnovationFileEntity[] | string[]
  ): Promise<void> {
    if (files.length === 0) {
      return;
    }

    if (typeof files[0] === 'string') {
      files = await transactionManager
        .createQueryBuilder(InnovationFileEntity, 'file')
        .where('id IN (:...files)', { files })
        .getMany();
    } else {
      // if it's not string it's InnovationFileEntity
      files = files as InnovationFileEntity[];
    }

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
    const innovation = await this.sqlConnection
      .createQueryBuilder(InnovationEntity, 'innovation')
      .select(['innovation.id', 'innovation.name', 'owner.id', 'owner.identityId'])
      .leftJoin('innovation.owner', 'owner')
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
  async threadIntervenients(
    threadId: string,
    entityManager?: EntityManager
  ): Promise<
    {
      id: string;
      identityId: string;
      name?: string;
      locked: boolean;
      isOwner?: boolean;
      userRole: { id: string; role: ServiceRoleEnum };
      organisationUnit: { id: string; acronym: string } | null;
      emailNotificationPreferences: {
        type: EmailNotificationTypeEnum;
        preference: EmailNotificationPreferenceEnum;
      }[];
    }[]
  > {
    const connection = entityManager ?? this.sqlConnection.manager;

    const thread = await connection
      .createQueryBuilder(InnovationThreadEntity, 'thread')
      .select(['thread.id', 'innovation.id', 'owner.id'])
      .innerJoin('thread.innovation', 'innovation')
      .leftJoin('innovation.owner', 'owner')
      .where('thread.id = :threadId', { threadId })
      .getOne();

    if (!thread) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_THREAD_NOT_FOUND);
    }

    const messages = await connection
      .createQueryBuilder(InnovationThreadMessageEntity, 'threadMessage')
      .select([
        'threadMessage.id',
        'author.id',
        'author.identityId',
        'author.lockedAt',
        'authorRole.id',
        'authorRole.role',
        'organisationUnit.id',
        'organisationUnit.acronym',
        'notificationPreferences.notification_id',
        'notificationPreferences.preference',
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

    const authorIds = messages.map((m) => m.author.identityId);

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
          ...(message.authorUserRole.role === ServiceRoleEnum.INNOVATOR && {
            isOwner: message.author.id === thread.innovation.owner?.id,
          }),
          organisationUnit: message.authorUserRole.organisationUnit
            ? {
                id: message.authorUserRole.organisationUnit.id,
                acronym: message.authorUserRole.organisationUnit.acronym,
              }
            : null,
          emailNotificationPreferences: (await message.author.notificationPreferences).map(
            (emailPreference) => ({
              type: emailPreference.notification_id,
              preference: emailPreference.preference,
            })
          ),
        });
      }
    }

    return participants;
  }

  async getInnovationsGroupedStatus(filters: {
    innovationIds?: string[];
    status?: InnovationGroupedStatusEnum;
  }): Promise<Map<string, InnovationGroupedStatusEnum>> {
    const query = this.sqlConnection.createQueryBuilder(
      InnovationGroupedStatusViewEntity,
      'innovationGroupedStatus'
    );

    if (filters.innovationIds && filters.innovationIds.length) {
      query.andWhere('innovationGroupedStatus.innovationId IN (:...innovationIds)', {
        innovationIds: filters.innovationIds,
      });
    }

    if (filters.status && filters.status.length) {
      query.andWhere('innovationGroupedStatus.groupedStatus IN (:...status)', {
        status: filters.status,
      });
    }

    const groupedStatus = await query.getMany();

    return new Map(groupedStatus.map((cur) => [cur.innovationId, cur.groupedStatus]));
  }

  async getInnovationsByOwnerId(userId: string): Promise<
    {
      id: string;
      name: string;
      collaboratorsCount: number;
      expirationTransferDate: Date | null;
    }[]
  > {
    const query = await this.sqlConnection
      .createQueryBuilder(InnovationEntity, 'innovations')
      .select(['innovations.id', 'innovations.name', 'collaborator.id', 'transfer.createdAt'])
      .leftJoin(
        'innovations.collaborators',
        'collaborator',
        'collaborator.status = :collaboratorStatus',
        { collaboratorStatus: InnovationCollaboratorStatusEnum.ACTIVE }
      )
      .leftJoin('innovations.transfers', 'transfer', 'transfer.status = :transferStatus', {
        transferStatus: InnovationTransferStatusEnum.PENDING,
      })
      .where('innovations.owner_id = :userId', { userId })
      .getMany();

    const data = query.map((innovation) => ({
      id: innovation.id,
      name: innovation.name,
      collaboratorsCount: innovation.collaborators.length,
      expirationTransferDate: innovation.transfers[0]
        ? new Date(innovation.transfers[0].createdAt.getTime() + EXPIRATION_DATES.transfers)
        : null,
    }));

    return data;
  }

  /**
   * This function is used to cleanup old versions (not snapshots) of innovation documents.
   * Only the non snapshots more recent than the last snapshot will be kept.
   *
   * This function disabled the system versioning, deletes the old versions and re-enables the system versioning.
   * This is done in a transaction to avoid concurrency issues.
   */
  async cleanupInnovationDocuments(entityManager?: EntityManager): Promise<void> {
    const em = entityManager ?? this.sqlConnection.manager;

    await em.query(`
    BEGIN TRANSACTION
    EXEC('ALTER TABLE innovation_document SET ( SYSTEM_VERSIONING = OFF)');
    EXEC('DELETE h FROM innovation_document_history h
          INNER JOIN (SELECT id,MAX(valid_from) as max FROM innovation_document_history WHERE is_snapshot=1 GROUP BY id) h2 ON h.id = h2.id AND h.valid_from<h2.max AND h.is_snapshot=0');
    EXEC('ALTER TABLE innovation_document SET ( SYSTEM_VERSIONING = ON (HISTORY_TABLE = dbo.innovation_document_history, History_retention_period = 7 YEAR))');
    COMMIT TRANSACTION;
    `);
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
        throw new UnprocessableEntityError(
          InnovationErrorsEnum.INNOVATION_ACTIVITY_LOG_INVALID_ITEM
        );
    }
  }

  private async bulkUpdateCollaboratorStatusByInnovation(
    entityManager: EntityManager,
    user: { id: string },
    status: { current: InnovationCollaboratorStatusEnum; next: InnovationCollaboratorStatusEnum },
    innovationId: string
  ): Promise<void> {
    await entityManager.getRepository(InnovationCollaboratorEntity).update(
      {
        innovation: { id: innovationId },
        status: status.current,
      },
      {
        updatedBy: user.id,
        status: status.next,
        deletedAt: new Date().toISOString(),
      }
    );
  }
}
