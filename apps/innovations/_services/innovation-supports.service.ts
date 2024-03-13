import { inject, injectable } from 'inversify';
import { Brackets, EntityManager, In } from 'typeorm';

import {
  InnovationAssessmentEntity,
  InnovationEntity,
  InnovationSupportEntity,
  InnovationSupportLogEntity,
  InnovationTaskEntity,
  OrganisationUnitEntity
} from '@innovations/shared/entities';
import {
  ActivityEnum,
  InnovationFileContextTypeEnum,
  InnovationSupportLogTypeEnum,
  InnovationSupportStatusEnum,
  InnovationSupportSummaryTypeEnum,
  InnovationTaskStatusEnum,
  NotifierTypeEnum,
  ServiceRoleEnum,
  ThreadContextTypeEnum,
  UserStatusEnum
} from '@innovations/shared/enums';
import {
  BadRequestError,
  GenericErrorsEnum,
  InnovationErrorsEnum,
  NotFoundError,
  OrganisationErrorsEnum,
  UnprocessableEntityError
} from '@innovations/shared/errors';
import type { DomainService, NotifierService } from '@innovations/shared/services';
import type { DomainContextType, SupportLogProgressUpdate } from '@innovations/shared/types';

import { InnovationThreadSubjectEnum } from '../_enums/innovation.enums';
import type {
  InnovationFileType,
  InnovationSuggestionAccessor,
  InnovationSuggestionsType
} from '../_types/innovation.types';

import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { SupportSummaryUnitInfo } from '../_types/support.types';
import { BaseService } from './base.service';
import type { InnovationFileService } from './innovation-file.service';
import type { InnovationThreadsService } from './innovation-threads.service';
import SYMBOLS from './symbols';
import type { ValidationService } from './validation.service';

type UnitSupportInformationType = {
  id: string;
  status: InnovationSupportStatusEnum;
  updatedAt: Date;
  unitId: string;
  unitName: string;
  startSupport: null | Date;
  endSupport: null | Date;
  orgId: string;
  orgAcronym: string;
};

type SuggestedUnitType = {
  id: string;
  name: string;
  support: { id?: string; status: InnovationSupportStatusEnum; start?: Date; end?: Date };
  organisation: {
    id: string;
    acronym: string;
  };
};

@injectable()
export class InnovationSupportsService extends BaseService {
  constructor(
    @inject(SHARED_SYMBOLS.DomainService) private domainService: DomainService,
    @inject(SHARED_SYMBOLS.NotifierService) private notifierService: NotifierService,
    @inject(SYMBOLS.InnovationThreadsService)
    private innovationThreadsService: InnovationThreadsService,
    @inject(SYMBOLS.InnovationFileService) private innovationFileService: InnovationFileService,
    @inject(SYMBOLS.ValidationService) private validationService: ValidationService
  ) {
    super();
  }

  async getInnovationSupportsList(
    innovationId: string,
    filters: { fields: 'engagingAccessors'[] },
    entityManager?: EntityManager
  ): Promise<
    {
      id: string;
      status: InnovationSupportStatusEnum;
      organisation: {
        id: string;
        name: string;
        acronym: string | null;
        unit: { id: string; name: string; acronym: string | null };
      };
      engagingAccessors?: { id: string; userRoleId: string; name: string; isActive: boolean }[];
    }[]
  > {
    const connection = entityManager ?? this.sqlConnection.manager;

    const query = connection
      .createQueryBuilder(InnovationEntity, 'innovation')
      .leftJoinAndSelect('innovation.innovationSupports', 'supports')
      .leftJoinAndSelect('supports.organisationUnit', 'organisationUnit')
      .leftJoinAndSelect('organisationUnit.organisation', 'organisation')
      .where('innovation.id = :innovationId', { innovationId });

    if (filters.fields.includes('engagingAccessors')) {
      query.leftJoinAndSelect('supports.userRoles', 'userRole');
      query.leftJoinAndSelect('userRole.user', 'user');
    }

    const innovation = await query.getOne();
    if (!innovation) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    const innovationSupports = innovation.innovationSupports;

    // Fetch users names.
    let usersInfo: {
      id: string;
      identityId: string;
      email: string;
      displayName: string;
      isActive: boolean;
    }[] = [];

    if (filters.fields.includes('engagingAccessors')) {
      const assignedAccessorsIds = innovationSupports
        .filter(
          support =>
            support.status === InnovationSupportStatusEnum.ENGAGING ||
            support.status === InnovationSupportStatusEnum.WAITING
        )
        .flatMap(support => support.userRoles.filter(item => item.isActive).map(item => item.user.id));

      usersInfo = await this.domainService.users.getUsersList({ userIds: assignedAccessorsIds });
    }

    return innovationSupports.map(support => {
      let engagingAccessors: { id: string; userRoleId: string; name: string; isActive: boolean }[] | undefined =
        undefined;

      if (filters.fields.includes('engagingAccessors')) {
        engagingAccessors = support.userRoles
          .map(supportUserRole => ({
            id: supportUserRole.user.id,
            userRoleId: supportUserRole.id,
            name: usersInfo.find(item => item.id === supportUserRole.user.id)?.displayName || '',
            isActive: supportUserRole.isActive
          }))
          .filter(authUser => authUser.name);
      }

      return {
        id: support.id,
        status: support.status,
        organisation: {
          id: support.organisationUnit.organisation.id,
          name: support.organisationUnit.organisation.name,
          acronym: support.organisationUnit.organisation.acronym,
          unit: {
            id: support.organisationUnit.id,
            name: support.organisationUnit.name,
            acronym: support.organisationUnit.acronym
          }
        },
        ...(engagingAccessors === undefined ? {} : { engagingAccessors })
      };
    });
  }

  /**
   * returns a list of suggested organisations by assessment and assessors ordered by name
   * @param innovationId the innovation id
   * @returns suggested organisations by both assessors and accessors
   */
  async getInnovationSuggestions(innovationId: string): Promise<InnovationSuggestionsType> {
    const supportLogs = await this.fetchAccessorsSuggestedOrganisationUnits(innovationId);

    const assessmentQuery = this.sqlConnection
      .createQueryBuilder(InnovationAssessmentEntity, 'assessments')
      .select([
        'assessments.id',
        'organisation.id',
        'organisation.name',
        'organisation.acronym',
        'organisationUnit.id',
        'organisationUnit.name',
        'organisationUnit.acronym'
      ])
      .leftJoin('assessments.organisationUnits', 'organisationUnit')
      .leftJoin('organisationUnit.organisation', 'organisation')
      .where('assessments.innovation_id = :innovationId', { innovationId })
      .andWhere('organisationUnit.inactivated_at IS NULL');

    const innovationAssessment = await assessmentQuery.getOne();

    const result: InnovationSuggestionsType = {
      accessors: [],
      assessment: { suggestedOrganisations: [] }
    };

    if (innovationAssessment) {
      innovationAssessment.organisationUnits.forEach(ou => {
        // try to find suggested organisation
        const suggestedOrganisation = result.assessment.suggestedOrganisations.find(so => so.id === ou.organisation.id);

        // if suggested organisation exists in suggestedOrganisations, append unit to it
        if (suggestedOrganisation) {
          suggestedOrganisation.organisationUnits.push({
            id: ou.id,
            name: ou.name,
            acronym: ou.acronym
          });

          // otherwise, create and append organisation to suggestedOrganisations
        } else {
          result.assessment.suggestedOrganisations.push({
            id: ou.organisation.id,
            name: ou.organisation.name,
            acronym: ou.organisation.acronym,
            organisationUnits: [
              {
                id: ou.id,
                name: ou.name,
                acronym: ou.acronym
              }
            ]
          });
        }
      });
    }

    if (supportLogs.length) {
      result.accessors = supportLogs;
    }

    return result;
  }

  async getInnovationSupportInfo(
    innovationSupportId: string,
    entityManager?: EntityManager
  ): Promise<{
    id: string;
    status: InnovationSupportStatusEnum;
    engagingAccessors: { id: string; userRoleId: string; name: string }[];
  }> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const innovationSupport = await connection
      .createQueryBuilder(InnovationSupportEntity, 'support')
      .innerJoinAndSelect('support.innovation', 'innovation')
      .innerJoinAndSelect('support.organisationUnit', 'orgUnit')
      .innerJoinAndSelect('orgUnit.organisation', 'org')
      .leftJoinAndSelect('support.userRoles', 'userRole')
      .leftJoinAndSelect('userRole.user', 'user')
      .where('support.id = :innovationSupportId', { innovationSupportId })
      .getOne();

    if (!innovationSupport) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_SUPPORT_NOT_FOUND);
    }

    // Fetch users names.

    const assignedAccessorsIds = innovationSupport.userRoles
      .filter(item => item.user.status === UserStatusEnum.ACTIVE)
      .map(item => item.user.id);
    const usersInfo = await this.domainService.users.getUsersList({
      userIds: assignedAccessorsIds
    });

    return {
      id: innovationSupport.id,
      status: innovationSupport.status,
      engagingAccessors: innovationSupport.userRoles
        .map(su => ({
          id: su.user.id,
          userRoleId: su.id,
          name: usersInfo.find(item => item.id === su.user.id)?.displayName || ''
        }))
        .filter(authUser => authUser.name)
    };
  }

  async createInnovationSupport(
    domainContext: DomainContextType,
    innovationId: string,
    data: {
      status: InnovationSupportStatusEnum;
      message: string;
      accessors?: { id: string; userRoleId: string }[];
    },
    entityManager?: EntityManager
  ): Promise<{ id: string }> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const organisationUnitId = domainContext.organisation?.organisationUnit?.id;

    if (!organisationUnitId) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SUPPORT_WITH_UNPROCESSABLE_ORGANISATION_UNIT);
    }

    const organisationUnit = await connection
      .createQueryBuilder(OrganisationUnitEntity, 'unit')
      .where('unit.id = :organisationUnitId', { organisationUnitId })
      .getOne();

    if (!organisationUnit) {
      throw new NotFoundError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND);
    }

    const support = await connection
      .createQueryBuilder(InnovationSupportEntity, 'support')
      .where('support.innovation.id = :innovationId ', { innovationId })
      .andWhere('support.organisation_unit_id = :organisationUnitId', { organisationUnitId })
      .getOne();
    if (support) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SUPPORT_ALREADY_EXISTS);
    }

    if (data.status !== InnovationSupportStatusEnum.ENGAGING && data.accessors?.length) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SUPPORT_CANNOT_HAVE_ASSIGNED_ASSESSORS);
    }

    // If status is waiting assigned QA as accessor automatically
    const accessors =
      data.accessors?.map(item => item.userRoleId) ??
      (data.status === InnovationSupportStatusEnum.WAITING ? [domainContext.currentRole.id] : []);

    const result = await connection.transaction(async transaction => {
      const newSupport = InnovationSupportEntity.new({
        status: data.status,
        createdBy: domainContext.id,
        updatedBy: domainContext.id,
        innovation: InnovationEntity.new({ id: innovationId }),
        organisationUnit: OrganisationUnitEntity.new({ id: organisationUnit.id }),
        userRoles: [] // this will be setup later but we need to create the support first
      });

      const savedSupport = await transaction.save(InnovationSupportEntity, newSupport);

      const user = { id: domainContext.id, identityId: domainContext.identityId };
      const thread = await this.innovationThreadsService.createThreadOrMessage(
        domainContext,
        innovationId,
        InnovationThreadSubjectEnum.INNOVATION_SUPPORT_UPDATE.replace('{{Unit}}', organisationUnit.name),
        data.message,
        savedSupport.id,
        ThreadContextTypeEnum.SUPPORT,
        transaction,
        false
      );

      await this.domainService.innovations.addActivityLog(
        transaction,
        { innovationId: innovationId, activity: ActivityEnum.SUPPORT_STATUS_UPDATE, domainContext },
        {
          innovationSupportStatus: savedSupport.status,
          organisationUnit: organisationUnit.name,
          comment: { id: thread.message?.id ?? '', value: thread.message?.message ?? '' }
        }
      );

      await this.domainService.innovations.addSupportLog(
        transaction,
        { id: user.id, roleId: domainContext.currentRole.id },
        innovationId,
        {
          type: InnovationSupportLogTypeEnum.STATUS_UPDATE,
          supportStatus: savedSupport.status,
          description: thread.message?.message ?? '',
          unitId: organisationUnitId
        }
      );

      await this.assignAccessors(domainContext, savedSupport, accessors, thread.thread.id, transaction);

      return { id: savedSupport.id, threadId: thread.thread.id };
    });

    await this.notifierService.send(domainContext, NotifierTypeEnum.SUPPORT_STATUS_UPDATE, {
      innovationId,
      threadId: result.threadId,
      support: {
        id: result.id,
        status: data.status,
        message: data.message,
        newAssignedAccessorsIds:
          data.status === InnovationSupportStatusEnum.ENGAGING ? (data.accessors ?? []).map(item => item.id) : []
      }
    });

    return result;
  }

  async createInnovationSupportLogs(
    domainContext: DomainContextType,
    innovationId: string,
    data: {
      type: InnovationSupportLogTypeEnum.ACCESSOR_SUGGESTION | InnovationSupportLogTypeEnum.STATUS_UPDATE;
      description: string;
      organisationUnits?: string[];
    },
    entityManager?: EntityManager
  ): Promise<{ id: string }> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const organisationUnitId = domainContext.organisation?.organisationUnit?.id || '';

    if (!organisationUnitId) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SUPPORT_WITH_UNPROCESSABLE_ORGANISATION_UNIT);
    }

    const innovation = await connection
      .createQueryBuilder(InnovationEntity, 'innovation')
      .leftJoinAndSelect('innovation.innovationSupports', 'supports')
      .leftJoinAndSelect('supports.organisationUnit', 'organisationUnit')
      .where('innovation.id = :innovationId', { innovationId })
      .getOne();

    if (!innovation) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    const innovationSupport = innovation.innovationSupports.find(sup => sup.organisationUnit.id === organisationUnitId);

    const result = await connection.transaction(async transaction => {
      const savedSupportLog = await this.domainService.innovations.addSupportLog(
        transaction,
        { id: domainContext.id, roleId: domainContext.currentRole.id },
        innovationId,
        {
          description: data.description,
          supportStatus:
            innovationSupport && innovationSupport.status
              ? innovationSupport.status
              : InnovationSupportStatusEnum.UNASSIGNED,
          type: data.type,
          unitId: domainContext.organisation?.organisationUnit?.id ?? '',
          suggestedOrganisationUnits: data.organisationUnits ?? []
        }
      );

      if (
        data.type === InnovationSupportLogTypeEnum.ACCESSOR_SUGGESTION &&
        data?.organisationUnits &&
        data?.organisationUnits.length > 0
      ) {
        const units = await connection
          .createQueryBuilder(OrganisationUnitEntity, 'unit')
          .where('unit.id IN (:...organisationUnits)', {
            organisationUnits: data?.organisationUnits
          })
          .getRawMany();

        await this.domainService.innovations.addActivityLog(
          transaction,
          {
            innovationId,
            activity: ActivityEnum.ORGANISATION_SUGGESTION,
            domainContext
          },
          {
            organisations: units.map(unit => unit.unit_name)
          }
        );
      }

      return savedSupportLog;
    });

    if (
      data.type === InnovationSupportLogTypeEnum.ACCESSOR_SUGGESTION &&
      data?.organisationUnits &&
      data?.organisationUnits.length > 0
    ) {
      await this.notifierService.send(domainContext, NotifierTypeEnum.ORGANISATION_UNITS_SUGGESTION, {
        innovationId,
        unitsIds: data.organisationUnits,
        comment: data.description
      });
    }

    return result;
  }

  async updateInnovationSupport(
    domainContext: DomainContextType,
    innovationId: string,
    supportId: string,
    data: {
      status: InnovationSupportStatusEnum;
      message: string;
      accessors?: { id: string; userRoleId: string }[];
    },
    entityManager?: EntityManager
  ): Promise<{ id: string }> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const dbSupport = await connection
      .createQueryBuilder(InnovationSupportEntity, 'support')
      .innerJoinAndSelect('support.organisationUnit', 'organisationUnit')
      .leftJoinAndSelect('support.userRoles', 'userRole')
      .where('support.id = :supportId ', { supportId })
      .getOne();
    if (!dbSupport) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_SUPPORT_NOT_FOUND);
    }

    const validSupportStatus = await this.getValidSupportStatuses(
      innovationId,
      dbSupport.organisationUnit.id,
      connection
    );
    if (!validSupportStatus.includes(data.status)) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SUPPORT_UPDATE_WITH_UNPROCESSABLE_STATUS);
    }

    const result = await connection.transaction(async transaction => {
      let assignedAccessors: string[] = [];
      if (data.status === InnovationSupportStatusEnum.ENGAGING) {
        assignedAccessors = data.accessors?.map(item => item.userRoleId) ?? [];
      } else {
        // Cleanup tasks if the status is not ENGAGING or WAITING
        if (data.status !== InnovationSupportStatusEnum.WAITING) {
          assignedAccessors = [];
          await transaction
            .createQueryBuilder()
            .update(InnovationTaskEntity)
            .set({ status: InnovationTaskStatusEnum.CANCELLED, updatedBy: domainContext.id })
            .where({
              innovationSupport: dbSupport.id,
              status: In([InnovationTaskStatusEnum.OPEN])
            })
            .execute();
        } else {
          // In waiting status the QA is automatically assigned
          assignedAccessors = [domainContext.currentRole.id];
        }
      }

      dbSupport.status = data.status;
      dbSupport.updatedBy = domainContext.id;

      const savedSupport = await transaction.save(InnovationSupportEntity, dbSupport);

      const thread = await this.innovationThreadsService.createThreadOrMessage(
        domainContext,
        innovationId,
        InnovationThreadSubjectEnum.INNOVATION_SUPPORT_UPDATE.replace('{{Unit}}', dbSupport.organisationUnit.name),
        data.message,
        savedSupport.id,
        ThreadContextTypeEnum.SUPPORT,
        transaction,
        false
      );

      if (!thread.message) {
        throw new NotFoundError(InnovationErrorsEnum.INNOVATION_THREAD_MESSAGE_NOT_FOUND);
      }

      await this.domainService.innovations.addActivityLog(
        transaction,
        { innovationId: innovationId, activity: ActivityEnum.SUPPORT_STATUS_UPDATE, domainContext },
        {
          innovationSupportStatus: savedSupport.status,
          organisationUnit: savedSupport.organisationUnit.name,
          comment: { id: thread.message.id, value: thread.message.message }
        }
      );

      await this.domainService.innovations.addSupportLog(
        transaction,
        { id: domainContext.id, roleId: domainContext.currentRole.id },
        innovationId,
        {
          type: InnovationSupportLogTypeEnum.STATUS_UPDATE,
          supportStatus: savedSupport.status,
          description: thread.message.message,
          unitId: savedSupport.organisationUnit.id
        }
      );

      const { newAssignedAccessors } = await this.assignAccessors(
        domainContext,
        savedSupport,
        assignedAccessors,
        thread.thread.id,
        transaction
      );

      return { id: savedSupport.id, newAssignedAccessors: new Set(newAssignedAccessors), threadId: thread.thread.id };
    });

    await this.notifierService.send(domainContext, NotifierTypeEnum.SUPPORT_STATUS_UPDATE, {
      innovationId,
      threadId: result.threadId,
      support: {
        id: result.id,
        status: data.status,
        message: data.message,
        newAssignedAccessorsIds:
          data.status === InnovationSupportStatusEnum.ENGAGING
            ? (data.accessors ?? [])
                .filter(item => result.newAssignedAccessors.has(item.userRoleId))
                .map(item => item.id)
            : []
      }
    });

    return result;
  }

  /**
   * updates the innovation support accessors and creates a thread message if a message is provided
   *
   * This only works for ENGAGING supports
   * @param domainContext the domain context
   * @param innovationId the innovation id
   * @param supportId the support id
   * @param data list of accessors and optional message
   * @param entityManager optional transaction
   */
  async updateInnovationSupportAccessors(
    domainContext: DomainContextType,
    innovationId: string,
    supportId: string,
    data: {
      message: string;
      accessors: { id: string; userRoleId: string }[];
    },
    entityManager?: EntityManager
  ): Promise<void> {
    // joi validates this but just in case
    if (!data.accessors.length) {
      throw new BadRequestError(GenericErrorsEnum.INVALID_PAYLOAD);
    }

    if (!entityManager) {
      return this.sqlConnection.transaction(async transaction => {
        return this.updateInnovationSupportAccessors(domainContext, innovationId, supportId, data, transaction);
      });
    }

    // We're already fetching extra data for the assign accessors to avoid extra queries
    const support = await entityManager
      .createQueryBuilder(InnovationSupportEntity, 'support')
      .innerJoinAndSelect('support.organisationUnit', 'organisationUnit')
      .leftJoinAndSelect('support.userRoles', 'userRole')
      .where('support.id = :supportId', { supportId })
      .andWhere('support.innovation_id = :innovationId', { innovationId })
      .getOne();
    if (!support) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_SUPPORT_NOT_FOUND);
    }
    if (support.status !== InnovationSupportStatusEnum.ENGAGING) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SUPPORT_UPDATE_WITH_UNPROCESSABLE_STATUS);
    }

    const thread = await this.innovationThreadsService.getThreadByContextId(
      ThreadContextTypeEnum.SUPPORT,
      supportId,
      entityManager
    );

    const accessorsChanges = await this.assignAccessors(
      domainContext,
      support,
      data.accessors.map(item => item.userRoleId),
      thread?.id,
      entityManager
    );

    if (thread) {
      await this.innovationThreadsService.createThreadMessage(
        domainContext,
        thread.id,
        data.message,
        false,
        false,
        undefined,
        entityManager
      );

      // Possible techdebt since notification depends on the thread at the moment and we don't have a thread
      // in old supports before November 2022 (see #156480)
      await this.notifierService.send(domainContext, NotifierTypeEnum.SUPPORT_NEW_ASSIGN_ACCESSORS, {
        innovationId: innovationId,
        supportId: supportId,
        threadId: thread.id,
        message: data.message,
        newAssignedAccessorsRoleIds: accessorsChanges.newAssignedAccessors,
        removedAssignedAccessorsRoleIds: accessorsChanges.removedAssignedAccessors
      });
    }
  }

  /**
   * assigns accessors to a support, adding them to the thread followers if the support is ENGAGING
   * @param domainContext the domain context
   * @param support the support entity or id
   * @param accessorRoleIds the list of assigned accessors role ids
   * @param threadId optional thread id to add the followers
   * @param entityManager transactional entity manager
   * @returns the list of new assigned accessors role ids
   */
  private async assignAccessors(
    domainContext: DomainContextType,
    support: string | InnovationSupportEntity,
    accessorRoleIds: string[],
    threadId?: string,
    entityManager?: EntityManager
  ): Promise<{ newAssignedAccessors: string[]; removedAssignedAccessors: string[] }> {
    // Force a transaction if one not present
    if (!entityManager) {
      return this.sqlConnection.transaction(async transaction => {
        return this.assignAccessors(domainContext, support, accessorRoleIds, threadId, transaction);
      });
    }

    if (typeof support === 'string') {
      const dbSupport = await entityManager
        .createQueryBuilder(InnovationSupportEntity, 'support')
        .innerJoinAndSelect('support.organisationUnit', 'organisationUnit')
        .leftJoinAndSelect('support.userRoles', 'userRole')
        .where('support.id = :supportId ', { support })
        .getOne();

      if (!dbSupport) {
        throw new NotFoundError(InnovationErrorsEnum.INNOVATION_SUPPORT_NOT_FOUND);
      }
      support = dbSupport;
    }

    const previousUsersRoleIds = support.userRoles.map(item => item.id);
    const previousUsersRoleIdsSet = new Set(previousUsersRoleIds);
    const newAssignedAccessors = accessorRoleIds.filter(item => !previousUsersRoleIdsSet.has(item));
    const removedAssignedAccessors = previousUsersRoleIds.filter(r => !accessorRoleIds.includes(r));

    await entityManager.save(InnovationSupportEntity, {
      id: support.id,
      userRoles: accessorRoleIds.map(id => ({ id }))
    });

    // Add followers logic
    // Update thread followers with the new assigned users only when the support is ENGAGING
    if (support.status === InnovationSupportStatusEnum.ENGAGING && threadId) {
      // If we want to remove only the previous assigned users we can use this
      // await this.innovationThreadsService.removeFollowers(threadId, [...previousUsersRoleIds], entityManager);
      await this.innovationThreadsService.removeOrganisationUnitFollowers(
        threadId,
        support.organisationUnit.id,
        entityManager
      );
      await this.innovationThreadsService.addFollowersToThread(
        domainContext,
        threadId,
        accessorRoleIds,
        false,
        entityManager
      );
    }

    return { newAssignedAccessors, removedAssignedAccessors };
  }

  async changeInnovationSupportStatusRequest(
    domainContext: DomainContextType,
    innovationId: string,
    supportId: string,
    status: InnovationSupportStatusEnum,
    requestReason: string
  ): Promise<boolean> {
    await this.notifierService.send(domainContext, NotifierTypeEnum.SUPPORT_STATUS_CHANGE_REQUEST, {
      innovationId,
      supportId,
      proposedStatus: status,
      requestStatusUpdateComment: requestReason
    });

    return true;
  }

  // Innovation Support Summary
  async getSupportSummaryList(
    domainContext: DomainContextType,
    innovationId: string,
    entityManager?: EntityManager
  ): Promise<Record<keyof typeof InnovationSupportSummaryTypeEnum, SuggestedUnitType[]>> {
    const em = entityManager ?? this.sqlConnection.manager;

    const suggestedUnitsInfoMap = await this.getSuggestedUnitsInfoMap(innovationId, em);
    const unitsSupportInformationMap = await this.getSuggestedUnitsSupportInfoMap(innovationId, em);

    const suggestedIds = new Set<string>();
    const engaging: SuggestedUnitType[] = [];
    const beenEngaged: SuggestedUnitType[] = [];
    const suggested: SuggestedUnitType[] = [];

    for (const support of unitsSupportInformationMap.values()) {
      suggestedIds.add(support.unitId);
      if (support.status === InnovationSupportStatusEnum.ENGAGING) {
        engaging.push({
          id: support.unitId,
          name: support.unitName,
          ...(support.unitId === domainContext.organisation?.organisationUnit?.id && { sameOrganisation: true }),
          support: {
            id: support.id,
            status: support.status,
            start: support.startSupport ?? undefined
          },
          organisation: {
            id: support.orgId,
            acronym: support.orgAcronym
          }
        });
      } else if (support.startSupport && support.endSupport) {
        beenEngaged.push({
          id: support.unitId,
          name: support.unitName,
          ...(support.unitId === domainContext.organisation?.organisationUnit?.id && { sameOrganisation: true }),
          support: {
            id: support.id,
            status: support.status,
            start: support.startSupport,
            end: support.endSupport
          },
          organisation: {
            id: support.orgId,
            acronym: support.orgAcronym
          }
        });
      } else {
        suggested.push({
          id: support.unitId,
          name: support.unitName,
          ...(support.unitId === domainContext.organisation?.organisationUnit?.id && { sameOrganisation: true }),
          support: {
            id: support.id,
            status: support.status,
            start: support.updatedAt
          },
          organisation: {
            id: support.orgId,
            acronym: support.orgAcronym
          }
        });
      }
    }

    // Since they are UNASSIGNED they don't exist on support table, we have to add them here
    suggested.push(
      ...Array.from(suggestedUnitsInfoMap.values())
        .filter(u => !suggestedIds.has(u.id))
        .map(u => ({
          id: u.id,
          name: u.name,
          support: {
            status: InnovationSupportStatusEnum.UNASSIGNED
          },
          organisation: {
            id: u.orgId,
            acronym: u.orgAcronym
          }
        }))
    );

    return {
      [InnovationSupportSummaryTypeEnum.ENGAGING]: this.sortByStartDate(engaging),
      [InnovationSupportSummaryTypeEnum.BEEN_ENGAGED]: this.sortByStartDate(beenEngaged),
      [InnovationSupportSummaryTypeEnum.SUGGESTED]: this.sortByStartDate(suggested)
    };
  }

  async getSupportSummaryUnitInfo(
    domainContext: DomainContextType,
    innovationId: string,
    unitId: string,
    entityManager?: EntityManager
  ): Promise<SupportSummaryUnitInfo[]> {
    const em = entityManager ?? this.sqlConnection.manager;

    const innovation = await em
      .createQueryBuilder(InnovationEntity, 'innovation')
      .select(['innovation.id', 'owner.id'])
      .leftJoin('innovation.owner', 'owner')
      .where('innovation.id = :innovationId', { innovationId })
      .getOne();

    if (!innovation) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    const unitSupportLogs = await em
      .createQueryBuilder(InnovationSupportLogEntity, 'log')
      .select([
        'log.id',
        'log.createdBy',
        'log.type',
        'log.createdAt',
        'log.innovationSupportStatus',
        'log.description',
        'log.params',
        'unit.id',
        'unit.name',
        'createdByUserRole.role'
      ])
      .leftJoin(
        'innovation_support_log_organisation_unit',
        'suggestedUnits',
        '(suggestedUnits.innovation_support_log_id = log.id AND suggestedUnits.organisation_unit_id = :unitId)',
        { unitId }
      )
      .leftJoin('log.organisationUnit', 'unit')
      .innerJoin('log.createdByUserRole', 'createdByUserRole')
      .where('log.innovation_id = :innovationId', { innovationId })
      .andWhere(
        new Brackets(qb => {
          qb.where('(log.type IN (:...suggestions) AND suggestedUnits.organisation_unit_id = :unitId )', {
            suggestions: [
              InnovationSupportLogTypeEnum.ACCESSOR_SUGGESTION,
              InnovationSupportLogTypeEnum.ASSESSMENT_SUGGESTION
            ],
            unitId
          });
          qb.orWhere('(log.type NOT IN (:...suggestions) AND log.organisation_unit_id = :unitId )', {
            suggestions: [
              InnovationSupportLogTypeEnum.ACCESSOR_SUGGESTION,
              InnovationSupportLogTypeEnum.ASSESSMENT_SUGGESTION
            ],
            unitId
          });
        })
      )
      .getMany();

    const createdByUserIds = new Set([...unitSupportLogs.map(s => s.createdBy)]);
    const usersInfo = await this.domainService.users.getUsersMap({ userIds: Array.from(createdByUserIds.values()) });

    const summary: SupportSummaryUnitInfo[] = [];
    for (const supportLog of unitSupportLogs) {
      const createdByUser = usersInfo.get(supportLog.createdBy);

      const defaultSummary = {
        id: supportLog.id,
        createdAt: supportLog.createdAt,
        createdBy: {
          id: supportLog.createdBy,
          name: createdByUser?.displayName ?? '[deleted user]',
          displayRole: this.domainService.users.getDisplayRoleInformation(
            supportLog.createdBy,
            supportLog.createdByUserRole.role,
            innovation.owner?.id
          )
        }
      };
      switch (supportLog.type) {
        case InnovationSupportLogTypeEnum.STATUS_UPDATE:
          summary.push({
            ...defaultSummary,
            type: 'SUPPORT_UPDATE',
            params: {
              supportStatus: supportLog.innovationSupportStatus ?? InnovationSupportStatusEnum.UNASSIGNED, // Not needed, we are veryfing in the switch case that is a type that always has supportStatus
              message: supportLog.description
            }
          });
          break;
        case InnovationSupportLogTypeEnum.ACCESSOR_SUGGESTION:
          summary.push({
            ...defaultSummary,
            type: 'SUGGESTED_ORGANISATION',
            params: {
              suggestedByName: supportLog.organisationUnit?.name,
              message: supportLog.description
            }
          });
          break;
        case InnovationSupportLogTypeEnum.PROGRESS_UPDATE:
          {
            const file = await this.getProgressUpdateFile(domainContext, innovationId, supportLog.id);

            if (supportLog.params) {
              summary.push({
                ...defaultSummary,
                type: 'PROGRESS_UPDATE',
                params: {
                  message: supportLog.description,
                  ...supportLog.params,
                  ...(file ? { file: { id: file.id, name: file.name, url: file.file.url } } : {})
                }
              });
            }
          }
          break;
        case InnovationSupportLogTypeEnum.ASSESSMENT_SUGGESTION:
          summary.push({
            ...defaultSummary,
            type: 'SUGGESTED_ORGANISATION',
            params: {}
          });
          break;
        case InnovationSupportLogTypeEnum.INNOVATION_ARCHIVED:
          summary.push({
            ...defaultSummary,
            type: 'INNOVATION_ARCHIVED',
            params: {
              supportStatus: supportLog.innovationSupportStatus ?? InnovationSupportStatusEnum.CLOSED,
              message: supportLog.description
            }
          });
          break;
        case InnovationSupportLogTypeEnum.STOP_SHARE:
          summary.push({
            ...defaultSummary,
            type: 'STOP_SHARE',
            params: { supportStatus: supportLog.innovationSupportStatus ?? InnovationSupportStatusEnum.CLOSED }
          });
          break;
      }
    }

    return summary.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createProgressUpdate(
    domainContext: DomainContextType,
    innovationId: string,
    data: {
      description: string;
      document?: InnovationFileType;
      createdAt?: Date;
    } & SupportLogProgressUpdate['params'],
    entityManager?: EntityManager
  ): Promise<void> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const unitId = domainContext.organisation?.organisationUnit?.id;
    if (!unitId) {
      throw new NotFoundError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { description, document, createdAt, ...params } = data;

    const support = await connection
      .createQueryBuilder(InnovationSupportEntity, 'support')
      .select(['support.id', 'support.status', 'innovation.id', 'innovation.status'])
      .innerJoin('support.innovation', 'innovation')
      .where('support.innovation_id = :innovationId', { innovationId })
      .andWhere('support.organisation_unit_id = :unitId', { unitId })
      .getOne();
    if (!support) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_SUPPORT_NOT_FOUND);
    }

    // If we have a created date and it's different from today check if the support was engaging otherwise check current
    if (data.createdAt && data.createdAt.toISOString().split('T')[0] !== new Date().toISOString().split('T')[0]) {
      const res = await this.validationService.checkIfSupportStatusAtDate(domainContext, innovationId, {
        supportId: support.id,
        date: data.createdAt,
        status: InnovationSupportStatusEnum.ENGAGING
      });

      if (!res.valid) {
        throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SUPPORT_UNIT_NOT_ENGAGING);
      }
    } else {
      data.createdAt = undefined; // We don't need to store the date if it's today
      if (!(support.status === InnovationSupportStatusEnum.ENGAGING)) {
        throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SUPPORT_UNIT_NOT_ENGAGING);
      }
    }

    await connection.transaction(async transaction => {
      const savedLog = await this.domainService.innovations.addSupportLog(
        transaction,
        { id: domainContext.id, roleId: domainContext.currentRole.id },
        innovationId,
        {
          type: InnovationSupportLogTypeEnum.PROGRESS_UPDATE,
          description: data.description,
          supportStatus: support.status,
          unitId,
          params: params
        }
      );

      if (data.document) {
        await this.innovationFileService.createFile(
          domainContext,
          innovationId,
          {
            ...data.document,
            context: {
              id: savedLog.id,
              type: InnovationFileContextTypeEnum.INNOVATION_PROGRESS_UPDATE
            }
          },
          support.innovation.status,
          transaction
        );
      }

      // created at needs a raw query to bypass typeorm, this shouldn't happen often so I'm doing an extra query just
      // to update the date
      if (data.createdAt) {
        await transaction.query(`UPDATE innovation_support_log SET created_at = @0 WHERE id = @1`, [
          data.createdAt,
          savedLog.id
        ]);
      }
    });

    await this.notifierService.send(domainContext, NotifierTypeEnum.SUPPORT_SUMMARY_UPDATE, {
      innovationId,
      supportId: support.id
    });
  }

  async deleteProgressUpdate(
    domainContext: DomainContextType,
    innovationId: string,
    progressId: string,
    entityManager?: EntityManager
  ): Promise<void> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const dbProgress = await connection
      .createQueryBuilder(InnovationSupportLogEntity, 'log')
      .select(['log.id', 'unit.id'])
      .innerJoin('log.organisationUnit', 'unit')
      .where('log.id = :progressId', { progressId })
      .getOne();

    if (!dbProgress) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_SUPPORT_SUMMARY_PROGRESS_UPDATE_NOT_FOUND);
    }

    if (dbProgress.organisationUnit?.id !== domainContext.organisation?.organisationUnit?.id) {
      throw new UnprocessableEntityError(
        InnovationErrorsEnum.INNOVATION_SUPPORT_SUMMARY_PROGRESS_DELETE_MUST_BE_FROM_UNIT
      );
    }

    await connection.transaction(async transaction => {
      const file = await this.getProgressUpdateFile(domainContext, innovationId, progressId);
      if (file) {
        await this.innovationFileService.deleteFile(domainContext, file.id, transaction);
      }

      const now = new Date();
      await transaction.update(
        InnovationSupportLogEntity,
        { id: progressId },
        { updatedAt: now, deletedAt: now, updatedBy: domainContext.id }
      );
    });
  }

  async getValidSupportStatuses(
    innovationId: string,
    unitId: string,
    entityManager?: EntityManager
  ): Promise<InnovationSupportStatusEnum[]> {
    const em = entityManager ?? this.sqlConnection.manager;

    let [support] = await em.query<{ status: InnovationSupportStatusEnum; engagedCount: number }[]>(
      `
        SELECT s.[status], (
          SELECT COUNT(*) FROM innovation_support FOR SYSTEM_TIME ALL WHERE id = s.id AND [status] = 'ENGAGING'
        ) as engagedCount
        FROM innovation_support s
        WHERE s.innovation_id = @0 AND organisation_unit_id = @1
      `,
      [innovationId, unitId]
    );

    if (!support) {
      support = { status: InnovationSupportStatusEnum.UNASSIGNED, engagedCount: 0 };
    }

    // currently this is not considered for closing, if this remains the query can be changed
    // const beenEngaged = support.engagedCount > 0;
    const beenEngaged = true;

    switch (support.status) {
      case InnovationSupportStatusEnum.UNASSIGNED:
      case InnovationSupportStatusEnum.CLOSED:
        return [
          InnovationSupportStatusEnum.ENGAGING,
          InnovationSupportStatusEnum.WAITING,
          InnovationSupportStatusEnum.UNSUITABLE
        ];

      case InnovationSupportStatusEnum.WAITING:
        if (beenEngaged) {
          return [
            InnovationSupportStatusEnum.ENGAGING,
            InnovationSupportStatusEnum.UNSUITABLE,
            InnovationSupportStatusEnum.CLOSED
          ];
        }
        return [InnovationSupportStatusEnum.ENGAGING, InnovationSupportStatusEnum.UNSUITABLE];

      case InnovationSupportStatusEnum.ENGAGING:
        return [
          InnovationSupportStatusEnum.WAITING,
          InnovationSupportStatusEnum.UNSUITABLE,
          InnovationSupportStatusEnum.CLOSED
        ];

      case InnovationSupportStatusEnum.UNSUITABLE:
        if (beenEngaged) {
          return [
            InnovationSupportStatusEnum.ENGAGING,
            InnovationSupportStatusEnum.WAITING,
            InnovationSupportStatusEnum.CLOSED
          ];
        }
        return [InnovationSupportStatusEnum.ENGAGING, InnovationSupportStatusEnum.WAITING];
    }
  }

  private async fetchAccessorsSuggestedOrganisationUnits(
    innovationId: string,
    entityManager?: EntityManager
  ): Promise<InnovationSuggestionAccessor[]> {
    const res = new Map<string, InnovationSuggestionAccessor>();
    const em = entityManager ?? this.sqlConnection.manager;

    const query = em
      .createQueryBuilder()
      .from(InnovationSupportLogEntity, 'sl')
      .select([
        'whom.id',
        'whom.name',
        'whom.acronym',
        'suggested_org.id',
        'suggested_org.name',
        'suggested_org.acronym',
        'suggested_unit.id',
        'suggested_unit.name',
        'suggested_unit.acronym'
      ])
      .innerJoin('innovation_support_log_organisation_unit', 'slou', 'slou.innovation_support_log_id = sl.id')
      .innerJoin('organisation_unit', 'whom_unit', 'whom_unit.id = sl.organisation_unit_id')
      .innerJoin('organisation', 'whom', 'whom.id = whom_unit.organisation_id')
      .innerJoin('organisation_unit', 'suggested_unit', 'suggested_unit.id = slou.organisation_unit_id')
      .innerJoin('organisation', 'suggested_org', 'suggested_org.id = suggested_unit.organisation_id')
      .where('sl.innovation_id = :innovationId', { innovationId })
      .andWhere('sl.type = :type', { type: InnovationSupportLogTypeEnum.ACCESSOR_SUGGESTION })
      .groupBy('whom.id')
      .addGroupBy('whom.name')
      .addGroupBy('whom.acronym')
      .addGroupBy('suggested_org.id')
      .addGroupBy('suggested_org.name')
      .addGroupBy('suggested_org.acronym')
      .addGroupBy('suggested_unit.id')
      .addGroupBy('suggested_unit.name')
      .addGroupBy('suggested_unit.acronym')
      .orderBy('whom.name', 'ASC')
      .addOrderBy('suggested_org.name', 'ASC')
      .addOrderBy('suggested_unit.name', 'ASC');

    const rows = await query.getRawMany();

    rows.forEach(row => {
      // if suggestor organisation (whom) doesn't exist in res, set in res
      if (!res.has(row.whom_id)) {
        res.set(row.whom_id, {
          organisation: { id: row.whom_id, name: row.whom_name, acronym: row.whom_acronym },
          suggestedOrganisations: []
        });
      }

      // try to find suggested organisation
      const suggestedOrganisation = res
        .get(row.whom_id)
        ?.suggestedOrganisations.find(so => so.id === row.suggested_org_id);

      // if suggested organisation exists in res, append unit to it
      if (suggestedOrganisation) {
        suggestedOrganisation.organisationUnits.push({
          id: row.suggested_unit_id,
          name: row.suggested_unit_name,
          acronym: row.suggested_unit_acronym
        });

        // otherwise, create and append organisation to suggestedOrganisations
      } else {
        res.get(row.whom_id)?.suggestedOrganisations.push({
          id: row.suggested_org_id,
          name: row.suggested_org_name,
          acronym: row.suggested_org_acronym,
          organisationUnits: [
            {
              id: row.suggested_unit_id,
              name: row.suggested_unit_name,
              acronym: row.suggested_unit_acronym
            }
          ]
        });
      }
    });

    return [...res.values()];
  }

  private async getProgressUpdateFile(
    domainContext: DomainContextType,
    innovationId: string,
    progressId: string
  ): Promise<
    | {
        id: string;
        storageId: string;
        context: { id: string; type: InnovationFileContextTypeEnum; name?: string };
        name: string;
        description?: string;
        createdAt: Date;
        createdBy: { name: string; role: ServiceRoleEnum; isOwner?: boolean; orgUnitName?: string };
        file: { name: string; size?: number; extension: string; url: string };
      }
    | undefined
  > {
    const files = await this.innovationFileService.getFilesList(
      domainContext,
      innovationId,
      { contextId: progressId },
      { skip: 0, take: 1, order: { createdAt: 'ASC' } }
    );

    return files.data[0];
  }

  private async getSuggestedUnitsInfoMap(
    innovationId: string,
    em: EntityManager
  ): Promise<Map<string, { id: string; name: string; orgId: string; orgAcronym: string }>> {
    const suggestedUnitsInfo: { id: string; name: string; orgId: string; orgAcronym: string }[] = [
      ...(await this.getSuggestedUnitsByNA(innovationId, em)).map(u => ({
        id: u.id,
        name: u.name,
        orgId: u.orgId,
        orgAcronym: u.orgAcronym
      })),
      ...(await this.getSuggestedUnitsByQA(innovationId, em))
    ];

    return new Map(suggestedUnitsInfo.map(u => [u.id, u]));
  }

  /**
   * This function returns the suggestions from NA assessment
   * If unitId = undefined -> will return all the suggestions
   * If unit != undefined -> will return an array with just the unit if it was suggested by the NA or an empty array
   */
  private async getSuggestedUnitsByNA(
    innovationId: string,
    em: EntityManager
  ): Promise<
    {
      id: string;
      name: string;
      assessmentId: string;
      updatedAt: Date;
      assignTo?: string;
      orgId: string;
      orgAcronym: string;
    }[]
  > {
    const suggestedByNA = await em
      .createQueryBuilder(InnovationAssessmentEntity, 'assessment')
      .select([
        'assessment.id',
        'assessment.updatedAt',
        'assignedTo.id',
        'units.id',
        'units.name',
        'org.id',
        'org.acronym'
      ])
      .leftJoin('assessment.organisationUnits', 'units')
      .innerJoin('assessment.assignTo', 'assignedTo')
      .innerJoin('units.organisation', 'org')
      .where('assessment.innovation_id = :innovationId', { innovationId })
      .getOne();

    if (!suggestedByNA) {
      return [];
    }

    return suggestedByNA.organisationUnits.map(u => ({
      id: u.id,
      name: u.name,
      assessmentId: suggestedByNA.id,
      updatedAt: suggestedByNA.updatedAt,
      assignTo: suggestedByNA.assignTo?.id,
      orgId: u.organisation.id,
      orgAcronym: u.organisation.acronym || ''
    }));
  }

  private async getSuggestedUnitsByQA(
    innovationId: string,
    em: EntityManager
  ): Promise<{ id: string; name: string; orgId: string; orgAcronym: string }[]> {
    const suggestedByQA = await em
      .createQueryBuilder(InnovationSupportLogEntity, 'log')
      .select(['log.id', 'suggestedUnits.id', 'suggestedUnits.name', 'suggestedUnits.acronym', 'org.id', 'org.acronym'])
      .leftJoin('log.suggestedOrganisationUnits', 'suggestedUnits')
      .innerJoin('suggestedUnits.organisation', 'org')
      .where('log.innovation_id = :innovationId', { innovationId })
      .andWhere('log.type = :suggestionStatus', {
        suggestionStatus: InnovationSupportLogTypeEnum.ACCESSOR_SUGGESTION
      })
      .getMany();

    return suggestedByQA
      .map(log =>
        (log.suggestedOrganisationUnits ?? []).map(u => ({
          id: u.id,
          name: u.name,
          orgId: u.organisation.id,
          orgAcronym: u.organisation.acronym || ''
        }))
      )
      .flat();
  }

  private async getSuggestedUnitsSupportInfoMap(
    innovationId: string,
    em: EntityManager
  ): Promise<Map<string, UnitSupportInformationType>> {
    const unitsSupportInformation: UnitSupportInformationType[] = await em.query(
      `
      SELECT s.id, s.status, s.updated_at as updatedAt, ou.id as unitId, ou.name as unitName, org.id as orgId, org.acronym as orgAcronym, t.startSupport, t.endSupport
      FROM innovation_support s
      INNER JOIN organisation_unit ou ON ou.id = s.organisation_unit_id
      INNER JOIN organisation org ON org.id = ou.organisation_id
      LEFT JOIN (
          SELECT id, MIN(valid_from) as startSupport, MAX(valid_to) as endSupport
          FROM innovation_support
          FOR SYSTEM_TIME ALL
          WHERE innovation_id = @0 AND (status IN ('ENGAGING'))
          GROUP BY id
      ) t ON t.id = s.id
      WHERE innovation_id = @0
    `,
      [innovationId]
    );

    return new Map(unitsSupportInformation.map(support => [support.unitId, support]));
  }

  private sortByStartDate(units: SuggestedUnitType[]): SuggestedUnitType[] {
    return units.sort((a, b) => {
      if (!a.support.start) {
        return 1;
      }

      if (!b.support.start) {
        return -1;
      }

      return new Date(a.support.start).getTime() - new Date(b.support.start).getTime();
    });
  }
}
