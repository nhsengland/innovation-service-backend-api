import {
  ActivityLogEntity,
  InnovationActionEntity,
  InnovationEntity,
  InnovationExportRequestEntity,
  InnovationSupportEntity,
  InnovationThreadEntity,
  InnovationTransferEntity,
  NotificationEntity,
  NotificationPreferenceEntity,
  OrganisationUnitEntity,
  UserEntity,
  UserRoleEntity
} from '@notifications/shared/entities';
import {
  ActivityTypeEnum,
  EmailNotificationPreferenceEnum,
  EmailNotificationType,
  InnovationActionStatusEnum,
  InnovationCollaboratorStatusEnum,
  InnovationExportRequestStatusEnum,
  InnovationStatusEnum,
  InnovationSupportStatusEnum,
  InnovationTransferStatusEnum,
  NotificationContextTypeEnum,
  OrganisationTypeEnum,
  ServiceRoleEnum,
  UserStatusEnum
} from '@notifications/shared/enums';
import { InnovationErrorsEnum, NotFoundError, OrganisationErrorsEnum } from '@notifications/shared/errors';
import type { DomainService, IdentityProviderService } from '@notifications/shared/services';
import SHARED_SYMBOLS from '@notifications/shared/services/symbols';
import { inject, injectable } from 'inversify';

import { BaseService } from './base.service';

import { InnovationCollaboratorEntity } from '@notifications/shared/entities/innovation/innovation-collaborator.entity';
import type { IdentityUserInfo } from '@notifications/shared/types';
import type { EntityManager } from 'typeorm';

export type RecipientType = {
  roleId: string;
  role: ServiceRoleEnum;
  userId: string;
  identityId: string;
  isActive: boolean;
};

type RoleFilter = {
  organisation?: string;
  organisationUnit?: string;
  withDeleted?: boolean;
};

@injectable()
export class RecipientsService extends BaseService {
  constructor(
    @inject(SHARED_SYMBOLS.IdentityProviderService) private identityProviderService: IdentityProviderService,
    @inject(SHARED_SYMBOLS.DomainService) private domainService: DomainService
  ) {
    super();
  }

  /**
   * get the identityInfo for a given user id
   * @param userIdentityId the user identity id
   * @returns user info or null if not found
   */
  async usersIdentityInfo(userIdentityId?: string): Promise<IdentityUserInfo | null>;
  /**
   * gets the identityInfo for a list of users
   * @param userIdentityIds the user identity ids
   * @param includeLocked wether to include locked users (default: false)
   * @returns list of users identity info
   */
  async usersIdentityInfo(userIdentityIds: string[]): Promise<Map<string, IdentityUserInfo>>;
  async usersIdentityInfo(
    userIdentityIds?: string | string[]
  ): Promise<null | IdentityUserInfo | Map<string, IdentityUserInfo>>;
  async usersIdentityInfo(
    userIdentityIds?: string | string[]
  ): Promise<null | IdentityUserInfo | Map<string, IdentityUserInfo>> {
    if (!userIdentityIds) {
      return null;
    }

    if (typeof userIdentityIds === 'string') {
      return (await this.identityProviderService.getUsersList([userIdentityIds]))[0] ?? null;
    } else {
      return this.identityProviderService.getUsersMap(userIdentityIds);
    }
  }

  /**
   * retrieves basic innovation info (note this assumes that the owner is not deleted unless withDeleted is set to true)
   *
   * !!!REVIEW THIS!!! Also remove the identityId from the response
   *
   * @param innovationId the innovation id
   * @param withDeleted optionally include deleted records (default: false)
   * @returns innovation name and owner id
   */
  async innovationInfo(
    innovationId: string,
    withDeleted = false,
    entityManager?: EntityManager
  ): Promise<{
    name: string;
    ownerId?: string;
    ownerIdentityId?: string;
  }> {
    const em = entityManager ?? this.sqlConnection.manager;
    const query = em.createQueryBuilder(InnovationEntity, 'innovation');

    if (withDeleted) {
      query.withDeleted();
    }

    query
      .select(['innovation.name', 'owner.id', 'owner.identityId'])
      .leftJoin('innovation.owner', 'owner')
      .where('innovation.id = :innovationId', { innovationId });

    const dbInnovation = await query.getOne();

    if (!dbInnovation) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    return {
      name: dbInnovation.name,
      ownerId: dbInnovation.owner?.id,
      ownerIdentityId: dbInnovation.owner?.identityId
    };
  }

  /**
   * gets the innovation collaborators
   *
   * Note: this is currently private because it wasn't required outside this service after refactor
   *
   * @param innovationId innovation id
   * @param status options status filter
   * @returns the collaborators list
   */
  private async getInnovationCollaborators(
    innovationId: string,
    status?: InnovationCollaboratorStatusEnum[],
    entityManager?: EntityManager
  ): Promise<
    {
      email: string;
      status: InnovationCollaboratorStatusEnum;
      userId?: string;
    }[]
  > {
    const em = entityManager ?? this.sqlConnection.manager;

    const query = em
      .createQueryBuilder(InnovationCollaboratorEntity, 'collaborator')
      .select(['collaborator.email', 'collaborator.status', 'user.id', 'user.status'])
      .leftJoin('collaborator.user', 'user')
      .where('collaborator.innovation_id = :innovationId', { innovationId });

    if (status?.length) {
      query.andWhere('collaborator.status IN (:...status)', { status });
    }

    const collaborators = (await query.getMany()).map(c => ({
      email: c.email,
      status: c.status,
      userId: c.user && c.user.status !== UserStatusEnum.DELETED ? c.user.id : undefined
    }));

    return collaborators;
  }

  async innovationSharedOrganisationsWithUnits(innovationId: string): Promise<
    {
      id: string;
      name: string;
      acronym: null | string;
      organisationUnits: { id: string; name: string; acronym: string }[];
    }[]
  > {
    const dbInnovation = await this.sqlConnection
      .createQueryBuilder(InnovationEntity, 'innovation')
      .select([
        'innovation.id',
        'organisationShares.id',
        'organisationShares.name',
        'organisationShares.acronym',
        'organisationUnits.id',
        'organisationUnits.name',
        'organisationUnits.acronym'
      ])
      .innerJoin('innovation.organisationShares', 'organisationShares')
      .innerJoin('organisationShares.organisationUnits', 'organisationUnits')
      .where('innovation.id = :innovationId', { innovationId })
      .andWhere('organisationShares.inactivated_at IS NULL')
      .andWhere('organisationUnits.inactivated_at IS NULL')
      .getOne();

    if (!dbInnovation) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    return Promise.all(
      dbInnovation.organisationShares.map(async organisation => ({
        id: organisation.id,
        name: organisation.name,
        acronym: organisation.acronym,
        organisationUnits: (await organisation.organisationUnits).map(unit => ({
          id: unit.id,
          name: unit.name,
          acronym: unit.acronym
        }))
      }))
    );
  }

  /**
   * returns the innovation assigned recipients to an innovation/support.
   * @param innovationId the innovation id
   * @param entityManager optionally pass an entity manager
   * @returns a list of users with their email notification preferences
   * @throws {NotFoundError} if the support is not found when using innovationSupportId
   */
  async innovationAssignedRecipients(innovationId: string, entityManager?: EntityManager): Promise<RecipientType[]> {
    const em = entityManager ?? this.sqlConnection.manager;

    const query = em
      .createQueryBuilder(InnovationSupportEntity, 'support')
      .select([
        'support.id',
        'organisationUnit.id',
        'userRole.id',
        'userRole.role',
        'userRole.isActive',
        'user.id',
        'user.identityId',
        'user.status'
      ])
      .innerJoin('support.userRoles', 'userRole')
      .innerJoin('support.organisationUnit', 'organisationUnit')
      .innerJoin('userRole.user', 'user')
      .where('userRole.organisation_unit_id = organisationUnit.id') // Only get the role for the organisation unit
      .andWhere('user.status != :userDeleted', { userDeleted: UserStatusEnum.DELETED }) // Filter deleted users
      .andWhere('support.innovation_id = :innovationId', { innovationId: innovationId });

    const dbInnovationSupports = await query.getMany();

    const res: RecipientType[] = [];
    for (const support of dbInnovationSupports) {
      for (const userRole of support.userRoles) {
        // This will always be true because of the inner join, but just in case
        if (userRole) {
          res.push({
            roleId: userRole.id,
            role: userRole.role,
            userId: userRole.user.id,
            identityId: userRole.user.identityId,
            isActive: userRole.isActive && userRole.user.status === UserStatusEnum.ACTIVE
          });
        }
      }
    }
    return res;
  }

  async userInnovationsWithAssignedRecipients(userId: string): Promise<
    {
      id: string;
      name: string;
      assignedUsers: RecipientType[];
    }[]
  > {
    const dbInnovations = await this.sqlConnection
      .createQueryBuilder(InnovationEntity, 'innovation')
      .select([
        'innovation.id',
        'innovation.name',
        'support.id',
        'organisationUnit.id',
        'userRole.id',
        'userRole.role',
        'userRole.isActive',
        'user.id',
        'user.identityId',
        'user.status'
      ])
      .innerJoin('innovation.innovationSupports', 'support')
      .innerJoin('support.organisationUnit', 'organisationUnit')
      .innerJoin('support.userRoles', 'userRole')
      .innerJoin('userRole.user', 'user')
      .where('innovation.owner_id = :userId', { userId })
      .andWhere('userRole.organisation_unit_id = organisationUnit.id')
      .andWhere('user.status = :userActive', { userActive: UserStatusEnum.ACTIVE })
      .getMany();

    const res: Awaited<ReturnType<RecipientsService['userInnovationsWithAssignedRecipients']>> = [];
    for (const innovation of dbInnovations) {
      const assignedUsers: RecipientType[] = [];
      for (const support of innovation.innovationSupports) {
        for (const userRole of support.userRoles) {
          // This will always be true because of the inner join, but just in case
          if (userRole) {
            assignedUsers.push({
              roleId: userRole.id,
              role: userRole.role,
              userId: userRole.user.id,
              identityId: userRole.user.identityId,
              isActive: userRole.isActive && userRole.user.status === UserStatusEnum.ACTIVE
            });
          }
        }
      }
      res.push({
        id: innovation.id,
        name: innovation.name,
        assignedUsers
      });
    }
    return res;
  }

  async actionInfoWithOwner(actionId: string): Promise<{
    id: string;
    displayId: string;
    status: InnovationActionStatusEnum;
    organisationUnit?: { id: string; name: string; acronym: string };
    owner: RecipientType; // maybe just output the roleId but this is not used in many places so left the shortcut
  }> {
    const dbAction = await this.sqlConnection
      .createQueryBuilder(InnovationActionEntity, 'action')
      .select([
        'action.id',
        'action.displayId',
        'action.status',
        'user.id',
        'user.identityId',
        'user.status',
        'role.id',
        'role.role',
        'role.isActive',
        'unit.id',
        'unit.name',
        'unit.acronym'
      ])
      // Review we are inner joining with user / role and the createdBy might have been deleted, for actions I don't
      // think it's too much of an error to not send notifications in those cases
      .innerJoin('action.createdByUser', 'user')
      .innerJoin('action.createdByUserRole', 'role')
      .leftJoin('role.organisationUnit', 'unit')
      .where(`action.id = :actionId`, { actionId })
      .andWhere('user.status = :userActive', { userActive: UserStatusEnum.ACTIVE })
      .getOne();

    if (!dbAction) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_ACTION_NOT_FOUND);
    }

    return {
      id: dbAction.id,
      displayId: dbAction.displayId,
      status: dbAction.status,
      ...(dbAction.createdByUserRole.organisationUnit && {
        organisationUnit: {
          id: dbAction.createdByUserRole.organisationUnit.id,
          name: dbAction.createdByUserRole.organisationUnit.name,
          acronym: dbAction.createdByUserRole.organisationUnit.acronym
        }
      }),
      owner: {
        userId: dbAction.createdByUser.id,
        identityId: dbAction.createdByUser.identityId,
        roleId: dbAction.createdByUserRole.id,
        role: dbAction.createdByUserRole.role,
        isActive: dbAction.createdByUserRole.isActive && dbAction.createdByUser.status === UserStatusEnum.ACTIVE
      }
    };
  }

  async threadInfo(
    threadId: string,
    entityManager?: EntityManager
  ): Promise<{
    id: string;
    subject: string;
    author?: RecipientType;
  }> {
    const em = entityManager ?? this.sqlConnection.manager;
    const dbThread = await em
      .createQueryBuilder(InnovationThreadEntity, 'thread')
      .select([
        'thread.id',
        'thread.subject',
        'author.id',
        'author.identityId',
        'author.status',
        'authorUserRole.id',
        'authorUserRole.role',
        'authorUserRole.isActive'
      ])
      .innerJoin('thread.author', 'author')
      .innerJoin('thread.authorUserRole', 'authorUserRole')
      .where('thread.id = :threadId', { threadId })
      .getOne();

    if (!dbThread) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_THREAD_NOT_FOUND);
    }
    return {
      id: dbThread.id,
      subject: dbThread.subject,
      // In case author has been deleted, we still want to send notifications
      ...(dbThread.author.status !== UserStatusEnum.DELETED && {
        author: {
          userId: dbThread.author.id,
          identityId: dbThread.author.identityId,
          roleId: dbThread.authorUserRole.id,
          role: dbThread.authorUserRole.role,
          isActive: dbThread.author.status === UserStatusEnum.ACTIVE && dbThread.authorUserRole.isActive
        }
      })
    };
  }

  /**
   * Fetch a thread intervenient users.
   * We only need to go by the thread messages because the first one, has also the thread author.
   */
  async threadFollowerRecipients(threadId: string): Promise<RecipientType[]> {
    const intervenients = await this.domainService.innovations.threadFollowers(threadId, false);

    return intervenients.map(item => ({
      userId: item.id,
      identityId: item.identityId,
      roleId: item.userRole.id,
      role: item.userRole.role,
      isActive: !item.locked
    }));
  }

  async innovationTransferInfoWithOwner(transferId: string): Promise<{
    id: string;
    email: string;
    status: InnovationTransferStatusEnum;
    ownerId: string;
  }> {
    const dbTransfer = await this.sqlConnection
      .createQueryBuilder(InnovationTransferEntity, 'transfer')
      .select(['transfer.id', 'transfer.email', 'transfer.status', 'transfer.createdBy'])
      .where('transfer.id = :transferId', { transferId })
      .getOne();

    if (!dbTransfer) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_TRANSFER_NOT_FOUND);
    }

    return {
      id: dbTransfer.id,
      email: dbTransfer.email,
      status: dbTransfer.status,
      ownerId: dbTransfer.createdBy
    };
  }

  /**
   * this is used to fetch the collaboration info. It might or might not be a user of the platform.
   * @param innovationCollaboratorId
   * @returns
   */
  async innovationCollaborationInfo(innovationCollaboratorId: string): Promise<{
    collaboratorId: string;
    email: string;
    status: InnovationCollaboratorStatusEnum;
    userId: string | null;
  }> {
    const dbCollaborator = await this.sqlConnection
      .createQueryBuilder(InnovationCollaboratorEntity, 'collaborator')
      .select(['collaborator.id', 'collaborator.email', 'collaborator.status', 'user.id'])
      .leftJoin('collaborator.user', 'user')
      .where('collaborator.id = :collaboratorId', { collaboratorId: innovationCollaboratorId })
      .getOne();

    if (!dbCollaborator) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_COLLABORATOR_NOT_FOUND);
    }

    return {
      collaboratorId: dbCollaborator.id,
      email: dbCollaborator.email,
      status: dbCollaborator.status,
      userId: dbCollaborator.user?.id ?? null
    };
  }

  /**
   * returns a list of active collaborator ids for an innovation
   * @param innovationId the innovation id
   * @returns list of user ids
   */
  async getInnovationActiveCollaborators(innovationId: string): Promise<string[]> {
    return (await this.getInnovationCollaborators(innovationId, [InnovationCollaboratorStatusEnum.ACTIVE]))
      .map(c => c.userId)
      .filter((item): item is string => item !== undefined); //filter undefined items
  }

  /**
   * gets the needs assessment recipients
   * @param includeLocked also include locked users (default false)
   * @param entityManager optionally pass an entity manager
   * @returns list of recipients
   */
  async needsAssessmentUsers(includeLocked = false, entityManager?: EntityManager): Promise<RecipientType[]> {
    return this.getRole(
      {
        roles: [ServiceRoleEnum.ASSESSMENT],
        includeLocked
      },
      entityManager
    );
  }

  async organisationUnitInfo(organisationUnitId: string): Promise<{
    organisation: { id: string; name: string; acronym: null | string };
    organisationUnit: { id: string; name: string; acronym: string };
  }> {
    const dbOrganisationUnit = await this.sqlConnection
      .createQueryBuilder(OrganisationUnitEntity, 'organisationUnit')
      .select([
        'organisation.id',
        'organisation.name',
        'organisation.acronym',
        'organisationUnit.id',
        'organisationUnit.name',
        'organisationUnit.acronym'
      ])
      .innerJoin('organisationUnit.organisation', 'organisation')
      .where('organisation.type = :type', { type: OrganisationTypeEnum.ACCESSOR })
      .andWhere('organisationUnit.id = :organisationUnitId', { organisationUnitId })
      .getOne();

    if (!dbOrganisationUnit) {
      throw new NotFoundError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND);
    }

    return {
      organisation: {
        id: dbOrganisationUnit.organisation.id,
        name: dbOrganisationUnit.organisation.name,
        acronym: dbOrganisationUnit.organisation.acronym
      },
      organisationUnit: {
        id: dbOrganisationUnit.id,
        name: dbOrganisationUnit.name,
        acronym: dbOrganisationUnit.acronym
      }
    };
  }

  async organisationUnitsQualifyingAccessors(
    organisationUnitIds: string[],
    includeLocked = false,
    entityManager?: EntityManager
  ): Promise<RecipientType[]> {
    if (!organisationUnitIds.length) {
      return [];
    }

    const em = entityManager ?? this.sqlConnection.manager;

    // filter out inactive organisations (this was previously like this not really sure why we'd pass ids of inactive organisations)
    const organisationUnits = (
      await em
        .createQueryBuilder(OrganisationUnitEntity, 'organisationUnit')
        .where('organisationUnit.id IN (:...organisationUnitIds)', { organisationUnitIds })
        .andWhere('organisationUnit.inactivated_at IS NULL')
        .getMany()
    ).map(unit => unit.id);

    if (!organisationUnits.length) {
      return [];
    }

    return this.getRole(
      {
        roles: [ServiceRoleEnum.QUALIFYING_ACCESSOR],
        organisationUnits: organisationUnits,
        includeLocked: includeLocked
      },
      em
    );
  }

  /**
   * Fetch daily digest users, this means users with notification preferences DAILY group by notification type (Actions, comments or support).
   */
  async dailyDigestUsersWithCounts(): Promise<
    {
      recipient: RecipientType;
      actionsCount: number;
      messagesCount: number;
      supportsCount: number;
    }[]
  > {
    // Start date to yesterday at midnight.
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 1);
    startDate.setHours(0, 0, 0, 0);

    // End date to today at midnight.
    const endDate = new Date();
    endDate.setHours(0, 0, 0, 0);

    const dbUsers: {
      userId: string;
      userIdentityId: string;
      userRole: ServiceRoleEnum;
      userRoleId: string;
      actionsCount: number;
      messagesCount: number;
      supportsCount: number;
    }[] =
      (await this.sqlConnection
        .createQueryBuilder(NotificationEntity, 'notification')
        .select('user.id', 'userId')
        .addSelect('user.external_id', 'userIdentityId')
        .addSelect('userRole.role', 'userRole')
        .addSelect('userRole.id', 'userRoleId')
        .addSelect(
          `COUNT(CASE WHEN notification.context_type = '${NotificationContextTypeEnum.ACTION}' then 1 else null end)`,
          'actionsCount'
        )
        .addSelect(
          `COUNT(CASE WHEN notification.context_type = '${NotificationContextTypeEnum.THREAD}' then 1 else null end)`,
          'messagesCount'
        )
        .addSelect(
          `COUNT(CASE WHEN notification.context_type = '${NotificationContextTypeEnum.SUPPORT}' then 1 else null end)`,
          'supportsCount'
        )
        .innerJoin('notification.notificationUsers', 'notificationUsers')
        .innerJoin('notificationUsers.userRole', 'userRole')
        .innerJoin('userRole.user', 'user')
        .innerJoin(
          'notification_preference',
          'notificationPreferences',
          'userRole.id = notificationPreferences.user_role_id'
        )
        .where('notification.created_at >= :startDate AND notification.created_at < :endDate', {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        })
        .andWhere('notificationPreferences.preference = :preference', {
          preference: EmailNotificationPreferenceEnum.DAILY
        })
        .andWhere('user.status = :userActive AND userRole.is_active = 1 AND user.deleted_at IS NULL', {
          userActive: UserStatusEnum.ACTIVE
        })
        .groupBy('user.id')
        .addGroupBy('user.external_id')
        .addGroupBy('userRole.role')
        .addGroupBy('userRole.id')
        .getRawMany()) || [];

    return dbUsers
      .filter(item => item.actionsCount + item.messagesCount + item.supportsCount > 0)
      .map(item => ({
        id: item.userId,
        identityId: item.userIdentityId,
        userRole: item.userRole,
        recipient: {
          userId: item.userId,
          identityId: item.userIdentityId,
          roleId: item.userRoleId,
          role: item.userRole,
          isActive: true
        },
        actionsCount: item.actionsCount,
        messagesCount: item.messagesCount,
        supportsCount: item.supportsCount
      }));
  }

  /**
   * returns a list of innovations with owner that have been created but not completed more than every 30 days ago
   * @param entityManager optionally pass an entity manager
   * @returns list of recipient owners with innovation id and name
   */
  async incompleteInnovationRecordOwners(
    entityManager?: EntityManager
  ): Promise<{ recipient: RecipientType; innovationId: string; innovationName: string }[]> {
    const em = entityManager ?? /* c8 ignore next */ this.sqlConnection.manager;
    const dbInnovations = await em
      .createQueryBuilder(InnovationEntity, 'innovations')
      .select(['innovations.id', 'innovations.name', 'owner.id', 'owner.identityId', 'roles.id', 'roles.role'])
      .leftJoin('innovations.owner', 'owner')
      .leftJoin('owner.serviceRoles', 'roles')
      .where(`innovations.status = '${InnovationStatusEnum.CREATED}'`)
      .andWhere('roles.role = :role', { role: ServiceRoleEnum.INNOVATOR })
      .andWhere('DATEDIFF(DAY, innovations.created_at, DATEADD(DAY, -1, GETDATE())) != 0')
      .andWhere('DATEDIFF(DAY, innovations.created_at, DATEADD(DAY, -1, GETDATE())) % 30 = 0')
      .andWhere('owner.status = :userActive AND roles.isActive = 1', { userActive: UserStatusEnum.ACTIVE })
      .getMany();

    return dbInnovations
      .filter((innovation): innovation is InnovationEntity & { owner: UserEntity } => !!innovation.owner)
      .map(innovation => ({
        recipient: {
          userId: innovation.owner.id,
          identityId: innovation.owner.identityId,
          roleId: innovation.owner.serviceRoles[0]?.id ?? /* c8 ignore next */ '',
          role: innovation.owner.serviceRoles[0]?.role ?? /* c8 ignore next */ ServiceRoleEnum.INNOVATOR,
          isActive: innovation.owner.serviceRoles[0] ? true : /* c8 ignore next */ false
        },
        innovationId: innovation.id,
        innovationName: innovation.name
      }));
  }

  /**
   *
   * @param days number of idle days to check
   * @param daysMod split notifications by daysMod
   */
  async idleSupports(
    days = 90,
    daysMod = 10
  ): Promise<
    {
      innovationId: string;
      innovationName: string;
      ownerIdentityId: string;
      unitId: string;
      recipient: RecipientType;
    }[]
  > {
    const query = this.sqlConnection
      .createQueryBuilder(ActivityLogEntity, 'activityLog')
      .select('innovation.id', 'innovationId')
      .addSelect('innovation.name', 'innovationName')
      .addSelect('owner.external_id', 'ownerIdentityId')
      .addSelect('userRole.organisation_unit_id', 'unitId')
      .addSelect('qas.id', 'qaRoleId')
      .addSelect('qas.role', 'qaRole')
      .addSelect('qaUser.id', 'qaUserId')
      .addSelect('qaUser.external_id', 'qaUserIdentityId')

      // Joins
      .innerJoin('activityLog.userRole', 'userRole')
      .innerJoin('activityLog.innovation', 'innovation')
      .innerJoin(
        'innovation.innovationSupports',
        'supports',
        'supports.organisation_unit_id = userRole.organisation_unit_id'
      )
      .innerJoin('user_role', 'qas', 'qas.organisation_unit_id = userRole.organisation_unit_id')
      .innerJoin('user', 'qaUser', 'qaUser.id = qas.user_id')
      .leftJoin('innovation.owner', 'owner', 'owner.status <> :userDeleted', { userDeleted: UserStatusEnum.DELETED }) // currently owner can be deleted and innovation active ...

      // Conditions
      .where('activityLog.type IN (:...types)', {
        types: [ActivityTypeEnum.ACTIONS, ActivityTypeEnum.THREADS, ActivityTypeEnum.SUPPORT]
      })

      // only active supports
      .andWhere('innovation.status != :innovationStatus', { innovationStatus: InnovationStatusEnum.PAUSED })
      .andWhere('supports.status IN (:...statuses)', {
        statuses: [InnovationSupportStatusEnum.ENGAGING, InnovationSupportStatusEnum.FURTHER_INFO_REQUIRED]
      })

      .andWhere('userRole.organisation_unit_id IS NOT NULL') // only A/QAs activity
      .andWhere('qas.role = :role', { role: ServiceRoleEnum.QUALIFYING_ACCESSOR }) // only notify QAs

      // filter locked/deleted
      .andWhere('qas.is_active = 1')
      .andWhere('qaUser.status = :userActive', { userActive: UserStatusEnum.ACTIVE })

      // group by
      .groupBy('innovation.id')
      .addGroupBy('innovation.name')
      .addGroupBy('owner.external_id')
      .addGroupBy('userRole.organisation_unit_id')
      .addGroupBy('qas.id')
      .addGroupBy('qas.role')
      .addGroupBy('qaUser.id')
      .addGroupBy('qaUser.external_id')

      // having
      .having('DATEDIFF(day, MAX(activityLog.created_at), GETDATE()) > :days', { days })
      .andHaving('(DATEDIFF(day, MAX(activityLog.created_at), GETDATE()) - :days) % :daysMod = 0', { days, daysMod });

    const rows = await query.getRawMany();
    return rows.map(row => ({
      innovationId: row.innovationId,
      innovationName: row.innovationName,
      ownerIdentityId: row.ownerIdentityId,
      unitId: row.unitId,
      recipient: {
        roleId: row.qaRoleId,
        role: row.qaRole,
        userId: row.qaUserId,
        identityId: row.qaUserIdentityId,
        isActive: true
      }
    }));
  }

  /**
   * returns the exportRequest info
   * @param requestId the request id
   * @returns the exportRequest info
   */
  async getExportRequestInfo(requestId: string): Promise<{
    id: string;
    status: InnovationExportRequestStatusEnum;
    requestReason: string;
    rejectReason: string | null;
    createdBy: {
      id: string;
      // All consumers require the unit so adding it here to avoid extra queries
      unitId?: string;
      unitName?: string;
    };
  }> {
    const request = await this.sqlConnection
      .createQueryBuilder(InnovationExportRequestEntity, 'request')
      .select([
        'request.id',
        'request.status',
        'request.requestReason',
        'request.rejectReason',
        'request.createdBy',
        'role.id',
        'unit.id',
        'unit.name'
      ])
      .innerJoin('request.createdByUserRole', 'role')
      .leftJoin('role.organisationUnit', 'unit')
      .where('request.id = :requestId', { requestId })
      .getOne();

    if (!request) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_EXPORT_REQUEST_NOT_FOUND);
    }

    return {
      id: request.id,
      status: request.status,
      requestReason: request.requestReason,
      rejectReason: request.rejectReason,
      createdBy: {
        id: request.createdBy,
        unitId: request.createdByUserRole.organisationUnit?.id,
        unitName: request.createdByUserRole.organisationUnit?.name
      }
    };
  }

  /**
   * retrieves a user recipient for a role
   * @param userId the user id
   * @param role the roles, this can be a single role or an array (useful for A/QAs)
   * @param extraFilters optional additional filters
   *  - organisation: the organisation id
   *  - organisationUnit: the organisation unit id
   *  - withDeleted: include deleted users
   * @returns the recipient for notifications
   */
  async getUsersRecipient(
    userId: undefined | string,
    roles: ServiceRoleEnum | ServiceRoleEnum[],
    extraFilters?: RoleFilter,
    entityManager?: EntityManager
  ): Promise<null | RecipientType>;
  /**
   * retrieves user recipients for a role
   * @param userId the user ids
   * @param role the roles, this can be a single role or an array (useful for A/QAs)
   * @param extraFilters optional additional filters
   *  - organisation: the organisation id
   *  - organisationUnit: the organisation unit id
   *  - withDeleted: include deleted users
   * @returns the recipients for notifications
   */
  async getUsersRecipient(
    userIds: string[],
    roles: ServiceRoleEnum | ServiceRoleEnum[],
    extraFilters?: RoleFilter,
    entityManager?: EntityManager
  ): Promise<RecipientType[]>;
  async getUsersRecipient(
    userIds: undefined | string | string[],
    roles: ServiceRoleEnum | ServiceRoleEnum[],
    extraFilters?: RoleFilter,
    entityManager?: EntityManager
  ): Promise<null | RecipientType | RecipientType[]>;
  async getUsersRecipient(
    userIds: undefined | string | string[],
    roles: ServiceRoleEnum | ServiceRoleEnum[],
    extraFilters?: RoleFilter,
    entityManager?: EntityManager
  ): Promise<null | RecipientType | RecipientType[]> {
    // Moved this verification to here to prevent verifications all around the code
    if (!userIds) {
      return null;
    }

    const userIdsArray = typeof userIds === 'string' ? [userIds] : userIds;
    if (!userIdsArray.length) {
      return [];
    }

    const em = entityManager ?? this.sqlConnection.manager;

    const rolesArray = typeof roles === 'string' ? [roles] : roles;
    const userRoles = await this.getRole(
      {
        userIds: userIdsArray,
        roles: rolesArray,
        includeLocked: true, // maybe make this an option but was currently used like this most of the times and the handler chooses
        ...(extraFilters?.organisation && { organisations: [extraFilters.organisation] }),
        ...(extraFilters?.organisationUnit && { organisationUnits: [extraFilters.organisationUnit] }),
        ...(extraFilters?.withDeleted && { withDeleted: true })
      },
      em
    );

    if (typeof userIds === 'string') {
      return userRoles[0] ?? null;
    } else {
      return userRoles;
    }
  }

  /**
   * helper function to get roles by all combination of possible filters
   * @param filters optional filters
   * @property userIds: array of user ids
   * @property roles: array of service roles
   * @property organisation array of organisations
   * @property organisationUnit array of units
   * @property withLocked if defined it will only include those otherwise both locked and unlocked
   * @property withDeleted return deleted users
   * @returns list of recipients
   */
  private async getRole(
    filters: {
      userIds?: string[];
      roles?: ServiceRoleEnum[];
      organisations?: string[];
      organisationUnits?: string[];
      includeLocked?: boolean;
      withDeleted?: boolean;
    },
    entityManager?: EntityManager
  ): Promise<RecipientType[]> {
    const { userIds, roles, organisations, organisationUnits, includeLocked, withDeleted } = filters;

    // sanity check to ensure we're filtering for something
    if (!userIds?.length && !roles?.length && !organisations?.length && !organisationUnits?.length) {
      return [];
    }

    const em = entityManager ?? this.sqlConnection.manager;

    const query = em
      .createQueryBuilder(UserRoleEntity, 'userRole')
      .select(['userRole.id', 'userRole.isActive', 'userRole.role', 'user.id', 'user.identityId', 'user.status'])
      .innerJoin('userRole.user', 'user');

    if (userIds?.length) {
      query.where('userRole.user_id IN (:...userIds)', { userIds });
    }

    if (roles?.length) {
      query.andWhere('userRole.role IN (:...roles)', { roles });
    }

    if (organisations?.length) {
      query.andWhere('userRole.organisation_id IN (:...organisations)', { organisations });
    }

    if (organisationUnits?.length) {
      query.andWhere('userRole.organisation_unit_id IN (:...organisationUnits)', { organisationUnits });
    }

    if (!includeLocked) {
      query
        .andWhere('user.status <> :userLocked', { userLocked: UserStatusEnum.LOCKED })
        .andWhere('userRole.is_active = 1');
    }

    // join user to check the status
    if (!withDeleted) {
      query.andWhere('user.status <> :userDeleted', { userDeleted: UserStatusEnum.DELETED });
    }

    const userRoles = (await query.getMany()).map(r => ({
      roleId: r.id,
      role: r.role,
      userId: r.user.id,
      identityId: r.user.identityId,
      isActive: r.isActive && r.user.status === UserStatusEnum.ACTIVE
    }));

    return userRoles;
  }

  /**
   * convert from identityId to userId including the deleted users
   * @param identityId the user identityId
   * @returns the user id
   */
  async identityId2UserId(identityId: string): Promise<string | null> {
    const user = await this.sqlConnection
      .createQueryBuilder(UserEntity, 'user')
      .select('user.id')
      .where('user.identityId = :identityId', { identityId })
      .getOne();

    return user?.id ?? null;
  }

  /**
   * convert from userId to identityId including the deleted users
   * @param userId the user id
   * @returns the identityId
   */
  async userId2IdentityId(userId: string): Promise<string | null> {
    const user = await this.sqlConnection
      .createQueryBuilder(UserEntity, 'user')
      .select('user.identityId')
      .where('user.id = :userId', { userId })
      .getOne();

    return user?.identityId ?? null;
  }

  /**
   * converts users (id, role, unit) to recipients. This is an envelope for the getUsersRecipient function that splits
   * the users by role and unit and then calls the getUsersRecipient function for each combination.
   *
   * ignoring the organisation because it's not relevant to avoid wrong selections;
   *
   * What this function aims for is reducing the number of queries done to the database buy grouping all the IDs into
   * groups of roles and units and then calling the getUsersRecipient function for each group.
   *
   * This avoids inserting one by one the IDs into the query and then having to do a lot of queries to the database.
   *
   * This also protects when one user might have multiple roles and not all of them are affected by the notification.
   * It wouldn't be possible to do this in a single query with ORs because it would return wrong results.
   * It would be possible to do with unions but that would be harder and need the SQL queries to be generated on demand.
   *
   * @param users the users to convert
   * @returns the recipients
   */
  async usersBagToRecipients(
    users: { id: string; userType: ServiceRoleEnum; organisationUnit?: string }[]
  ): Promise<RecipientType[]> {
    const helperMap = new Map<ServiceRoleEnum, Map<string, string[]>>();
    for (const user of users) {
      if (!helperMap.has(user.userType)) helperMap.set(user.userType, new Map());
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const roleMap = helperMap.get(user.userType)!; // we know it exists this is a map get after set issue in typescript
      if (!roleMap.has(user.organisationUnit ?? 'default')) roleMap.set(user.organisationUnit ?? 'default', []);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      roleMap.get(user.organisationUnit ?? 'default')!.push(user.id); // we know it exists this is a map get after set issue in typescript
    }

    const result: RecipientType[] = [];
    for (const [role, roleMap] of helperMap.entries()) {
      for (const [unit, userIds] of roleMap.entries()) {
        const x = unit !== 'default' ? { organisationUnit: unit } : undefined;
        result.push(...(await this.getUsersRecipient(userIds, role, x)));
      }
    }

    return result;
  }

  /**
   * returns a map of user roles and their preferences
   * @param roleIds the role ids
   * @param entityManager optionally pass an entity manager
   */
  async getEmailPreferences(
    roleIds: string[],
    entityManager?: EntityManager
  ): Promise<Map<string, Partial<Record<EmailNotificationType, EmailNotificationPreferenceEnum>>>> {
    const em = entityManager ?? this.sqlConnection.manager;

    if (!roleIds.length) {
      return new Map();
    }

    const res = new Map<string, Partial<Record<EmailNotificationType, EmailNotificationPreferenceEnum>>>();
    const preferences = await em
      .createQueryBuilder(NotificationPreferenceEntity, 'notificationPreference')
      .where('notificationPreference.user_role_id IN (:...roleIds)', { roleIds })
      .getMany();

    for (const preference of preferences) {
      if (!res.has(preference.userRoleId)) {
        res.set(preference.userRoleId, {});
      }
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      res.get(preference.userRoleId)![preference.notificationType] = preference.preference;
    }

    return res;
  }
}
