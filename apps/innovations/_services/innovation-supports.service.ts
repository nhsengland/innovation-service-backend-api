import { inject, injectable } from 'inversify';
import { Brackets, EntityManager, In } from 'typeorm';

import {
  InnovationAssessmentEntity,
  InnovationEntity,
  InnovationSupportEntity,
  InnovationSupportLogEntity,
  InnovationTaskEntity,
  OrganisationUnitEntity,
  UserRoleEntity
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
  InnovationErrorsEnum,
  NotFoundError,
  OrganisationErrorsEnum,
  UnprocessableEntityError
} from '@innovations/shared/errors';
import type { DomainService, NotifierService } from '@innovations/shared/services';
import type { DomainContextType } from '@innovations/shared/types';

import { InnovationThreadSubjectEnum } from '../_enums/innovation.enums';
import type {
  InnovationDocumentType,
  InnovationSuggestionAccessor,
  InnovationSuggestionsType
} from '../_types/innovation.types';

import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { SupportSummaryUnitInfo } from '../_types/support.types';
import { BaseService } from './base.service';
import type { InnovationFileService } from './innovation-file.service';
import type { InnovationThreadsService } from './innovation-threads.service';
import SYMBOLS from './symbols';

type UnitSupportInformationType = {
  id: string;
  status: InnovationSupportStatusEnum;
  updatedAt: Date;
  unitId: string;
  unitName: string;
  startSupport: null | Date;
  endSupport: null | Date;
};

type SuggestedUnitType = {
  id: string;
  name: string;
  support: { status: InnovationSupportStatusEnum; start?: Date; end?: Date };
};

@injectable()
export class InnovationSupportsService extends BaseService {
  constructor(
    @inject(SHARED_SYMBOLS.DomainService) private domainService: DomainService,
    @inject(SHARED_SYMBOLS.NotifierService) private notifierService: NotifierService,
    @inject(SYMBOLS.InnovationThreadsService)
    private innovationThreadsService: InnovationThreadsService,
    @inject(SYMBOLS.InnovationFileService) private innovationFileService: InnovationFileService
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
        .filter(support => support.status === InnovationSupportStatusEnum.ENGAGING)
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

  async getInnovationSuggestions(innovationId: string): Promise<InnovationSuggestionsType> {
    const supportLogs = await this.fetchSupportLogs(innovationId, InnovationSupportLogTypeEnum.ACCESSOR_SUGGESTION);

    const assessmentQuery = this.sqlConnection
      .createQueryBuilder(InnovationAssessmentEntity, 'assessments')
      .leftJoinAndSelect('assessments.organisationUnits', 'organisationUnit')
      .leftJoinAndSelect('organisationUnit.organisation', 'organisation')
      .where('assessments.innovation_id = :innovationId', { innovationId })
      .andWhere('organisationUnit.inactivated_at IS NULL');

    const innovationAssessment = await assessmentQuery.getOne();

    const result: InnovationSuggestionsType = {
      assessment: {},
      accessors: []
    };

    if (innovationAssessment) {
      const assessmentOrganisationUnits = [...new Set(innovationAssessment.organisationUnits)];

      result.assessment = {
        id: innovationAssessment.id,
        suggestedOrganisationUnits:
          assessmentOrganisationUnits.length > 0
            ? assessmentOrganisationUnits.map((orgUnit: OrganisationUnitEntity) => ({
                id: orgUnit.id,
                name: orgUnit.name,
                acronym: orgUnit.acronym,
                organisation: {
                  id: orgUnit.organisation.id,
                  name: orgUnit.organisation.name,
                  acronym: orgUnit.organisation.acronym
                }
              }))
            : []
      };
    }

    if (supportLogs && supportLogs.length > 0) {
      result.accessors = supportLogs.map(log => {
        const rec: InnovationSuggestionAccessor = {
          organisationUnit: log.organisationUnit
            ? {
                id: log.organisationUnit.id,
                name: log.organisationUnit.name,
                acronym: log.organisationUnit.acronym,
                organisation: {
                  id: log.organisationUnit.organisation.id,
                  name: log.organisationUnit.organisation.name,
                  acronym: log.organisationUnit.organisation.acronym
                }
              }
            : null
        };

        if (log.suggestedOrganisationUnits && log.suggestedOrganisationUnits.length > 0) {
          rec.suggestedOrganisationUnits = log.suggestedOrganisationUnits.map((orgUnit: OrganisationUnitEntity) => ({
            id: orgUnit.id,
            name: orgUnit.name,
            acronym: orgUnit.acronym,
            organisation: {
              id: orgUnit.organisation.id,
              name: orgUnit.organisation.name,
              acronym: orgUnit.organisation.acronym
            }
          }));
        }

        return rec;
      });
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

    const organisationUnitId = domainContext.organisation?.organisationUnit?.id || '';

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

    const result = await connection.transaction(async transaction => {
      const newSupport = InnovationSupportEntity.new({
        status: data.status,
        createdBy: domainContext.id,
        updatedBy: domainContext.id,
        innovation: InnovationEntity.new({ id: innovationId }),
        organisationUnit: OrganisationUnitEntity.new({ id: organisationUnit.id }),
        userRoles: (data.accessors || []).map(item => UserRoleEntity.new({ id: item.userRoleId }))
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
        true
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

      return { id: savedSupport.id };
    });

    await this.notifierService.send(domainContext, NotifierTypeEnum.INNOVATION_SUPPORT_STATUS_UPDATE, {
      innovationId,
      innovationSupport: {
        id: result.id,
        status: data.status,
        statusChanged: true,
        message: data.message,
        organisationUnitId: organisationUnitId,
        newAssignedAccessors:
          data.status === InnovationSupportStatusEnum.ENGAGING
            ? (data.accessors ?? []).map(item => ({ id: item.id }))
            : []
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
      await this.notifierService.send(domainContext, NotifierTypeEnum.INNOVATION_ORGANISATION_UNITS_SUGGESTION, {
        innovationId,
        organisationUnitIds: data.organisationUnits
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

    const previousStatus = dbSupport.status;

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
        true
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

      const newAssignedAccessors = await this.assignAccessors(
        savedSupport,
        assignedAccessors,
        thread.thread.id,
        transaction
      );

      return { id: savedSupport.id, newAssignedAccessors: new Set(newAssignedAccessors) };
    });

    await this.notifierService.send(domainContext, NotifierTypeEnum.INNOVATION_SUPPORT_STATUS_UPDATE, {
      innovationId,
      innovationSupport: {
        id: result.id,
        status: data.status,
        statusChanged: previousStatus !== data.status,
        message: data.message,
        organisationUnitId: dbSupport.organisationUnit.id,
        newAssignedAccessors:
          data.status === InnovationSupportStatusEnum.ENGAGING
            ? (data.accessors ?? [])
                .filter(item => result.newAssignedAccessors.has(item.userRoleId))
                .map(item => ({ id: item.id }))
            : []
      }
    });

    return result;
  }

  /**
   * assigns accessors to a support, adding them to the thread followers if the support is ENGAGING
   * @param support the support entity or id
   * @param accessorRoleIds the list of assigned accessors role ids
   * @param entityManager transactional entity manager
   * @returns the list of new assigned accessors role ids
   */
  private async assignAccessors(
    support: string | InnovationSupportEntity,
    accessorRoleIds: string[],
    threadId: string, // this will likely become optional in the future
    entityManager?: EntityManager
  ): Promise<string[]> {
    // Force a transaction if one not present
    if (!entityManager) {
      return this.sqlConnection.transaction(async transaction => {
        return this.assignAccessors(support, accessorRoleIds, threadId, transaction);
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

    const previousUsersRoleIds = new Set(support.userRoles.map(item => item.id));
    const newAssignedAccessors = accessorRoleIds.filter(item => !previousUsersRoleIds.has(item));

    await entityManager.save(InnovationSupportEntity, {
      id: support.id,
      userRoles: accessorRoleIds.map(id => ({ id }))
    });

    // Add followers logic
    // Update thread followers with the new assigned users only when the support is ENGAGING
    if (support.status === InnovationSupportStatusEnum.ENGAGING) {
      await this.innovationThreadsService.removeFollowers(threadId, [...previousUsersRoleIds], entityManager);
      await this.innovationThreadsService.addFollowersToThread(threadId, accessorRoleIds, entityManager);
    }

    return newAssignedAccessors;
  }

  async changeInnovationSupportStatusRequest(
    domainContext: DomainContextType,
    innovationId: string,
    supportId: string,
    status: InnovationSupportStatusEnum,
    requestReason: string
  ): Promise<boolean> {
    await this.notifierService.send(domainContext, NotifierTypeEnum.INNOVATION_SUPPORT_STATUS_CHANGE_REQUEST, {
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
  ): Promise<
    Record<
      keyof typeof InnovationSupportSummaryTypeEnum,
      {
        id: string;
        name: string;
        support: { status: InnovationSupportStatusEnum; start?: Date; end?: Date };
      }[]
    >
  > {
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
            status: support.status,
            start: support.startSupport ?? undefined
          }
        });
      } else if (support.startSupport && support.endSupport) {
        beenEngaged.push({
          id: support.unitId,
          name: support.unitName,
          ...(support.unitId === domainContext.organisation?.organisationUnit?.id && { sameOrganisation: true }),
          support: {
            status: support.status,
            start: support.startSupport,
            end: support.endSupport
          }
        });
      } else {
        suggested.push({
          id: support.unitId,
          name: support.unitName,
          ...(support.unitId === domainContext.organisation?.organisationUnit?.id && { sameOrganisation: true }),
          support: {
            status: support.status,
            start: support.updatedAt
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
            const file = await this.getProgressUpdateFile(innovationId, supportLog.id);

            summary.push({
              ...defaultSummary,
              type: 'PROGRESS_UPDATE',
              params: {
                title: supportLog.params?.title ?? '', // will always exists in type PROGRESS_UPDATE
                message: supportLog.description,
                ...(file ? { file: { id: file.id, name: file.name, url: file.file.url } } : {})
              }
            });
          }
          break;
        case InnovationSupportLogTypeEnum.ASSESSMENT_SUGGESTION:
          summary.push({
            ...defaultSummary,
            type: 'SUGGESTED_ORGANISATION',
            params: {}
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
      title: string;
      description: string;
      document?: InnovationDocumentType;
    },
    entityManager?: EntityManager
  ): Promise<void> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const unitId = domainContext.organisation?.organisationUnit?.id;
    if (!unitId) {
      throw new NotFoundError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND);
    }

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

    if (!(support.status === InnovationSupportStatusEnum.ENGAGING)) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SUPPORT_UNIT_NOT_ENGAGING);
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
          params: { title: data.title }
        }
      );

      if (data.document) {
        await this.innovationFileService.createFile(
          domainContext,
          innovationId,
          support.innovation.status,
          {
            ...data.document,
            context: {
              id: savedLog.id,
              type: InnovationFileContextTypeEnum.INNOVATION_PROGRESS_UPDATE
            }
          },
          transaction
        );
      }
    });

    await this.notifierService.send(domainContext, NotifierTypeEnum.SUPPORT_SUMMARY_UPDATE, {
      innovationId,
      organisationUnitId: unitId,
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
      const file = await this.getProgressUpdateFile(innovationId, progressId);
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

    const beenEngaged = support.engagedCount > 0;

    switch (support.status) {
      case InnovationSupportStatusEnum.UNASSIGNED:
      case InnovationSupportStatusEnum.CLOSED:
        return [
          InnovationSupportStatusEnum.UNSUITABLE,
          InnovationSupportStatusEnum.WAITING,
          InnovationSupportStatusEnum.ENGAGING
        ];

      case InnovationSupportStatusEnum.WAITING:
        if (beenEngaged) {
          return [
            InnovationSupportStatusEnum.UNSUITABLE,
            InnovationSupportStatusEnum.ENGAGING,
            InnovationSupportStatusEnum.CLOSED
          ];
        }
        return [InnovationSupportStatusEnum.UNSUITABLE, InnovationSupportStatusEnum.ENGAGING];

      case InnovationSupportStatusEnum.ENGAGING:
        return [
          InnovationSupportStatusEnum.UNSUITABLE,
          InnovationSupportStatusEnum.WAITING,
          InnovationSupportStatusEnum.CLOSED
        ];

      case InnovationSupportStatusEnum.UNSUITABLE:
        if (beenEngaged) {
          return [
            InnovationSupportStatusEnum.WAITING,
            InnovationSupportStatusEnum.ENGAGING,
            InnovationSupportStatusEnum.CLOSED
          ];
        }
        return [InnovationSupportStatusEnum.WAITING, InnovationSupportStatusEnum.ENGAGING];
    }
  }

  private async fetchSupportLogs(
    innovationId: string,
    type?: InnovationSupportLogTypeEnum
  ): Promise<InnovationSupportLogEntity[]> {
    const supportQuery = this.sqlConnection
      .createQueryBuilder(InnovationSupportLogEntity, 'supports')
      .leftJoinAndSelect('supports.innovation', 'innovation')
      .leftJoinAndSelect('supports.organisationUnit', 'organisationUnit')
      .leftJoinAndSelect('organisationUnit.organisation', 'organisation')
      .leftJoinAndSelect('supports.suggestedOrganisationUnits', 'suggestedOrganisationUnits')
      .leftJoinAndSelect('suggestedOrganisationUnits.organisation', 'suggestedOrganisation')
      .where('innovation.id = :innovationId', { innovationId })
      .andWhere('suggestedOrganisation.inactivated_at IS NULL');

    if (type) {
      supportQuery.andWhere('supports.type = :type', { type });
    }

    supportQuery.orderBy('supports.createdAt', 'ASC');

    return await supportQuery.getMany();
  }

  private async getProgressUpdateFile(
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
      innovationId,
      { contextId: progressId },
      { skip: 0, take: 1, order: { createdAt: 'ASC' } }
    );

    return files.data[0];
  }

  private async getSuggestedUnitsInfoMap(
    innovationId: string,
    em: EntityManager
  ): Promise<Map<string, { id: string; name: string }>> {
    const suggestedUnitsInfo: { id: string; name: string }[] = [
      ...(await this.getSuggestedUnitsByNA(innovationId, em)).map(u => ({ id: u.id, name: u.name })),
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
  ): Promise<{ id: string; name: string; assessmentId: string; updatedAt: Date; assignTo?: string }[]> {
    const suggestedByNA = await em
      .createQueryBuilder(InnovationAssessmentEntity, 'assessment')
      .select(['assessment.id', 'assessment.updatedAt', 'assignedTo.id', 'units.id', 'units.name'])
      .leftJoin('assessment.organisationUnits', 'units')
      .innerJoin('assessment.assignTo', 'assignedTo')
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
      assignTo: suggestedByNA.assignTo?.id
    }));
  }

  private async getSuggestedUnitsByQA(
    innovationId: string,
    em: EntityManager
  ): Promise<{ id: string; name: string }[]> {
    const suggestedByQA = await em
      .createQueryBuilder(InnovationSupportLogEntity, 'log')
      .select(['log.id', 'suggestedUnits.id', 'suggestedUnits.name'])
      .leftJoin('log.suggestedOrganisationUnits', 'suggestedUnits')
      .where('log.innovation_id = :innovationId', { innovationId })
      .andWhere('log.type = :suggestionStatus', {
        suggestionStatus: InnovationSupportLogTypeEnum.ACCESSOR_SUGGESTION
      })
      .getMany();

    return suggestedByQA
      .map(log => (log.suggestedOrganisationUnits ?? []).map(u => ({ id: u.id, name: u.name })))
      .flat();
  }

  private async getSuggestedUnitsSupportInfoMap(
    innovationId: string,
    em: EntityManager
  ): Promise<Map<string, UnitSupportInformationType>> {
    const unitsSupportInformation: UnitSupportInformationType[] = await em.query(
      `
      SELECT s.id, s.status, s.updated_at as updatedAt, ou.id as unitId, ou.name as unitName, t.startSupport, t.endSupport
      FROM innovation_support s
      INNER JOIN organisation_unit ou ON ou.id = s.organisation_unit_id
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
