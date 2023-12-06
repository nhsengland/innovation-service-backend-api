import { DataSource, EntityManager, In, Repository } from 'typeorm';

import type { UserEntity } from 'libs/shared/entities';
import { EXPIRATION_DATES } from '../../constants';
import { ActivityLogEntity } from '../../entities/innovation/activity-log.entity';
import { InnovationAssessmentEntity } from '../../entities/innovation/innovation-assessment.entity';
import { InnovationCollaboratorEntity } from '../../entities/innovation/innovation-collaborator.entity';
import { InnovationExportRequestEntity } from '../../entities/innovation/innovation-export-request.entity';
import { InnovationSectionEntity } from '../../entities/innovation/innovation-section.entity';
import { InnovationSupportLogEntity } from '../../entities/innovation/innovation-support-log.entity';
import { InnovationSupportEntity } from '../../entities/innovation/innovation-support.entity';
import { InnovationTaskEntity } from '../../entities/innovation/innovation-task.entity';
import { InnovationThreadEntity } from '../../entities/innovation/innovation-thread.entity';
import { InnovationTransferEntity } from '../../entities/innovation/innovation-transfer.entity';
import { InnovationEntity } from '../../entities/innovation/innovation.entity';
import { OrganisationUnitEntity } from '../../entities/organisation/organisation-unit.entity';
import { NotificationUserEntity } from '../../entities/user/notification-user.entity';
import { NotificationEntity } from '../../entities/user/notification.entity';
import { UserRoleEntity } from '../../entities/user/user-role.entity';
import { InnovationGroupedStatusViewEntity } from '../../entities/views/innovation-grouped-status.view.entity';
import {
  ActivityEnum,
  ActivityTypeEnum,
  InnovationCollaboratorStatusEnum,
  InnovationExportRequestStatusEnum,
  InnovationGroupedStatusEnum,
  InnovationStatusEnum,
  InnovationSupportLogTypeEnum,
  InnovationSupportStatusEnum,
  InnovationTaskStatusEnum,
  InnovationTransferStatusEnum,
  NotificationCategoryType,
  NotifierTypeEnum,
  ServiceRoleEnum,
  UserStatusEnum
} from '../../enums';
import {
  BadRequestError,
  GenericErrorsEnum,
  InnovationErrorsEnum,
  NotFoundError,
  UnprocessableEntityError
} from '../../errors';
import { TranslationHelper } from '../../helpers';
import type { ActivitiesParamsType, DomainContextType, IdentityUserInfo, SupportLogParams } from '../../types';
import type { IdentityProviderService } from '../integrations/identity-provider.service';
import type { NotifierService } from '../integrations/notifier.service';

export class DomainInnovationsService {
  innovationRepository: Repository<InnovationEntity>;
  innovationSupportRepository: Repository<InnovationSupportEntity>;
  activityLogRepository: Repository<ActivityLogEntity>;

  constructor(
    private sqlConnection: DataSource,
    private identityProviderService: IdentityProviderService,
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
      dbInnovations.map(item => ({ id: item.id, reason: null }))
    );
  }

  async withdrawExpiredInnovationsTransfers(entityManager?: EntityManager): Promise<void> {
    const em = entityManager ?? this.sqlConnection.manager;

    const transfersToExpire = await em
      .createQueryBuilder(InnovationTransferEntity, 'transfers')
      .select(['transfers.id', 'innovation.id', 'innovation.name'])
      .innerJoin('transfers.innovation', 'innovation')
      .where('DATEDIFF(day, transfers.created_at, GETDATE()) > :date', {
        date: EXPIRATION_DATES.transfersDays
      })
      .andWhere('transfers.status = :status', { status: InnovationTransferStatusEnum.PENDING })
      .getMany();

    if (transfersToExpire.length) {
      const transferIds = transfersToExpire.map(item => item.id);

      await em
        .createQueryBuilder(InnovationTransferEntity, 'transfers')
        .update()
        .set({
          finishedAt: new Date(),
          status: InnovationTransferStatusEnum.EXPIRED
        })
        .where('id IN (:...ids)', { ids: transferIds })
        .execute();

      for (const dbTransfer of transfersToExpire) {
        // Send the notifications
        await this.notifierService.sendSystemNotification(NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_EXPIRATION, {
          innovationId: dbTransfer.innovation.id
        });
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
  async remindInnovationsTransfers(days = 7, emailCount = 1, entityManager?: EntityManager): Promise<void> {
    const em = entityManager ?? this.sqlConnection.manager;

    const transfersToExpire = await em
      .createQueryBuilder(InnovationTransferEntity, 'transfers')
      .select(['transfers.id', 'transfers.email', 'innovation.id', 'innovation.name'])
      .innerJoin('transfers.innovation', 'innovation')
      .where('DATEDIFF(day, transfers.created_at, GETDATE()) = :date', {
        date: EXPIRATION_DATES.transfersDays - days
      })
      .andWhere('transfers.status = :status', { status: InnovationTransferStatusEnum.PENDING })
      .andWhere('transfers.emailCount = :emailCount', { emailCount })
      .getMany();

    if (transfersToExpire.length) {
      const transferIds = transfersToExpire.map(item => item.id);

      await em
        .createQueryBuilder(InnovationTransferEntity, 'transfers')
        .update()
        .set({ emailCount: emailCount + 1 })
        .where('id IN (:...ids)', { ids: transferIds })
        .execute();

      for (const dbTransfer of transfersToExpire) {
        // Send the notifications
        await this.notifierService.sendSystemNotification(NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_REMINDER, {
          innovationId: dbTransfer.innovation.id,
          innovationName: dbTransfer.innovation.name,
          recipientEmail: dbTransfer.email
        });
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
        unitId?: string;
      }[];
    }[]
  > {
    if (!innovations.length) {
      return [];
    }
    const em = entityManager ?? this.sqlConnection.manager;

    const toReturn: Awaited<ReturnType<DomainInnovationsService['withdrawInnovations']>> = [];

    const dbInnovations = await this.innovationRepository
      .createQueryBuilder('innovations')
      .leftJoinAndSelect('innovations.owner', 'owner')
      .leftJoinAndSelect('owner.serviceRoles', 'roles')
      .leftJoinAndSelect('innovations.innovationSupports', 'supports')
      .leftJoinAndSelect('supports.userRoles', 'userRoles')
      .leftJoinAndSelect('userRoles.user', 'users')
      .where('innovations.id IN (:...innovationIds)', {
        innovationIds: innovations.map(item => item.id)
      })
      .getMany();

    /**
     * If in the future we want to withdraw innovations for different users this needs to be inside the for loop
     */
    let userId = user.id;
    let roleId = user.roleId;
    if (user.id === '' && user.roleId === '') {
      // We will use transfer to get ownerId
      const transfer = await em
        .createQueryBuilder(InnovationTransferEntity, 'transfer')
        .select(['transfer.id', 'transfer.createdBy'])
        .where('transfer.innovation_id = :innovationId', { innovationId: innovations[0]!.id }) // We are verifying above
        .orderBy('transfer.updatedAt', 'DESC')
        .getOne();
      if (!transfer) {
        return []; // this will never happen
      }

      const userRole = await em
        .createQueryBuilder(UserRoleEntity, 'role')
        .withDeleted()
        .select(['role.id'])
        .where('user_id = :userId', { userId: transfer.createdBy })
        .andWhere('role = :innovatorRole', { innovatorRole: ServiceRoleEnum.INNOVATOR })
        .getOne();
      if (!userRole) {
        return []; // this will never happen
      }

      userId = transfer.createdBy;
      roleId = userRole.id;
    }

    try {
      for (const dbInnovation of dbInnovations) {
        const affectedUsers: {
          userId: string;
          userType: ServiceRoleEnum;
          unitId?: string;
        }[] = [];

        if (dbInnovation.status === InnovationStatusEnum.NEEDS_ASSESSMENT) {
          const assignedNa = await em
            .createQueryBuilder(InnovationAssessmentEntity, 'assessment')
            .select(['assessment.id', 'assignedUser.id'])
            .innerJoin('assessment.assignTo', 'assignedUser')
            .where('assessment.innovation_id = :innovationId', { innovationId: dbInnovation.id })
            .andWhere('assessment.finished_at IS NULL')
            .andWhere('assignedUser.status <> :userDeleted', { userDeleted: UserStatusEnum.DELETED })
            .getOne();

          if (assignedNa && assignedNa.assignTo) {
            affectedUsers.push({
              userId: assignedNa.assignTo.id,
              userType: ServiceRoleEnum.ASSESSMENT
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
            collaboratorActiveStatus: InnovationCollaboratorStatusEnum.ACTIVE
          })
          .andWhere('user.status <> :userDeleted', { userDeleted: UserStatusEnum.DELETED })
          .getMany();

        if (activeCollaborators.length > 0) {
          affectedUsers.push(
            ...activeCollaborators.map(c => ({
              userId: c.user?.id ?? '',
              userType: ServiceRoleEnum.INNOVATOR
            }))
          );
        }

        // Update innovation collaborators status
        await this.bulkUpdateCollaboratorStatusByInnovation(
          em,
          { id: userId },
          {
            current: InnovationCollaboratorStatusEnum.ACTIVE,
            next: InnovationCollaboratorStatusEnum.REMOVED
          },
          dbInnovation.id
        );
        await this.bulkUpdateCollaboratorStatusByInnovation(
          em,
          { id: userId },
          {
            current: InnovationCollaboratorStatusEnum.PENDING,
            next: InnovationCollaboratorStatusEnum.CANCELLED
          },
          dbInnovation.id
        );

        const reason = innovations.find(item => item.id === dbInnovation.id)?.reason || null;

        // Get all sections id's.
        const sections = await em
          .createQueryBuilder(InnovationSectionEntity, 'section')
          .select(['section.id'])
          .where('section.innovation_id = :innovationId', { innovationId: dbInnovation.id })
          .getMany();
        const sectionsIds = sections.map(section => section.id);

        // Close opened actions, and deleted them all afterwards, hence 2 querys needed for both operations.
        await em
          .createQueryBuilder()
          .update(InnovationTaskEntity)
          .set({ status: InnovationTaskStatusEnum.DECLINED })
          .where('innovation_section_id IN (:...sectionsIds) AND status = :innovationActionStatus', {
            sectionsIds,
            innovationActionStatus: InnovationTaskStatusEnum.OPEN
          })
          .execute();

        await em
          .createQueryBuilder()
          .update(InnovationTaskEntity)
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
            updatedBy: userId
          })
          .where(
            'innovation_id = :innovationId AND (status = :pendingStatus OR (status = :approvedStatus AND updated_at >= :expiredAt))',
            {
              approvedStatus: InnovationExportRequestStatusEnum.APPROVED,
              expiredAt: new Date(Date.now() - EXPIRATION_DATES.exportRequests).toISOString(),
              innovationId: dbInnovation.id,
              pendingStatus: InnovationExportRequestStatusEnum.PENDING
            }
          )
          .execute();

        // Reject PENDING transfer requests
        await em.getRepository(InnovationTransferEntity).update(
          {
            innovation: { id: dbInnovation.id },
            status: InnovationTransferStatusEnum.PENDING
          },
          {
            finishedAt: new Date().toISOString(),
            status: InnovationTransferStatusEnum.CANCELED,
            updatedBy: userId
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
          id: In(unopenedNotificationsIds.map(c => c.id))
        });

        affectedUsers.push(
          ...dbInnovation.innovationSupports.flatMap(item =>
            item.userRoles
              .filter(su => su.user.status !== UserStatusEnum.DELETED)
              .map(su => ({
                userId: su.user.id,
                userType: su.role as unknown as ServiceRoleEnum,
                unitId: su.organisationUnitId
              }))
          )
        );

        // Update all supports to UNASSIGNED AND delete them.
        for (const innovationSupport of dbInnovation.innovationSupports) {
          innovationSupport.status = InnovationSupportStatusEnum.UNASSIGNED;
          innovationSupport.userRoles = [];
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
          affectedUsers
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
        status: status.current
      },
      {
        updatedBy: user.id,
        status: status.next
      }
    );
  }

  /**
   * Responsible for storing the following actions:
   * - Accessors supports update
   * - QA suggesting other organisations/units.
   * - NA suggesting organisations/units
   * - Admin completing support update while inactivating units
   */
  async addSupportLog(
    transactionManager: EntityManager,
    user: { id: string; roleId: string },
    innovationId: string,
    params: SupportLogParams
  ): Promise<{ id: string }> {
    const supportLogData = InnovationSupportLogEntity.new({
      innovation: InnovationEntity.new({ id: innovationId }),
      description: params.description,
      type: params.type,
      createdBy: user.id,
      createdByUserRole: UserRoleEntity.new({ id: user.roleId }),
      updatedBy: user.id,
      ...(params.type !== InnovationSupportLogTypeEnum.ASSESSMENT_SUGGESTION && {
        organisationUnit: OrganisationUnitEntity.new({ id: params.unitId }),
        innovationSupportStatus: params.supportStatus
      }),
      ...((params.type === InnovationSupportLogTypeEnum.ACCESSOR_SUGGESTION ||
        params.type === InnovationSupportLogTypeEnum.ASSESSMENT_SUGGESTION) && {
        suggestedOrganisationUnits: params.suggestedOrganisationUnits.map(id => OrganisationUnitEntity.new({ id }))
      }),
      ...(params.type === InnovationSupportLogTypeEnum.PROGRESS_UPDATE && { params: params.params })
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
        id: configuration.domainContext.currentRole.id
      },
      param: params
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
      contextType: NotificationCategoryType;
      contextId: string;
      params: Record<string, unknown>;
    }[]
  > {
    const em = entityManager ?? this.sqlConnection.manager;

    const notifications = await em
      .createQueryBuilder(NotificationEntity, 'notification')
      .select(['notification.id', 'notification.contextType', 'notification.contextId', 'notification.params'])
      .innerJoin('notification.notificationUsers', 'notificationUsers')
      .where('notification.context_id IN (:...contextIds)', { contextIds })
      .andWhere('notificationUsers.user_role_id = :roleId', { roleId })
      .andWhere('notificationUsers.read_at IS NULL')
      .getMany();

    return notifications.map(item => ({
      id: item.id,
      contextType: item.contextType,
      contextId: item.contextId,
      params: item.params
    }));
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
  async threadFollowers(
    threadId: string,
    withUserNames = true,
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
    }[]
  > {
    const em = entityManager ?? this.sqlConnection.manager;

    const thread = await em
      .createQueryBuilder(InnovationThreadEntity, 'thread')
      .select([
        'thread.id',
        'innovation.id',
        'innovationOwner.id',
        'innovationOwner.identityId',
        'innovationOwnerRole.id',
        'innovationOwnerRole.role',
        'innovationOwnerRole.isActive',
        'collaborator.id',
        'collaboratorUser.id',
        'collaboratorUser.identityId',
        'collaboratorUserRole.id',
        'collaboratorUserRole.role',
        'collaboratorUserRole.isActive',
        'followerUser.id',
        'followerUser.identityId',
        'followerUserRole.id',
        'followerUserRole.role',
        'followerUserRole.isActive',
        'followerOrganisationUnit.id',
        'followerOrganisationUnit.acronym'
      ])
      .innerJoin('thread.innovation', 'innovation')
      .leftJoin('innovation.owner', 'innovationOwner', "innovationOwner.status <> 'DELETED'")
      .leftJoin('innovationOwner.serviceRoles', 'innovationOwnerRole')
      .leftJoin('innovation.collaborators', 'collaborator', "collaborator.status = 'ACTIVE'")
      .leftJoin('collaborator.user', 'collaboratorUser', "collaboratorUser.status <> 'DELETED'")
      .leftJoin('collaboratorUser.serviceRoles', 'collaboratorUserRole')
      .leftJoin('thread.followers', 'followerUserRole')
      .leftJoin('followerUserRole.organisationUnit', 'followerOrganisationUnit')
      .leftJoin('followerUserRole.user', 'followerUser', "followerUser.status <> 'DELETED'")
      .where('thread.id = :threadId', { threadId })
      .getOne();

    if (!thread) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_THREAD_NOT_FOUND);
    }

    // for correct typing when mapping instead of using type assertions
    const collaboratorIsUser = (collaboratorUser: UserEntity | null): collaboratorUser is UserEntity => {
      return !!collaboratorUser;
    };

    const collaboratorUsers = thread.innovation.collaborators
      .map(c => c.user)
      .filter(collaboratorIsUser)
      .filter(u => u.id !== thread.innovation.owner?.id);

    const usersInfo: Map<string, IdentityUserInfo> = withUserNames
      ? await this.identityProviderService.getUsersMap([
          ...(thread.innovation.owner ? [thread.innovation.owner.identityId] : []),
          ...collaboratorUsers.map(u => u.identityId),
          ...thread.followers.map(f => f.user.identityId)
        ])
      : new Map();

    const followers: Awaited<ReturnType<DomainInnovationsService['threadFollowers']>> = [];

    //always push owner into followers
    if (thread.innovation.owner && thread.innovation.owner.serviceRoles[0]) {
      followers.push({
        id: thread.innovation.owner.id,
        identityId: thread.innovation.owner.identityId,
        name: usersInfo.get(thread.innovation.owner.identityId)?.displayName,
        locked: !thread.innovation.owner.serviceRoles[0].isActive,
        isOwner: true,
        userRole: { id: thread.innovation.owner.serviceRoles[0].id, role: ServiceRoleEnum.INNOVATOR },
        organisationUnit: null
      });
    }

    //always push collaborator users into followers
    collaboratorUsers.forEach(collaboratorUser => {
      followers.push({
        id: collaboratorUser.id,
        identityId: collaboratorUser.identityId,
        name: usersInfo.get(collaboratorUser.identityId)?.displayName,
        locked: !collaboratorUser.serviceRoles[0]?.isActive,
        isOwner: false,
        userRole: { id: collaboratorUser.serviceRoles[0]!.id, role: ServiceRoleEnum.INNOVATOR }, //assuming innovators can only have 1 role
        organisationUnit: null
      });
    });

    followers.push(
      ...thread.followers.map(followerRole => ({
        id: followerRole.user.id,
        identityId: followerRole.user.identityId,
        name: usersInfo.get(followerRole.user.identityId)?.displayName,
        locked: !followerRole.isActive,
        isOwner: false,
        userRole: {
          id: followerRole.id,
          role: followerRole.role
        },
        organisationUnit: followerRole.organisationUnit
          ? { id: followerRole.organisationUnit.id, acronym: followerRole.organisationUnit.acronym }
          : null
      }))
    );

    return followers;
  }

  async getInnovationsGroupedStatus(filters: {
    innovationIds?: string[];
    status?: InnovationGroupedStatusEnum;
  }): Promise<Map<string, InnovationGroupedStatusEnum>> {
    const query = this.sqlConnection.createQueryBuilder(InnovationGroupedStatusViewEntity, 'innovationGroupedStatus');

    if (filters.innovationIds && filters.innovationIds.length) {
      query.andWhere('innovationGroupedStatus.innovationId IN (:...innovationIds)', {
        innovationIds: filters.innovationIds
      });
    }

    if (filters.status && filters.status.length) {
      query.andWhere('innovationGroupedStatus.groupedStatus IN (:...status)', {
        status: filters.status
      });
    }

    const groupedStatus = await query.getMany();

    return new Map(groupedStatus.map(cur => [cur.innovationId, cur.groupedStatus]));
  }

  async getInnovationsByOwnerId(
    userId: string,
    entityManager?: EntityManager
  ): Promise<
    {
      id: string;
      name: string;
      collaboratorsCount: number;
      expirationTransferDate: Date | null;
    }[]
  > {
    const connection = entityManager ?? this.sqlConnection;

    const query = await connection
      .createQueryBuilder(InnovationEntity, 'innovations')
      .select(['innovations.id', 'innovations.name', 'collaborator.id', 'transfer.createdAt'])
      .leftJoin('innovations.collaborators', 'collaborator', 'collaborator.status = :collaboratorStatus', {
        collaboratorStatus: InnovationCollaboratorStatusEnum.ACTIVE
      })
      .leftJoin('innovations.transfers', 'transfer', 'transfer.status = :transferStatus', {
        transferStatus: InnovationTransferStatusEnum.PENDING
      })
      .where('innovations.owner_id = :userId', { userId })
      .getMany();

    const data = query.map(innovation => ({
      id: innovation.id,
      name: innovation.name,
      collaboratorsCount: innovation.collaborators.length,
      expirationTransferDate: innovation.transfers[0]
        ? new Date(innovation.transfers[0].createdAt.getTime() + EXPIRATION_DATES.transfers)
        : null
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

  /*****
   * MOVE THESE TO A STATISTIC SERVICE SHARED PROBABLY
   */

  /**
   * returns tasks counters
   * @param domainContext
   * @param statuses task statuses to count
   * @param filters (all optional)
   *  - innovationId tasks for this innovation
   *  - statuses counters for these statuses
   *  - organisationUnitId tasks for this organisation unit
   *  - mine
   * @param entityManager optional entity manager
   * @returns counters for each status and lastUpdatedAt
   */
  async getTasksCounter<T extends InnovationTaskStatusEnum[]>(
    domainContext: DomainContextType,
    statuses: T,
    filters: { innovationId?: string; myTeam?: boolean; mine?: boolean },
    entityManager?: EntityManager
  ): Promise<
    {
      [k in T[number]]: number;
    } & { lastUpdatedAt: Date | null }
  > {
    if (!statuses.length) {
      throw new BadRequestError(GenericErrorsEnum.INVALID_PAYLOAD);
    }
    const connection = entityManager ?? this.sqlConnection.manager;

    const query = connection
      .createQueryBuilder(InnovationTaskEntity, 'task')
      .select('task.status', 'status')
      .addSelect('count(*)', 'count')
      .addSelect('max(task.updated_at)', 'lastUpdatedAt')
      .groupBy('task.status')
      .innerJoin('task.createdByUserRole', 'createdByUserRole')
      .where('task.status IN (:...statuses)', { statuses });

    if (filters.innovationId) {
      query
        .innerJoin('task.innovationSection', 'innovationSection')
        .andWhere('innovationSection.innovation_id = :innovationId', { innovationId: filters.innovationId });
    }

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

    const res = (
      await query.getRawMany<{
        count: number;
        lastUpdatedAt: Date;
        status: InnovationTaskStatusEnum;
      }>()
    ).reduce(
      (acc, cur) => {
        acc[cur.status] = cur.count;
        acc.lastUpdatedAt =
          acc.lastUpdatedAt && acc.lastUpdatedAt > cur.lastUpdatedAt ? acc.lastUpdatedAt : cur.lastUpdatedAt;
        return acc;
      },
      {} as { [k in InnovationTaskStatusEnum]: number } & { lastUpdatedAt: Date | null }
    );

    statuses.forEach(status => {
      if (!res[status]) {
        res[status] = 0;
      }
    });

    return res;
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

      case ActivityEnum.TASK_CREATION:
      case ActivityEnum.TASK_STATUS_DONE_UPDATE:
      case ActivityEnum.TASK_STATUS_DECLINED_UPDATE:
      case ActivityEnum.TASK_STATUS_OPEN_UPDATE:
      case ActivityEnum.TASK_STATUS_CANCELLED_UPDATE:
        return ActivityTypeEnum.TASKS;

      default:
        throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_ACTIVITY_LOG_INVALID_ITEM);
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
        status: status.current
      },
      {
        updatedBy: user.id,
        status: status.next,
        deletedAt: new Date().toISOString()
      }
    );
  }
}
