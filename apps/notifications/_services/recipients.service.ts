import {
  AnnouncementEntity,
  AnnouncementUserEntity,
  InnovationEntity,
  InnovationExportRequestEntity,
  InnovationSupportEntity,
  InnovationTaskEntity,
  InnovationThreadEntity,
  InnovationTransferEntity,
  NotificationPreferenceEntity,
  OrganisationEntity,
  OrganisationUnitEntity,
  UserEntity,
  UserRoleEntity
} from '@notifications/shared/entities';
import {
  AnnouncementParamsType,
  InnovationCollaboratorStatusEnum,
  InnovationExportRequestStatusEnum,
  InnovationStatusEnum,
  InnovationSupportLogTypeEnum,
  InnovationSupportStatusEnum,
  InnovationTaskStatusEnum,
  InnovationTransferStatusEnum,
  OrganisationTypeEnum,
  ServiceRoleEnum,
  UserStatusEnum
} from '@notifications/shared/enums';
import {
  AnnouncementErrorsEnum,
  GenericErrorsEnum,
  InnovationErrorsEnum,
  NotFoundError,
  OrganisationErrorsEnum,
  UnprocessableEntityError
} from '@notifications/shared/errors';
import type { DomainService, IdentityProviderService } from '@notifications/shared/services';
import SHARED_SYMBOLS from '@notifications/shared/services/symbols';
import { inject, injectable } from 'inversify';

import { BaseService } from './base.service';

import { InnovationSupportLogEntity } from '@notifications/shared/entities';
import { InnovationCollaboratorEntity } from '@notifications/shared/entities/innovation/innovation-collaborator.entity';
import { DatesHelper } from '@notifications/shared/helpers';
import { addToArrayValueInMap } from '@notifications/shared/helpers/misc.helper';
import type { IdentityUserInfo, NotificationPreferences } from '@notifications/shared/types';
import { Brackets, type EntityManager } from 'typeorm';

export type RecipientType = {
  roleId: string;
  role: ServiceRoleEnum;
  userId: string;
  identityId: string;
  isActive: boolean;
  unitId?: string;
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
    id: string;
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
      id: innovationId,
      name: dbInnovation.name,
      ownerId: dbInnovation.owner?.id,
      ownerIdentityId: dbInnovation.owner?.identityId
    };
  }

  /**
   * Returns a Map with innovationInfo for the innovationIds provided in the params
   */
  async getInnovationsInfo(
    innovationIds: string[],
    withDeleted?: boolean,
    entityManager?: EntityManager
  ): Promise<Map<string, { id: string; name: string; ownerId?: string }>> {
    if (!innovationIds.length) {
      return new Map();
    }
    const em = entityManager ?? this.sqlConnection.manager;
    const query = em
      .createQueryBuilder(InnovationEntity, 'innovation')
      .select(['innovation.id', 'innovation.name', 'owner.id'])
      .leftJoin('innovation.owner', 'owner')
      .where('innovation.id IN (:...innovationIds)', { innovationIds });
    if (withDeleted) {
      query.withDeleted();
    }

    const innovations = await query.getMany();

    return new Map(innovations.map(i => [i.id, { id: i.id, name: i.name, ownerId: i.owner?.id }]));
  }

  async getAnnouncementUsers(announcementId: string, entityManager?: EntityManager): Promise<string[]> {
    const em = entityManager ?? this.sqlConnection.manager;

    const query = em
      .createQueryBuilder(AnnouncementUserEntity, 'au')
      .innerJoin('au.user', 'user')
      .select(['au.id', 'user.id'])
      .where('au.announcement = :announcementId', { announcementId })
      .andWhere('au.innovation_id IS null')
      .andWhere('user.status <> :userLocked', { userLocked: UserStatusEnum.LOCKED });

    const users = await query.getMany();

    return users.map(u => u.user.id);
  }

  async getAnnouncementUsersWithInnovationsNames(
    announcementId: string,
    entityManager?: EntityManager
  ): Promise<Map<string, string[]>> {
    const em = entityManager ?? this.sqlConnection.manager;

    const query = em
      .createQueryBuilder(AnnouncementUserEntity, 'au')
      .innerJoin('au.user', 'user')
      .innerJoin('au.innovation', 'innovation')
      .select(['au.id', 'user.id', 'innovation.name'])
      .where('au.announcement = :announcementId', { announcementId })
      .andWhere('user.status <> :userLocked', { userLocked: UserStatusEnum.LOCKED });

    const records = await query.getMany();

    // Group innovations by userId
    const result = new Map<string, string[]>();
    records.forEach(record => {
      const userId = record.user.id;
      const innovationName = record.innovation?.name;

      if (userId && innovationName) {
        addToArrayValueInMap(result, userId, innovationName);
      }
    });

    return result;
  }

  async getAnnouncementInfo(
    announcementId: string,
    entityManager?: EntityManager
  ): Promise<{
    id: string;
    title: string;
    params: AnnouncementParamsType;
  }> {
    const em = entityManager ?? this.sqlConnection.manager;

    const announcement = await em
      .createQueryBuilder(AnnouncementEntity, 'announcement')
      .select(['announcement.id', 'announcement.title', 'announcement.params'])
      .where('announcement.id = :announcementId', { announcementId })
      .getOne();

    if (!announcement) {
      throw new NotFoundError(AnnouncementErrorsEnum.ANNOUNCEMENT_NOT_FOUND);
    }

    return {
      id: announcement.id,
      title: announcement.title,
      params: announcement.params
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
      .select(['collaborator.email', 'collaborator.status', 'collaborator.invitedAt', 'user.id', 'user.status'])
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
   * @param filters optionally filter:
   * - supportStatus: filter by support status
   * - unitId: filter by unit id
   * @param entityManager optionally pass an entity manager
   * @returns a list of user recipients
   * @throws {NotFoundError} if the support is not found when using innovationSupportId
   */
  async innovationAssignedRecipients(
    innovationId: string,
    filters: { supportStatus?: InnovationSupportStatusEnum[]; unitId?: string },
    entityManager?: EntityManager
  ): Promise<RecipientType[]> {
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
      .andWhere('support.innovation_id = :innovationId', { innovationId: innovationId })
      .andWhere('support.isMostRecent = 1');

    if (filters.supportStatus) {
      query.andWhere('support.status IN (:...supportStatus)', { supportStatus: filters.supportStatus });
    }

    if (filters.unitId) {
      query.andWhere('organisationUnit.id = :unitId', { unitId: filters.unitId });
    }

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
            isActive: userRole.isActive && userRole.user.status === UserStatusEnum.ACTIVE,
            unitId: support.organisationUnit.id
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
      .innerJoin('innovation.innovationSupports', 'support', 'support.isMostRecent = 1')
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
              unitId: support.organisationUnit.id,
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

  async taskInfoWithOwner(taskId: string): Promise<{
    id: string;
    displayId: string;
    status: InnovationTaskStatusEnum;
    owner: RecipientType;
  }> {
    const dbTask = await this.sqlConnection
      .createQueryBuilder(InnovationTaskEntity, 'task')
      .select([
        'task.id',
        'task.displayId',
        'task.status',
        'user.id',
        'user.identityId',
        'user.status',
        'role.id',
        'role.role',
        'role.isActive',
        'ownerUnit.id'
      ])
      // Review we are inner joining with user / role and the createdBy might have been deleted, for tasks I don't
      // think it's too much of an error to not send notifications in those cases
      .innerJoin('task.createdByUserRole', 'role')
      .leftJoin('role.organisationUnit', 'ownerUnit')
      .innerJoin('role.user', 'user')
      .where(`task.id = :taskId`, { taskId: taskId })
      .andWhere('user.status = :userActive', { userActive: UserStatusEnum.ACTIVE })
      .getOne();

    if (!dbTask) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_TASK_NOT_FOUND);
    }

    return {
      id: dbTask.id,
      displayId: dbTask.displayId,
      status: dbTask.status,
      owner: {
        userId: dbTask.createdByUserRole.user.id,
        identityId: dbTask.createdByUserRole.user.identityId,
        roleId: dbTask.createdByUserRole.id,
        role: dbTask.createdByUserRole.role,
        unitId: dbTask.createdByUserRole.organisationUnit?.id,
        isActive: dbTask.createdByUserRole.isActive && dbTask.createdByUserRole.user.status === UserStatusEnum.ACTIVE
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
        'authorUserRole.isActive',
        'authorUnit.id'
      ])
      .innerJoin('thread.author', 'author')
      .innerJoin('thread.authorUserRole', 'authorUserRole')
      .leftJoin('authorUserRole.organisationUnit', 'authorUnit')
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
          unitId: dbThread.authorUserRole.organisationUnit?.id,
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
      unitId: item.organisationUnit?.id,
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
      .select(['collaborator.id', 'collaborator.email', 'collaborator.invitedAt', 'collaborator.status', 'user.id'])
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
   * returns a list of innovation innovators (owner + collaborators)
   */
  async getInnovationActiveOwnerAndCollaborators(innovationId: string): Promise<string[]> {
    const innovationInfo = await this.innovationInfo(innovationId);
    const collaborators = await this.getInnovationActiveCollaborators(innovationId);
    return [...(innovationInfo.ownerId ? [innovationInfo.ownerId] : []), ...collaborators];
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

  async organisationInfo(organisationId: string): Promise<{
    id: string;
    name: string;
    acronym: null | string;
  }> {
    const dbOrganisation = await this.sqlConnection
      .createQueryBuilder(OrganisationEntity, 'organisation')
      .select(['organisation.id', 'organisation.name', 'organisation.acronym'])
      .where('organisation.id = :organisationId', { organisationId })
      .getOne();

    if (!dbOrganisation) {
      throw new NotFoundError(OrganisationErrorsEnum.ORGANISATION_NOT_FOUND);
    }

    return {
      id: dbOrganisation.id,
      name: dbOrganisation.name,
      acronym: dbOrganisation.acronym
    };
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
   * returns a list of innovations with owner that have been created but not completed more than every 30 days ago
   * @param entityManager optionally pass an entity manager
   * @returns list of recipient owners with innovation id and name
   */
  async incompleteInnovations(
    entityManager?: EntityManager
  ): Promise<{ innovationId: string; innovationName: string }[]> {
    const em = entityManager ?? /* c8 ignore next */ this.sqlConnection.manager;
    const dbInnovations = await em
      .createQueryBuilder(InnovationEntity, 'innovations')
      .select(['innovations.id', 'innovations.name'])
      .where(`innovations.status = '${InnovationStatusEnum.CREATED}'`)
      .andWhere('DATEDIFF(DAY, innovations.created_at, DATEADD(DAY, -1, GETDATE())) != 0')
      .andWhere('DATEDIFF(DAY, innovations.created_at, DATEADD(DAY, -1, GETDATE())) % 30 = 0')
      .getMany();

    return dbInnovations.map(innovation => ({
      innovationId: innovation.id,
      innovationName: innovation.name
    }));
  }

  async getInnovationSupports(
    innovationId: string,
    entityManager?: EntityManager
  ): Promise<{ id: string; unitId: string; status: InnovationSupportStatusEnum }[]> {
    const em = entityManager ?? this.sqlConnection.manager;

    const supports = await em
      .createQueryBuilder(InnovationSupportEntity, 'support')
      .select(['support.id', 'support.status', 'unit.id'])
      .innerJoin('support.organisationUnit', 'unit')
      .where('support.innovation_id = :innovationId', { innovationId })
      .andWhere('support.isMostRecent = 1')
      .getMany();

    return supports.map(s => ({ id: s.id, status: s.status, unitId: s.organisationUnit.id }));
  }

  /**
   * returns a list of innovations that aren't receiving any support (ENGAGING/WAITING) for n days
   *
   * view innovation service lastSupportStatusTransitionFromEngaging in case this changes to keep consistency
   *
   * @param days number of days to check (ex: 1 month 30 | 7 months 210)
   */
  async innovationsWithoutSupportForNDays(
    days: number[]
    // entityManager?: EntityManager
  ): Promise<{ id: string; name: string; daysPassedSinceLastSupport: string; expectedArchiveDate: string }[]> {
    if (!days.length) {
      throw new UnprocessableEntityError(GenericErrorsEnum.INVALID_PAYLOAD, { details: { error: 'days is required' } });
    }

    //const em = entityManager ?? this.sqlConnection.manager;

    return [
      {
        id: 'innovationId',
        name: 'innovationName',
        daysPassedSinceLastSupport: '30',
        expectedArchiveDate: '22.10.2025'
      },
      {
        id: 'innovationId-2',
        name: 'innovationName-2',
        daysPassedSinceLastSupport: '90',
        expectedArchiveDate: '01.05.2025'
      }
    ];

    // const query = em
    //   .createQueryBuilder(InnovationEntity, 'innovation')
    //   .select(['innovation.id', 'innovation.name', 'innovation.expectedArchiveDate'])
    //   .from(InnovationEntity, 'innovation') // change to the new view
    //   .where(
    //     new Brackets(qb => {
    //       const [first, ...reminder] = days;
    //       qb.where(`DATEDIFF(DAY, lastEngagement.statusChangedAt, DATEADD(DAY, -1, GETDATE())) = ${first}`);
    //       reminder?.forEach(day => {
    //         qb.orWhere(`DATEDIFF(DAY, lastEngagement.statusChangedAt, DATEADD(DAY, -1, GETDATE())) = ${day}`);
    //       });
    //     })
    // //   );

    // return (await query.getMany()).map(innovation => ({
    //   id: innovation.id,
    //   name: innovation.name,
    //   expectedArchiveDate: innovation.expectedArchiveDate
    // }));
  }

  /**
   * returns the supports that haven't had an interaction in n days, repeats every m days afterwards (if m is defined)
   * @param days number of idle days to check (default: 90)
   * @param repeat repeat the notification every n days (if defined)
   */
  async idleSupports(
    days = 90,
    status: InnovationSupportStatusEnum[],
    repeat?: number,
    entityManager?: EntityManager
  ): Promise<
    { innovationId: string; unitId: string; supportId: string; supportStatus: InnovationSupportStatusEnum }[]
  > {
    if (!status.length) return [];

    const em = entityManager ?? this.sqlConnection.manager;
    const query = em
      .createQueryBuilder(InnovationSupportEntity, 'support')
      .select([
        'support.id',
        'support.status',
        'lastActivityUpdate.innovationId',
        'lastActivityUpdate.organisationUnitId'
      ])
      .innerJoin('support.lastActivityUpdate', 'lastActivityUpdate')
      .where('support.status IN (:...status)', { status })
      .andWhere('support.isMostRecent = 1');

    if (repeat) {
      query
        .andWhere('DATEDIFF(day, lastActivityUpdate.lastUpdate, GETDATE()) >= :days', { days })
        .andWhere('DATEDIFF(day, lastActivityUpdate.lastUpdate, GETDATE()) % :repeat = 0', { repeat });
    } else {
      query.andWhere('DATEDIFF(day, lastActivityUpdate.lastUpdate, GETDATE()) = :days', { days });
    }

    const rows = await query.getMany();
    return rows.map(row => ({
      supportId: row.id,
      supportStatus: row.status,
      innovationId: row.lastActivityUpdate.innovationId,
      unitId: row.lastActivityUpdate.organisationUnitId
    }));
  }

  /**
   * returns supports waiting for n days,
   * repeats every m days afterwards (if m is defined)
   * @param days number of days to check (default: 90)
   * @param repeat repeat the notification every n days (if defined)
   * @param entityManager optional entityManager
   * @returns idle supports
   */
  async idleWaitingSupports(
    days = 90,
    repeat?: number,
    entityManager?: EntityManager
  ): Promise<{ innovationId: string; unitId: string; supportId: string }[]> {
    const em = entityManager ?? this.sqlConnection.manager;
    const query = em
      .createQueryBuilder(InnovationSupportEntity, 'support')
      .select(['support.id', 'innovation.id', 'unit.id'])
      .innerJoin('support.innovation', 'innovation')
      .innerJoin('support.organisationUnit', 'unit')
      .where('support.status = :status', { status: InnovationSupportStatusEnum.WAITING })
      .andWhere('support.isMostRecent = 1');

    if (repeat) {
      query
        .andWhere('DATEDIFF(day, support.updatedAt, GETDATE()) >= :days', { days })
        .andWhere('DATEDIFF(day, support.updatedAt, GETDATE()) % :repeat = 0', { repeat });
    } else {
      query.andWhere('DATEDIFF(day, support.updatedAt, GETDATE()) = :days', { days });
    }

    const rows = await query.getMany();
    return rows.map(row => ({
      supportId: row.id,
      innovationId: row.innovation.id,
      unitId: row.organisationUnit.id
    }));
  }

  /**
   * Get the collaboration invites of a user by email
   */
  async getUserCollaborations(
    email: string,
    status?: InnovationExportRequestStatusEnum[],
    entityManager?: EntityManager
  ): Promise<{ collaborationId: string; status: string; innovationId: string; innovationName: string }[]> {
    const em = entityManager ?? this.sqlConnection.manager;

    const query = em
      .createQueryBuilder(InnovationCollaboratorEntity, 'collaborator')
      .select(['collaborator.id', 'collaborator.status', 'collaborator.invitedAt', 'innovation.id', 'innovation.name'])
      .innerJoin('collaborator.innovation', 'innovation')
      .where('collaborator.email = :email', { email });

    if (status?.length) {
      query.andWhere('collaborator.status IN (:...status)', { status });
    }

    const collaborations = await query.getMany();
    return collaborations.map(c => ({
      collaborationId: c.id,
      status: c.status,
      innovationId: c.innovation.id,
      innovationName: c.innovation.name
    }));
  }

  /**
   * returns a the innovations suggested but not picked by organisation units according to the days and recurring
   * @param days number of days to trigger the notification
   * @param recurring if it should trigger recurring notifications
   * @returns Map of organisation unit id and list of innovation ids
   */
  async suggestedInnovationsWithoutUnitAction(
    days: number,
    recurring = false
  ): Promise<Map<string, { id: string; name: string }[]>> {
    const date = DatesHelper.addWorkingDays(new Date(), -days);
    const query = this.sqlConnection
      .createQueryBuilder(InnovationSupportEntity, 'support')
      .innerJoin('support.innovation', 'innovation')
      .innerJoin('support.organisationUnit', 'organisationUnit')
      .select(['support.id', 'innovation.id', 'innovation.name', 'organisationUnit.id'])
      .where('support.isMostRecent = 1')
      .andWhere('support.status = :supportStatus', { supportStatus: InnovationSupportStatusEnum.SUGGESTED })
      .andWhere('innovation.status = :status', { status: InnovationStatusEnum.IN_PROGRESS }); // This shouldn't be required but just in case

    // for some unknown reason passing date shows the right query, works locally connected to the stage DB but not
    // in stage. Resorted to using the date.toISOString().split('T')[0] to get the date in the right format for the query
    if (recurring) {
      // We want all dates before the date provided where the weekday is the same as the date provided

      // this is a hack to know the day of the week of assigned_date with 2 being Monday, Saturday and Sunday
      const weekday = `CASE DATEPART(DW, support.created_at) WHEN 3 THEN 3 WHEN 4 THEN 4 WHEN 5 THEN 5 WHEN 6 THEN 6 ELSE 2 END`;
      date.setHours(23, 59, 59, 999);
      query
        .andWhere('support.created_at <= :fullDate', { fullDate: date })
        .andWhere(`${weekday} = DATEPART(DW, :date)`, { date: date.toISOString().split('T')[0] });
    } else {
      // We want all dates that are the same as the date provided (or previous day if it's a weekend)
      query.andWhere(
        'DATEDIFF(day, "support"."created_at", :date) = 0 OR (DATEPART(DW, :date) = 2 AND DATEDIFF(day, "support"."created_at", :date) IN (1,2))',
        { date: date.toISOString().split('T')[0] }
      );
    }

    const dbResult = await query.getMany();
    return dbResult.reduce((acc, item) => {
      addToArrayValueInMap(acc, item.organisationUnit.id, { id: item.innovation.id, name: item.innovation.name });
      return acc;
    }, new Map<string, { id: string; name: string }[]>());
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

  async getUnitSuggestionsByInnovation(innovationId: string): Promise<{ unitId: string; orgId: string }[]> {
    const suggestions = await this.sqlConnection
      .createQueryBuilder(InnovationSupportLogEntity, 'log')
      .innerJoinAndSelect('log.suggestedOrganisationUnits', 'suggestedUnits')
      .where('log.innovation_id = :innovationId', { innovationId })
      .andWhere('log.type IN (:...suggestionTypes)', {
        suggestionTypes: [
          InnovationSupportLogTypeEnum.ACCESSOR_SUGGESTION,
          InnovationSupportLogTypeEnum.ASSESSMENT_SUGGESTION
        ]
      })
      .getMany();

    const suggestedUnits = new Set(
      suggestions.flatMap(s =>
        (s.suggestedOrganisationUnits ?? [])?.map(su => ({ unitId: su.id, orgId: su.organisationId }))
      )
    );

    return Array.from(suggestedUnits.values());
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
    userId: undefined | null | string,
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
    userIds: null | undefined | string | string[],
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

  async getRecipientsByRoleId(userRoleIds: string[], entityManager?: EntityManager): Promise<RecipientType[]> {
    const em = entityManager ?? this.sqlConnection.manager;

    const userRoles = await em
      .createQueryBuilder(UserRoleEntity, 'userRole')
      .select([
        'userRole.id',
        'userRole.isActive',
        'userRole.role',
        'user.id',
        'user.identityId',
        'user.status',
        'unit.id'
      ])
      .innerJoin('userRole.user', 'user')
      .leftJoin('userRole.organisationUnit', 'unit')
      .where('userRole.id IN (:...userRoleIds)', { userRoleIds })
      .getMany();

    return userRoles.map(r => ({
      roleId: r.id,
      role: r.role,
      userId: r.user.id,
      identityId: r.user.identityId,
      unitId: r.organisationUnit?.id,
      isActive: r.isActive && r.user.status === UserStatusEnum.ACTIVE
    }));
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
      .select([
        'userRole.id',
        'userRole.isActive',
        'userRole.role',
        'user.id',
        'user.identityId',
        'user.status',
        'unit.id'
      ])
      .innerJoin('userRole.user', 'user')
      .leftJoin('userRole.organisationUnit', 'unit');

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
      unitId: r.organisationUnit?.id,
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
    const identityIdMap = await this.usersIds2IdentityIds([userId]);

    return identityIdMap.get(userId) ?? null;
  }

  /**
   * convert a given array with userIds in a Map with id and identity id
   * @param userIds the userIds to be converted to identityIds
   * @returns an array with the identityIds of all the users
   */
  async usersIds2IdentityIds(userIds: string[]): Promise<Map<string, string>> {
    if (!userIds.length) {
      return new Map();
    }
    const users = await this.sqlConnection
      .createQueryBuilder(UserEntity, 'user')
      .select(['user.id', 'user.identityId'])
      .where('user.id IN (:...userIds)', { userIds })
      .getMany();

    return new Map(users.map(u => [u.id, u.identityId]));
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

      const roleMap = helperMap.get(user.userType)!; // we know it exists this is a map get after set issue in typescript
      addToArrayValueInMap(roleMap, user.organisationUnit ?? 'default', user.id);
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
  ): Promise<Map<string, NotificationPreferences>> {
    const em = entityManager ?? this.sqlConnection.manager;

    if (!roleIds.length) {
      return new Map();
    }

    const batchSize = 1000;
    const batchedPreferences: NotificationPreferenceEntity[] = [];

    for (let i = 0; i < roleIds.length; i += batchSize) {
      const batch = roleIds.slice(i, i + batchSize);

      const preferencesBatch = await em
        .createQueryBuilder(NotificationPreferenceEntity, 'preference')
        .where('preference.user_role_id IN (:...batch)', { batch })
        .getMany();

      batchedPreferences.push(...preferencesBatch);
    }

    // Convert the result into a Map
    return new Map(batchedPreferences.map(p => [p.userRoleId, p.preferences]));
  }

  /**
   * Returns the recipient grouped by their user role
   * @param recipients the recipients to group by role
   * @returns recipients grouped by role
   */
  getRecipientsByRole(recipients: RecipientType[]): { [key in ServiceRoleEnum]?: RecipientType[] } {
    return recipients.reduce(
      (acc, cur) => {
        if (!acc[cur.role]) {
          acc[cur.role] = [];
        }
        acc[cur.role]!.push(cur);
        return acc;
      },
      {} as { [key in ServiceRoleEnum]?: RecipientType[] }
    );
  }
}
