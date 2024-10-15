import { inject, injectable } from 'inversify';
import type { EntityManager, SelectQueryBuilder } from 'typeorm';
import { Brackets, In } from 'typeorm';

import type { InnovationAssessmentEntity } from '@innovations/shared/entities';
import {
  ActivityLogEntity,
  InnovationDocumentDraftEntity,
  InnovationDocumentEntity,
  InnovationEntity,
  InnovationExportRequestEntity,
  InnovationListView,
  InnovationSectionEntity,
  InnovationSupportEntity,
  InnovationTaskEntity,
  LastSupportStatusViewEntity,
  NotificationEntity,
  NotificationUserEntity,
  OrganisationEntity,
  OrganisationUnitEntity,
  UserEntity,
  UserRoleEntity
} from '@innovations/shared/entities';
import {
  ActivityEnum,
  type ActivityTypeEnum,
  InnovationCollaboratorStatusEnum,
  InnovationExportRequestStatusEnum,
  type InnovationGroupedStatusEnum,
  InnovationSectionStatusEnum,
  InnovationStatusEnum,
  InnovationSupportCloseReasonEnum,
  InnovationSupportStatusEnum,
  InnovationTaskStatusEnum,
  NotifierTypeEnum,
  type PhoneUserPreferenceEnum,
  ServiceRoleEnum,
  UserStatusEnum
} from '@innovations/shared/enums';
import {
  BadRequestError,
  GenericErrorsEnum,
  InnovationErrorsEnum,
  NotFoundError,
  NotImplementedError,
  OrganisationErrorsEnum,
  UnprocessableEntityError
} from '@innovations/shared/errors';
import type { PaginationQueryParamsType } from '@innovations/shared/helpers';
import { TranslationHelper } from '@innovations/shared/helpers';
import type { DomainUsersService } from '@innovations/shared/services';
import { DomainService, IRSchemaService, NotifierService } from '@innovations/shared/services';
import {
  type ActivityLogListParamsType,
  type DomainContextType,
  isAccessorDomainContextType,
  isAdminDomainContextType,
  isAssessmentDomainContextType
} from '@innovations/shared/types';

import {
  type InnovationRelevantOrganisationsStatusEnum,
  InnovationSupportLogTypeEnum
} from '@innovations/shared/enums';
import { InnovationLocationEnum } from '../_enums/innovation.enums';
import type { InnovationSectionModel } from '../_types/innovation.types';

import { InnovationRelevantOrganisationsStatusView } from '@innovations/shared/entities';
import { createDocumentFromInnovation } from '@innovations/shared/entities/innovation/innovation-document.entity';
import type { InnovationListViewWithoutNull } from '@innovations/shared/entities/views/innovation-progress.view.entity';
import { InnovationProgressView } from '@innovations/shared/entities/views/innovation-progress.view.entity';
import { CurrentCatalogTypes } from '@innovations/shared/schemas/innovation-record';
import { ActionEnum } from '@innovations/shared/services/integrations/audit.service';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import { groupBy, isString, mapValues, omit, pick, snakeCase } from 'lodash';
import { BaseService } from './base.service';
import { InnovationDocumentService } from './innovation-document.service';
import { InnovationSupportsService } from './innovation-supports.service';
import SYMBOLS from './symbols';

// TODO move types
export const InnovationListSelectType = [
  'id',
  'name',
  'status',
  'statusUpdatedAt',
  'groupedStatus',
  'submittedAt',
  'updatedAt',
  'lastAssessmentRequestAt',
  // Document fields
  'careSettings',
  'categories',
  'countryName',
  'diseasesAndConditions',
  'involvedAACProgrammes',
  'keyHealthInequalities',
  'mainCategory',
  'otherCareSetting',
  'otherCategoryDescription',
  'postcode',
  // Relation fields
  'assessment.id',
  'assessment.majorVersion',
  'assessment.minorVersion',
  'assessment.isExempt',
  'assessment.assignedTo',
  'assessment.updatedAt',
  'assessment.finishedAt',
  'engagingOrganisations',
  'engagingUnits',
  // NOTE: The suggestion is always related to the unit from the QA accessing
  'suggestion.suggestedBy',
  'suggestion.suggestedOn',
  'support.id',
  'support.status',
  'support.updatedAt',
  'support.updatedBy',
  'support.closeReason',
  'owner.id',
  'owner.name',
  'owner.companyName',
  'statistics.notifications',
  'statistics.tasks',
  'statistics.messages'
] as const;
type InnovationListViewFields = Omit<InnovationListView, 'assessment' | 'supports' | 'ownerId'>;
export type InnovationListSelectType =
  | keyof InnovationListViewFields
  | `assessment.${keyof Pick<InnovationAssessmentEntity, 'id' | 'updatedAt' | 'finishedAt'>}`
  | 'assessment.assignedTo'
  | 'assessment.isExempt'
  | `support.${keyof Pick<InnovationSupportEntity, 'id' | 'status' | 'updatedAt' | 'updatedBy' | 'closeReason'>}`
  | 'owner.id'
  | 'owner.name'
  | 'owner.companyName'
  | 'suggestion.suggestedBy'
  | 'suggestion.suggestedOn'
  | 'statistics.notifications'
  | 'statistics.tasks'
  | 'statistics.messages';

export type InnovationListFullResponseType = Omit<InnovationListViewFields, 'engagingUnits'> & {
  assessment: { id: string } | null;
  engagingUnits:
    | (Omit<NonNullable<InnovationListView['engagingUnits']>[number], 'assignedAccessors'> & {
        assignedAccessors: UserWithRoleDTO[] | null;
      })[]
    | null;
  support: {
    status: InnovationSupportStatusEnum;
    updatedAt: Date | null;
    updatedBy: string | null;
    closeReason: InnovationSupportCloseReasonEnum | null;
  } | null;
  suggestion: {
    suggestedBy: string[];
    suggestedOn: Date;
  } | null;
  owner: { id: string; name: string | null; companyName: string | null } | null;
  statistics: { notifications: number; tasks: number; messages: number };
};

type KeyPart<S> = S extends `${infer U}.${infer _D}` ? U : S;
export type InnovationListResponseType<S extends InnovationListSelectType, K extends KeyPart<S> = KeyPart<S>> = {
  [k in K]: InnovationListFullResponseType[k];
};

export const DateFilterFieldsType = [
  'lastAssessmentRequestAt',
  'submittedAt',
  'updatedAt',
  'support.updatedAt'
] as const;
export type DateFilterFieldsType = (typeof DateFilterFieldsType)[number];

export const HasAccessThroughKeys = ['owner', 'collaborator'] as const;
export type HasAccessThroughKeys = (typeof HasAccessThroughKeys)[number];

export type InnovationListFilters = {
  assignedToMe?: boolean;
  careSettings?: CurrentCatalogTypes.catalogCareSettings[];
  categories?: CurrentCatalogTypes.catalogCategory[];
  dateFilters?: { field: DateFilterFieldsType; startDate?: Date; endDate?: Date }[];
  diseasesAndConditions: string[];
  engagingOrganisations?: string[];
  engagingUnits?: string[];
  groupedStatuses: InnovationGroupedStatusEnum[];
  hasAccessThrough?: HasAccessThroughKeys[];
  involvedAACProgrammes?: CurrentCatalogTypes.catalogInvolvedAACProgrammes[];
  keyHealthInequalities?: CurrentCatalogTypes.catalogKeyHealthInequalities[];
  latestWorkedByMe?: boolean;
  locations?: InnovationLocationEnum[];
  search?: string;
  suggestedOnly?: boolean;
  supportStatuses?: InnovationSupportStatusEnum[];
  supportUnit?: string;
  closedByMyOrganisation?: boolean;
};

// Join types are the ones with nested selectable objects
type InnovationListJoinTypes = InnovationListSelectType extends infer X
  ? X extends `${infer U}.${infer _D}`
    ? U
    : never
  : never;

type InnovationListChildrenType<T extends InnovationListJoinTypes> = InnovationListSelectType extends infer X
  ? X extends `${T}.${infer D}`
    ? D
    : never
  : never;

type PickHandlerReturnType<T extends { [k: string]: any }, K extends keyof T> = {
  [k in K]: Awaited<ReturnType<T[k]>>;
};

type UserWithRoleDTO = { id: string; name: string | null }; // role: ServiceRoleEnum }; // the role ain't used yet

@injectable()
export class InnovationsService extends BaseService {
  constructor(
    @inject(SHARED_SYMBOLS.DomainService) private domainService: DomainService,
    @inject(SHARED_SYMBOLS.NotifierService) private notifierService: NotifierService,
    @inject(SHARED_SYMBOLS.IRSchemaService) private irSchemaService: IRSchemaService,
    @inject(SYMBOLS.InnovationSupportsService) private innovationSupportsService: InnovationSupportsService,
    @inject(SYMBOLS.InnovationDocumentService) private innovationDocumentService: InnovationDocumentService
  ) {
    super();
  }

  async archiveInnovation(
    domainContext: DomainContextType,
    innovationId: string,
    data: { message: string },
    entityManager?: EntityManager
  ): Promise<void> {
    const em = entityManager ?? this.sqlConnection.manager;

    const archivedInnovations = await this.domainService.innovations.archiveInnovations(
      domainContext,
      [{ id: innovationId, reason: data.message }],
      em
    );

    for (const innovation of archivedInnovations) {
      await this.notifierService.send(domainContext, NotifierTypeEnum.INNOVATION_ARCHIVE, {
        innovationId: innovation.id,
        message: innovation.reason,
        previousStatus: innovation.prevStatus,
        reassessment: innovation.isReassessment,
        affectedUsers: innovation.affectedUsers
      });
    }
  }

  //#region innovationsListNew
  /**
   * graph like method to return list information
   * This is a new version that leverages the innovation_list_view to retrieve most information in a effective way.
   * It's strongly typed and allows fetching only partials of the nested objects
   *
   * Supports requires a different approach since it depends on user to fetch and isn't necessarily part of the view
   *
   * @param domainContext the user making the request
   * @param params parameters for the query:
   *  - fields: the fields to return (supports dotted children)
   *  - pagination: the pagination parameters supports multiple orderBys
   *    - orderBy postHandled fields isn't allowed (ie: statistics, owner.name). This isn't being validated yet
   *  - filters: the filters to apply
   * @param em optional entity manager
   * @returns list of innovations with only the selected fields
   */
  async getInnovationsList<S extends InnovationListSelectType>(
    domainContext: DomainContextType,
    params: {
      fields: S[];
      pagination: PaginationQueryParamsType<S>;
      filters?: InnovationListFilters;
    },
    em?: EntityManager
  ): Promise<{ count: number; data: InnovationListResponseType<S>[] }> {
    // TODO allow selection within JSON fields, ie: only fetch engagingOrganisations.organisationId

    // Some sanity checks
    if (!params.fields.length) {
      return { count: 0, data: [] };
    }
    // Ensure that the sort field is one of the fields
    Object.keys(params.pagination.order).forEach(key => {
      if (!params.fields.includes(key as S)) {
        throw new BadRequestError(GenericErrorsEnum.INVALID_PAYLOAD, {
          message: `Invalid sort field ${key} missing from fields`
        });
      }
    });
    // Ensure that we aren't filtering by owner name as it's not supported (joi is validating this, didn't spend much time getting the pagination type to work with Omit)
    if (Object.keys(params.pagination.order).includes('owner.name')) {
      throw new BadRequestError(GenericErrorsEnum.INVALID_PAYLOAD, {
        message: 'Invalid sort field owner.name not supported'
      });
    }

    const nestedObjects = new Set(
      params.fields
        .filter(item => item.includes('.'))
        .map(item => item.split('.')[0])
        .filter(isString) // remove undefined
    );
    const fieldGroups = mapValues(
      groupBy(params.fields, item => item.split('.')[0]),
      v => v.map(item => item.split('.')[1] ?? null)
    );

    const connection = em ?? this.sqlConnection.manager;
    const query = connection
      .createQueryBuilder(InnovationListView, 'innovation')
      // currently I'm only handling the root selects here, might change in the future. ie: withSupports add the selects
      .select(params.fields.filter(item => !item.includes('.')).map(item => `innovation.${item}`));

    // Special role constraints (maybe make handler in the future)
    if (isAccessorDomainContextType(domainContext)) {
      // support is required for A/QAs access check
      if (!nestedObjects.has('support')) {
        nestedObjects.add('support');
      }

      // Because of the many to many relationship I need to do a custom join to get the shares while keeping typeorm happy
      // The on condition must be on the relation table and not on the organisation one
      query
        .leftJoin(
          'innovation_share',
          'innovation_shares',
          'innovation_shares.innovation_id = innovation.id AND innovation_shares.organisation_id = :organisationId',
          {
            organisationId: domainContext.organisation.id
          }
        )
        .leftJoinAndMapMany(
          'innovation.organisationShares',
          'organisation',
          'shares',
          'shares.id = innovation_shares.organisation_id'
        )
        // Innovation list can have innovations that are shared or organisations that are not share that had a support in the past
        .andWhere(
          new Brackets(qb => {
            qb.where('innovation_shares.organisation_id IS NOT NULL').orWhere('support.id IS NOT NULL');
          })
        );

      // current rule is A/QA can see innovations that have had their first assessment
      query.andWhere('innovation.hasBeenAssessed = 1');

      // Accessors can only see innovations that they are supporting
      if (domainContext.currentRole.role === ServiceRoleEnum.ACCESSOR) {
        query.andWhere('support.status IN (:...accessorSupportStatusFilter)', {
          accessorSupportStatusFilter: [InnovationSupportStatusEnum.ENGAGING, InnovationSupportStatusEnum.CLOSED]
        });
      }
    }

    if (isAssessmentDomainContextType(domainContext)) {
      query.andWhere(
        '(innovation.status IN (:...assessmentInnovationStatus) OR innovation.archivedStatus IN (:...assessmentInnovationStatus))',
        {
          assessmentInnovationStatus: [
            InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT,
            InnovationStatusEnum.NEEDS_ASSESSMENT,
            InnovationStatusEnum.IN_PROGRESS
          ]
        }
      );
    }

    // Exclude withdrawn innovations from non admin users (at least for now). This state is still present for old innovations
    // but no longer used
    if (!isAdminDomainContextType(domainContext)) {
      query.andWhere('innovation.status != :deletedStatus', { deletedStatus: InnovationStatusEnum.WITHDRAWN });
    }

    // Nested object handlers and joins
    nestedObjects.forEach(join => {
      this.joinHandlers[join as keyof typeof this.joinHandlers](
        domainContext,
        query,
        fieldGroups[join] as any[],
        params.filters
      );
    });

    // filters
    for (const [key, value] of Object.entries(params.filters ?? {})) {
      // add to do a as any for the filters as the value was evaluated as never but this should be safe to use
      await (this.filtersHandlers[key as keyof typeof this.filtersHandlers] as any)(domainContext, query, value, {
        pagination: params.pagination
      });
    }

    // pagination and sorting (TODO create a function for this as it's getting more complex)
    query.skip(params.pagination.skip);
    query.take(params.pagination.take);
    Object.entries(params.pagination.order).forEach(([key, value]) => {
      if (value === 'ASC' || value === 'DESC') {
        // Special case for orders we might improve this in the future if it becomes the norm
        if (key.startsWith('owner.')) {
          key = 'owner' + key.split('.')[1]?.charAt(0).toUpperCase() + key.split('.')[1]?.slice(1);
        }
        switch (key) {
          case 'owner.name':
          case 'support.updatedBy':
            throw new NotImplementedError(GenericErrorsEnum.NOT_IMPLEMENTED_ERROR, {
              message: 'Sort by name is not allowed'
            });

          default:
            query.addOrderBy(key.includes('.') ? key : `innovation.${key}`, value);
        }
      }
    });

    const queryResult = await query.getManyAndCount();

    // postHandlers - optimize to only fetch once. This means that the fields handled here aren't sortable but it would
    // be really bad performant otherwise and for the names even worse.
    const needUsernameResolution =
      nestedObjects.has('owner') ||
      fieldGroups['engagingUnits'] ||
      fieldGroups['support']?.includes('updatedBy') ||
      fieldGroups['assessment']?.includes('assignedTo');

    const handlerMaps: {
      [k in keyof typeof this.postHandlers]: Awaited<ReturnType<(typeof this.postHandlers)[k]>>;
    } = {} as any; // initialization
    for (const key of Object.keys(this.postHandlers) as (keyof typeof this.postHandlers)[]) {
      const fields = fieldGroups[key];
      // users is "different" to allow it working with multiple cases (owner, engagingUnits, support.updatedby)
      // need to improve the user detection in the future to avoid this
      if (fields || (key === 'users' && needUsernameResolution)) {
        handlerMaps[key] = (await this.postHandlers[key as keyof typeof handlerMaps](
          domainContext,
          queryResult[0],
          fields as any, // should be safe since it's result from groupBy
          connection
        )) as any;
      } else {
        new Map();
      }
    }

    // Transform the entity into the response DTO
    return {
      count: queryResult[1],
      data: queryResult[0].map(item => {
        const res = {} as any;
        Object.entries(fieldGroups).forEach(([key, value]) => {
          if (key in this.displayHandlers) {
            const handler = this.displayHandlers[key as keyof typeof this.displayHandlers];
            if (handler) {
              res[key] = handler(item, value as any[], handlerMaps); // this any should be safe since it comes from the groupBy
            }
          } else {
            // Handle plain object directly from the view
            res[key] = item[key as keyof InnovationListView];
          }
        });

        // Extra postProcessing the items if required (this might become handlers in the future, keeping a function for now)
        return isAccessorDomainContextType(domainContext) && item.organisationShares?.length === 0
          ? this.cleanupAccessorsNotSharedInnovation(res)
          : res;
      })
    };
  }

  //#region join handlers
  // Nested object handlers / joins
  private readonly joinHandlers: {
    [k in InnovationListJoinTypes]: (
      domainContext: DomainContextType,
      query: SelectQueryBuilder<InnovationListView>,
      value: InnovationListChildrenType<k> | any,
      filters?: Partial<InnovationListFilters>
    ) => void;
  } = {
    assessment: this.withAssessment.bind(this),
    owner: this.withOwner.bind(this),
    support: this.withSupport.bind(this),
    suggestion: this.withSuggestion.bind(this),
    statistics: () => {}
  };

  private withAssessment(
    _domainContext: DomainContextType,
    query: SelectQueryBuilder<InnovationListView>,
    fields: InnovationListChildrenType<'assessment'>[] = ['id']
  ): void {
    if (fields.length) {
      query
        .addSelect(fields.filter(f => !['assignedTo', 'isExempt'].includes(f)).map(f => `assessment.${f}`))
        .leftJoin('innovation.currentAssessment', 'assessment');

      if (fields.includes('assignedTo')) {
        query.leftJoin('assessment.assignTo', 'assessor');
        query.addSelect('assessor.id');
        // Special case when we only have the assessBy to preserve typeorm model
        if (fields.length === 1) {
          query.addSelect('assessment.id');
        }
      }

      if (fields.includes('isExempt')) {
        query.addSelect('assessment.exemptedAt');
      }
    }
  }

  private withOwner(
    _domainContext: DomainContextType,
    query: SelectQueryBuilder<InnovationListView>,
    fields: InnovationListChildrenType<'owner'>[] = ['id']
  ): void {
    if (fields.length) {
      query.addSelect([
        'innovation.ownerId',
        ...(fields.includes('companyName') ? ['innovation.ownerCompanyName'] : [])
      ]);
    }
  }

  private withSupport(
    domainContext: DomainContextType,
    query: SelectQueryBuilder<InnovationListView>,
    fields: InnovationListChildrenType<'support'>[] = ['id'],
    filters?: Partial<InnovationListFilters>
  ): void {
    if (fields.length) {
      const unitId = isAccessorDomainContextType(domainContext)
        ? domainContext.organisation.organisationUnit.id
        : isAdminDomainContextType(domainContext) && filters?.supportUnit
          ? filters.supportUnit
          : null;

      if (!unitId) {
        throw new BadRequestError(GenericErrorsEnum.INVALID_PAYLOAD, {
          message: 'Support is only valid for accessor domain context or admin with one engagingOrganisationUnit'
        });
      }

      query
        .addSelect((fields ?? ['id']).map(f => `support.${f}`))
        .leftJoin(
          'innovation.supports',
          'support',
          'support.organisation_unit_id = :organisationUnitId AND support.isMostRecent = 1',
          { organisationUnitId: unitId }
        )
        // Ignore archived innovations that never had any support or it would be messing with the status and support summary
        .andWhere('(innovation.status != :innovationArchivedStatus OR support.id IS NOT NULL) ', {
          innovationArchivedStatus: InnovationStatusEnum.ARCHIVED
        });

      // updated by also depends on the innovation and support status
      if (fields.includes('updatedBy')) {
        if (!query.expressionMap.selects.some(s => s.selection === 'innovation.status')) {
          query.addSelect('innovation.status');
        }
        if (!fields.includes('status')) {
          query.addSelect('support.status');
        }
      }
    }
  }

  private withSuggestion(
    domainContext: DomainContextType,
    query: SelectQueryBuilder<InnovationListView>,
    fields: InnovationListChildrenType<'suggestion'>[] = ['suggestedBy', 'suggestedOn'],
    _filters?: Partial<InnovationListFilters>
  ): void {
    if (fields.length) {
      const unitId = isAccessorDomainContextType(domainContext) ? domainContext.organisation.organisationUnit.id : null;

      if (!unitId) {
        throw new BadRequestError(GenericErrorsEnum.INVALID_PAYLOAD, {
          message: 'Suggestion is only valid for accessor domain context'
        });
      }

      query
        .addSelect(fields.map(f => `suggestion.${f}`))
        .leftJoin('innovation.suggestions', 'suggestion', 'suggestion.suggested_unit_id = :requestUnitId', {
          requestUnitId: unitId
        });
    }
  }
  //#endregion

  //#region post handlers
  private readonly postHandlers = {
    statistics: this.withStatistics.bind(this),
    users: this.withUsers.bind(this)
  };

  // Maybe create a view for this in the future so it's reusable in other places...
  private statisticsMap: {
    [k in InnovationListChildrenType<'statistics'>]: string;
  } = {
    notifications: 'count(*)',
    messages: "COUNT(case when context_type='MESSAGES' then 1 end)",
    tasks:
      "COUNT(case when context_detail IN ('TA01_TASK_CREATION_TO_INNOVATOR', 'TA06_TASK_REOPEN_TO_INNOVATOR') then 1 end)"
  };
  private async withStatistics(
    domainContext: DomainContextType,
    innovations: InnovationListView[],
    fields: InnovationListChildrenType<'statistics'>[],
    entityManager: EntityManager
  ): Promise<Map<string, { [k in (typeof fields)[number]]: number }>> {
    if (innovations.length ?? fields.length) {
      const query = entityManager
        .createQueryBuilder('notification', 'notification')
        .select('notification.innovation_id', 'innovationId')
        .innerJoin('notification_user', 'user', 'notification.id = user.notification_id')
        .where('user.user_role_id = :domainContextRoleId', { domainContextRoleId: domainContext.currentRole.id })
        .andWhere('notification.innovation_id IN (:...handlerInnovationIds)', {
          handlerInnovationIds: innovations.map(i => i.id)
        })
        .andWhere('user.read_at IS NULL')
        .groupBy('notification.innovation_id');

      fields.forEach(field => {
        query.addSelect(this.statisticsMap[field], field);
      });

      return new Map((await query.getRawMany()).map(item => [item.innovationId, item] as const));
    } else {
      return new Map();
    }
  }

  private async withUsers(
    _domainContext: DomainContextType,
    innovations: InnovationListView[],
    _fields: unknown[],
    _entityManager: EntityManager
  ): ReturnType<DomainUsersService['getUsersMap']> {
    const usersSet = new Set<string>();
    // Add the owners and the engaging units accessors
    innovations.forEach(i => {
      // We need to resolve the innovation owner name, assessment assigned to, the supports updatedBy (for the closedBy) and the engaging units accessors
      [
        i.ownerId,
        i.supports?.[0]?.updatedBy,
        i.currentAssessment?.assignTo?.id,
        ...(i.engagingUnits?.flatMap(u => u.assignedAccessors) || [])
      ]
        .filter(isString)
        .forEach(u => {
          usersSet.add(u);
        });
    });
    return this.domainService.users.getUsersMap({
      userIds: [...usersSet]
    });
  }

  //#endregion

  //#region filter handlers
  private readonly filtersHandlers: {
    [k in keyof Required<InnovationListFilters>]:
      | ((
          domainContext: DomainContextType,
          query: SelectQueryBuilder<InnovationListView>,
          value: Required<InnovationListFilters>[k],
          options?: { pagination: PaginationQueryParamsType<InnovationListSelectType> }
        ) => void | Promise<void>)
      | ((
          domainContext: DomainContextType,
          query: SelectQueryBuilder<InnovationListView>,
          value: Required<InnovationListFilters>[k][],
          options?: { pagination: PaginationQueryParamsType<InnovationListSelectType> }
        ) => void | Promise<void>);
  } = {
    assignedToMe: this.addAssignedToMeFilter.bind(this),
    careSettings: this.addJsonArrayInFilter('careSettings').bind(this),
    categories: this.addJsonArrayInFilter('categories').bind(this),
    closedByMyOrganisation: this.addClosedByMyOrganisationFilters.bind(this),
    dateFilters: this.addDateFilters.bind(this),
    diseasesAndConditions: this.addJsonArrayInFilter('diseasesAndConditions').bind(this),
    engagingOrganisations: this.addJsonArrayInFilter('engagingOrganisations', {
      fieldSelector: '$.organisationId'
    }).bind(this),
    engagingUnits: this.addJsonArrayInFilter('engagingUnits', {
      fieldSelector: '$.unitId'
    }).bind(this),
    groupedStatuses: this.addInFilter('groupedStatuses', 'groupedStatus').bind(this),
    hasAccessThrough: this.addHasAccessThroughFilters.bind(this),
    involvedAACProgrammes: this.addJsonArrayInFilter('involvedAACProgrammes').bind(this),
    keyHealthInequalities: this.addJsonArrayInFilter('keyHealthInequalities').bind(this),
    latestWorkedByMe: this.addLatestWorkedByMeFilter.bind(this),
    locations: this.addLocationFilter.bind(this),
    search: this.addSearchFilter.bind(this),
    suggestedOnly: this.addSuggestedOnlyFilter.bind(this),
    supportStatuses: this.addSupportFilter.bind(this),
    supportUnit: () => {} // this is handled in the withSupport handler for admin users and forbidden otherwise
  };

  /**
   * adds a filter that searches for a value in the json arrays of the innovation list
   * @param filterKey the filter key to use in the query
   * @param options optional options
   * - fieldSelector optional selector to use in the json search (defaults to undefined for simple arrays)
   * - column the array column to search (defaults to filterKey)
   * - noValue the value for the option being not selected (defaults to undefined). If this is defined rows with null will match
   * @returns filter handler function
   */
  private addJsonArrayInFilter<
    FilterKey extends keyof InnovationListFilters,
    FilterValue extends Required<InnovationListFilters[FilterKey]>,
    FilterValues extends FilterValue extends unknown[]
      ? FilterValue
      : FilterValue extends true | false // hackish because type script would make it true[] or false[] otherwise
        ? boolean[]
        : FilterValue[]
  >(
    filterKey: FilterKey,
    options?: {
      fieldSelector?: string;
      column?: string;
      noValue?: Exclude<FilterValues[number], undefined>;
    }
  ): (_domainContext: DomainContextType, query: SelectQueryBuilder<InnovationListView>, value: FilterValues) => void {
    return (_domainContext: DomainContextType, query: SelectQueryBuilder<InnovationListView>, values: FilterValues) => {
      const column = options?.column ?? snakeCase(filterKey);
      if (values.length) {
        const valueField = options?.fieldSelector ? `JSON_VALUE(value, '${options?.fieldSelector}')` : 'value';
        const valueVariable = `${filterKey}Value`; // this is here to ensure uniqueness of the variable name
        if (options?.noValue && values.includes(options.noValue as any)) {
          // this is a case where we want the no filter option to match the null value also
          query.andWhere(
            `(${column} IS NULL OR EXISTS(SELECT 1 FROM OPENJSON(${column}) WHERE ${valueField} IN(:...${valueVariable}) OR ${valueField} IS NULL))`,
            {
              [valueVariable]: values
            }
          );
        } else {
          query.andWhere(`EXISTS(SELECT 1 FROM OPENJSON(${column}) WHERE ${valueField} IN(:...${valueVariable}))`, {
            [valueVariable]: values
          });
        }
      }
    };
  }

  /**
   * adds a filter that searchs for a value in a column
   * @param filterKey the filter key to use in the query
   * @param column the array column to search (defaults to filterKey)
   * @returns filter handler function
   */
  private addInFilter<FilterKey extends keyof InnovationListFilters>(
    filterKey: FilterKey,
    column: string = snakeCase(filterKey)
  ): (_domainContext: DomainContextType, query: SelectQueryBuilder<InnovationListView>, value: any[]) => void {
    return (_domainContext: DomainContextType, query: SelectQueryBuilder<InnovationListView>, values: any[]) => {
      if (values.length) {
        const col = column.includes('.') ? column : `innovation.${column}`;
        const valueVariable = `${filterKey}Value`; // this is here to ensure uniqueness of the variable name
        query.andWhere(`${col} IN (:...${valueVariable})`, { [valueVariable]: values });
      }
    };
  }

  private addAssignedToMeFilter(
    domainContext: DomainContextType,
    query: SelectQueryBuilder<InnovationListView>,
    value: boolean
  ): void {
    if (value) {
      if (isAccessorDomainContextType(domainContext)) {
        // sanity check to ensure we're joining with the support
        if (!query.expressionMap.aliases.find(item => item.name === 'support')) {
          this.withSupport(domainContext, query);
        }
        query.innerJoin('support.userRoles', 'supportUserRoles').andWhere('supportUserRoles.id = :userRoleId', {
          userRoleId: domainContext.currentRole.id
        });
      }
      if (isAssessmentDomainContextType(domainContext)) {
        if (!query.expressionMap.aliases.find(item => item.name === 'assessment')) {
          this.withAssessment(domainContext, query);
        }
        query
          .innerJoin(
            'user_role',
            'assessmentRole',
            'assessmentRole.user_id = assessment.assign_to_id AND assessmentRole.role = :assessmentRole AND assessmentRole.is_active = 1',
            { assessmentRole: ServiceRoleEnum.ASSESSMENT }
          )
          .andWhere('assessment.assign_to_id = :assessmentRoleUserId', {
            assessmentRoleUserId: domainContext.id
          });
      }
      // Choose to do nothing instead of throwing an error if this is passed when not supposed (joi should handle it)
      // but as a behavior think it's better to ignore the filter than to throw an error
    }
  }

  private addHasAccessThroughFilters(
    domainContext: DomainContextType,
    query: SelectQueryBuilder<InnovationListView>,
    hasAccessThrough: HasAccessThroughKeys[]
  ): void {
    if (hasAccessThrough.length) {
      query.andWhere(
        new Brackets(qb => {
          if (hasAccessThrough.includes('owner')) {
            qb.orWhere('innovation.ownerId = :userId', { userId: domainContext.id });
          }
          if (hasAccessThrough.includes('collaborator')) {
            qb.orWhere(
              'innovation.id IN (SELECT innovation_id FROM innovation_collaborator WHERE user_id = :userId AND status = :collaboratorActiveStatus AND deleted_at IS NULL)',
              {
                userId: domainContext.id,
                collaboratorActiveStatus: InnovationCollaboratorStatusEnum.ACTIVE
              }
            );
          }
        })
      );
    }
  }

  private addLatestWorkedByMeFilter(
    domainContext: DomainContextType,
    query: SelectQueryBuilder<InnovationListView>,
    latestWorkedByMe: boolean,
    options?: { pagination: PaginationQueryParamsType<InnovationListSelectType> }
  ): void {
    if (latestWorkedByMe) {
      query.andWhere(
        'innovation.id IN (SELECT innovation_id FROM audit WHERE user_id=:userId AND action IN (:...actions) GROUP BY innovation_id ORDER BY MAX(date) DESC OFFSET :offset ROWS FETCH NEXT :fetch ROWS ONLY)',
        {
          userId: domainContext.id,
          actions: [ActionEnum.CREATE, ActionEnum.UPDATE],
          offset: options?.pagination.skip,
          fetch: options?.pagination.take
        }
      );
    }
  }

  private addLocationFilter(
    _domainContext: DomainContextType,
    query: SelectQueryBuilder<InnovationListView>,
    locations: InnovationLocationEnum[]
  ): void {
    if (locations.length) {
      query.andWhere(
        new Brackets(qb => {
          if (locations.includes(InnovationLocationEnum['Based outside UK'])) {
            qb.orWhere('innovation.countryName NOT IN (:...ukLocations)', {
              ukLocations: [
                InnovationLocationEnum.England,
                InnovationLocationEnum['Northern Ireland'],
                InnovationLocationEnum.Scotland,
                InnovationLocationEnum.Wales
              ]
            });
          }
          const ukLocationsSelect = locations.filter(l => l !== InnovationLocationEnum['Based outside UK']);
          if (ukLocationsSelect.length) {
            qb.orWhere('innovation.countryName IN (:...ukLocationsSelect)', { ukLocationsSelect });
          }
        })
      );
    }
  }

  private async addSearchFilter(
    domainContext: DomainContextType,
    query: SelectQueryBuilder<InnovationListView>,
    search: string
  ): Promise<void> {
    if (search) {
      // Admins can search by email (full match search)
      const targetUser =
        domainContext.currentRole.role === ServiceRoleEnum.ADMIN && search.match(/^\S+@\S+$/)
          ? await this.domainService.users.getUserByEmail(search)
          : null;
      query.andWhere(
        new Brackets(async qb => {
          qb.where('innovation.name LIKE :search', { search: `%${search}%` });
          // Admins can search by email (full match search)
          if (targetUser?.length && targetUser[0]) {
            qb.orWhere('innovation.owner_id = :userId', {
              userId: targetUser[0].id
            });
          }
          // Company search will be added here when the story arrives
          qb.orWhere('innovation.ownerCompanyName LIKE :search', { search: `%${search}%` });
        })
      );
    }
  }

  private addSuggestedOnlyFilter(
    domainContext: DomainContextType,
    query: SelectQueryBuilder<InnovationListView>,
    value: boolean
  ): void {
    // TODO this will be changed in a future story as the logic for suggested will be updated
    if (value && isAccessorDomainContextType(domainContext)) {
      query
        .innerJoin('innovation', 'i', 'i.id = innovation.id')
        .leftJoin('i.currentAssessment', 'assessments')

        .leftJoin('assessments.organisationUnits', 'assessmentOrganisationUnits')
        .leftJoin('i.innovationSupportLogs', 'supportLogs', 'supportLogs.type = :supportLogType', {
          supportLogType: InnovationSupportLogTypeEnum.ACCESSOR_SUGGESTION
        })
        .leftJoin('supportLogs.suggestedOrganisationUnits', 'supportLogOrgUnit')
        .andWhere(
          `(assessmentOrganisationUnits.id = :suggestedOrganisationUnitId OR supportLogOrgUnit.id =:suggestedOrganisationUnitId)`,
          { suggestedOrganisationUnitId: domainContext.organisation.organisationUnit.id }
        );
    }
  }

  private addSupportFilter(
    domainContext: DomainContextType,
    query: SelectQueryBuilder<InnovationListView>,
    supportStatuses: InnovationSupportStatusEnum[]
  ): void {
    if (supportStatuses.length) {
      // sanity check to ensure we're joining with the support
      if (!query.expressionMap.aliases.find(item => item.name === 'support')) {
        this.withSupport(domainContext, query);
      }
      query.andWhere('support.status IN (:...supportStatuses)', { supportStatuses: supportStatuses });
    }
  }

  private addClosedByMyOrganisationFilters(
    domainContext: DomainContextType,
    query: SelectQueryBuilder<InnovationListView>,
    value: boolean
  ): void {
    if (value && isAccessorDomainContextType(domainContext)) {
      query.andWhere('support.closeReason = :closeReason', {
        closeReason: InnovationSupportCloseReasonEnum.SUPPORT_COMPLETE
      });
    }
  }

  private addDateFilters(
    domainContext: DomainContextType,
    query: SelectQueryBuilder<InnovationListView>,
    dateFilters: { field: DateFilterFieldsType; startDate?: Date; endDate?: Date }[]
  ): void {
    if (dateFilters && dateFilters.length > 0) {
      if (
        dateFilters.some(({ field }) => field.includes('support')) &&
        !query.expressionMap.aliases.find(item => item.name === 'support')
      ) {
        this.withSupport(domainContext, query);
      }

      for (const filter of dateFilters) {
        const filterKey = !filter.field.includes('.') ? `innovation.${filter.field}` : filter.field;

        if (filter.startDate) {
          query.andWhere(`${filterKey} >= :startDate`, { startDate: filter.startDate });
        }

        if (filter.endDate) {
          // This is needed because default TimeStamp for a DD/MM/YYYY date is 00:00:00
          const beforeDateWithTimestamp = new Date(filter.endDate);
          beforeDateWithTimestamp.setDate(beforeDateWithTimestamp.getDate() + 1);

          query.andWhere(`${filterKey} < :endDate`, { endDate: beforeDateWithTimestamp });
        }
      }
    }
  }
  //#endregion

  //#region nested display handlers
  private displayHandlers: {
    [k in InnovationListJoinTypes | 'engagingUnits']: (
      // engagingUnits is a special case since it's not a join, this should become a "join" later but would imply further FE changes
      item: InnovationListView,
      fields: k extends InnovationListJoinTypes ? InnovationListChildrenType<k>[] : string[],
      postHandlers: { [k in keyof typeof this.postHandlers]: Awaited<ReturnType<(typeof this.postHandlers)[k]>> }
    ) => Partial<InnovationListFullResponseType[k]>;
  } = {
    assessment: this.displayAssessment.bind(this),
    engagingUnits: this.displayEngagingUnits.bind(this),
    support: this.displaySupport.bind(this),
    suggestion: this.displaySuggestion.bind(this),
    owner: this.displayOwner.bind(this),
    statistics: this.displayStatistics.bind(this) // Finish the display of statistics
  };

  private displayEngagingUnits(
    item: InnovationListView,
    _fields: string[],
    extra: PickHandlerReturnType<typeof this.postHandlers, 'users'>
  ): Partial<InnovationListFullResponseType['engagingUnits']> {
    // currently not doing any field selection, just replacing user names
    return (
      item.engagingUnits?.map(unit => ({
        acronym: unit.acronym,
        assignedAccessors:
          unit.assignedAccessors?.map(userId => ({
            id: userId,
            name: extra.users.get(userId)?.displayName ?? null
          })) ?? null,
        name: unit.name,
        unitId: unit.unitId
      })) || null
    );
  }

  private displayAssessment(
    item: InnovationListView,
    fields: InnovationListChildrenType<'assessment'>[],
    extra: PickHandlerReturnType<typeof this.postHandlers, 'users'>
  ): Partial<InnovationListFullResponseType['assessment']> {
    const res = {} as any;
    fields.forEach(field => {
      switch (field) {
        case 'assignedTo':
          res[field] = extra.users.get(item.currentAssessment?.assignTo?.id ?? '')?.displayName ?? null;
          break;
        case 'isExempt':
          res[field] = !!item.currentAssessment?.exemptedAt;
          break;
        default:
          res[field] = item.currentAssessment?.[field] ?? null;
      }
    });
    return res;
  }

  private displaySupport(
    item: InnovationListView,
    fields: InnovationListChildrenType<'support'>[],
    extra: PickHandlerReturnType<typeof this.postHandlers, 'users'>
  ): Partial<InnovationListFullResponseType['support']> {
    const support = item.supports?.[0];
    if (!support) return {};

    const updatedBy = extra.users?.get(support.updatedBy) ?? null;
    const displayName =
      // Ensuring that updatedBy is always innovator if the innovation is archived or not shared
      item.status === InnovationStatusEnum.ARCHIVED ||
      !item.organisationShares?.length ||
      // if the user has the innovator role (currently exclusive) as the updatedBy is not a role but user id and we can't
      // distinguish if there's multiple roles for the same user
      updatedBy?.roles.some(r => r.role === ServiceRoleEnum.INNOVATOR)
        ? 'Innovator'
        : (updatedBy?.displayName ?? null);

    // support is handled differently to remove the nested array since it's only 1 element in this case
    return {
      ...(fields.includes('id') && { id: support.id ?? null }),
      ...(fields.includes('status') && { status: support.status }),
      ...(fields.includes('updatedAt') && { updatedAt: support.updatedAt }),
      ...(fields.includes('updatedBy') && { updatedBy: displayName }),
      ...(fields.includes('closeReason') && { closeReason: support.closeReason })
    };
  }

  private displaySuggestion(
    item: InnovationListView,
    fields: InnovationListChildrenType<'suggestion'>[],
    _extra: PickHandlerReturnType<typeof this.postHandlers, 'users'>
  ): Partial<InnovationListFullResponseType['suggestion']> {
    const suggestion = item.suggestions?.shift();
    return suggestion
      ? {
          ...(fields.includes('suggestedBy') && { suggestedBy: suggestion.suggestedBy }),
          ...(fields.includes('suggestedOn') && { suggestedOn: suggestion.suggestedOn })
        }
      : null;
  }

  private displayOwner(
    item: InnovationListView,
    fields: InnovationListChildrenType<'owner'>[],
    extra: PickHandlerReturnType<typeof this.postHandlers, 'users'>
  ): Partial<InnovationListFullResponseType['owner']> {
    if (!item.ownerId) {
      return null;
    }
    return {
      ...(fields.includes('id') && { id: item.ownerId }),
      ...(fields.includes('name') && {
        name: extra.users.get(item.ownerId)?.displayName ?? null
      }),
      ...(fields.includes('companyName') && {
        companyName: item.ownerCompanyName ?? null
      })
    };
  }

  private displayStatistics(
    item: InnovationListView,
    fields: InnovationListChildrenType<'statistics'>[],
    extra: PickHandlerReturnType<typeof this.postHandlers, 'statistics'>
  ): Partial<InnovationListFullResponseType['statistics']> {
    return fields.reduce((acc, field) => {
      acc[field] = extra.statistics.get(item.id)?.[field] ?? 0;
      return acc;
    }, {} as any);
  }
  //#endregion
  //#endregion

  async getInnovationInfo(
    domainContext: DomainContextType,
    id: string,
    filters: { fields?: ('assessment' | 'supports')[] },
    entityManager?: EntityManager
  ): Promise<{
    id: string;
    name: string;
    description: null | string;
    version: string;
    status: InnovationStatusEnum;
    archivedStatus?: InnovationStatusEnum;
    groupedStatus: InnovationGroupedStatusEnum;
    hasBeenAssessed: boolean;
    statusUpdatedAt: Date;
    submittedAt: null | Date;
    countryName: null | string;
    postCode: null | string;
    categories: CurrentCatalogTypes.catalogCategory[];
    otherCategoryDescription: null | string;
    owner?: {
      id: string;
      name: string;
      email: string;
      contactByEmail: boolean;
      contactByPhone: boolean;
      contactByPhoneTimeframe: PhoneUserPreferenceEnum | null;
      contactDetails: string | null;
      mobilePhone: null | string;
      isActive: boolean;
      lastLoginAt?: null | Date;
      organisation?: { name: string; size: null | string; registrationNumber: null | string };
    };
    lastEndSupportAt: null | Date;
    assessment?: null | {
      id: string;
      majorVersion: number;
      minorVersion: number;
      createdAt: Date;
      finishedAt: null | Date;
      assignedTo?: { id: string; name: string; userRoleId: string };
      reassessmentCount: number;
    };
    supports?: { id: string; status: InnovationSupportStatusEnum; organisationUnitId: string }[];
    collaboratorId?: string;
    createdAt: Date;
  }> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const query = connection
      .createQueryBuilder(InnovationEntity, 'innovation')
      .select([
        'innovation.id',
        'innovation.name',
        'innovation.status',
        'innovation.statusUpdatedAt',
        'innovation.archivedStatus',
        'innovation.hasBeenAssessed',
        'innovation.lastAssessmentRequestAt',
        'innovation.createdAt',
        'innovationOwner.id',
        'innovationOwner.status',
        'innovationOwnerUserRole.id',
        'innovationOwnerOrganisation.isShadow',
        'innovationOwnerOrganisation.name',
        'innovationOwnerOrganisation.size',
        'innovationOwnerOrganisation.registrationNumber',
        'reassessmentRequests.id',
        'innovationGroupedStatus.groupedStatus',
        'collaborator.id'
      ])
      .leftJoin('innovation.owner', 'innovationOwner')
      .leftJoin('innovationOwner.serviceRoles', 'innovationOwnerUserRole')
      .leftJoin('innovationOwnerUserRole.organisation', 'innovationOwnerOrganisation')
      .leftJoin('innovation.reassessmentRequests', 'reassessmentRequests')
      .innerJoin('innovation.innovationGroupedStatus', 'innovationGroupedStatus')
      .leftJoin(
        'innovation.collaborators',
        'collaborator',
        'collaborator.status = :status AND collaborator.user_id = :userId',
        { status: InnovationCollaboratorStatusEnum.ACTIVE, userId: domainContext.id }
      )
      .where('innovation.id = :innovationId', { innovationId: id });

    // Assessment relations.
    if (filters.fields?.includes('assessment')) {
      query.leftJoin('innovation.currentAssessment', 'currentAssessment');
      query.leftJoin('currentAssessment.assignTo', 'assignTo', 'assignTo.status != :deletedStatus', {
        deletedStatus: UserStatusEnum.DELETED
      });
      query.leftJoin('assignTo.serviceRoles', 'assignToRoles', 'assignToRoles.role = :assessmentRole', {
        assessmentRole: ServiceRoleEnum.ASSESSMENT
      });
      query.addSelect([
        'currentAssessment.id',
        'currentAssessment.majorVersion',
        'currentAssessment.minorVersion',
        'currentAssessment.createdAt',
        'currentAssessment.finishedAt',
        'assignTo.id',
        'assignTo.status',
        'assignToRoles.id'
      ]);
    }

    // Supports relations.
    if (filters.fields?.includes('supports')) {
      // To keep current behavior we're returning only the most recent supports (this might change in the future)
      query.leftJoin('innovation.innovationSupports', 'innovationSupports', 'innovationSupports.isMostRecent = 1');
      query.leftJoin('innovationSupports.organisationUnit', 'supportingOrganisationUnit');
      query.addSelect(['innovationSupports.id', 'innovationSupports.status', 'supportingOrganisationUnit.id']);
    }

    const innovation = await query.getOne();
    if (!innovation) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    // Only fetch the document version and category data (maybe create a helper for this in the future)
    let documentDataQuery: SelectQueryBuilder<InnovationDocumentEntity | InnovationDocumentDraftEntity> =
      connection.createQueryBuilder(InnovationDocumentEntity, 'innovationDocument');
    if ([ServiceRoleEnum.INNOVATOR, ServiceRoleEnum.ADMIN].includes(domainContext.currentRole.role)) {
      documentDataQuery = connection.createQueryBuilder(InnovationDocumentDraftEntity, 'innovationDocument');
    }

    const documentData = await documentDataQuery
      .select("JSON_QUERY(document, '$.INNOVATION_DESCRIPTION.categories')", 'categories')
      .addSelect(
        "JSON_VALUE(document, '$.INNOVATION_DESCRIPTION.otherCategoryDescription')",
        'otherCategoryDescription'
      )
      .addSelect("JSON_VALUE(document, '$.INNOVATION_DESCRIPTION.description')", 'description')
      .addSelect("JSON_VALUE(document, '$.INNOVATION_DESCRIPTION.countryName')", 'countryName')
      .addSelect("JSON_VALUE(document, '$.INNOVATION_DESCRIPTION.postcode')", 'postcode')
      .addSelect('version', 'version')
      .where('innovationDocument.id = :innovationId', { innovationId: innovation.id })
      .getRawOne();

    // Fetch users names.
    const assessmentUsersId = innovation.currentAssessment?.assignTo?.id;
    const categories = documentData.categories ? JSON.parse(documentData.categories) : [];
    let usersInfo: Awaited<ReturnType<DomainService['users']['getUsersList']>> = [];
    let ownerInfo = undefined;
    let ownerPreferences = undefined;

    if (innovation.owner && innovation.owner.status !== UserStatusEnum.DELETED) {
      ownerPreferences = await this.domainService.users.getUserPreferences(innovation.owner.id);
      usersInfo = await this.domainService.users.getUsersList({
        userIds: [innovation.owner.id, ...(assessmentUsersId ? [assessmentUsersId] : [])]
      });
      ownerInfo = usersInfo.find(item => item.id === innovation.owner?.id);
    } else if (assessmentUsersId) {
      usersInfo = await this.domainService.users.getUsersList({ userIds: [assessmentUsersId] });
    }

    // Assessment parsing.
    let assessment:
      | undefined
      | null
      | {
          id: string;
          majorVersion: number;
          minorVersion: number;
          createdAt: Date;
          finishedAt: null | Date;
          assignedTo?: { id: string; name: string; userRoleId: string };
          reassessmentCount: number;
        };

    if (filters.fields?.includes('assessment')) {
      const assignTo = usersInfo.find(item => item.id === innovation.currentAssessment?.assignTo?.id && item.isActive);
      assessment = innovation.currentAssessment
        ? {
            id: innovation.currentAssessment.id,
            majorVersion: innovation.currentAssessment.majorVersion,
            minorVersion: innovation.currentAssessment.minorVersion,
            createdAt: innovation.currentAssessment.createdAt,
            finishedAt: innovation.currentAssessment.finishedAt,
            ...(assignTo &&
              assignTo.roles[0] && {
                assignedTo: { id: assignTo.id, name: assignTo.displayName, userRoleId: assignTo.roles[0].id }
              }),
            reassessmentCount: (await innovation.reassessmentRequests).length
          }
        : null;
    }

    return {
      id: innovation.id,
      name: innovation.name,
      description: documentData.description,
      version: documentData.version,
      status: innovation.status,
      groupedStatus: innovation.innovationGroupedStatus.groupedStatus,
      hasBeenAssessed: innovation.hasBeenAssessed,
      statusUpdatedAt: innovation.statusUpdatedAt,
      submittedAt: innovation.lastAssessmentRequestAt,
      countryName: documentData.countryName,
      postCode: documentData.postcode,
      categories,
      otherCategoryDescription: documentData.otherCategoryDescription,
      ...(innovation.archivedStatus ? { archivedStatus: innovation.archivedStatus } : {}),
      ...(innovation.owner && ownerPreferences
        ? {
            owner: {
              id: innovation.owner.id,
              name: ownerInfo?.displayName ?? '',
              email: ownerInfo?.email ?? '',
              contactByEmail: ownerPreferences.contactByEmail,
              contactByPhone: ownerPreferences.contactByPhone,
              contactByPhoneTimeframe: ownerPreferences.contactByPhoneTimeframe,
              contactDetails: ownerPreferences.contactDetails,
              mobilePhone: ownerInfo?.mobilePhone ?? '',
              isActive: !!ownerInfo?.isActive,
              lastLoginAt: ownerInfo?.lastLoginAt ?? null,
              // shadow innovator organisations shouldn't be displayed
              ...(innovation.owner.serviceRoles[0]?.organisation &&
                !innovation.owner.serviceRoles[0].organisation.isShadow && {
                  organisation: {
                    name: innovation.owner.serviceRoles[0].organisation.name,
                    size: innovation.owner.serviceRoles[0].organisation.size,
                    registrationNumber: innovation.owner.serviceRoles[0].organisation.registrationNumber
                  }
                })
            }
          }
        : {}),
      lastEndSupportAt: await this.lastSupportStatusTransitionFromEngaging(innovation.id),
      assessment,
      ...(!filters.fields?.includes('supports')
        ? {}
        : {
            supports: (innovation.innovationSupports || []).map(support => ({
              id: support.id,
              status: support.status,
              organisationUnitId: support.organisationUnit.id
            }))
          }),
      collaboratorId: innovation.collaborators[0]?.id,
      createdAt: innovation.createdAt
    };
  }

  async getNeedsAssessmentOverdueInnovations(
    domainContext: DomainContextType,
    filters: {
      innovationStatus: (InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT | InnovationStatusEnum.NEEDS_ASSESSMENT)[];
      assignedToMe: boolean;
    },
    entityManager?: EntityManager
  ): Promise<number> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const query = connection
      .createQueryBuilder(InnovationEntity, 'innovation')
      .leftJoinAndSelect('innovation.currentAssessment', 'currentAssessment')
      .where('innovation.status IN (:...innovationStatus)', {
        innovationStatus: filters.innovationStatus
      })
      .andWhere(`DATEDIFF(day, innovation.submitted_at, GETDATE()) > 7 AND currentAssessment.finished_at IS NULL`);

    if (filters.assignedToMe) {
      query.andWhere('currentAssessment.assign_to_id = :assignToId', { assignToId: domainContext.id });
    }

    return query.getCount();
  }

  async createInnovation(
    domainContext: DomainContextType,
    data: {
      name: string;
      description: string;
      countryName: string;
      officeLocation: string;
      countryLocation?: string;
      postcode?: string;
      hasWebsite: string;
      website?: string;
    },
    entityManager?: EntityManager
  ): Promise<{ id: string }> {
    const connection = entityManager ?? this.sqlConnection.manager;

    // Sanity check if innovation name already exists (for the same user).
    const repeatedNamesCount = await connection
      .createQueryBuilder(InnovationEntity, 'innovation')
      .where('innovation.owner_id = :ownerId', { ownerId: domainContext.id })
      .andWhere('TRIM(LOWER(innovation.name)) = :innovationName', {
        innovationName: data.name.trim().toLowerCase()
      })
      .getCount();
    if (repeatedNamesCount > 0) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_ALREADY_EXISTS);
    }

    return connection.transaction(async transaction => {
      const now = new Date();

      const savedInnovation = await transaction.save(
        InnovationEntity,
        InnovationEntity.new({
          name: data.name,

          owner: UserEntity.new({ id: domainContext.id }),
          status: InnovationStatusEnum.CREATED,
          statusUpdatedAt: new Date(),

          createdAt: now,
          createdBy: domainContext.id,
          updatedAt: now,
          updatedBy: domainContext.id
        })
      );

      const { version } = await this.irSchemaService.getSchema();
      const document = createDocumentFromInnovation(savedInnovation, version, data);
      await transaction.save(InnovationDocumentEntity, document);
      await transaction.save(InnovationDocumentDraftEntity, omit(document, ['isSnapshot', 'description']));

      // Mark some section to status DRAFT.
      const sectionsToBeInDraft: CurrentCatalogTypes.InnovationSections[] = ['INNOVATION_DESCRIPTION'];
      for (const sectionKey of sectionsToBeInDraft) {
        await transaction.save(
          InnovationSectionEntity,
          InnovationSectionEntity.new({
            innovation: savedInnovation,
            section: CurrentCatalogTypes.InnovationSections.find(s => s === sectionKey),
            status: InnovationSectionStatusEnum.DRAFT,

            createdBy: savedInnovation.createdBy,
            updatedBy: savedInnovation.updatedBy
          })
        );
      }

      await this.domainService.innovations.addActivityLog(
        transaction,
        { activity: ActivityEnum.INNOVATION_CREATION, domainContext, innovationId: savedInnovation.id },
        {}
      );

      return { id: savedInnovation.id };
    });
  }

  async getInnovationShares(
    innovationId: string,
    entityManager?: EntityManager
  ): Promise<{ organisation: { id: string; name: string; acronym: null | string } }[]> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const innovation = await connection
      .createQueryBuilder(InnovationEntity, 'innovation')
      .select(['innovation.id', 'organisationShares.id', 'organisationShares.name', 'organisationShares.acronym'])
      .leftJoin('innovation.organisationShares', 'organisationShares')
      .where('innovation.id = :innovationId', { innovationId })
      .getOne();
    if (!innovation) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    return (innovation.organisationShares ?? []).map(organisation => ({
      organisation: {
        id: organisation.id,
        name: organisation.name,
        acronym: organisation.acronym
      }
    }));
  }

  async updateInnovationShares(
    domainContext: DomainContextType,
    innovationId: string,
    organisationShares: string[],
    entityManager?: EntityManager
  ): Promise<void> {
    const em = entityManager ?? this.sqlConnection.manager;

    // Sanity check if all organisation exists.
    const organisations = await em
      .createQueryBuilder(OrganisationEntity, 'organisation')
      .select('organisation.name')
      .where('organisation.id IN (:...organisationIds)', { organisationIds: organisationShares })
      .getMany();

    // Sanity check if all organisation exists.
    if (organisations.length != organisationShares.length) {
      throw new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATIONS_NOT_FOUND, {
        details: { error: 'Unknown organisations' }
      });
    }

    const innovation = await em
      .createQueryBuilder(InnovationEntity, 'innovation')
      .select([
        'innovation.id',
        'innovation.status',
        'innovation.hasBeenAssessed',
        'organisationShares.id',
        'majorAssessment.id'
      ])
      .leftJoin('innovation.organisationShares', 'organisationShares')
      .leftJoin('innovation.currentMajorAssessment', 'majorAssessment')
      .where('innovation.id = :innovationId', { innovationId })
      .getOne();

    if (!innovation) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    const oldShares = innovation.organisationShares.map(o => o.id);
    const oldSharesSet = new Set(oldShares);
    const sharesSet = new Set(organisationShares);

    const addedShares = organisationShares.filter(s => !oldSharesSet.has(s));
    const deletedShares = oldShares.filter(s => !sharesSet.has(s));

    const emTransaction = await em.transaction(async transaction => {
      const toReturn: {
        innovationId: string;
        organisationId: string;
        affectedUsers?: {
          roleIds: string[];
        };
      }[] = [];

      // Delete shares
      if (deletedShares.length > 0) {
        // Check for active supports
        const supports = await transaction
          .createQueryBuilder(InnovationSupportEntity, 'support')
          .select([
            'support.id',
            'support.status',
            'userRole.role',
            'userRole.id',
            'user.id',
            'unit.id',
            'unit.organisationId'
          ])
          .innerJoin('support.innovation', 'innovation')
          .innerJoin('support.organisationUnit', 'unit')
          .leftJoin('support.userRoles', 'userRole')
          .leftJoin('userRole.user', 'user', "user.status <> 'DELETED'")
          .where('innovation.id = :innovationId', { innovationId })
          .andWhere('unit.organisation IN (:...ids)', { ids: deletedShares })
          .andWhere('support.status NOT IN (:...statuses)', {
            statuses: [InnovationSupportStatusEnum.CLOSED, InnovationSupportStatusEnum.UNSUITABLE]
          })
          .andWhere('support.isMostRecent = 1')
          .getMany();

        const supportsOrgIdMap = new Map(supports.map(support => [support.organisationUnit.organisationId, support]));

        deletedShares.forEach(share => {
          /*
          check if deletedShare is in support, if so add affected users,
          otherwise just add organisationId
          */
          const support = supportsOrgIdMap.get(share);
          if (support) {
            toReturn.push({
              innovationId: innovation.id,
              organisationId: support.organisationUnit.organisationId,
              affectedUsers: {
                roleIds: support.userRoles.map(userRole => userRole.id)
              }
            });
          } else {
            toReturn.push({
              innovationId: innovation.id,
              organisationId: share
            });
          }
        });

        const supportIds = supports.map(support => support.id);
        if (supportIds.length > 0) {
          // Cancel all tasks for the deleted shares supports
          await transaction.update(
            InnovationTaskEntity,
            { innovationSupport: { id: In(supportIds), status: InnovationTaskStatusEnum.OPEN } },
            {
              status: InnovationTaskStatusEnum.CANCELLED,
              updatedBy: domainContext.id,
              updatedByUserRole: UserRoleEntity.new({ id: domainContext.currentRole.id })
            }
          );

          // Close all supports
          await transaction.save(
            InnovationSupportEntity,
            supports.map(support => {
              support.userRoles = [];
              support.updatedBy = domainContext.id;
              support.updatedByUserRole = domainContext.currentRole.id;
              support.status = InnovationSupportStatusEnum.CLOSED;
              support.closeReason = InnovationSupportCloseReasonEnum.STOP_SHARE;
              support.finishedAt = new Date();
              return support;
            })
          );

          const units = supports.map(s => s.organisationUnit.id);
          // Add to support summary
          for (const unitId of units) {
            await this.domainService.innovations.addSupportLog(
              transaction,
              { id: domainContext.id, roleId: domainContext.currentRole.id },
              innovationId,
              {
                type: InnovationSupportLogTypeEnum.STOP_SHARE,
                unitId,
                description: '',
                supportStatus: InnovationSupportStatusEnum.CLOSED
              }
            );
          }

          // Reject all pending export requests if they exist
          const exportRequests = await transaction
            .createQueryBuilder(InnovationExportRequestEntity, 'request')
            .select(['request.id'])
            .innerJoin('request.createdByUserRole', 'role')
            .where('request.innovation_id = :innovationId', { innovationId })
            .andWhere('role.organisation_unit_id IN (:...unitIds)', { unitIds: units })
            .getMany();
          if (exportRequests.length > 0) {
            await transaction.save(
              InnovationExportRequestEntity,
              exportRequests.map(r => {
                return {
                  ...r,
                  status: InnovationExportRequestStatusEnum.REJECTED,
                  rejectReason: TranslationHelper.translate('DEFAULT_MESSAGES.EXPORT_REQUEST.STOP_SHARING'),
                  updatedBy: domainContext.id
                };
              })
            );
          }
        }
      }

      innovation.organisationShares = organisationShares.map(id => OrganisationEntity.new({ id }));
      await this.domainService.innovations.addActivityLog(
        transaction,
        { innovationId, activity: ActivityEnum.SHARING_PREFERENCES_UPDATE, domainContext },
        { organisations: organisations.map(o => o.name) }
      );
      await transaction.save(InnovationEntity, innovation);

      // Create the supports for suggested organisations that were now shared
      // this can only be after the new shares have been saved as createSuggestedSupports will check for the sharing
      if (addedShares.length > 0) {
        const suggestions = new Set(
          await this.innovationSupportsService.getInnovationSuggestedUnits(
            innovationId,
            { majorAssessmentId: innovation.currentMajorAssessment?.id },
            transaction
          )
        );

        const organisationUnits = await transaction
          .createQueryBuilder(OrganisationUnitEntity, 'unit')
          .select(['unit.id'])
          .where('unit.organisation_id IN (:...organisationId)', { organisationId: addedShares })
          .andWhere('unit.inactivatedAt IS NULL')
          .getMany();

        const newUnitShares = organisationUnits
          .filter(u => suggestions.has(u.id)) // only the ones that were suggested
          .map(u => u.id);

        if (newUnitShares.length) {
          await this.innovationSupportsService.createSuggestedSupports(
            domainContext,
            innovationId,
            newUnitShares,
            transaction
          );
        }
      }

      return toReturn;
    });

    if (addedShares.length > 0 && innovation.hasBeenAssessed) {
      await this.notifierService.send(domainContext, NotifierTypeEnum.INNOVATION_DELAYED_SHARE, {
        innovationId: innovation.id,
        newSharedOrgIds: addedShares
      });
    }

    if (deletedShares.length > 0) {
      for (const share of emTransaction) {
        await this.notifierService.send(domainContext, NotifierTypeEnum.INNOVATION_STOP_SHARING, {
          innovationId: innovation.id,
          organisationId: share.organisationId,
          ...(share.affectedUsers
            ? {
                affectedUsers: {
                  roleIds: share.affectedUsers.roleIds
                }
              }
            : null)
        });
      }
    }
  }

  async submitInnovation(
    domainContext: DomainContextType,
    innovationId: string,
    entityManager?: EntityManager
  ): Promise<{ id: string; status: InnovationStatusEnum }> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const innovation = await connection
      .createQueryBuilder(InnovationEntity, 'innovations')
      .leftJoinAndSelect('innovations.sections', 'sections')
      .where('innovations.id = :innovationId', { innovationId })
      .getOne();

    if (!innovation) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    const sections = innovation.sections;

    if (!sections.length) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_NO_SECTIONS);
    }

    // TODO: I believe that an error exists here.
    // this.hasIncompleteSections does not take into account if ALL sections exists.
    // If a section has never been saved before, is returning as being completed.
    const canSubmit = !(await this.hasIncompleteSections(sections));

    if (!canSubmit) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SECTIONS_INCOMPLETE);
    }

    await connection.transaction(async transaction => {
      const now = new Date();
      const update = await transaction.update(
        InnovationEntity,
        { id: innovationId },
        {
          submittedAt: now,
          lastAssessmentRequestAt: now,
          status: InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT,
          statusUpdatedAt: now,
          updatedBy: domainContext.id,
          // In case the innovation was archived during the CREATED status
          archivedStatus: null,
          archiveReason: null
        }
      );

      // Sync the Submitted document with the Draft document
      await this.innovationDocumentService.syncDocumentVersions(domainContext, innovationId, transaction, {
        updatedAt: now
      });

      await this.domainService.innovations.addActivityLog(
        transaction,
        { innovationId: innovationId, activity: ActivityEnum.INNOVATION_SUBMISSION, domainContext },
        {}
      );

      return update;
    });

    // Add notification with Innovation submitted for needs assessment
    await this.notifierService.send(domainContext, NotifierTypeEnum.INNOVATION_SUBMITTED, {
      innovationId,
      reassessment: false
    });

    return {
      id: innovationId,
      status: InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT
    };
  }

  async getInnovationActivitiesLog(
    innovationId: string,
    filters: {
      activityTypes?: ActivityTypeEnum[];
      dateFilters?: { field: 'createdAt'; startDate?: Date; endDate?: Date }[];
    },
    pagination: PaginationQueryParamsType<'createdAt'>,
    entityManager?: EntityManager
  ): Promise<{
    count: number;
    data: {
      type: ActivityTypeEnum;
      activity: ActivityEnum;
      date: Date;
      params: ActivityLogListParamsType;
    }[];
  }> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const query = connection
      .createQueryBuilder(ActivityLogEntity, 'activityLog')
      .select([
        'activityLog.id',
        'activityLog.activity',
        'activityLog.type',
        'activityLog.createdAt',
        'activityLog.createdBy',
        'activityLog.param',
        'userRole.role'
      ])
      .leftJoin('activityLog.userRole', 'userRole')
      .where('activityLog.innovation_id = :innovationId', { innovationId });

    // Filters
    if (filters.activityTypes && filters.activityTypes.length > 0) {
      query.andWhere('activityLog.type IN (:...activityTypes)', {
        activityTypes: filters.activityTypes
      });
    }

    if (filters.dateFilters && filters.dateFilters.length > 0) {
      const dateFilterKeyMap = new Map([['createdAt', 'activityLog.createdAt']]);

      for (const filter of filters.dateFilters) {
        const filterKey = dateFilterKeyMap.get(filter.field);

        if (filter.startDate) {
          query.andWhere(`${filterKey} >= :startDate`, { startDate: filter.startDate });
        }

        if (filter.endDate) {
          // This is needed because default TimeStamp for a DD/MM/YYYY date is 00:00:00
          const beforeDateWithTimestamp = new Date(filter.endDate);
          beforeDateWithTimestamp.setDate(beforeDateWithTimestamp.getDate() + 1);

          query.andWhere(`${filterKey} < :endDate`, { endDate: beforeDateWithTimestamp });
        }
      }
    }

    // Pagination and ordering
    query.skip(pagination.skip);
    query.take(pagination.take);

    for (const [key, order] of Object.entries(pagination.order)) {
      let field: string;
      switch (key) {
        case 'createdAt':
          field = 'activityLog.createdAt';
          break;
        default:
          field = 'activityLog.createdAt';
          break;
      }
      query.addOrderBy(field, order);
    }

    const [dbActivities, dbActivitiesCount] = await query.getManyAndCount();

    const usersIds = dbActivities.flatMap(item => {
      const params = item.param as ActivityLogListParamsType;
      const p: string[] = [];

      p.push(item.createdBy);
      if (params.interveningUserId !== undefined) {
        p.push(params.interveningUserId);
      }

      return p;
    });

    const usersInfo = await this.domainService.users.getUsersMap({ userIds: [...usersIds] });

    return {
      count: dbActivitiesCount,
      data: dbActivities.map(item => {
        const params = item.param as ActivityLogListParamsType;

        params.actionUserName = usersInfo.get(item.createdBy)?.displayName ?? '[deleted account]';

        if (params.interveningUserId !== undefined) {
          params.interveningUserName = usersInfo.get(params.interveningUserId)?.displayName ?? '[deleted account]';
        }

        params.actionUserRole = item.userRole.role;

        return {
          activity: item.activity,
          type: item.type,
          date: item.createdAt,
          params
        };
      })
    };
  }

  /**
   * dismisses innovation notification for the requestUser according to optional conditions
   *
   * @param domainContext the user that is dismissing the notification
   * @param innovationId the innovation id
   * @param conditions extra conditions that control the dismissal
   *  - if notificationIds is set, only the notifications with the given ids will be dismissed
   *  - if notificationContext.id is set, only the notifications with the given context id will be dismissed
   *  - if notificationContext.type is set, only the notifications with the given context type will be dismissed
   */
  async dismissNotifications(
    domainContext: DomainContextType,
    innovationId: string,
    conditions: {
      notificationIds: string[];
      contextTypes: string[];
      contextDetails: string[];
      contextIds: string[];
    },
    entityManager?: EntityManager
  ): Promise<void> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const params: {
      roleId: string;
      innovationId: string;
      notificationIds?: string[];
      contextIds?: string[];
      contextTypes?: string[];
      contextDetails?: string[];
      organisationUnitId?: string;
    } = { roleId: domainContext.currentRole.id, innovationId };

    const query = connection
      .createQueryBuilder(NotificationEntity, 'notification')
      .select('notification.id')
      .where('notification.innovation_id = :innovationId', { innovationId });

    if (conditions.notificationIds.length > 0) {
      query.andWhere('notification.id IN (:...notificationIds)');
      params.notificationIds = conditions.notificationIds;
    }
    if (conditions.contextIds.length > 0) {
      query.andWhere('notification.contextId IN (:...contextIds)');
      params.contextIds = conditions.contextIds;
    }

    if (conditions.contextDetails.length > 0) {
      query.andWhere('notification.contextDetail IN (:...contextDetails)');
      params.contextDetails = conditions.contextDetails;
    }

    if (conditions.contextTypes.length > 0) {
      query.andWhere('notification.contextType IN (:...contextTypes)');
      params.contextTypes = conditions.contextTypes;
    }

    const updateQuery = connection
      .createQueryBuilder(NotificationUserEntity, 'user')
      .update()
      .set({ readAt: () => 'CURRENT_TIMESTAMP' })
      .where('notification_id IN ( ' + query.getQuery() + ' )')
      .andWhere('user_role_id = :roleId AND read_at IS NULL');

    await updateQuery.setParameters(params).execute();
  }

  async getInnovationSubmissionsState(
    innovationId: string,
    entityManager?: EntityManager
  ): Promise<{ submittedAllSections: boolean; submittedForNeedsAssessment: boolean }> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const innovation = await connection
      .createQueryBuilder(InnovationEntity, 'innovation')
      .where('innovation.id = :innovationId', { innovationId })
      .getOne();

    if (!innovation) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    const sectionsSubmitted = await connection
      .createQueryBuilder(InnovationSectionEntity, 'section')
      .where('section.innovation_id = :innovationId', { innovationId })
      .andWhere('section.status = :status', { status: InnovationSectionStatusEnum.SUBMITTED })
      .getCount();

    const totalSections = CurrentCatalogTypes.InnovationSections.length;

    return {
      submittedAllSections: sectionsSubmitted === totalSections,
      submittedForNeedsAssessment: innovation.status !== InnovationStatusEnum.CREATED
    };
  }

  private async hasIncompleteSections(sections: InnovationSectionEntity[]): Promise<boolean> {
    const innovationSections: InnovationSectionModel[] = [];

    for (const key of CurrentCatalogTypes.InnovationSections) {
      const section = sections.find(sec => sec.section === key);
      innovationSections.push(this.getInnovationSectionMetadata(key, section));
    }

    return innovationSections.some(x => x.status !== InnovationSectionStatusEnum.SUBMITTED);
  }

  // fetches the innovation progress filtering out the null values
  async getInnovationProgress(
    innovationId: string,
    entityManager?: EntityManager
  ): Promise<InnovationListViewWithoutNull> {
    const em = entityManager ?? this.sqlConnection.manager;
    const data = await em
      .createQueryBuilder(InnovationProgressView, 'innovationProgress')
      .where('innovationProgress.innovationId = :innovationId', { innovationId })
      .getOne();

    if (!data) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    return (Object.entries(data) as [keyof InnovationListViewWithoutNull, any][])
      .filter(([_key, value]) => !!value)
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {} as InnovationListViewWithoutNull);
  }

  // view recipients service innovationsWithoutSupportForNDays to maintain consistency
  private async lastSupportStatusTransitionFromEngaging(innovationId: string): Promise<Date | null> {
    const result = await this.sqlConnection
      .createQueryBuilder(LastSupportStatusViewEntity, 'lastSupportStatus')
      .select('TOP 1 lastSupportStatus.statusChangedAt', 'statusChangedAt')
      .where('lastSupportStatus.innovationId = :innovationId', { innovationId })
      .orderBy('lastSupportStatus.statusChangedAt', 'DESC')
      .getRawOne<{ statusChangedAt: string }>();

    if (!result) return null;

    return new Date(result.statusChangedAt);
  }

  private getInnovationSectionMetadata(
    key: CurrentCatalogTypes.InnovationSections,
    section?: InnovationSectionEntity
  ): InnovationSectionModel {
    let result: InnovationSectionModel;

    if (section) {
      result = {
        id: section.id,
        section: section.section,
        status: section.status,
        updatedAt: section.updatedAt,
        submittedAt: section.submittedAt,
        taskStatus: null
      };
    } else {
      result = {
        id: null,
        section: key,
        status: InnovationSectionStatusEnum.NOT_STARTED,
        updatedAt: null,
        submittedAt: null,
        taskStatus: null
      };
    }

    return result;
  }

  /**
   * Cleanup innovation output to keep only the fields an accessor as access when not shared
   * @param input the input to be cleaned
   * @param notShared if it's shared or not
   * @returns cleanup the response to remove fields that are not shared
   */
  private cleanupAccessorsNotSharedInnovation<T extends object>(input: T): Partial<T> {
    return pick(input, [
      'id',
      'name',
      'statusUpdatedAt',
      'submittedAt',
      'groupedStatus',
      'updatedAt',
      'mainCategory',
      'otherCategoryDescription',
      'countryName',
      'postCode',
      'support'
    ]);
  }

  async getInnovationRelavantOrganisationsStatusList(
    innovationId: string,
    retrieveRecipients: boolean,
    entityManager?: EntityManager
  ): Promise<
    {
      id: string;
      status: InnovationRelevantOrganisationsStatusEnum;
      organisation: {
        id: string;
        name: string;
        acronym: string | null;
        unit: { id: string; name: string; acronym: string | null };
      };
      recipients?: { id: string; roleId: string; name: string }[];
    }[]
  > {
    const connection = entityManager ?? this.sqlConnection.manager;

    const query = connection
      .createQueryBuilder(InnovationRelevantOrganisationsStatusView, 'relevantOrganisationsStatus')
      .where('relevantOrganisationsStatus.innovationId = :innovationId', { innovationId });

    let organisationsAndUsers = await query.getMany();

    if (retrieveRecipients) {
      //We are filtering organisations that do not have users to support innovations
      organisationsAndUsers = organisationsAndUsers.filter(item => item.userData !== null && item.userData.length > 0);
    }

    const usersInfo = await this.domainService.users.getUsersMap({
      userIds: organisationsAndUsers.flatMap(item => item.userData?.map(user => user.userId) ?? [])
    });

    const result = organisationsAndUsers.map(item => {
      const organisation = item.organisationData;
      const unit = item.organisationUnitData;

      let recipients: { id: string; roleId: string; name: string }[] | undefined = undefined;

      if (retrieveRecipients && item.userData) {
        recipients = item.userData.map(user => ({
          id: user.userId,
          roleId: user.roleId,
          name: usersInfo.get(user.userId)?.displayName ?? '[unavailable account]'
        }));
      }

      return {
        id: item.innovationId,
        status: item.status,
        organisation: {
          id: organisation.id,
          name: organisation.name,
          acronym: organisation.acronym,
          unit: {
            id: unit.id,
            name: unit.name,
            acronym: unit.acronym
          }
        },
        ...(recipients ? { recipients } : {})
      };
    });
    return result;
  }
}
