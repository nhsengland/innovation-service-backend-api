import { inject, injectable } from 'inversify';
import { Brackets, EntityManager, In } from 'typeorm';

import {
  InnovationEntity,
  InnovationSupportEntity,
  InnovationSupportLogEntity,
  InnovationTaskEntity,
  InnovationThreadEntity,
  OrganisationUnitEntity,
  UserRoleEntity
} from '@innovations/shared/entities';
import {
  ActivityEnum,
  InnovationFileContextTypeEnum,
  InnovationSupportCloseReasonEnum,
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
  ConflictError,
  ForbiddenError,
  GenericErrorsEnum,
  InnovationErrorsEnum,
  NotFoundError,
  OrganisationErrorsEnum,
  UnprocessableEntityError
} from '@innovations/shared/errors';
import type { DomainService, NotifierService } from '@innovations/shared/services';
import {
  isAccessorDomainContextType,
  type DomainContextType,
  type SupportLogProgressUpdate
} from '@innovations/shared/types';

import { InnovationThreadSubjectEnum } from '../_enums/innovation.enums';
import type {
  InnovationFileType,
  InnovationSuggestionAccessor,
  InnovationSuggestionsType,
  InnovationUnitSuggestionsType,
  SuggestedOrganisationInfo
} from '../_types/innovation.types';

import { DatesHelper } from '@innovations/shared/helpers';
import { UserMap } from '@innovations/shared/models/user.map';
import { AuthErrorsEnum } from '@innovations/shared/services/auth/authorization-validation.model';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { SupportSummaryUnitInfo } from '../_types/support.types';
import { BaseService } from './base.service';
import type { InnovationFileService } from './innovation-file.service';
import type { InnovationThreadsService } from './innovation-threads.service';
import { SurveysService } from './surveys.service';
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
  minStartSupport: null | Date;
  orgId: string;
  orgAcronym: string;
};

type SuggestedUnitType = {
  id: string;
  name: string;
  support: { id?: string; status: InnovationSupportStatusEnum; start?: Date; end?: Date; minStart?: Date };
  organisation: {
    id: string;
    acronym: string;
  };
};

type SupportLogSuggestion = {
  whom_id: null | string;
  whom_name: null | string;
  whom_acronym: null | string;
  suggested_org_id: string;
  suggested_org_name: string;
  suggested_org_acronym: string;
  suggested_unit_id: string;
  suggested_unit_name: string;
  suggested_unit_acronym: string;
};

@injectable()
export class InnovationSupportsService extends BaseService {
  constructor(
    @inject(SHARED_SYMBOLS.DomainService) private domainService: DomainService,
    @inject(SHARED_SYMBOLS.NotifierService) private notifierService: NotifierService,
    @inject(SYMBOLS.InnovationThreadsService) private innovationThreadsService: InnovationThreadsService,
    @inject(SYMBOLS.InnovationFileService) private innovationFileService: InnovationFileService,
    @inject(SYMBOLS.ValidationService) private validationService: ValidationService,
    @inject(SYMBOLS.SurveysService) private surveysService: SurveysService
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
      .leftJoinAndSelect('innovation.innovationSupports', 'supports', 'supports.isMostRecent = 1')
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
    let usersInfo = new UserMap();

    if (filters.fields.includes('engagingAccessors')) {
      const assignedAccessorsIds = innovationSupports
        .filter(
          support =>
            support.status === InnovationSupportStatusEnum.ENGAGING ||
            support.status === InnovationSupportStatusEnum.WAITING
        )
        .flatMap(support => support.userRoles.filter(item => item.isActive).map(item => item.user.id));

      usersInfo = await this.domainService.users.getUsersMap({ userIds: assignedAccessorsIds }, connection);
    }

    return innovationSupports.map(support => {
      let engagingAccessors: { id: string; userRoleId: string; name: string; isActive: boolean }[] | undefined =
        undefined;

      if (filters.fields.includes('engagingAccessors')) {
        engagingAccessors = support.userRoles
          .map(supportUserRole => ({
            id: supportUserRole.user.id,
            userRoleId: supportUserRole.id,
            name: usersInfo.getDisplayName(supportUserRole.user.id, supportUserRole.role),
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

  async getInnovationUnitsSuggestions(
    domainContext: DomainContextType,
    innovationId: string
  ): Promise<InnovationUnitSuggestionsType> {
    const unitId = isAccessorDomainContextType(domainContext) ? domainContext.organisation.organisationUnit.id : null;
    if (!unitId) {
      throw new ConflictError(AuthErrorsEnum.AUTH_MISSING_ORGANISATION_UNIT_CONTEXT);
    }

    const lastSupportStatusUpdate = await this.sqlConnection.manager
      .createQueryBuilder(InnovationSupportEntity, 'support')
      .select(['support.updatedAt'])
      .where('support.innovation_id = :innovationId', { innovationId })
      .andWhere('support.organisation_unit_id = :unitId', { unitId })
      .getOne();

    const unitsSuggestionsQuery = this.sqlConnection.manager
      .createQueryBuilder(InnovationSupportLogEntity, 'log')
      .select(['log.id', 'log.createdAt', 'log.description', 'unit.name'])
      .innerJoin('log.organisationUnit', 'unit')
      .innerJoin('log.suggestedOrganisationUnits', 'units')
      .innerJoin('innovation_thread', 'thread', 'thread.context_id = log.id')
      .where('log.innovation_id = :innovationId', { innovationId })
      .andWhere('log.type = :type', { type: 'ACCESSOR_SUGGESTION' })
      .andWhere('units.id = :unitId', { unitId });

    if (lastSupportStatusUpdate) {
      unitsSuggestionsQuery.andWhere('log.createdAt > :statusUpdatedAt', {
        statusUpdatedAt: lastSupportStatusUpdate.updatedAt
      });
    }

    const unitsSuggestions = await unitsSuggestionsQuery.getMany();

    if (unitsSuggestions.length === 0) {
      return [];
    }

    const threads = new Map(
      (
        await this.sqlConnection.manager
          .createQueryBuilder(InnovationThreadEntity, 'threads')
          .select(['threads.id', 'threads.contextId'])
          .where('threads.context_id IN (:...logId)', {
            logId: unitsSuggestions.map(s => s.id)
          })
          .getMany()
      ).map(t => [t.contextId, t.id])
    );

    return unitsSuggestions.map(s => ({
      suggestionId: s.id,
      suggestorUnit: s.organisationUnit?.name ?? '',
      thread: {
        id: threads.get(s.id) ?? '',
        message: s.description
      }
    }));
  }

  /**
   * returns a list of suggested organisations by assessment and assessors ordered by name
   * @param innovationId the innovation id
   * @returns suggested organisations by both assessors and accessors
   */
  async getInnovationSuggestions(
    innovationId: string,
    filters?: {
      majorAssessmentId?: string;
    },
    entityManager?: EntityManager
  ): Promise<InnovationSuggestionsType> {
    const suggestions = await this.getDbSuggestions(innovationId, filters, entityManager);

    const assessmentSuggestions = new Map<string, SuggestedOrganisationInfo>();
    const accessorSuggestions = new Map<string, InnovationSuggestionAccessor>();

    for (const suggestion of suggestions) {
      // Means is a suggestion from Assessment team.
      if (!suggestion.whom_id) {
        this.addToAssessmentSuggestions(assessmentSuggestions, suggestion);
      } else {
        this.addToAccessorSuggestions(accessorSuggestions, suggestion);
      }
    }
    return {
      assessment: { suggestedOrganisations: Array.from(assessmentSuggestions.values()) },
      accessors: Array.from(accessorSuggestions.values())
    };
  }

  /** returns a list of units that have been suggested (id for now) */
  async getInnovationSuggestedUnits(
    innovationId: string,
    filters?: { majorAssessmentId?: string },
    entityManager?: EntityManager
  ): Promise<string[]> {
    const suggestions = await this.getDbSuggestions(innovationId, filters, entityManager);

    return suggestions.map(s => s.suggested_unit_id);
  }

  /** Helper function to return the suggestions from the database */
  private async getDbSuggestions(
    innovationId: string,
    filters?: { majorAssessmentId?: string },
    entityManager?: EntityManager
  ): Promise<SupportLogSuggestion[]> {
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
      .leftJoin('organisation_unit', 'whom_unit', 'whom_unit.id = sl.organisation_unit_id')
      .leftJoin('organisation', 'whom', 'whom.id = whom_unit.organisation_id')
      .innerJoin('organisation_unit', 'suggested_unit', 'suggested_unit.id = slou.organisation_unit_id')
      .innerJoin('organisation', 'suggested_org', 'suggested_org.id = suggested_unit.organisation_id')
      .where('sl.innovation_id = :innovationId', { innovationId })
      .andWhere('sl.type IN (:...types)', {
        types: [InnovationSupportLogTypeEnum.ACCESSOR_SUGGESTION, InnovationSupportLogTypeEnum.ASSESSMENT_SUGGESTION]
      })
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

    if (filters?.majorAssessmentId) {
      query.andWhere('sl.major_assessment_id = :majorAssessmentId', { majorAssessmentId: filters.majorAssessmentId });
    }

    return await query.getRawMany<SupportLogSuggestion>();
  }

  private addToAssessmentSuggestions(
    assessmentSuggestions: Map<string, SuggestedOrganisationInfo>,
    suggestion: SupportLogSuggestion
  ): void {
    const suggestedOrganisation = assessmentSuggestions.get(suggestion.suggested_org_id);
    const organisationUnit = {
      id: suggestion.suggested_unit_id,
      name: suggestion.suggested_unit_name,
      acronym: suggestion.suggested_unit_acronym
    };

    if (!suggestedOrganisation) {
      assessmentSuggestions.set(suggestion.suggested_org_id, {
        id: suggestion.suggested_org_id,
        name: suggestion.suggested_org_name,
        acronym: suggestion.suggested_org_acronym,
        organisationUnits: [organisationUnit]
      });
    } else {
      suggestedOrganisation.organisationUnits.push(organisationUnit);
    }
  }

  private addToAccessorSuggestions(
    accessorSuggestions: Map<string, InnovationSuggestionAccessor>,
    suggestion: SupportLogSuggestion
  ): void {
    if (!suggestion.whom_id || !suggestion.whom_name || !suggestion.whom_acronym) return;
    if (!accessorSuggestions.has(suggestion.whom_id)) {
      accessorSuggestions.set(suggestion.whom_id, {
        organisation: { id: suggestion.whom_id, name: suggestion.whom_name, acronym: suggestion.whom_acronym },
        suggestedOrganisations: []
      });
    }

    const accessor = accessorSuggestions.get(suggestion.whom_id);
    const suggestedOrganisation = accessor?.suggestedOrganisations.find(org => org.id === suggestion.suggested_org_id);
    const organisationUnit = {
      id: suggestion.suggested_unit_id,
      name: suggestion.suggested_unit_name,
      acronym: suggestion.suggested_unit_acronym
    };

    if (suggestedOrganisation) {
      suggestedOrganisation.organisationUnits.push(organisationUnit);
    } else {
      accessor?.suggestedOrganisations.push({
        id: suggestion.suggested_org_id,
        name: suggestion.suggested_org_name,
        acronym: suggestion.suggested_org_acronym,
        organisationUnits: [organisationUnit]
      });
    }
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
    const usersInfo = await this.domainService.users.getUsersMap({ userIds: assignedAccessorsIds }, connection);

    return {
      id: innovationSupport.id,
      status: innovationSupport.status,
      engagingAccessors: innovationSupport.userRoles
        .map(su => ({
          id: su.user.id,
          userRoleId: su.id,
          name: usersInfo.getDisplayName(su.user.id, su.role)
        }))
        .filter(authUser => authUser.name)
    };
  }

  async createInnovationSupport(
    domainContext: DomainContextType,
    innovationId: string,
    organisationUnitId: string,
    status: InnovationSupportStatusEnum,
    entityManager?: EntityManager
  ): Promise<InnovationSupportEntity> {
    if (!entityManager) {
      return this.sqlConnection.transaction(async transaction => {
        return this.createInnovationSupport(domainContext, innovationId, organisationUnitId, status, transaction);
      });
    }

    // Idea if we put the majorAssessment in a innovation domain context we could add a isShared method to the
    // innovation service and reuse it when we need to know if an innovation is shared (similar to hasActiveSupport)
    const innovation = await entityManager
      .createQueryBuilder(InnovationEntity, 'innovation')
      .select(['innovation.id', 'majorAssessment.id'])
      .innerJoin('innovation.currentMajorAssessment', 'majorAssessment')
      .innerJoin('innovation.organisationShares', 'shares')
      .innerJoin('shares.organisationUnits', 'organisationUnits')
      .where('innovation.id = :innovationId', { innovationId })
      .andWhere('organisationUnits.id = :organisationUnitId', { organisationUnitId })
      .getOne();
    if (!innovation || !innovation.currentMajorAssessment) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    if (await this.hasActiveSupport(innovationId, organisationUnitId, entityManager)) {
      throw new ConflictError(InnovationErrorsEnum.INNOVATION_SUPPORT_ALREADY_EXISTS);
    }

    // Update older supports to not most recent
    await entityManager.update(
      InnovationSupportEntity,
      { innovation: { id: innovationId }, organisationUnit: { id: organisationUnitId }, isMostRecent: true },
      { isMostRecent: false }
    );

    const now = new Date();
    return entityManager.save(InnovationSupportEntity, {
      status,
      createdBy: domainContext.id,
      updatedBy: domainContext.id,
      updatedByUserRole: domainContext.currentRole.id,
      createdByUserRole: domainContext.currentRole.id,
      innovation: { id: innovationId },
      organisationUnit: { id: organisationUnitId },
      majorAssessment: { id: innovation.currentMajorAssessment.id },
      userRoles: [],
      createdAt: now,
      ...(status !== InnovationSupportStatusEnum.SUGGESTED && { startedAt: now }),
      ...([InnovationSupportStatusEnum.UNSUITABLE, InnovationSupportStatusEnum.CLOSED].includes(status) && {
        finishedAt: now
      })
    });
  }

  /** Creates the suggested units supports as long as they have been shared with and they don't have an ongoing support  */
  async createSuggestedSupports(
    domainContext: DomainContextType,
    innovationId: string,
    newSuggestedUnits: string[],
    transaction: EntityManager
  ): Promise<void> {
    // Create suggestions for the new suggested organisations without ongoing support
    const ongoingSupports = new Set(
      (
        await transaction
          .createQueryBuilder(InnovationSupportEntity, 'support')
          .select(['support.id', 'unit.id'])
          .innerJoin('support.organisationUnit', 'unit')
          .where('support.innovation = :innovationId', { innovationId })
          .andWhere('support.status IN (:...statuses)', {
            statuses: [
              InnovationSupportStatusEnum.SUGGESTED,
              InnovationSupportStatusEnum.ENGAGING,
              InnovationSupportStatusEnum.WAITING
            ]
          })
          .getMany()
      ).map(s => s.organisationUnit.id)
    );

    const sharedUnits = new Set(
      await this.domainService.innovations.getInnovationSharedUnits(innovationId, transaction)
    );

    for (const unitId of newSuggestedUnits.filter(id => !ongoingSupports.has(id) && sharedUnits.has(id))) {
      await this.createInnovationSupport(
        domainContext,
        innovationId,
        unitId,
        InnovationSupportStatusEnum.SUGGESTED,
        transaction
      );
    }
  }

  /**
   * Starts an innovation support, this can occur only once per active support and should start either from the suggested or search
   */
  async startInnovationSupport(
    domainContext: DomainContextType,
    innovationId: string,
    data: {
      status: InnovationSupportStatusEnum;
      message: string;
      file?: InnovationFileType;
      accessors?: { id: string; userRoleId: string }[];
    },
    entityManager?: EntityManager
  ): Promise<{ id: string }> {
    const connection = entityManager ?? this.sqlConnection.manager;

    if (!isAccessorDomainContextType(domainContext)) {
      throw new ForbiddenError(AuthErrorsEnum.AUTH_USER_ROLE_NOT_ALLOWED);
    }

    const organisationUnitId = domainContext.organisation.organisationUnit.id;

    const organisationUnit = await connection
      .createQueryBuilder(OrganisationUnitEntity, 'unit')
      .where('unit.id = :organisationUnitId', { organisationUnitId })
      .getOne();

    if (!organisationUnit) {
      throw new NotFoundError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND);
    }

    const support = await connection
      .createQueryBuilder(InnovationSupportEntity, 'support')
      .addSelect(['innovation.id', 'organisationUnit.id'])
      .innerJoin('support.innovation', 'innovation')
      .innerJoin('support.organisationUnit', 'organisationUnit')
      .where('support.innovation.id = :innovationId ', { innovationId })
      .andWhere('support.organisation_unit_id = :organisationUnitId', { organisationUnitId })
      .andWhere('support.isMostRecent = 1')
      .getOne();

    if (
      support?.status === InnovationSupportStatusEnum.ENGAGING ||
      support?.status === InnovationSupportStatusEnum.WAITING
    ) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SUPPORT_ALREADY_EXISTS);
    }

    if (
      data.status !== InnovationSupportStatusEnum.ENGAGING &&
      data.status !== InnovationSupportStatusEnum.WAITING &&
      data.accessors?.length
    ) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SUPPORT_CANNOT_HAVE_ASSIGNED_ASSESSORS);
    }

    const accessors = data.accessors?.map(item => item.userRoleId) ?? [];

    const result = await connection.transaction(async transaction => {
      let savedSupport: InnovationSupportEntity;
      // Update support if it already exists (suggested) otherwise create a new one (organisation started on their own)
      if (support?.status === InnovationSupportStatusEnum.SUGGESTED) {
        const newSupport = support;
        newSupport.status = data.status;
        newSupport.updatedBy = domainContext.id;
        newSupport.updatedByUserRole = domainContext.currentRole.id;
        newSupport.startedAt = new Date();
        newSupport.userRoles = [];
        if ([InnovationSupportStatusEnum.UNSUITABLE, InnovationSupportStatusEnum.CLOSED].includes(data.status)) {
          newSupport.finishedAt = new Date();
        }
        savedSupport = await transaction.save(InnovationSupportEntity, newSupport);
      } else {
        savedSupport = await this.createInnovationSupport(
          domainContext,
          innovationId,
          organisationUnitId,
          data.status,
          transaction
        );
      }

      const user = { id: domainContext.id, identityId: domainContext.identityId };
      const thread = await this.innovationThreadsService.createThreadOrMessage(
        domainContext,
        innovationId,
        InnovationThreadSubjectEnum.INNOVATION_SUPPORT_UPDATE.replace('{{unit}}', organisationUnit.name).replace(
          '{{startedAt}}',
          DatesHelper.getLongDateFormat(savedSupport.startedAt!)
        ),
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

      await this.assignAccessors(
        domainContext,
        savedSupport,
        accessors,
        data.message,
        true,
        thread.thread.id,
        transaction
      );

      if (data.file) {
        await this.innovationFileService.createFile(
          domainContext,
          innovationId,
          {
            name: data.file.name,
            description: data.file.description,
            file: data.file.file,
            context: {
              id: thread.message.id,
              type: InnovationFileContextTypeEnum.INNOVATION_MESSAGE
            }
          },
          undefined,
          entityManager
        );
      }

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

    await this.notifierService.sendNotifyMe(domainContext, innovationId, 'SUPPORT_UPDATED', {
      status: data.status,
      units: organisationUnitId,
      message: data.message
    });

    return result;
  }

  async createInnovationOrganisationsSuggestions(
    domainContext: DomainContextType,
    innovationId: string,
    data: {
      description: string;
      organisationUnits: string[];
    },
    entityManager?: EntityManager
  ): Promise<void> {
    // TODO no unit tests on this function
    const connection = entityManager ?? this.sqlConnection.manager;

    if (!isAccessorDomainContextType(domainContext)) {
      throw new UnprocessableEntityError(AuthErrorsEnum.AUTH_USER_ROLE_NOT_ALLOWED);
    }

    if (!data.organisationUnits.length) {
      throw new BadRequestError(InnovationErrorsEnum.INNOVATION_SUGGESTION_WITHOUT_ORGANISATION_UNITS);
    }

    const organisationUnitId = domainContext.organisation.organisationUnit.id;

    const innovation = await connection
      .createQueryBuilder(InnovationEntity, 'innovation')
      .select(['innovation.id', 'supports.id', 'supports.status'])
      .leftJoin(
        'innovation.innovationSupports',
        'supports',
        'supports.isMostRecent = 1 AND supports.organisation_unit_id = :organisationUnitId',
        { organisationUnitId }
      )
      .leftJoin('supports.organisationUnit', 'organisationUnit')
      .where('innovation.id = :innovationId', { innovationId })
      .getOne();

    const innovationSupportStatus = innovation?.innovationSupports[0]?.status ?? InnovationSupportStatusEnum.UNASSIGNED;

    if (!innovation) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    await connection.transaction(async transaction => {
      const units = await connection
        .createQueryBuilder(OrganisationUnitEntity, 'unit')
        .select(['unit.id', 'unit.name'])
        .where('unit.id IN (:...organisationUnits)', {
          organisationUnits: data.organisationUnits
        })
        .getMany();

      const userUnitName = domainContext.organisation.organisationUnit.name;

      for (const unit of units) {
        const savedSupportLog = await this.domainService.innovations.addSupportLog(
          transaction,
          { id: domainContext.id, roleId: domainContext.currentRole.id },
          innovationId,
          {
            description: data.description,
            supportStatus: innovationSupportStatus,
            type: InnovationSupportLogTypeEnum.ACCESSOR_SUGGESTION,
            unitId: domainContext.organisation.organisationUnit.id,
            suggestedOrganisationUnits: [unit.id]
          }
        );

        const thread = await this.innovationThreadsService.createThreadOrMessage(
          domainContext,
          innovationId,
          InnovationThreadSubjectEnum.ORGANISATION_SUGGESTION.replace('{{unit}}', userUnitName).replace(
            '{{suggestedUnit}}',
            unit.name
          ),
          data.description,
          savedSupportLog.id,
          ThreadContextTypeEnum.ORGANISATION_SUGGESTION,
          transaction,
          false
        );

        // Add qualifying accessors from unit as thread followers
        const userRoles = await connection
          .createQueryBuilder(UserRoleEntity, 'userRole')
          .where('userRole.organisation_unit_id = :unitId', { unitId: unit.id })
          .andWhere('userRole.role = :roleType', { roleType: ServiceRoleEnum.QUALIFYING_ACCESSOR })
          .andWhere('userRole.is_active = 1')
          .getMany();

        if (userRoles.length) {
          await this.innovationThreadsService.addFollowersToThread(
            domainContext,
            thread.thread.id,
            userRoles.map(userRole => userRole.id),
            false,
            transaction
          );
        }
      }

      await this.createSuggestedSupports(domainContext, innovationId, data.organisationUnits, transaction);

      await this.domainService.innovations.addActivityLog(
        transaction,
        {
          innovationId,
          activity: ActivityEnum.ORGANISATION_SUGGESTION,
          domainContext
        },
        {
          organisations: units.map(unit => unit.name)
        }
      );
    });

    await this.notifierService.send(domainContext, NotifierTypeEnum.ORGANISATION_UNITS_SUGGESTION, {
      innovationId,
      unitsIds: data.organisationUnits,
      comment: data.description
    });
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
      .leftJoinAndSelect('support.innovation', 'innovation')
      .where('support.id = :supportId ', { supportId })
      .andWhere('support.isMostRecent = 1')
      .getOne();
    if (!dbSupport) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_SUPPORT_NOT_FOUND);
    }

    if (!(await this.hasActiveSupport(innovationId, dbSupport.organisationUnit.id, connection))) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SUPPORT_UPDATE_INACTIVE);
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
      if (data.status === InnovationSupportStatusEnum.ENGAGING || data.status === InnovationSupportStatusEnum.WAITING) {
        assignedAccessors = data.accessors?.map(item => item.userRoleId) ?? [];
      } else {
        // Cleanup tasks if the status is not ENGAGING or WAITING
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
      }

      dbSupport.status = data.status;
      dbSupport.updatedBy = domainContext.id;

      // add finishedAt if closing state
      if (
        data.status === InnovationSupportStatusEnum.CLOSED ||
        data.status === InnovationSupportStatusEnum.UNSUITABLE
      ) {
        dbSupport.finishedAt = new Date();
        dbSupport.closeReason = InnovationSupportCloseReasonEnum.SUPPORT_COMPLETE;
      }

      const savedSupport = await transaction.save(InnovationSupportEntity, dbSupport);

      const thread = await this.innovationThreadsService.createThreadOrMessage(
        domainContext,
        innovationId,
        InnovationThreadSubjectEnum.INNOVATION_SUPPORT_UPDATE.replace(
          '{{unit}}',
          savedSupport.organisationUnit.name
        ).replace('{{startedAt}}', DatesHelper.getLongDateFormat(savedSupport.startedAt!)),
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
        data.message,
        true,
        thread.thread.id,
        transaction
      );

      // Create satisfaction survey if the support was closed
      if (data.status === InnovationSupportStatusEnum.CLOSED) {
        await this.surveysService.createSurvey('SUPPORT_END', innovationId, savedSupport.id, transaction);
      }

      return { id: savedSupport.id, newAssignedAccessors: new Set(newAssignedAccessors), threadId: thread.thread.id };
    });

    // Notify the innovator
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

    await this.notifierService.sendNotifyMe(domainContext, innovationId, 'SUPPORT_UPDATED', {
      status: data.status,
      units: dbSupport.organisationUnit.id,
      message: data.message
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
      .leftJoinAndSelect('support.innovation', 'innovation')
      .where('support.id = :supportId', { supportId })
      .andWhere('support.innovation_id = :innovationId', { innovationId })
      .andWhere('support.isMostRecent = 1')
      .getOne();
    if (!support) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_SUPPORT_NOT_FOUND);
    }
    if (
      support.status !== InnovationSupportStatusEnum.ENGAGING &&
      support.status !== InnovationSupportStatusEnum.WAITING
    ) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SUPPORT_UPDATE_WITH_UNPROCESSABLE_STATUS);
    }

    const thread = await this.innovationThreadsService.getThreadByContextId(
      ThreadContextTypeEnum.SUPPORT,
      supportId,
      entityManager
    );

    await this.assignAccessors(
      domainContext,
      support,
      data.accessors.map(item => item.userRoleId),
      data.message,
      false,
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
    }
  }

  /**
   * assigns accessors to a support, adding them to the thread followers if the support is ENGAGING or WAITING
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
    message: string,
    changedStatus: boolean,
    threadId?: string,
    entityManager?: EntityManager
  ): Promise<{ newAssignedAccessors: string[]; removedAssignedAccessors: string[] }> {
    // Force a transaction if one not present
    if (!entityManager) {
      return this.sqlConnection.transaction(async transaction => {
        return this.assignAccessors(
          domainContext,
          support,
          accessorRoleIds,
          message,
          changedStatus,
          threadId,
          transaction
        );
      });
    }

    if (typeof support === 'string') {
      const dbSupport = await entityManager
        .createQueryBuilder(InnovationSupportEntity, 'support')
        .innerJoinAndSelect('support.organisationUnit', 'organisationUnit')
        .leftJoinAndSelect('support.userRoles', 'userRole')
        .where('support.id = :supportId ', { support })
        .andWhere('support.isMostRecent = 1')
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
    // Update thread followers with the new assigned users only when the support is ENGAGING or WAITING
    if (
      (support.status === InnovationSupportStatusEnum.ENGAGING ||
        support.status === InnovationSupportStatusEnum.WAITING) &&
      threadId
    ) {
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
      await this.notifierService.send(domainContext, NotifierTypeEnum.SUPPORT_NEW_ASSIGN_ACCESSORS, {
        innovationId: support.innovation.id,
        supportId: support.id,
        threadId: threadId,
        message: message,
        newAssignedAccessorsRoleIds: newAssignedAccessors,
        removedAssignedAccessorsRoleIds: removedAssignedAccessors,
        changedStatus: changedStatus
      });
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
            start: support.startSupport ?? undefined,
            minStart: support.minStartSupport ?? undefined
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
            end: support.endSupport,
            minStart: support.minStartSupport ?? undefined
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
            start: support.updatedAt,
            minStart: support.minStartSupport ?? undefined
          },
          organisation: {
            id: support.orgId,
            acronym: support.orgAcronym
          }
        });
      }
    }

    return {
      [InnovationSupportSummaryTypeEnum.ENGAGING]: engaging,
      [InnovationSupportSummaryTypeEnum.BEEN_ENGAGED]: beenEngaged,
      [InnovationSupportSummaryTypeEnum.SUGGESTED]: suggested
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
    const usersInfo = await this.domainService.users.getUsersMap(
      { userIds: Array.from(createdByUserIds.values()) },
      em
    );

    const summary: SupportSummaryUnitInfo[] = [];
    for (const supportLog of unitSupportLogs) {
      const defaultSummary = {
        id: supportLog.id,
        createdAt: supportLog.createdAt,
        createdBy: {
          id: supportLog.createdBy,
          name: usersInfo.getDisplayName(supportLog.createdBy),
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

            if (supportLog.params && !('assessmentId' in supportLog.params)) {
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
      createdAt: Date;
      document?: InnovationFileType;
    } & SupportLogProgressUpdate['params'],
    entityManager?: EntityManager
  ): Promise<void> {
    const connection = entityManager ?? this.sqlConnection.manager;

    if (!isAccessorDomainContextType(domainContext)) {
      throw new NotFoundError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND);
    }

    const unitId = domainContext.organisation.organisationUnit.id;
    const unitName = domainContext.organisation.organisationUnit.name;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { description, document, createdAt, ...params } = data;

    const support = await connection
      .createQueryBuilder(InnovationSupportEntity, 'support')
      .select(['support.id', 'support.status', 'innovation.id', 'innovation.status'])
      .innerJoin('support.innovation', 'innovation')
      .where('support.innovation_id = :innovationId', { innovationId })
      .andWhere('support.organisation_unit_id = :unitId', { unitId })
      .andWhere('support.isMostRecent = 1') // TODO: This will probably changed because of past progress updates
      .getOne();

    if (!support) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_SUPPORT_NOT_FOUND);
    }

    // Validate if the support had already started at the given date
    const res = await this.validationService.checkIfSupportHadAlreadyStartedAtDate(
      domainContext,
      innovationId,
      {
        unitId,
        date: data.createdAt
      },
      connection
    );

    if (!res.valid) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SUPPORT_UNIT_NOT_STARTED);
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

      await this.domainService.innovations.addActivityLog(
        transaction,
        {
          innovationId: innovationId,
          activity: ActivityEnum.SUPPORT_PROGRESS_UPDATE,
          domainContext
        },
        {
          organisationUnit: unitName,
          progressUpdate: {
            id: savedLog.id,
            date: data.createdAt
          }
        }
      );
    });

    await this.notifierService.send(domainContext, NotifierTypeEnum.SUPPORT_SUMMARY_UPDATE, {
      innovationId,
      supportId: support.id
    });

    await this.notifierService.sendNotifyMe(domainContext, innovationId, 'PROGRESS_UPDATE_CREATED', {
      units: unitId
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

    const status =
      (
        await em
          .createQueryBuilder(InnovationSupportEntity, 'support')
          .select('support.status')
          .where('support.innovation_id = :innovationId', { innovationId })
          .andWhere('support.organisation_unit_id = :unitId', { unitId })
          .andWhere('support.isMostRecent = 1')
          .getOne()
      )?.status ?? InnovationSupportStatusEnum.UNASSIGNED;

    switch (status) {
      case InnovationSupportStatusEnum.UNASSIGNED:
      case InnovationSupportStatusEnum.SUGGESTED:
        return [
          InnovationSupportStatusEnum.ENGAGING,
          InnovationSupportStatusEnum.WAITING,
          InnovationSupportStatusEnum.UNSUITABLE
        ];

      case InnovationSupportStatusEnum.WAITING:
        return [
          InnovationSupportStatusEnum.ENGAGING,
          InnovationSupportStatusEnum.CLOSED,
          InnovationSupportStatusEnum.UNSUITABLE
        ];

      case InnovationSupportStatusEnum.ENGAGING:
        return [
          InnovationSupportStatusEnum.WAITING,
          InnovationSupportStatusEnum.CLOSED,
          InnovationSupportStatusEnum.UNSUITABLE
        ];

      case InnovationSupportStatusEnum.CLOSED:
      case InnovationSupportStatusEnum.UNSUITABLE:
      default:
        return [];
    }
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

  private async getSuggestedUnitsSupportInfoMap(
    innovationId: string,
    em: EntityManager
  ): Promise<Map<string, UnitSupportInformationType>> {
    const unitsSupportInformation: UnitSupportInformationType[] = await em.query(
      `
      SELECT s.id, s.status, s.updated_at as updatedAt, ou.id as unitId, ou.name as unitName, org.id as orgId, org.acronym as orgAcronym, t.startSupport, t.endSupport,
      (SELECT MIN(started_at) FROM innovation_support WHERE innovation_id = @0 AND organisation_unit_id = ou.id) as minStartSupport
      FROM innovation_support s
      INNER JOIN organisation_unit ou ON ou.id = s.organisation_unit_id
      INNER JOIN organisation org ON org.id = ou.organisation_id
      LEFT JOIN (
          SELECT innovation_id, organisation_unit_id, MIN(valid_from) as startSupport, MAX(valid_to) as endSupport
          FROM innovation_support
          FOR SYSTEM_TIME ALL
          WHERE innovation_id = @0 AND (status IN ('ENGAGING'))
          GROUP BY innovation_id, organisation_unit_id
      ) t ON t.innovation_id = s.innovation_id AND t.organisation_unit_id = s.organisation_unit_id
      WHERE s.innovation_id = @0 AND s.is_most_recent = 1
      ORDER BY DATEPART(year, COALESCE(t.startSupport, s.updated_at)) DESC, DATEPART(month, COALESCE(t.startSupport, s.updated_at)) DESC, ou.name ASC
    `,
      [innovationId]
    );

    return new Map(unitsSupportInformation.map(support => [support.unitId, support]));
  }

  private async hasActiveSupport(
    innovationId: string,
    organisationUnitId: string,
    entityManager: EntityManager
  ): Promise<boolean> {
    const activeSupport = await entityManager
      .createQueryBuilder(InnovationSupportEntity, 'support')
      .where('support.innovation.id = :innovationId', { innovationId })
      .andWhere('support.organisation_unit_id = :organisationUnitId', { organisationUnitId })
      .andWhere('support.status NOT IN (:...statuses)', {
        statuses: [InnovationSupportStatusEnum.CLOSED, InnovationSupportStatusEnum.UNSUITABLE]
      })
      .andWhere('support.isMostRecent = 1')
      .getOne();

    return !!activeSupport;
  }
}
