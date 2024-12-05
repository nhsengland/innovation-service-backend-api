import type { DataSource, EntityManager, Repository } from 'typeorm';
import { Brackets, In } from 'typeorm';

import { cloneDeep } from 'lodash';
import { EXPIRATION_DATES, SYSTEM_CONTEXT } from '../../constants';
import type { UserEntity } from '../../entities';
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
import type { NotificationCategoryType } from '../../enums';
import {
  ActivityEnum,
  ActivityTypeEnum,
  InnovationArchiveReasonEnum,
  InnovationCollaboratorStatusEnum,
  InnovationExportRequestStatusEnum,
  InnovationGroupedStatusEnum,
  InnovationStatusEnum,
  InnovationSupportCloseReasonEnum,
  InnovationSupportLogTypeEnum,
  InnovationSupportStatusEnum,
  InnovationTaskStatusEnum,
  InnovationTransferStatusEnum,
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
import type { FilterPayload } from '../../models/schema-engine/schema.model';
import { UserMap } from '../../models/user.map';
import type { CurrentElasticSearchDocumentType } from '../../schemas/innovation-record/index';
import { DomainUsersService, RedisService, SQLConnectionService } from '../../services';
import type { ActivitiesParamsType, DomainContextType, SupportLogParams } from '../../types';
import type { NotifierService } from '../integrations/notifier.service';
import type { IRSchemaService } from '../storage/ir-schema.service';

export class DomainInnovationsService {
  innovationRepository: Repository<InnovationEntity>;
  innovationSupportRepository: Repository<InnovationSupportEntity>;
  activityLogRepository: Repository<ActivityLogEntity>;

  #sqlConnection: DataSource;
  get sqlConnection(): DataSource {
    if (!this.#sqlConnection) {
      this.#sqlConnection = this.sqlConnectionService.getConnection();
    }
    return this.#sqlConnection;
  }

  #domainUsersService: DomainUsersService;
  get domainUsersService(): DomainUsersService {
    return this.#domainUsersService;
  }
  set domainUsersService(value: DomainUsersService) {
    this.#domainUsersService = value;
  }

  constructor(
    private sqlConnectionService: SQLConnectionService,
    private notifierService: NotifierService,
    private irSchemaService: IRSchemaService,
    private redisService: RedisService
  ) {
    this.innovationRepository = this.sqlConnection.getRepository(InnovationEntity);
    this.innovationSupportRepository = this.sqlConnection.getRepository(InnovationSupportEntity);
    this.activityLogRepository = this.sqlConnection.getRepository(ActivityLogEntity);
  }

  /**
   * archives all expired innovations.
   * This method is used by the cron job.
   * @param entityManager optional entity manager
   */
  async archiveExpiredInnovations(entityManager?: EntityManager): Promise<void> {
    const em = entityManager ?? this.sqlConnection.manager;

    const dbInnovations = await em
      .createQueryBuilder(InnovationEntity, 'innovations')
      .select(['innovations.id', 'transfers.id', 'transfers.createdBy'])
      .innerJoin('innovations.transfers', 'transfers', 'transfers.status = :status', {
        status: InnovationTransferStatusEnum.PENDING
      })
      .where('innovations.expires_at < :now', { now: new Date().toISOString() })
      .getMany();

    for (const innovation of dbInnovations) {
      if (innovation.transfers[0]) {
        await this.archiveInnovationsWithDeleteSideffects(
          SYSTEM_CONTEXT,
          [
            {
              id: innovation.id,
              reason: InnovationArchiveReasonEnum.OWNER_ACCOUNT_DELETED
            }
          ],
          em
        );
      }
    }
  }

  /**
   * archive innovations without active support
   * This method is used by the cron job.
   * @param entityManager optional entity manager
   */

  async archiveInnovationsWithoutSupport(entityManager?: EntityManager): Promise<void> {
    const em = entityManager ?? this.sqlConnection.manager;

    const dbInnovations = await em
      .createQueryBuilder(InnovationGroupedStatusViewEntity, 'innovationGroupedStatus')
      .where('innovationGroupedStatus.groupedStatus = :groupedStatus', {
        groupedStatus: InnovationGroupedStatusEnum.NO_ACTIVE_SUPPORT
      })
      .andWhere('innovationGroupedStatus.expected_archive_date < GETDATE()')
      .getMany();

    for (const innovation of dbInnovations) {
      await this.archiveInnovations(
        SYSTEM_CONTEXT,
        [
          {
            id: innovation.innovationId,
            reason: InnovationArchiveReasonEnum.SIX_MONTHS_INACTIVITY
          }
        ],
        em
      );
    }
  }

  /**
   * expire transfer for all innovations with pending transfer expired.
   * This method is used by the cron job.
   * @param entityManager optional entity manager
   */
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

  /**
   * Contains all the business rules of archiving innovations.
   * It's responsible for:
   * 1. Updating all OPEN tasks to CANCELLED
   * 2. Changes all active supports to closed with the archive reason.
   * 3. Rejecting all PENDING export requests
   * 4. Updating innovation status to Archived and saving prevStatus
   * 5. Adding an entry to support log for each unit
   *
   * @returns information related with the archived innovations, this information is mostly
   * used for things outside he core of archive innovations (e.g., send notifications)
   */
  async archiveInnovations(
    domainContext: DomainContextType,
    innovations: { id: string; reason: InnovationArchiveReasonEnum }[],
    entityManager?: EntityManager
  ): Promise<
    {
      id: string;
      prevStatus: InnovationStatusEnum;
      reason: InnovationArchiveReasonEnum;
      affectedUsers: { userId: string; userType: ServiceRoleEnum; unitId?: string }[];
      isReassessment: boolean;
    }[]
  > {
    const em = entityManager ?? this.sqlConnection.manager;

    const dbInnovations = await em
      .createQueryBuilder(InnovationEntity, 'innovation')
      .select(['innovation.id', 'innovation.status', 'assessment.id'])
      .leftJoin('innovation.currentAssessment', 'assessment')
      .where('innovation.id IN (:...innovationIds)', { innovationIds: innovations.map(i => i.id) })
      .getMany();

    const archivedInnovationsInfoPromises = innovations.map(async innovation => {
      const dbInno = dbInnovations.find(i => i.id === innovation.id);
      if (!dbInno) throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);

      return {
        id: innovation.id,
        reason: innovation.reason,
        prevStatus: dbInno.status,
        affectedUsers: [] as { userId: string; userType: ServiceRoleEnum; unitId?: string }[],
        isReassessment: !!(await dbInno.reassessmentRequests).length,
        currentAssessmentId: dbInno.currentAssessment?.id
      };
    });

    const archivedInnovationsInfo = await Promise.all(archivedInnovationsInfoPromises);

    const archivedAt = new Date();

    return await em.transaction(async transaction => {
      for (const innovation of archivedInnovationsInfo) {
        let newAssessmentId: string | null = null;
        if (
          innovation.prevStatus === InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT ||
          innovation.prevStatus === InnovationStatusEnum.NEEDS_ASSESSMENT
        ) {
          const assessment = await em
            .createQueryBuilder(InnovationAssessmentEntity, 'assessment')
            .select(['assessment.id', 'assignedUser.id'])
            .leftJoin('assessment.assignTo', 'assignedUser', 'assignedUser.status <> :userDeleted', {
              userDeleted: UserStatusEnum.DELETED
            })
            .where('assessment.id = :currentAssessmentId', { currentAssessmentId: innovation.currentAssessmentId })
            .getOne();

          if (assessment) {
            // Complete the current assessment
            await transaction.update(
              InnovationAssessmentEntity,
              { id: assessment.id },
              { finishedAt: archivedAt, updatedBy: domainContext.id }
            );

            if (assessment.assignTo) {
              innovation.affectedUsers.push({ userId: assessment.assignTo.id, userType: ServiceRoleEnum.ASSESSMENT });
            }
          } else {
            // This innovation never had an assessment so we need to create and complete one
            const newAssessment = await transaction.save(
              InnovationAssessmentEntity,
              InnovationAssessmentEntity.new({
                description: '',
                innovation: InnovationEntity.new({ id: innovation.id }),
                assignTo: null,
                createdBy: domainContext.id,
                updatedBy: domainContext.id,
                startedAt: archivedAt,
                finishedAt: archivedAt,
                majorVersion: 1,
                minorVersion: 0
              })
            );

            newAssessmentId = newAssessment.id;
          }
        }

        const supports = await transaction
          .createQueryBuilder(InnovationSupportEntity, 'support')
          .select([
            'support.id',
            'support.status',
            'support.updatedBy',
            'userRole.id',
            'userRole.role',
            'user.id',
            'unit.id'
          ])
          .innerJoin('support.organisationUnit', 'unit')
          .leftJoin('support.userRoles', 'userRole')
          .leftJoin('userRole.user', 'user', "user.status <> 'DELETED'")
          .where('support.innovation_id = :innovationId', { innovationId: innovation.id })
          .andWhere('support.status NOT IN (:...statuses)', {
            statuses: [InnovationSupportStatusEnum.CLOSED, InnovationSupportStatusEnum.UNSUITABLE]
          })
          .andWhere('support.isMostRecent = 1')
          .getMany();

        innovation.affectedUsers.push(
          ...supports.flatMap(support =>
            support.userRoles.map(item => ({
              userId: item.user.id,
              userType: item.role,
              unitId: support.organisationUnit.id
            }))
          )
        );

        const sections = await transaction
          .createQueryBuilder(InnovationSectionEntity, 'section')
          .select(['section.id'])
          .where('section.innovation_id = :innovationId', { innovationId: innovation.id })
          .getMany();

        // Update all OPEN tasks to CANCELLED
        await transaction.update(
          InnovationTaskEntity,
          { innovationSection: In(sections.map(s => s.id)), status: InnovationTaskStatusEnum.OPEN },
          {
            status: InnovationTaskStatusEnum.CANCELLED,
            updatedBy: domainContext.id,
            updatedByUserRole: UserRoleEntity.new({ id: domainContext.currentRole.id })
          }
        );

        // Change all supports to closed and save a snapshot
        const supportsToUpdate = supports.map(support => {
          support.userRoles = [];
          support.updatedBy = domainContext.id;
          support.updatedByUserRole = domainContext.currentRole.id;
          support.status = InnovationSupportStatusEnum.CLOSED;
          support.closeReason = InnovationSupportCloseReasonEnum.ARCHIVE;
          support.finishedAt = new Date();
          return support;
        });
        await transaction.save(InnovationSupportEntity, supportsToUpdate);

        // Reject all PENDING export requests
        await transaction
          .createQueryBuilder()
          .update(InnovationExportRequestEntity)
          .set({
            status: InnovationExportRequestStatusEnum.REJECTED,
            rejectReason: TranslationHelper.translate('DEFAULT_MESSAGES.EXPORT_REQUEST.ARCHIVE'),
            updatedBy: domainContext.id
          })
          .where('innovation_id = :innovationId', { innovationId: innovation.id })
          .andWhere('status IN (:...status)', { status: [InnovationExportRequestStatusEnum.PENDING] })
          .execute();

        // Update Innovation status
        await transaction.update(
          InnovationEntity,
          { id: innovation.id },
          {
            status: InnovationStatusEnum.ARCHIVED,
            archiveReason: innovation.reason,
            statusUpdatedAt: archivedAt,
            updatedBy: domainContext.id,
            expires_at: null,
            ...(newAssessmentId && { currentAssessment: { id: newAssessmentId } })
          }
        );

        const supportLogs = [];
        for (const support of supports) {
          supportLogs.push(
            await this.addSupportLog(
              transaction,
              { id: domainContext.id, roleId: domainContext.currentRole.id },
              innovation.id,
              {
                type: InnovationSupportLogTypeEnum.INNOVATION_ARCHIVED,
                description: TranslationHelper.translate(`ARCHIVE_REASONS.${innovation.reason}`),
                unitId: support.organisationUnit.id,
                supportStatus: InnovationSupportStatusEnum.CLOSED
              }
            )
          );
        }
        await Promise.all(supportLogs);
      }

      // Add to the elasticsearch queue so they update on advanced search
      await this.redisService.addToSet(
        'elasticsearch',
        archivedInnovationsInfo.map(i => i.id)
      );

      return archivedInnovationsInfo;
    });
  }

  /**
   * This method contains the rules to archive innovations that is side-effect from a delete account.
   * Due to being a side-effect from delete account this "archival" process contains additional rules
   * from the normal archiveInnovations (@see archiveInnovations).
   * This function does:
   * 1. Run the archive innovations rules
   * 2. Reject PENDING transfer requests
   * 3. Remove existing collaborators and pending invites
   * 4. Delete unopened notifications
   *
   * @returns information related with the archived innovations, this information is mostly
   * used for things outside he core of archive innovations (e.g., send notifications)
   */
  async archiveInnovationsWithDeleteSideffects(
    domainContext: DomainContextType,
    innovations: { id: string; reason: InnovationArchiveReasonEnum }[],
    entityManager?: EntityManager
  ): Promise<
    {
      id: string;
      prevStatus: InnovationStatusEnum;
      reason: string;
      affectedUsers: { userId: string; userType: ServiceRoleEnum; unitId?: string }[];
    }[]
  > {
    if (innovations.length === 0) return [];

    const em = entityManager ?? this.sqlConnection.manager;

    return await em.transaction(async transaction => {
      // Run the archive innovations rules
      const archivedInnovations = await this.archiveInnovations(domainContext, innovations, transaction);

      // Run additional side-effects
      for (const innovation of archivedInnovations) {
        // Reject PENDING transfer requests
        await transaction.update(
          InnovationTransferEntity,
          { innovation: { id: innovation.id }, status: InnovationTransferStatusEnum.PENDING },
          {
            finishedAt: new Date().toISOString(),
            status: InnovationTransferStatusEnum.CANCELED,
            updatedBy: domainContext.id
          }
        );

        // Add active collaborators to affected users
        const activeCollaborators = await transaction
          .createQueryBuilder(InnovationCollaboratorEntity, 'collaborator')
          .select(['collaborator.id', 'collaborator.innovation_id', 'user.id'])
          .innerJoin('collaborator.user', 'user')
          .where('collaborator.innovation_id = :innovationId', { innovationId: innovation.id })
          .andWhere('collaborator.status = :collaboratorActiveStatus', {
            collaboratorActiveStatus: InnovationCollaboratorStatusEnum.ACTIVE
          })
          .andWhere('user.status <> :userDeleted', { userDeleted: UserStatusEnum.DELETED })
          .getMany();
        if (activeCollaborators.length > 0) {
          innovation.affectedUsers.push(
            ...activeCollaborators.map(c => ({ userId: c.user?.id ?? '', userType: ServiceRoleEnum.INNOVATOR }))
          );
        }

        // Remove existing collaborators
        await this.bulkUpdateCollaboratorStatusByInnovation(
          transaction,
          { id: domainContext.id },
          { current: InnovationCollaboratorStatusEnum.ACTIVE, next: InnovationCollaboratorStatusEnum.REMOVED },
          innovation.id
        );
        await this.bulkUpdateCollaboratorStatusByInnovation(
          transaction,
          { id: domainContext.id },
          { current: InnovationCollaboratorStatusEnum.PENDING, next: InnovationCollaboratorStatusEnum.CANCELLED },
          innovation.id
        );

        const subquery = transaction
          .createQueryBuilder(NotificationUserEntity, 'userNotification')
          .select(['userNotification.id'])
          .innerJoin('userNotification.notification', 'notification')
          .innerJoin('notification.innovation', 'innovation')
          .where('innovation.id = :innovationId')
          .andWhere('userNotification.read_at IS NULL')
          .getQuery();
        await em
          .createQueryBuilder()
          .softDelete()
          .from(NotificationUserEntity)
          .where(`id IN (${subquery})`)
          .setParameters({ innovationId: innovation.id })
          .execute();
      }

      return archivedInnovations;
    });
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
   * - Archival of innovation by innovation owner
   * - Innovator stopped sharing innovation with unit
   */
  async addSupportLog(
    transactionManager: EntityManager,
    user: { id: string; roleId: string },
    innovationId: string,
    params: SupportLogParams
  ): Promise<{ id: string }> {
    const innovation = await transactionManager
      .createQueryBuilder(InnovationEntity, 'innovation')
      .select(['innovation.id', 'currentMajorAssessment.id'])
      .innerJoin('innovation.currentMajorAssessment', 'currentMajorAssessment')
      .where('innovation.id = :id', { id: innovationId })
      .getOne();
    if (!innovation) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    const supportLogData = InnovationSupportLogEntity.new({
      innovation: InnovationEntity.new({ id: innovationId }),
      description: params.description,
      type: params.type,
      createdBy: user.id,
      createdByUserRole: UserRoleEntity.new({ id: user.roleId }),
      updatedBy: user.id,
      majorAssessmentId: innovation.currentMajorAssessment,
      ...(params.type !== InnovationSupportLogTypeEnum.ASSESSMENT_SUGGESTION && {
        organisationUnit: OrganisationUnitEntity.new({ id: params.unitId }),
        innovationSupportStatus: params.supportStatus
      }),
      ...((params.type === InnovationSupportLogTypeEnum.ACCESSOR_SUGGESTION ||
        params.type === InnovationSupportLogTypeEnum.ASSESSMENT_SUGGESTION) && {
        suggestedOrganisationUnits: params.suggestedOrganisationUnits.map(id => OrganisationUnitEntity.new({ id }))
      }),
      ...((params.type === InnovationSupportLogTypeEnum.PROGRESS_UPDATE ||
        params.type === InnovationSupportLogTypeEnum.ASSESSMENT_SUGGESTION) && { params: params.params })
    });

    try {
      const savedSupportLog = await transactionManager.save(InnovationSupportLogEntity, supportLogData);
      return { id: savedSupportLog.id };
    } catch {
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
    } catch {
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
      name: string;
      locked: boolean;
      isOwner?: boolean;
      userRole: { id: string; role: ServiceRoleEnum };
      organisationUnit: { id: string; name: string; acronym: string } | null;
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
        'followerOrganisationUnit.name',
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

    const usersInfo = withUserNames
      ? await this.domainUsersService.getUsersMap(
          {
            identityIds: [
              ...(thread.innovation.owner ? [thread.innovation.owner.identityId] : []),
              ...collaboratorUsers.map(u => u.identityId),
              ...thread.followers.map(f => f.user.identityId)
            ]
          },
          em
        )
      : new UserMap();

    const followers: Awaited<ReturnType<DomainInnovationsService['threadFollowers']>> = [];

    //always push owner into followers
    if (thread.innovation.owner && thread.innovation.owner.serviceRoles[0]) {
      followers.push({
        id: thread.innovation.owner.id,
        identityId: thread.innovation.owner.identityId,
        name: usersInfo.getDisplayName(thread.innovation.owner.identityId, ServiceRoleEnum.INNOVATOR),
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
        name: usersInfo.getDisplayName(collaboratorUser.identityId, ServiceRoleEnum.INNOVATOR),
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
        name: usersInfo.getDisplayName(followerRole.user.identityId),
        locked: !followerRole.isActive,
        isOwner: false,
        userRole: {
          id: followerRole.id,
          role: followerRole.role
        },
        organisationUnit: followerRole.organisationUnit
          ? {
              id: followerRole.organisationUnit.id,
              name: followerRole.organisationUnit.name,
              acronym: followerRole.organisationUnit.acronym
            }
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

  async getInnovationsByInnovatorId(
    userId: string,
    includeAsCollaborator?: boolean,
    entityManager?: EntityManager
  ): Promise<
    {
      id: string;
      name: string;
      collaboratorsCount: number;
      expirationTransferDate: Date | null;
      isOwner?: boolean;
    }[]
  > {
    const connection = entityManager ?? this.sqlConnection;

    const query = connection
      .createQueryBuilder(InnovationEntity, 'innovations')
      .select(['innovations.id', 'innovations.name', 'collaborator.id', 'transfer.createdAt', 'owner.id'])
      .leftJoin('innovations.collaborators', 'collaborator', 'collaborator.status = :collaboratorStatus', {
        collaboratorStatus: InnovationCollaboratorStatusEnum.ACTIVE
      })
      .leftJoin('innovations.transfers', 'transfer', 'transfer.status = :transferStatus', {
        transferStatus: InnovationTransferStatusEnum.PENDING
      })
      .leftJoin('innovations.owner', 'owner')
      .where('innovations.owner_id = :userId', { userId });

    if (includeAsCollaborator) {
      query.orWhere('collaborator.user_id = :userId', { userId });
    }

    const innovations = await query.getMany();

    const data = innovations.map(innovation => ({
      id: innovation.id,
      name: innovation.name,
      collaboratorsCount: innovation.collaborators.length,
      expirationTransferDate: innovation.transfers[0]
        ? new Date(innovation.transfers[0].createdAt.getTime() + EXPIRATION_DATES.transfers)
        : null,
      ...(includeAsCollaborator && { isOwner: innovation.owner?.id === userId ? true : false })
    }));

    return data;
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

  /**
   * Filters innovations based on the filters passed
   *
   * Business rules:
   * If some filters have been removed from the schema, will be filtered based on the remaining filters.
   * If all filters have been removed from the schema, will not filter and throw an error.
   * Filters work as "OR" within the same question and as "AND" between questions:
   * * (filter1 === 'A' OR filter1 === 'B') AND filter2 === 'C'
   */
  async getInnovationsFiltered(
    filters: FilterPayload[],
    options: { onlySubmitted?: boolean },
    entityManager?: EntityManager
  ): Promise<{ id: string }[]> {
    if (!filters.length) {
      throw new BadRequestError(InnovationErrorsEnum.INNOVATION_FILTERS_EMPTY);
    }

    const em = entityManager ?? this.sqlConnection.manager;

    const schema = await this.irSchemaService.getSchema();
    const validFilters = filters.filter(
      f => schema.model.isSubsectionValid(f.section) && schema.model.isQuestionValid(f.question)
    );
    if (validFilters.length === 0) {
      throw new BadRequestError(InnovationErrorsEnum.INNOVATION_FILTERS_ALL_INVALID);
    }

    const query = em
      .createQueryBuilder(InnovationEntity, 'innovation')
      .select(['innovation.id'])
      .innerJoin('innovation.document', 'document');

    for (const [index, filter] of validFilters.entries()) {
      const id = `${filter.section}_${filter.question}_${index}`;
      const params = {
        [`${id}_key`]: `$.${filter.section}.${filter.question}`,
        [`${id}_values`]: filter.answers
      };
      const question = schema.model.getQuestion(filter.question);
      if (!question) continue;

      switch (question.dataType) {
        case 'checkbox-array':
          // This validation is needed since the checkbox array can be an array of objects when `addQuestion` is defined.
          // And in this cases we need to do an aditional JSON_VALUE to get the value from inside the object.
          if (question.addQuestion) {
            query.andWhere(
              `
                  EXISTS (
                    SELECT TOP 1 *
                    FROM OPENJSON(JSON_QUERY(document.document, :${id}_key))
                    WHERE JSON_VALUE(value, :${id}_obj_key) IN (:...${id}_values)
                  )
                `,
              { ...params, [`${id}_obj_key`]: `$.${question.checkboxAnswerId ?? question.id}` }
            );
          } else {
            query.andWhere(
              `
                  EXISTS (
                    SELECT TOP 1 *
                    FROM OPENJSON(JSON_QUERY(document.document, :${id}_key))
                    WHERE value IN (:...${id}_values)
                  )
                `,
              params
            );
          }
          break;
        case 'radio-group':
          query.andWhere(`JSON_VALUE(document.document, :${id}_key) IN (:...${id}_values)`, params);
          break;
      }
    }

    // By default make filter only by submitted.
    if (options.onlySubmitted !== false) {
      query.andWhere('innovation.submitted_at IS NOT NULL');
    }

    const innovations = await query.getMany();
    return innovations.map(i => ({
      id: i.id,
      name: i.name
    }));
  }

  /** helper to return an innovation shared units (result might change keeping it simple) */
  async getInnovationSharedUnits(innovationId: string, entityManager?: EntityManager): Promise<string[]> {
    const em = entityManager ?? this.sqlConnection.manager;

    const res = await em
      .createQueryBuilder(InnovationEntity, 'innovation')
      .select(['unit.id'])
      .innerJoin('innovation.organisationShares', 'shares')
      .innerJoin('shares.organisationUnits', 'unit')
      .where('innovation.id = :innovationId', { innovationId })
      .getRawMany(); // Using raw to avoid needless columns and Promise.all cause of lazy

    return res.map(r => r.unit_id);
  }

  // NOTE: For now is just retorning roleId, but can be further extended for other things if needed.
  async getInnovationInnovatorsRoleId(innovationId: string, entityManager?: EntityManager): Promise<string[]> {
    const em = entityManager ?? this.sqlConnection.manager;

    const users = await em
      .createQueryBuilder(UserRoleEntity, 'role')
      .select(['role.id'])
      .innerJoinAndMapOne(
        'innovation',
        InnovationEntity,
        'innovation',
        'innovation.id = :innovationId AND innovation.deleted_at IS NULL',
        { innovationId }
      )
      .leftJoin('innovation.collaborators', 'collaborator', 'collaborator.status = :activeStatus', {
        activeStatus: InnovationCollaboratorStatusEnum.ACTIVE
      })
      .where('role.isActive = 1')
      .andWhere(
        new Brackets(qp => {
          qp.where('role.user_id = innovation.owner_id');
          qp.orWhere('role.user_id = collaborator.user_id');
        })
      )
      .getMany();

    return users.map(r => r.id);
  }

  /**
   * Fetches all the information needed for the document type.
   * If innovationIds are passed it will only return the information for those ids,
   * if not returns all the documents information.
   *
   */
  async getESDocumentsInformation(): Promise<CurrentElasticSearchDocumentType[]>;
  async getESDocumentsInformation(innovationId: string): Promise<CurrentElasticSearchDocumentType | undefined>;
  async getESDocumentsInformation(
    innovationId?: string
  ): Promise<CurrentElasticSearchDocumentType | undefined | CurrentElasticSearchDocumentType[]> {
    let sql = `WITH
      innovations AS (
        SELECT i.id, i.status, status_updated_at, submitted_at, i.updated_at, i.current_assessment_id,
        i.has_been_assessed, last_assessment_request_at, grouped_status, u.id AS owner_id,
        u.external_id AS owner_external_id, u.status AS owner_status, o.name AS owner_company
        FROM innovation i
          INNER JOIN innovation_grouped_status_view_entity g ON i.id = g.id
          LEFT JOIN [user] u on i.owner_id = u.id AND u.status !='DELETED'
          LEFT JOIN user_role ur on u.id = ur.user_id AND ur.role='INNOVATOR'
          LEFT JOIN organisation o ON ur.organisation_id = o.id AND o.is_shadow = 0
      ),
      support AS (
        SELECT s.id, innovation_id, s.status, s.close_reason, s.updated_at, s.updated_by,
          ou.id AS unit_id, ou.name AS unit_name, ou.acronym AS unit_acronym,
          o.id AS org_id, o.name AS org_name, o.acronym AS org_acronym,
          (
            SELECT r.id AS roleId, u.id AS userId, u.external_id AS identityId
          FROM innovation_support_user su
            LEFT JOIN user_role r ON su.user_role_id = r.id AND r.deleted_at IS NULL AND r.is_active = 1
            LEFT JOIN [user] u ON u.id = r.user_id AND u.status != 'DELETED'
          WHERE s.id = su.innovation_support_id
          FOR
            JSON PATH
          ) AS assigned_accessors
        FROM innovation_support s
          INNER JOIN organisation_unit ou ON s.organisation_unit_id = ou.id AND ou.deleted_at IS NULL
          INNER JOIN organisation o ON ou.organisation_id = o.id
        WHERE s.deleted_at IS NULL
          AND s.is_most_recent = 1
      )
    SELECT
      i.id,
      i.status,
      i.status_updated_at AS statusUpdatedAt,
      i.grouped_status AS groupedStatus,
      i.has_been_assessed AS hasBeenAssessed,
      i.submitted_at AS submittedAt,
      i.updated_at AS updatedAt,
      i.last_assessment_request_at AS lastAssessmentRequestAt,
      d.document AS document,
      IIF(
        i.owner_id IS NULL,
        NULL,
        JSON_OBJECT('id': i.owner_id, 'identityId': i.owner_external_id, 'status': i.owner_status, 'companyName': i.owner_company ABSENT ON NULL)
      ) AS owner,
      (
        SELECT s.org_id AS organisationId, s.org_name AS name, s.org_acronym AS acronym
        FROM support s
        WHERE s.innovation_id = i.id AND s.status='ENGAGING'
        GROUP BY org_id, org_name, org_acronym
        FOR JSON PATH
      ) AS engagingOrganisations,
      (
        SELECT s.unit_id AS unitId, s.unit_name AS name, s.unit_acronym AS acronym, s.assigned_accessors AS assignedAccessors
        FROM support s
        WHERE s.innovation_id = i.id AND s.status='ENGAGING'
        FOR JSON PATH
      ) AS engagingUnits,
      (
        SELECT JSON_QUERY('[' + STRING_AGG(CONVERT(VARCHAR(38), QUOTENAME(s.organisation_id, '"')), ',') + ']') AS ids
        FROM innovation_share s
        WHERE s.innovation_id=i.id
      ) AS shares,
      (
        SELECT id, s.unit_id AS unitId, s.status, s.close_reason as closeReason, s.updated_at AS updatedAt, s.updated_by AS updatedBy,
        (
          SELECT JSON_QUERY('[' + STRING_AGG(CONVERT(VARCHAR(38), QUOTENAME(roleId, '"')), ',') + ']')
          FROM OPENJSON(s.assigned_accessors, '$')
          WITH (roleId NVARCHAR(36) '$.roleId')
        ) AS assignedAccessorsRoleIds
        FROM support s
        WHERE s.innovation_id = i.id
        FOR JSON PATH
      ) AS supports,
      IIF(
        a.id IS NULL,
        NULL,
        JSON_OBJECT('id': a.id, 'majorVersion': a.major_version, 'minorVersion': a.minor_version, 'updatedAt': a.updated_at, 'isExempt': CONVERT(BIT, IIF(a.exempted_at IS NULL, 0, 1)), 'assignedToId': a.assign_to_id ABSENT ON NULL)
      ) AS assessment,
      (
        SELECT suggested_unit_id as suggestedUnitId, suggested_by_units_acronyms AS suggestedBy
      FROM innovation_suggested_units_view
      WHERE innovation_id = i.id
      FOR JSON PATH
      ) AS suggestions
    FROM innovations i
      INNER JOIN innovation_document d ON i.id = d.id
      LEFT JOIN innovation_assessment a ON i.id = a.innovation_id AND i.current_assessment_id = a.id AND a.deleted_at IS NULL`;

    if (innovationId) {
      sql += ` WHERE i.id = @0`;
    }

    const innovations = await this.sqlConnection.query(sql, innovationId ? [innovationId] : []);

    const schema = await this.irSchemaService.getSchema();

    const parsed: CurrentElasticSearchDocumentType[] = innovations.map((innovation: any) => {
      const document = schema.model.cleanUpDocument(JSON.parse(innovation.document ?? {}));
      return {
        id: innovation.id,
        status: innovation.status,
        statusUpdatedAt: innovation.statusUpdatedAt,
        groupedStatus: innovation.groupedStatus,
        hasBeenAssessed: !!innovation.hasBeenAssessed,
        submittedAt: innovation.submittedAt,
        updatedAt: innovation.updatedAt,
        lastAssessmentRequestAt: innovation.lastAssessmentRequestAt,
        document: schema.model.translateDocument(cloneDeep(document)),
        ...(innovation.owner && { owner: JSON.parse(innovation.owner) }),
        ...(innovation.engagingOrganisations && {
          engagingOrganisations: JSON.parse(innovation.engagingOrganisations)
        }),
        ...(innovation.engagingUnits && { engagingUnits: JSON.parse(innovation.engagingUnits) }),
        ...(innovation.shares && { shares: JSON.parse(innovation.shares) }),
        ...(innovation.supports && { supports: JSON.parse(innovation.supports) }),
        ...(innovation.assessment && { assessment: JSON.parse(innovation.assessment) }),
        ...(innovation.suggestions && { suggestions: JSON.parse(innovation.suggestions) }),
        filters: {
          name: document.INNOVATION_DESCRIPTION.name,
          countryName: document.INNOVATION_DESCRIPTION.countryName,
          categories: document.INNOVATION_DESCRIPTION.categories,
          careSettings: document.INNOVATION_DESCRIPTION.careSettings,
          involvedAACProgrammes: document.INNOVATION_DESCRIPTION.involvedAACProgrammes,
          diseasesAndConditions: document.UNDERSTANDING_OF_NEEDS.diseasesConditionsImpact,
          keyHealthInequalities: document.UNDERSTANDING_OF_NEEDS.keyHealthInequalities
        }
      };
    });

    return innovationId ? parsed[0] : parsed;
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
      case ActivityEnum.NEEDS_ASSESSMENT_START_EDIT:
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
