import { inject, injectable } from 'inversify';
import { Brackets, EntityManager, In } from 'typeorm';

import {
  InnovationActionEntity,
  InnovationAssessmentEntity,
  InnovationEntity,
  InnovationSupportEntity,
  InnovationSupportLogEntity,
  OrganisationUnitEntity,
  OrganisationUnitUserEntity
} from '@innovations/shared/entities';
import {
  ActivityEnum,
  InnovationActionStatusEnum,
  InnovationSupportLogTypeEnum,
  InnovationSupportStatusEnum,
  InnovationSupportSummaryTypeEnum,
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
  InnovationSuggestionAccessor,
  InnovationSuggestionsType,
  InnovationSupportsLogType
} from '../_types/innovation.types';

import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { SupportSummaryUnitInfo } from '../_types/support.types';
import { BaseService } from './base.service';
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
    private innovationThreadsService: InnovationThreadsService
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
      engagingAccessors?: { id: string; organisationUnitUserId: string; name: string }[];
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
      query.leftJoinAndSelect('supports.organisationUnitUsers', 'organisationUnitUser');
      query.leftJoinAndSelect('organisationUnitUser.organisationUser', 'organisationUser');
      query.leftJoinAndSelect('organisationUser.user', 'user');
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
        .flatMap(support =>
          support.organisationUnitUsers
            .filter(item => item.organisationUser.user.status === UserStatusEnum.ACTIVE)
            .map(item => item.organisationUser.user.id)
        );

      usersInfo = await this.domainService.users.getUsersList({ userIds: assignedAccessorsIds });
    }

    return innovationSupports.map(support => {
      let engagingAccessors: { id: string; organisationUnitUserId: string; name: string }[] | undefined = undefined;

      if (filters.fields.includes('engagingAccessors')) {
        engagingAccessors = support.organisationUnitUsers
          .map(su => ({
            id: su.organisationUser.user.id,
            organisationUnitUserId: su.id,
            name: usersInfo.find(item => item.id === su.organisationUser.user.id)?.displayName || ''
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

  async getInnovationSupportLogs(innovationId: string): Promise<InnovationSupportsLogType[]> {
    const supportLogs = await this.fetchSupportLogs(innovationId);

    const usersIds = supportLogs.map(item => item.createdBy);
    const usersInfo = await this.domainService.users.getUsersList({ userIds: [...usersIds] });
    const userNames: { [key: string]: string } = usersInfo.reduce((map: { [key: string]: string }, obj) => {
      map[obj.id] = obj.displayName;
      return map;
    }, {});

    const response: InnovationSupportsLogType[] = supportLogs.map(log => {
      const rec: InnovationSupportsLogType = {
        id: log.id,
        type: log.type,
        description: log.description,
        innovationSupportStatus: log.innovationSupportStatus,
        createdBy: userNames[log.createdBy] ?? '',
        createdAt: log.createdAt,
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

    return response;
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
    engagingAccessors: { id: string; organisationUnitUserId: string; name: string }[];
  }> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const innovationSupport = await connection
      .createQueryBuilder(InnovationSupportEntity, 'support')
      .innerJoinAndSelect('support.innovation', 'innovation')
      .innerJoinAndSelect('support.organisationUnit', 'orgUnit')
      .innerJoinAndSelect('orgUnit.organisation', 'org')
      .leftJoinAndSelect('support.organisationUnitUsers', 'orgUnitUser')
      .leftJoinAndSelect('orgUnitUser.organisationUser', 'orgUser')
      .leftJoinAndSelect('orgUser.user', 'user')
      .where('support.id = :innovationSupportId', { innovationSupportId })
      .getOne();

    if (!innovationSupport) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_SUPPORT_NOT_FOUND);
    }

    // Fetch users names.

    const assignedAccessorsIds = innovationSupport.organisationUnitUsers
      .filter(item => item.organisationUser.user.status === UserStatusEnum.ACTIVE)
      .map(item => item.organisationUser.user.id);
    const usersInfo = await this.domainService.users.getUsersList({
      userIds: assignedAccessorsIds
    });

    return {
      id: innovationSupport.id,
      status: innovationSupport.status,
      engagingAccessors: innovationSupport.organisationUnitUsers
        .map(su => ({
          id: su.organisationUser.user.id,
          organisationUnitUserId: su.id,
          name: usersInfo.find(item => item.id === su.organisationUser.user.id)?.displayName || ''
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
      accessors?: { id: string; organisationUnitUserId: string }[];
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
        organisationUnitUsers: (data.accessors || []).map(item =>
          OrganisationUnitUserEntity.new({ id: item.organisationUnitUserId })
        )
      });

      const savedSupport = await transaction.save(InnovationSupportEntity, newSupport);

      const user = { id: domainContext.id, identityId: domainContext.identityId };
      const thread = await this.innovationThreadsService.createThreadOrMessage(
        user,
        domainContext,
        innovationId,
        InnovationThreadSubjectEnum.INNOVATION_SUPPORT_UPDATE,
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
        { id: user.id, organisationUnitId: organisationUnitId },
        { id: innovationId },
        savedSupport.status,
        {
          type: InnovationSupportLogTypeEnum.STATUS_UPDATE,
          description: thread.message?.message ?? '',
          suggestedOrganisationUnits: []
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
    data: { type: InnovationSupportLogTypeEnum; description: string; organisationUnits?: string[] },
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
      const supportLogObj = InnovationSupportLogEntity.new({
        createdBy: domainContext.id,
        updatedBy: domainContext.id,
        innovation,
        innovationSupportStatus:
          innovationSupport && innovationSupport.status
            ? innovationSupport.status
            : InnovationSupportStatusEnum.UNASSIGNED,
        type: data.type,
        description: data.description,
        ...(domainContext.organisation?.organisationUnit?.id && {
          organisationUnit: OrganisationUnitEntity.new({
            id: domainContext.organisation.organisationUnit.id
          })
        }),
        suggestedOrganisationUnits: (data.organisationUnits || []).map((id: string) =>
          OrganisationUnitEntity.new({ id })
        )
      });

      const savedSupportLog = await transaction.save(InnovationSupportLogEntity, supportLogObj);

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
      accessors?: { id: string; organisationUnitUserId: string }[];
    },
    entityManager?: EntityManager
  ): Promise<{ id: string }> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const dbSupport = await connection
      .createQueryBuilder(InnovationSupportEntity, 'support')
      .innerJoinAndSelect('support.organisationUnit', 'organisationUnit')
      .leftJoinAndSelect('support.organisationUnitUsers', 'organisationUnitUsers')
      .where('support.id = :supportId ', { supportId })
      .getOne();
    if (!dbSupport) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_SUPPORT_NOT_FOUND);
    }

    const previousUsersOrganisationUnitUsersIds = new Set(dbSupport.organisationUnitUsers.map(item => item.id));
    const previousStatus = dbSupport.status;

    const result = await connection.transaction(async transaction => {
      if (data.status === InnovationSupportStatusEnum.ENGAGING) {
        dbSupport.organisationUnitUsers = (data.accessors || []).map(item =>
          OrganisationUnitUserEntity.new({ id: item.organisationUnitUserId })
        );
      } else {
        // In the case that previous support was ENGAGING, cleanup several relations!

        dbSupport.organisationUnitUsers = [];

        // Cleanup actions if the status is not ENGAGING or FURTHER_INFO_REQUIRED
        if (data.status !== InnovationSupportStatusEnum.FURTHER_INFO_REQUIRED) {
          await transaction
            .createQueryBuilder()
            .update(InnovationActionEntity)
            .set({ status: InnovationActionStatusEnum.DELETED, updatedBy: domainContext.id })
            .where({
              innovationSupport: dbSupport.id,
              status: In([InnovationActionStatusEnum.REQUESTED, InnovationActionStatusEnum.SUBMITTED])
            })
            .execute();
        }
      }

      dbSupport.status = data.status;
      dbSupport.updatedBy = domainContext.id;

      const savedSupport = await transaction.save(InnovationSupportEntity, dbSupport);

      const thread = await this.innovationThreadsService.createThreadOrMessage(
        { id: domainContext.id, identityId: domainContext.identityId },
        domainContext,
        innovationId,
        InnovationThreadSubjectEnum.INNOVATION_SUPPORT_UPDATE,
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
        { id: domainContext.id, organisationUnitId: savedSupport.organisationUnit.id },
        { id: innovationId },
        savedSupport.status,
        {
          type: InnovationSupportLogTypeEnum.STATUS_UPDATE,
          description: thread.message.message,
          suggestedOrganisationUnits: []
        }
      );

      return { id: savedSupport.id };
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
                .filter(item => !previousUsersOrganisationUnitUsersIds.has(item.organisationUnitUserId))
                .map(item => ({ id: item.id }))
            : []
      }
    });

    return result;
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
  async getSupportSummaryUnitsList(innovationId: string): Promise<
    Record<
      keyof typeof InnovationSupportSummaryTypeEnum,
      {
        id: string;
        name: string;
        support: { status: InnovationSupportStatusEnum; start?: Date; end?: Date };
      }[]
    >
  > {
    const suggestedUnitsInfoMap = await this.getSuggestedUnitsInfoMap(innovationId);
    const unitsSupportInformationMap = await this.getSuggestedUnitsSupportInfoMap(innovationId);

    const suggestedIds = new Set<string>();
    const engaging: SuggestedUnitType[] = [];
    const beenEngaged: SuggestedUnitType[] = [];
    const suggested: SuggestedUnitType[] = [];

    for (const support of unitsSupportInformationMap.values()) {
      suggestedIds.add(support.unitId);

      if (this.isStatusEngaging(support.status)) {
        engaging.push({
          id: support.unitId,
          name: support.unitName,
          support: {
            status: support.status,
            start: support.startSupport ?? undefined
          }
        });
      } else if (support.startSupport && support.endSupport) {
        beenEngaged.push({
          id: support.unitId,
          name: support.unitName,
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

  async getSupportSummaryUnitInfo(innovationId: string, unitId: string): Promise<SupportSummaryUnitInfo[]> {
    const innovation = await this.sqlConnection
      .createQueryBuilder(InnovationEntity, 'innovation')
      .select(['innovation.id', 'owner.id'])
      .leftJoin('innovation.owner', 'owner')
      .where('innovation.id = :innovationId', { innovationId })
      .getOne();

    if (!innovation) {
      throw new Error(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    const unitSupportLogs = await this.sqlConnection
      .createQueryBuilder(InnovationSupportLogEntity, 'log')
      .select([
        'log.id',
        'log.createdBy',
        'log.type',
        'log.createdAt',
        'log.innovationSupportStatus',
        'log.description'
      ])
      .leftJoin(
        'innovation_support_log_organisation_unit',
        'suggestedUnits',
        '(suggestedUnits.innovation_support_log_id = log.id AND suggestedUnits.organisation_unit_id = :unitId)',
        { unitId }
      )
      .where('log.innovation_id = :innovationId', { innovationId })
      .andWhere(
        new Brackets(qb => {
          qb.where('(log.type = :accessorSuggestion AND suggestedUnits.organisation_unit_id = :unitId )', {
            accessorSuggestion: InnovationSupportLogTypeEnum.ACCESSOR_SUGGESTION,
            unitId
          });
          qb.orWhere('(log.type <> :accessorSuggestion AND log.organisation_unit_id = :unitId )', {
            accessorSuggestion: InnovationSupportLogTypeEnum.ACCESSOR_SUGGESTION,
            unitId
          });
        })
      )
      .getMany();

    const createdByUserIds = new Set(unitSupportLogs.map(s => s.createdBy));
    const usersInfo = await this.domainService.users.getUsersMap({ userIds: Array.from(createdByUserIds.values()) });

    const summary: SupportSummaryUnitInfo[] = [];
    for (const supportLog of unitSupportLogs) {
      const createdByUser = usersInfo.get(supportLog.createdBy);
      if (supportLog.type === InnovationSupportLogTypeEnum.STATUS_UPDATE) {
        summary.push({
          createdAt: supportLog.createdAt,
          createdBy: {
            id: supportLog.createdBy,
            name: createdByUser?.displayName ?? '[deleted user]',
            displayRole: this.domainService.users.getUserDisplayRoleInformation(
              supportLog.createdBy,
              ServiceRoleEnum.QUALIFYING_ACCESSOR,
              innovation.owner?.id
            )
          },
          type: 'SUPPORT_UPDATE',
          params: {
            supportStatus: supportLog.innovationSupportStatus,
            message: supportLog.description
          }
        });
      } else if (supportLog.type === InnovationSupportLogTypeEnum.ACCESSOR_SUGGESTION) {
        summary.push({
          createdAt: supportLog.createdAt,
          createdBy: {
            id: supportLog.createdBy,
            name: createdByUser?.displayName ?? '[deleted user]',
            displayRole: this.domainService.users.getUserDisplayRoleInformation(
              supportLog.createdBy,
              ServiceRoleEnum.QUALIFYING_ACCESSOR,
              innovation.owner?.id
            )
          },
          type: 'SUGGESTED_ORGANISATION',
          params: {
            suggestedByName: usersInfo.get(supportLog.createdBy)?.displayName ?? '[deleted user]',
            message: supportLog.description
          }
        });
      }
    }

    return summary.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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

  private async getSuggestedUnitsInfoMap(innovationId: string): Promise<Map<string, { id: string; name: string }>> {
    const suggestedByNA = await this.sqlConnection
      .createQueryBuilder(InnovationAssessmentEntity, 'assessment')
      .select(['assessment.id', 'units.id', 'units.name'])
      .leftJoin('assessment.organisationUnits', 'units')
      .where('assessment.innovation_id = :innovationId', { innovationId })
      .getOne();

    if (!suggestedByNA) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_ASSESSMENT_NOT_FOUND);
    }

    const suggestedByQA = await this.sqlConnection
      .createQueryBuilder(InnovationSupportLogEntity, 'log')
      .select(['log.id', 'suggestedUnits.id', 'suggestedUnits.name'])
      .leftJoin('log.suggestedOrganisationUnits', 'suggestedUnits')
      .where('log.innovation_id = :innovationId', { innovationId })
      .andWhere('log.type = :suggestionStatus', {
        suggestionStatus: InnovationSupportLogTypeEnum.ACCESSOR_SUGGESTION
      })
      .getMany();

    const suggestedUnitsInfo: { id: string; name: string }[] = [
      ...suggestedByNA.organisationUnits.map(u => ({ id: u.id, name: u.name })),
      ...suggestedByQA.map(log => log.suggestedOrganisationUnits.map(u => ({ id: u.id, name: u.name }))).flat()
    ];

    return new Map(suggestedUnitsInfo.map(u => [u.id, u]));
  }

  private async getSuggestedUnitsSupportInfoMap(
    innovationId: string
  ): Promise<Map<string, UnitSupportInformationType>> {
    const unitsSupportInformation: UnitSupportInformationType[] = await this.sqlConnection.query(
      `
      SELECT s.id, s.status, s.updated_at as updatedAt, ou.id as unitId, ou.name as unitName, t.startSupport, t.endSupport
      FROM innovation_support s
      INNER JOIN organisation_unit ou ON ou.id = s.organisation_unit_id
      LEFT JOIN (
          SELECT id, MIN(valid_from) as startSupport, MAX(valid_to) as endSupport
          FROM innovation_support
          FOR SYSTEM_TIME ALL
          WHERE innovation_id = @0 AND (status IN ('ENGAGING','FURTHER_INFO_REQUIRED'))
          GROUP BY id
      ) t ON t.id = s.id
      WHERE innovation_id = @0
    `,
      [innovationId]
    );

    return new Map(unitsSupportInformation.map(support => [support.unitId, support]));
  }

  private isStatusEngaging(status: InnovationSupportStatusEnum): boolean {
    return (
      status === InnovationSupportStatusEnum.FURTHER_INFO_REQUIRED || status === InnovationSupportStatusEnum.ENGAGING
    );
  }

  private sortByStartDate(units: SuggestedUnitType[]) {
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
