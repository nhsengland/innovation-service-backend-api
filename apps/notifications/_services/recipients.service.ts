import {
  IdleSupportViewEntity,
  InnovationActionEntity,
  InnovationEntity,
  InnovationExportRequestEntity,
  InnovationSupportEntity,
  InnovationThreadEntity,
  InnovationThreadMessageEntity,
  InnovationTransferEntity,
  NotificationEntity,
  OrganisationEntity,
  UserEntity,
  UserRoleEntity,
} from '@notifications/shared/entities';
import {
  EmailNotificationPreferenceEnum,
  EmailNotificationTypeEnum,
  InnovationActionStatusEnum,
  InnovationCollaboratorStatusEnum,
  InnovationStatusEnum,
  InnovationSupportStatusEnum,
  InnovationTransferStatusEnum,
  NotificationContextTypeEnum,
  OrganisationTypeEnum,
  ServiceRoleEnum,
} from '@notifications/shared/enums';
import {
  InnovationErrorsEnum,
  NotFoundError,
  OrganisationErrorsEnum,
  UserErrorsEnum,
} from '@notifications/shared/errors';
import {
  IdentityProviderServiceSymbol,
  IdentityProviderServiceType,
} from '@notifications/shared/services';
import { inject, injectable } from 'inversify';

import { BaseService } from './base.service';

import { InnovationCollaboratorEntity } from '@notifications/shared/entities/innovation/innovation-collaborator.entity';
import * as _ from 'lodash';
import type { EntityManager } from 'typeorm';

type InnovatorRecipientType = {
  id: string;
  identityId: string;
  userRole: UserRoleEntity;
  isActive: boolean;
  emailNotificationPreferences: {
    type: EmailNotificationTypeEnum;
    preference: EmailNotificationPreferenceEnum;
  }[];
};

@injectable()
export class RecipientsService extends BaseService {
  constructor(
    @inject(IdentityProviderServiceSymbol)
    private identityProviderService: IdentityProviderServiceType
  ) {
    super();
  }

  /*
   * TODO - I (MS) think most of the times the roles will either be irrelevant as a response here or they will be required more as filters than anything
   * else so I think we should remove them from the response and add them as filters to the queries.
   * This will help with the performance of the queries and avoid double checking after in the returns.
   *
   * It will become apparent when we start using the service in the notifications service.
   *
   * Example usersInfo will now return multiple times the same user if he has more than one role, this might have impact at the presentation
   * layer and force filtering afterwards (probably without the required context information)
   */

  /**
   * Fetch users information with notification preferences.
   */
  async usersInfo(userIds: string[]): Promise<
    {
      id: string;
      identityId: string;
      userRole: ServiceRoleEnum;
      emailNotificationPreferences: {
        type: EmailNotificationTypeEnum;
        preference: EmailNotificationPreferenceEnum;
      }[];
    }[]
  > {
    if (userIds.length === 0) {
      return [];
    }

    const dbUsers =
      (await this.sqlConnection
        .createQueryBuilder(UserEntity, 'user')
        .innerJoinAndSelect('user.serviceRoles', 'serviceRoles')
        .leftJoinAndSelect('user.notificationPreferences', 'notificationPreferences')
        .where('user.id IN (:...userIds)', { userIds })
        .andWhere('user.locked_at IS NULL')
        .getMany()) || [];

    const users = await Promise.all(
      dbUsers.map(async (item) => ({
        id: item.id,
        identityId: item.identityId,
        roles: item.serviceRoles.map((r) => r.role),
        emailNotificationPreferences: (
          await item.notificationPreferences
        ).map((emailPreference) => ({
          type: emailPreference.notification_id,
          preference: emailPreference.preference,
        })),
      }))
    );

    return users.flatMap((user) =>
      user.roles.map((role) => ({
        id: user.id,
        identityId: user.identityId,
        userRole: role,
        emailNotificationPreferences: user.emailNotificationPreferences,
      }))
    );
  }

  /**
   * Fetch user information with notification preferences.
   */
  async userInfo(
    userId: string,
    options?: { withDeleted?: boolean }
  ): Promise<{
    id: string;
    identityId: string;
    name: string;
    email: string;
    userRoles: ServiceRoleEnum[];
    isActive: boolean;
    emailNotificationPreferences: {
      type: EmailNotificationTypeEnum;
      preference: EmailNotificationPreferenceEnum;
    }[];
  }> {
    const dbUserQuery = this.sqlConnection
      .createQueryBuilder(UserEntity, 'user')
      .innerJoinAndSelect('user.serviceRoles', 'serviceRoles')
      .leftJoinAndSelect('user.notificationPreferences', 'notificationPreferences')
      .where('user.id = :userId', { userId });

    if (options?.withDeleted) {
      dbUserQuery.withDeleted();
    }

    const dbUser = await dbUserQuery.getOne();

    if (!dbUser) {
      throw new NotFoundError(UserErrorsEnum.USER_SQL_NOT_FOUND);
    }

    const authUser = await this.identityProviderService.getUserInfo(dbUser.identityId);

    return {
      id: dbUser.id,
      identityId: dbUser.identityId,
      email: authUser.email,
      name: authUser.displayName,
      userRoles: dbUser.serviceRoles.map((r) => r.role),
      isActive: !dbUser.lockedAt,
      emailNotificationPreferences: (await dbUser.notificationPreferences).map((item) => ({
        type: item.notification_id,
        preference: item.preference,
      })),
    };
  }

  async usersIdentityInfo(userIds: string[]): Promise<
    {
      identityId: string;
      displayName: string;
      email: string;
      isActive: boolean;
    }[]
  > {
    if (!userIds.length) {
      return [];
    }

    const dbUsers = await this.sqlConnection
      .createQueryBuilder(UserEntity, 'users')
      .where(`users.id IN (:...userIds)`, { userIds })
      .andWhere(`users.locked_at IS NULL`)
      .getMany();

    return await this.identityProviderService.getUsersList(dbUsers.map((u) => u.identityId));
  }

  /**
   * retrieves the innovation with information about the owner and their email preferences.
   * @param innovationId the innovation id
   * @param withDeleted optionally include deleted records (default: false)
   * @returns innovation info with owner
   */
  async innovationInfoWithOwner(
    innovationId: string,
    withDeleted = false
  ): Promise<{
    name: string;
    owner: {
      id: string;
      identityId: string;
      userRole: UserRoleEntity;
      isActive: boolean;
      emailNotificationPreferences: {
        type: EmailNotificationTypeEnum;
        preference: EmailNotificationPreferenceEnum;
      }[];
    };
  }> {
    let query = this.sqlConnection.createQueryBuilder(InnovationEntity, 'innovation');

    if (withDeleted) {
      query = query.withDeleted();
    }

    query = query
      .innerJoinAndSelect('innovation.owner', 'owner')
      .innerJoinAndSelect('owner.serviceRoles', 'serviceRoles')
      .leftJoinAndSelect('owner.notificationPreferences', 'notificationPreferences')
      .where('innovation.id = :innovationId', { innovationId });

    const dbInnovation = await query.getOne();

    if (!dbInnovation) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    // This will not work if a innovator can have two INNOVATOR roles
    const innovationOwnerRole = dbInnovation.owner.serviceRoles.find(
      (r) => r.role === ServiceRoleEnum.INNOVATOR
    );

    if (!innovationOwnerRole) {
      throw new NotFoundError(UserErrorsEnum.USER_TYPE_INVALID);
    }

    return {
      name: dbInnovation.name,
      owner: {
        id: dbInnovation.owner.id,
        identityId: dbInnovation.owner.identityId,
        userRole: innovationOwnerRole,
        isActive: !dbInnovation.owner.lockedAt,
        emailNotificationPreferences: (await dbInnovation.owner.notificationPreferences).map(
          (item) => ({
            type: item.notification_id,
            preference: item.preference,
          })
        ),
      },
    };
  }

  async innovationInfoWithCollaborators(innovationId: string): Promise<{
    name: string;
    collaborators: {
      id: string;
      status: InnovationCollaboratorStatusEnum;
      user?: {
        id: string;
        identityId: string;
        isActive: boolean;
        userRole: UserRoleEntity | undefined;
        emailNotificationPreferences: {
          type: EmailNotificationTypeEnum;
          preference: EmailNotificationPreferenceEnum;
        }[];
      };
    }[];
  }> {
    const dbInnovation = await this.sqlConnection
      .createQueryBuilder(InnovationEntity, 'innovation')
      .select([
        'innovation.name',
        'collaborator.id',
        'collaborator.status',
        'collaboratorUser.id',
        'collaboratorUser.identityId',
        'serviceRole.id',
        'serviceRole.role',
        'notificationPreferences.notification_id',
        'notificationPreferences.preference',
      ])
      .leftJoin('innovation.collaborators', 'collaborator')
      .leftJoin('collaborator.user', 'collaboratorUser')
      .leftJoin('collaboratorUser.serviceRoles', 'serviceRole')
      .leftJoin('collaboratorUser.notificationPreferences', 'notificationPreferences')
      .where('innovation.id = :innovationId', { innovationId })
      .getOne();

    if (!dbInnovation) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    return {
      name: dbInnovation.name,
      collaborators: await Promise.all(
        dbInnovation.collaborators.map(async (c) => ({
          id: c.id,
          status: c.status,
          ...(c.user && {
            user: {
              id: c.user.id,
              identityId: c.user.identityId,
              userRole: c.user.serviceRoles.find((sR) => sR.role === ServiceRoleEnum.INNOVATOR),
              isActive: !c.user.lockedAt,
              emailNotificationPreferences: (
                await c.user.notificationPreferences
              ).map((item) => ({ type: item.notification_id, preference: item.preference })),
            },
          }),
        }))
      ),
    };
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
      .innerJoinAndSelect('innovation.organisationShares', 'organisationShares')
      .innerJoinAndSelect('organisationShares.organisationUnits', 'organisationUnits')
      .where('innovation.id = :innovationId', { innovationId })
      .andWhere('organisationShares.inactivated_at IS NULL')
      .andWhere('organisationUnits.inactivated_at IS NULL')
      .getOne();

    if (!dbInnovation) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    return Promise.all(
      dbInnovation.organisationShares.map(async (organisation) => ({
        id: organisation.id,
        name: organisation.name,
        acronym: organisation.acronym,
        organisationUnits: (await organisation.organisationUnits).map((unit) => ({
          id: unit.id,
          name: unit.name,
          acronym: unit.acronym,
        })),
      }))
    );
  }

  /**
   * returns the innovation assigned users to an innovation/support.
   * @param data the parameters is either:
   *  - innovationId - to get all the users assigned to the innovation
   *  - innovationSupportId - to get all the users assigned to the innovation support
   * @returns a list of users with their email notification preferences
   * @throws {NotFoundError} if the support is not found when using innovationSupportId
   */
  async innovationAssignedUsers(
    data: { innovationId: string } | { innovationSupportId: string }
  ): Promise<
    {
      id: string;
      identityId: string;
      userRole: { id: string; role: ServiceRoleEnum };
      organisationUnitId: string;
      emailNotificationPreferences: {
        type: EmailNotificationTypeEnum;
        preference: EmailNotificationPreferenceEnum;
      }[];
    }[]
  > {
    const query = this.sqlConnection
      .createQueryBuilder(InnovationSupportEntity, 'support')
      .select([
        'support.id',
        'organisationUnit.id',
        'organisationUnitUser.id',
        'organisationUser.id', // there are required only for the typeOrm to work (create the hierarchical structure)
        'user.id',
        'user.identityId',
        'serviceRoles.id',
        'serviceRoles.role',
        'serviceRoles.organisation_unit_id',
        'notificationPreferences.notification_id',
        'notificationPreferences.preference',
      ])
      .innerJoin('support.organisationUnitUsers', 'organisationUnitUser')
      .innerJoin('support.organisationUnit', 'organisationUnit')
      .innerJoin('organisationUnitUser.organisationUser', 'organisationUser')
      .innerJoin('organisationUser.user', 'user')
      .innerJoin('user.serviceRoles', 'serviceRoles')
      .leftJoin('user.notificationPreferences', 'notificationPreferences')
      .where('serviceRoles.organisation_unit_id = organisationUnit.id') // Only get the role for the organisation unit
      .andWhere('user.locked_at IS NULL');

    if ('innovationId' in data) {
      query.andWhere('support.innovation_id = :innovationId', { innovationId: data.innovationId });
    } else if ('innovationSupportId' in data) {
      query.andWhere('support.id = :innovationSupportId', {
        innovationSupportId: data.innovationSupportId,
      });
    }

    const dbInnovationSupports = await query.getMany();

    // keep previous behavior throwing an error when searching for a specific support
    if ('innovationSupportId' in data && !dbInnovationSupports.length) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_SUPPORT_NOT_FOUND);
    }

    return Promise.all(
      dbInnovationSupports.flatMap((support) =>
        support.organisationUnitUsers.map(async (item) => ({
          id: item.organisationUser.user.id,
          identityId: item.organisationUser.user.identityId,
          userRole: item.organisationUser.user.serviceRoles.map((r) => ({
            id: r.id,
            role: r.role,
          }))[0] ?? { id: '', role: '' as ServiceRoleEnum }, // this will never happen since it's an inner join
          organisationUnitId: support.organisationUnit.id,
          emailNotificationPreferences: (
            await item.organisationUser.user.notificationPreferences
          ).map((emailPreference) => ({
            type: emailPreference.notification_id,
            preference: emailPreference.preference,
          })),
        }))
      )
    );
  }

  async userInnovationsWithAssignedUsers(userId: string): Promise<
    {
      id: string;
      assignedUsers: {
        id: string;
        identityId: string;
        roleId: string;
        organisationUnitId: string;
      }[];
    }[]
  > {
    const dbInnovations =
      (await this.sqlConnection
        .createQueryBuilder(InnovationEntity, 'innovation')
        .select([
          'innovation.id',
          'support.id',
          'organisationUnit.id',
          'organisationUnitUser.id',
          'organisationUser.id',
          'user.id',
          'user.identityId',
          'serviceRoles.id',
        ])
        .innerJoin('innovation.innovationSupports', 'support')
        .innerJoin('support.organisationUnit', 'organisationUnit')
        .innerJoin('support.organisationUnitUsers', 'organisationUnitUser')
        .innerJoin('organisationUnitUser.organisationUser', 'organisationUser')
        .innerJoin('organisationUser.user', 'user')
        .innerJoin('user.serviceRoles', 'serviceRoles')
        .where('innovation.owner_id = :userId', { userId })
        .andWhere('serviceRoles.organisation_unit_id = organisationUnit.id')
        .getMany()) || [];

    return dbInnovations.map((innovation) => ({
      id: innovation.id,
      assignedUsers: innovation.innovationSupports.flatMap((support) =>
        support.organisationUnitUsers.map((item) => ({
          id: item.organisationUser.user.id,
          identityId: item.organisationUser.user.identityId,
          roleId: item.organisationUser.user.serviceRoles.map((r) => r.id)[0] ?? '', // this will never happen since it's an inner join
          organisationUnitId: support.organisationUnit.id,
        }))
      ),
    }));
  }

  async actionInfoWithOwner(actionId: string): Promise<{
    id: string;
    displayId: string;
    status: InnovationActionStatusEnum;
    organisationUnit?: { id: string; name: string; acronym: string };
    owner: { id: string; identityId: string; roleId: string; role: ServiceRoleEnum };
  }> {
    const dbAction = await this.sqlConnection
      .createQueryBuilder(InnovationActionEntity, 'action')
      .select([
        'action.id',
        'action.displayId',
        'action.status',
        'user.id',
        'user.identityId',
        'role.id',
        'role.role',
        'support.id',
        'unit.id',
        'unit.name',
        'unit.acronym',
      ])
      .innerJoin('action.createdByUser', 'user')
      .innerJoin('action.createdByUserRole', 'role')
      .leftJoin('action.innovationSupport', 'support')
      .leftJoin('support.organisationUnit', 'unit')
      .where(`action.id = :actionId`, { actionId })
      .andWhere('user.locked_at IS NULL')
      .getOne();

    if (!dbAction) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_ACTION_NOT_FOUND);
    }

    return {
      id: dbAction.id,
      displayId: dbAction.displayId,
      status: dbAction.status,
      ...(dbAction.innovationSupport && {
        organisationUnit: {
          id: dbAction.innovationSupport.organisationUnit.id,
          name: dbAction.innovationSupport.organisationUnit.name,
          acronym: dbAction.innovationSupport.organisationUnit.acronym,
        },
      }),
      owner: {
        id: dbAction.createdByUser.id,
        identityId: dbAction.createdByUser.identityId,
        roleId: dbAction.createdByUserRole.id,
        role: dbAction.createdByUserRole.role,
      },
    };
  }

  async threadInfo(threadId: string): Promise<{
    id: string;
    subject: string;
    author: {
      id: string;
      identityId: string;
      locked: boolean;
      userRole: UserRoleEntity;
      emailNotificationPreferences: {
        type: EmailNotificationTypeEnum;
        preference: EmailNotificationPreferenceEnum;
      }[];
    };
  }> {
    const dbThread = await this.sqlConnection
      .createQueryBuilder(InnovationThreadEntity, 'thread')
      .innerJoinAndSelect('thread.author', 'user')
      .leftJoinAndSelect('thread.authorUserRole', 'authorUserRole')
      .leftJoinAndSelect('user.notificationPreferences', 'notificationPreferences')
      .where('thread.id = :threadId', { threadId })
      .getOne();

    if (!dbThread) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_THREAD_NOT_FOUND);
    }

    return {
      id: dbThread.id,
      subject: dbThread.subject,
      author: {
        id: dbThread.author.id,
        identityId: dbThread.author.identityId,
        locked: !!dbThread.author.lockedAt,
        userRole: dbThread.authorUserRole,
        emailNotificationPreferences: (await dbThread.author.notificationPreferences).map(
          (emailPreference) => ({
            type: emailPreference.notification_id,
            preference: emailPreference.preference,
          })
        ),
      },
    };
  }

  /**
   * Fetch a thread intervenient users.
   * We only need to go by the thread messages because the first one, has also the thread author.
   */
  async threadIntervenientUsers(
    threadId: string,
    entityManager?: EntityManager
  ): Promise<
    {
      id: string;
      identityId: string;
      userRole: UserRoleEntity;
      organisationUnitId?: string | null;
      emailNotificationPreferences: {
        type: EmailNotificationTypeEnum;
        preference: EmailNotificationPreferenceEnum;
      }[];
    }[]
  > {
    const connection = entityManager ?? this.sqlConnection.manager;

    const authors = new Map(
      (
        await connection
          .createQueryBuilder(InnovationThreadMessageEntity, 'threadMessage')
          .leftJoin('threadMessage.authorUserRole', 'authorUserRole')
          .where('threadMessage.innovation_thread_id = :threadId', { threadId })
          .select('threadMessage.author_id', 'author_id')
          .addSelect('authorUserRole.id', 'author_role_id')
          .addSelect('authorUserRole.role', 'author_role_name')
          .addSelect('authorUserRole.organisation_unit_id', 'author_organisation_unit_id')
          .where('threadMessage.deleted_at IS NULL')
          .andWhere('threadMessage.innovation_thread_id = :threadId', { threadId })
          .distinct()
          .getRawMany()
      ).map((item) => [
        item.author_id,
        {
          context: {
            organisationUnitId: item.author_organisation_unit_id,
            role: item.author_role_name,
          },
        },
      ])
    );

    if (authors.size === 0) {
      return [];
    }

    const dbThreadUsers = await connection
      .createQueryBuilder(UserEntity, 'user')
      .leftJoinAndSelect('user.notificationPreferences', 'notificationPreferences')
      .where('user.id IN (:...ids)', { ids: Array.from(authors.keys()) })
      .getMany();

    return Promise.all(
      dbThreadUsers.map(async (item) => ({
        id: item.id,
        identityId: item.identityId,
        userRole: authors.get(item.id)?.context.role ?? null,
        organisationUnitId: authors.get(item.id)?.context.organisationUnitId ?? null,
        emailNotificationPreferences: (await item.notificationPreferences).map(
          (emailPreference) => ({
            type: emailPreference.notification_id,
            preference: emailPreference.preference,
          })
        ),
      }))
    );
  }

  async innovationTransferInfoWithOwner(transferId: string): Promise<{
    id: string;
    email: string;
    status: InnovationTransferStatusEnum;
    owner: { id: string; identityId: string };
  }> {
    const dbTransfer = await this.sqlConnection
      .createQueryBuilder(InnovationTransferEntity, 'innovationTransfer')
      .select('innovationTransfer.id', 'id')
      .addSelect('innovationTransfer.email', 'email')
      .addSelect('innovationTransfer.status', 'status')
      .addSelect('user.id', 'userId')
      .addSelect('user.external_id', 'userIdentityId')
      .innerJoin(
        UserEntity,
        'user',
        'user.id = innovationTransfer.created_by AND user.locked_at IS NULL'
      )
      .where('innovationTransfer.id = :transferId', { transferId })
      .getRawOne();

    if (!dbTransfer) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_TRANSFER_NOT_FOUND);
    }

    return {
      id: dbTransfer.id,
      email: dbTransfer.email,
      status: dbTransfer.status,
      owner: { id: dbTransfer.userId, identityId: dbTransfer.userIdentityId },
    };
  }

  async innovationCollaboratorInfo(innovationCollaboratorId: string): Promise<{
    id: string;
    email: string;
    status: InnovationCollaboratorStatusEnum;
    user?: { id: string; identityId: string; roleId: string };
  }> {
    const dbCollaborator = await this.sqlConnection
      .createQueryBuilder(InnovationCollaboratorEntity, 'collaborator')
      .select([
        'collaborator.id',
        'collaborator.email',
        'collaborator.status',
        'user.id',
        'user.identityId',
        'userRoles.id',
        'userRoles.role',
      ])
      .leftJoin('collaborator.user', 'user')
      .leftJoin('user.serviceRoles', 'userRoles')
      .where('collaborator.id = :collaboratorId', { collaboratorId: innovationCollaboratorId })
      .getOne();

    if (!dbCollaborator) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_COLLABORATOR_NOT_FOUND);
    }

    const role = dbCollaborator.user?.serviceRoles.find(
      (sR) => sR.role === ServiceRoleEnum.INNOVATOR
    );

    return {
      id: dbCollaborator.id,
      email: dbCollaborator.email,
      status: dbCollaborator.status,
      ...(dbCollaborator.user && role
        ? {
            user: {
              id: dbCollaborator.user.id,
              identityId: dbCollaborator.user.identityId,
              roleId: role.id,
            },
          }
        : {}),
    };
  }

  async innovationActiveCollaboratorUsers(innovationId: string): Promise<InnovatorRecipientType[]> {
    return (await this.innovationInfoWithCollaborators(innovationId)).collaborators
      .filter((c) => c.status === InnovationCollaboratorStatusEnum.ACTIVE)
      .map((c) => c.user)
      .filter((item): item is InnovatorRecipientType => item !== undefined); //filter undefined items
  }

  async needsAssessmentUsers(): Promise<{ id: string; identityId: string; roleId: string }[]> {
    const dbUsers = await this.sqlConnection
      .createQueryBuilder(UserEntity, 'users')
      .select(['users.id', 'users.identityId', 'serviceRoles.id'])
      .innerJoin('users.serviceRoles', 'serviceRoles')
      .where('serviceRoles.role = :role', { role: ServiceRoleEnum.ASSESSMENT })
      .andWhere('users.locked_at IS NULL')
      .getMany();

    return dbUsers.map((user) => ({
      id: user.id,
      identityId: user.identityId,
      roleId: user.serviceRoles[0]?.id ?? '',
    })); // It's always assigned and just one because of the innerJoin
  }

  async organisationUnitInfo(organisationUnitId: string): Promise<{
    organisation: { id: string; name: string; acronym: null | string };
    organisationUnit: { id: string; name: string; acronym: string };
  }> {
    const dbOrganisation = await this.sqlConnection
      .createQueryBuilder(OrganisationEntity, 'organisation')
      .innerJoinAndSelect('organisation.organisationUnits', 'organisationUnits')
      .where('organisation.type = :type', { type: OrganisationTypeEnum.ACCESSOR })
      .andWhere('organisationUnits.id = :organisationUnitId', { organisationUnitId })
      .getOne();

    if (!dbOrganisation) {
      throw new NotFoundError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND);
    }

    return {
      organisation: {
        id: dbOrganisation.id,
        name: dbOrganisation.name,
        acronym: dbOrganisation.acronym,
      },
      organisationUnit: (await dbOrganisation.organisationUnits).map((item) => ({
        id: item.id,
        name: item.name,
        acronym: item.acronym,
      }))[0] ?? { id: '', name: '', acronym: '' },
    };
  }

  async organisationUnitsQualifyingAccessors(
    organisationUnitIds: string[]
  ): Promise<{ id: string; identityId: string; roleId: string; organisationUnitId: string }[]> {
    if (organisationUnitIds.length === 0) {
      return [];
    }

    const dbUsers = await this.sqlConnection
      .createQueryBuilder(UserEntity, 'user')
      .select(['user.id', 'user.identityId', 'serviceRoles.id', 'organisationUnit.id'])
      .innerJoin('user.serviceRoles', 'serviceRoles')
      .innerJoin('serviceRoles.organisationUnit', 'organisationUnit')
      .where('organisationUnit.id IN (:...organisationUnitIds)', { organisationUnitIds })
      .andWhere('user.locked_at IS NULL')
      .andWhere('serviceRoles.role = :role', { role: ServiceRoleEnum.QUALIFYING_ACCESSOR })
      .andWhere('organisationUnit.inactivated_at IS NULL')
      .getMany();

    return dbUsers.map((item) => ({
      id: item.id,
      identityId: item.identityId,
      roleId: item.serviceRoles[0]?.id ?? '',
      organisationUnitId: item.serviceRoles[0]?.organisationUnit?.id ?? '',
    }));
  }

  /**
   * Fetch daily digest users, this means users with notification preferences DAILY group by notification type (Actions, comments or support).
   */
  async dailyDigestUsersWithCounts(): Promise<
    {
      id: string;
      identityId: string;
      userRole: ServiceRoleEnum;
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
      actionsCount: number;
      messagesCount: number;
      supportsCount: number;
    }[] =
      (await this.sqlConnection
        .createQueryBuilder(NotificationEntity, 'notification')
        .select('user.id', 'userId')
        .addSelect('user.external_id', 'userIdentityId')
        .addSelect('userRole.role', 'userRole')
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
        .innerJoin('user.notificationPreferences', 'notificationPreferences')
        .where('notification.created_at >= :startDate AND notification.created_at < :endDate', {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        })
        .andWhere('notificationPreferences.preference = :preference', {
          preference: EmailNotificationPreferenceEnum.DAILY,
        })
        .andWhere('user.locked_at IS NULL')
        .groupBy('user.id')
        .addGroupBy('user.external_id')
        .addGroupBy('userRole.role')
        .getRawMany()) || [];

    return dbUsers
      .filter((item) => item.actionsCount + item.messagesCount + item.supportsCount > 0)
      .map((item) => ({
        id: item.userId,
        identityId: item.userIdentityId,
        userRole: item.userRole,
        actionsCount: item.actionsCount,
        messagesCount: item.messagesCount,
        supportsCount: item.supportsCount,
      }));
  }

  async incompleteInnovationRecordOwners(): Promise<
    { id: string; identityId: string; innovationId: string; innovationName: string }[]
  > {
    const dbInnovations = await this.sqlConnection
      .createQueryBuilder(InnovationEntity, 'innovations')
      .innerJoinAndSelect('innovations.owner', 'owner')
      .where(`innovations.status = '${InnovationStatusEnum.CREATED}'`)
      .andWhere('DATEDIFF(DAY, innovations.created_at, DATEADD(DAY, -1, GETDATE())) != 0')
      .andWhere('DATEDIFF(DAY, innovations.created_at, DATEADD(DAY, -1, GETDATE())) % 30 = 0')
      .andWhere('owner.lockedAt IS NULL')
      .getMany();

    return dbInnovations.map((innovation) => ({
      id: innovation.owner.id,
      identityId: innovation.owner.identityId,
      innovationId: innovation.id,
      innovationName: innovation.name,
    }));
  }

  /**
   * @description Looks for Innovations actively supported by organisation units (ENGAGING, FURTHER INFO) whose assigned accessors have not interacted with the innovations for a given amount of time.
   * @description Inactivity is measured by:
   * @description - The last time an Innovation Support was updated (change the status from A to B) AND;
   * @description - The last time an Innovation Action was completed by an Innovator (Changed its status from REQUESTED to SUBMITTED) OR no Innovation Actions are found AND;
   * @description - The last message posted on a thread or a thread was created (which also creates a message, so checking thread messages is enough) OR no messages or threads are found.
   * @param idlePeriod How many days are considered to be idle
   * @returns Promise<{userId: string; identityId: string, latestInteractionDate: Date}[]>
   */
  async idleOrganisationUnitsPerInnovation(
    idlePeriod = 90
  ): Promise<{ userId: string; identityId: string; latestInteractionDate: Date }[]> {
    const latestSupportQuery = this.sqlConnection
      .createQueryBuilder(InnovationEntity, 'i')
      .select('u.id', 'unitId')
      .addSelect('i.id', 'innovationId')
      .addSelect('MAX(s.id)', 'supportId')
      .addSelect('MAX(s.updated_at)', 'latest')
      .innerJoinAndSelect('i.innovationSupports', 's')
      .innerJoinAndSelect('s.organisationUnit', 'u')
      .groupBy('u.id')
      .addGroupBy('i.id');

    const latestActionQuery = this.sqlConnection
      .createQueryBuilder(InnovationEntity, 'i')
      .select('u.id', 'unitId')
      .addSelect('i.id', 'innovationId')
      .addSelect('MAX(s.id)', 'supportId')
      .addSelect('MAX(actions.updated_at)', 'latest')
      .innerJoin('i.innovationSupports', 's')
      .innerJoin('s.organisationUnit', 'u')
      .leftJoin('s.action', 'actions')
      .where(`actions.status = '${InnovationActionStatusEnum.SUBMITTED}'`)
      .groupBy('u.id')
      .addGroupBy('i.id');

    const latestMessageQuery = this.sqlConnection
      .createQueryBuilder(InnovationEntity, 'i')
      .select('u.id', 'unitId')
      .addSelect('i.id', 'innovationId')
      .addSelect('MAX(s.id)', 'supportId')
      .addSelect('MAX(s.updated_at)', 'latest')
      .innerJoin('i.innovationSupports', 's')
      .innerJoin('s.organisationUnit', 'u')
      .innerJoin(InnovationThreadEntity, 'threads', 'threads.innovation_id = i.id')
      .innerJoin(
        InnovationThreadMessageEntity,
        'messages',
        'threads.id = messages.innovation_thread_id'
      )
      .groupBy('u.id')
      .addGroupBy('i.id');

    const mainQuery = this.sqlConnection
      .createQueryBuilder(InnovationEntity, 'innovations')

      .select('users.id', 'userId')
      .addSelect('users.external_id', 'identityId')

      /**
       * maxSupports 01/01/2022 10:00:00
       * maxActions 02/01/2022 09:00:00
       * maxMessages 02/01/2022 09:01:00
       *
       * latestInteractionDate = maxMessages = 02/01/2022 09:01:00
       */
      .addSelect(
        '(SELECT MAX(v) FROM (VALUES (MAX(L.latest)), (MAX(l2.latest)), (MAX(l3.latest))) as value(v))',
        'latestInteractionDate'
      )

      .innerJoin('innovations.innovationSupports', 'supports')
      .innerJoin('supports.organisationUnitUsers', 'unitUsers')
      .innerJoin('unitUsers.organisationUser', 'organisationUsers')
      .innerJoin('organisationUsers.user', 'users')
      .innerJoin(
        (_) => latestSupportQuery,
        'maxSupports',
        'maxSupports.innovationId = innovations.id and maxSupports.supportId = supports.id'
      )
      .leftJoin(
        (_) => latestActionQuery,
        'maxActions',
        'maxActions.innovationId = innovations.id and maxActions.supportId = supports.id'
      )
      .leftJoin(
        (_) => latestMessageQuery,
        'maxMessages',
        'maxMessages.innovationId = innovations.id and maxMessages.supportId = supports.id'
      )
      .where(
        `supports.status in ('${InnovationSupportStatusEnum.ENGAGING}','${InnovationSupportStatusEnum.FURTHER_INFO_REQUIRED}')`
      )
      .andWhere(`DATEDIFF(day, maxSupports.latest, GETDATE()) >= ${idlePeriod}`)
      .andWhere(
        `(DATEDIFF(day, maxActions.latest, GETDATE()) >= ${idlePeriod} OR maxActions IS NULL)`
      )
      .andWhere(
        `(DATEDIFF(day, maxMessages.latest, GETDATE()) >= ${idlePeriod} OR maxMessages IS NULL)`
      )
      .groupBy('users.id')
      .addGroupBy('users.external_id');

    return await mainQuery.getRawMany<{
      userId: string;
      identityId: string;
      latestInteractionDate: Date;
    }>();
  }

  async idleSupportsByInnovation(): Promise<
    {
      innovationId: string;
      values: {
        identityId: string;
        innovationId: string;
        ownerId: string;
        ownerIdentityId: string;
        unitId: string;
        unitName: string;
        innovationName: string;
      }[];
    }[]
  > {
    const idleSupports = await this.sqlConnection.manager.find(IdleSupportViewEntity);

    return _.reduce(
      _.groupBy(idleSupports, 'innovationId'),
      (
        res: {
          innovationId: string;
          values: {
            identityId: string;
            innovationId: string;
            ownerId: string;
            ownerIdentityId: string;
            unitId: string;
            unitName: string;
            innovationName: string;
          }[];
        }[],
        val,
        key
      ) => {
        res.push({
          innovationId: key,
          values: val.map((v) => ({
            identityId: v.identityId,
            innovationName: v.innovationName,
            innovationId: v.innovationId,
            ownerId: v.ownerId,
            ownerIdentityId: v.ownerIdentityId,
            unitId: v.organisationUnitId,
            unitName: v.organisationUnitName,
          })),
        });
        return res;
      },
      []
    );
  }

  async getExportRequestWithRelations(requestId: string): Promise<{
    exportRequest: InnovationExportRequestEntity;
    createdBy: { id: string; identityId: string; name: string; isActive: boolean };
  }> {
    const request = await this.sqlConnection
      .createQueryBuilder(InnovationExportRequestEntity, 'request')
      .innerJoinAndSelect('request.organisationUnit', 'organisationUnit')
      .where('request.id = :requestId', { requestId })
      .getOne();

    if (!request) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_EXPORT_REQUEST_NOT_FOUND);
    }

    const createdBy = await this.sqlConnection
      .createQueryBuilder(UserEntity, 'user')
      .where('user.id = :id', { id: request.createdBy })
      .getOne();

    if (!createdBy) {
      throw new NotFoundError(UserErrorsEnum.USER_SQL_NOT_FOUND);
    }

    const createdByUser = await this.identityProviderService.getUserInfo(createdBy.identityId);

    return {
      exportRequest: request,
      createdBy: {
        id: createdBy.id,
        identityId: createdBy.identityId,
        name: createdByUser.displayName,
        isActive: createdByUser.isActive,
      },
    };
  }

  /**
   * retrieves a user role
   * @param userId the user id
   * @param role the role
   * @param extraFilters optional additional filters
   *  - organisation: the organisation id
   *  - organisationUnit: the organisation unit id
   *  - active: the role is active
   * @returns the role
   */
  async getUserRole(
    userId: string,
    role: ServiceRoleEnum,
    extraFilters?: {
      organisation?: string;
      organisationUnit?: string;
      active?: boolean;
    }
  ): Promise<null | { id: string; lockedAt: Date | null }> {
    const query = this.sqlConnection
      .createQueryBuilder(UserRoleEntity, 'userRole')
      .where('userRole.user_id = :userId', { userId })
      .andWhere('userRole.role = :role', { role });
    if (extraFilters?.organisation) {
      query.andWhere('userRole.organisation_id = :organisation', {
        organisation: extraFilters.organisation,
      });
    }
    if (extraFilters?.organisationUnit) {
      query.andWhere('userRole.organisation_unit_id = :organisationUnit', {
        organisationUnit: extraFilters.organisationUnit,
      });
    }
    if (extraFilters?.active !== undefined) {
      query.andWhere(
        extraFilters.active ? 'userRole.locked_at IS NULL' : 'userRole.locked_at IS NOT NULL'
      );
    }

    const userRole = await query.getOne();
    if (!userRole) {
      return null;
    }

    return {
      id: userRole.id,
      lockedAt: userRole.lockedAt,
    };
  }

  /**
   * convert from identityId to userId including the deleted users
   * @param identityId the user identityId
   * @returns the user id
   */
  async identityId2UserId(identityId: string): Promise<string | null> {
    const user = await this.sqlConnection
      .createQueryBuilder(UserEntity, 'user')
      .withDeleted()
      .select('user.id')
      .where('user.identityId = :identityId', { identityId })
      .getOne();

    return user?.id ?? null;
  }
}
