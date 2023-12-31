import { inject, injectable } from 'inversify';
import { Brackets, EntityManager, In, ObjectLiteral, SelectQueryBuilder } from 'typeorm';

import {
  ActivityLogEntity,
  InnovationAssessmentEntity,
  InnovationDocumentEntity,
  InnovationEntity,
  InnovationExportRequestEntity,
  InnovationListView,
  InnovationReassessmentRequestEntity,
  InnovationSectionEntity,
  InnovationSupportEntity,
  InnovationTaskEntity,
  LastSupportStatusViewEntity,
  NotificationEntity,
  NotificationUserEntity,
  OrganisationEntity,
  UserEntity,
  UserRoleEntity
} from '@innovations/shared/entities';
import {
  ActivityEnum,
  ActivityTypeEnum,
  InnovationCollaboratorStatusEnum,
  InnovationExportRequestStatusEnum,
  InnovationGroupedStatusEnum,
  InnovationSectionStatusEnum,
  InnovationStatusEnum,
  InnovationSupportStatusEnum,
  InnovationTaskStatusEnum,
  NotifierTypeEnum,
  PhoneUserPreferenceEnum,
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
import { PaginationQueryParamsType, TranslationHelper } from '@innovations/shared/helpers';
import type { DomainService, DomainUsersService, NotifierService } from '@innovations/shared/services';
import {
  isAccessorDomainContextType,
  isAdminDomainContextType,
  isAssessmentDomainContextType,
  type ActivityLogListParamsType,
  type DomainContextType
} from '@innovations/shared/types';

import { InnovationSupportLogTypeEnum } from '@innovations/shared/enums';
import { InnovationLocationEnum } from '../_enums/innovation.enums';
import type { InnovationSectionModel } from '../_types/innovation.types';

import { createDocumentFromInnovation } from '@innovations/shared/entities/innovation/innovation-document.entity';
import { CurrentCatalogTypes } from '@innovations/shared/schemas/innovation-record';
import { ActionEnum } from '@innovations/shared/services/integrations/audit.service';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import { groupBy, isString, snakeCase } from 'lodash';
import { BaseService } from './base.service';

// TODO move types
export const InnovationListSelectType = [
  'id',
  'name',
  'status',
  'groupedStatus',
  'submittedAt',
  'updatedAt',
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
  'engagingOrganisations',
  'engagingUnits',
  'suggestedOrganisations',
  'support.id',
  'support.status',
  'support.updatedAt',
  'owner.id',
  'owner.name',
  'owner.companyName'
] as const;
type InnovationListViewFields = Omit<InnovationListView, 'supports' | 'ownerId'>;
export type InnovationListSelectType =
  | keyof InnovationListViewFields
  | `support.${keyof Pick<InnovationSupportEntity, 'status' | 'updatedAt'>}`
  | 'owner.id'
  | 'owner.name'
  | 'owner.companyName';

export type InnovationListFullResponseType = InnovationListViewFields & {
  support: { status: InnovationSupportStatusEnum; updatedAt: Date | null };
  owner: { id: string; name: string | null; companyName: string | null } | null;
};

type KeyPart<S> = S extends `${infer U}.${infer _D}` ? U : S;
export type InnovationListResponseType<S extends InnovationListSelectType, K extends KeyPart<S> = KeyPart<S>> = {
  [k in K]: InnovationListFullResponseType[k];
};

export const DateFilterFieldsType = ['submittedAt', 'updatedAt', 'support.updatedAt'] as const;
export type DateFilterFieldsType = (typeof DateFilterFieldsType)[number];

export type InnovationListFilters = {
  assignedToMe?: boolean;
  careSettings?: CurrentCatalogTypes.catalogCareSettings[];
  categories?: CurrentCatalogTypes.catalogCategory[];
  dateFilters?: { field: DateFilterFieldsType; startDate?: Date; endDate?: Date }[];
  diseasesAndConditions: string[];
  engagingOrganisations?: string[];
  groupedStatuses: InnovationGroupedStatusEnum[];
  involvedAACProgrammes?: CurrentCatalogTypes.catalogInvolvedAACProgrammes[];
  keyHealthInequalities?: CurrentCatalogTypes.catalogKeyHealthInequalities[];
  locations?: InnovationLocationEnum[];
  search?: string;
  suggestedOnly?: boolean;
  supportStatuses?: InnovationSupportStatusEnum[];
};

// Join types are the ones with nested selectable objects
export type InnovationListJoinTypes = InnovationListSelectType extends infer X
  ? X extends `${infer U}.${infer _D}`
    ? U
    : never
  : never;

type InnovationListChildrenType<T extends InnovationListJoinTypes> = InnovationListSelectType extends infer X
  ? X extends `${T}.${infer D}`
    ? `${T}.${D}`
    : never
  : never;

@injectable()
export class InnovationsService extends BaseService {
  constructor(
    @inject(SHARED_SYMBOLS.DomainService) private domainService: DomainService,
    @inject(SHARED_SYMBOLS.NotifierService) private notifierService: NotifierService
  ) {
    super();
  }

  async getInnovationsList(
    user: { id: string },
    domainContext: DomainContextType,
    filters: {
      status: InnovationStatusEnum[];
      name?: string;
      mainCategories?: CurrentCatalogTypes.catalogCategory[];
      locations?: InnovationLocationEnum[];
      supportStatuses?: InnovationSupportStatusEnum[];
      groupedStatuses?: InnovationGroupedStatusEnum[];
      engagingOrganisations?: string[];
      engagingOrganisationUnits?: string[];
      assignedToMe?: boolean;
      suggestedOnly?: boolean;
      latestWorkedByMe?: boolean;
      hasAccessThrough?: ('owner' | 'collaborator')[];
      dateFilter?: { field: DateFilterFieldsType; startDate?: Date; endDate?: Date }[];
      withDeleted?: boolean;
      fields?: ('assessment' | 'supports' | 'notifications' | 'statistics' | 'groupedStatus')[];
    },
    pagination: PaginationQueryParamsType<
      | 'name'
      | 'location'
      | 'mainCategory'
      | 'submittedAt'
      | 'updatedAt'
      | 'assessmentStartedAt'
      | 'assessmentFinishedAt'
    >,
    entityManager?: EntityManager
  ): Promise<{
    count: number;
    data: {
      id: string;
      name: string;
      description: null | string;
      status: InnovationStatusEnum;
      statusUpdatedAt: Date;
      submittedAt: null | Date;
      updatedAt: null | Date;
      countryName: null | string;
      postCode: null | string;
      mainCategory: null | CurrentCatalogTypes.catalogCategory;
      otherMainCategoryDescription: null | string;
      groupedStatus?: InnovationGroupedStatusEnum;
      assessment?: null | {
        id: string;
        createdAt: Date;
        finishedAt: null | Date;
        assignedTo?: { name: string };
        reassessmentCount: number;
        isExempted?: boolean;
      };
      supports?: {
        id: string;
        status: InnovationSupportStatusEnum;
        updatedAt: Date;
        organisation: {
          id: string;
          name: string;
          acronym: null | string;
          unit: {
            id: string;
            name: string;
            acronym: string;
            users?: {
              name: string;
              role: ServiceRoleEnum;
            }[];
          };
        };
      }[];
      notifications?: number;
      statistics?: { tasks: number; messages: number };
    }[];
  }> {
    const connection = entityManager ?? this.sqlConnection.manager;

    // Innovators don't require to fetch user names (maybe make this a parameter)
    const fetchUsers = domainContext.currentRole.role !== ServiceRoleEnum.INNOVATOR;

    //#region Innovation query with filters
    const innovationFetchQuery = connection
      .createQueryBuilder(InnovationEntity, 'innovations')
      .select('innovations.id', 'innovations_id')
      .addSelect('innovations.name', 'innovations_name')
      .addSelect('innovations.description', 'innovations_description')
      .addSelect('innovations.countryName', 'innovations_country_name')
      .addSelect('innovations.mainCategory', 'innovations_main_category')
      .addSelect('innovations.createdAt', 'innovations_created_at')
      .addSelect('innovations.lastAssessmentRequestAt', 'innovations_last_assessment_request_at')
      .addSelect('innovations.updatedAt', 'innovations_updated_at')
      .addSelect('innovations.status', 'innovations_status')
      .addSelect('innovations.statusUpdatedAt', 'innovations_status_updated_at')
      .addSelect('innovations.postcode', 'innovations_postcode')
      .addSelect('innovations.otherCategoryDescription', 'innovations_other_category_description');

    // Assessment relations.
    if (
      filters.suggestedOnly ||
      pagination.order.assessmentStartedAt ||
      pagination.order.assessmentFinishedAt ||
      (filters.assignedToMe && domainContext.currentRole.role === ServiceRoleEnum.ASSESSMENT)
    ) {
      innovationFetchQuery.leftJoin('innovations.assessments', 'assessments');

      // These two are required for the order by
      if (pagination.order.assessmentStartedAt || pagination.order.assessmentFinishedAt) {
        innovationFetchQuery.addSelect('assessments.createdAt', 'assessments_created_at');
        innovationFetchQuery.addSelect('assessments.finishedAt', 'assessments_finished_at');
      }
    }

    // Last worked on.
    if (filters.latestWorkedByMe) {
      innovationFetchQuery.andWhere(
        'innovations.id IN (SELECT innovation_id FROM audit WHERE user_id=:userId AND action IN (:...actions) GROUP BY innovation_id ORDER BY MAX(date) DESC OFFSET :offset ROWS FETCH NEXT :fetch ROWS ONLY)',
        {
          userId: user.id,
          actions: [ActionEnum.CREATE, ActionEnum.UPDATE],
          offset: pagination.skip,
          fetch: pagination.take
        }
      );
    }

    if (domainContext.currentRole.role === ServiceRoleEnum.INNOVATOR) {
      const conditions = new Map<'owner' | 'collaborator', { condition: string; parameters: ObjectLiteral }>([
        [
          'owner',
          {
            condition: 'innovations.owner_id = :innovatorUserId',
            parameters: { innovatorUserId: user.id }
          }
        ],
        ['collaborator', { condition: 'collaborator.user_id = :userId', parameters: { userId: user.id } }]
      ]);

      if (filters.hasAccessThrough && filters.hasAccessThrough.length > 0) {
        if (!filters.hasAccessThrough.includes('owner')) {
          conditions.delete('owner');
        }

        if (!filters.hasAccessThrough.includes('collaborator')) {
          conditions.delete('collaborator');
        }
      }

      if (conditions.has('collaborator')) {
        innovationFetchQuery.leftJoin(
          'innovations.collaborators',
          'collaborator',
          'collaborator.status = :collaboratorStatus',
          { collaboratorStatus: InnovationCollaboratorStatusEnum.ACTIVE }
        );
      }

      innovationFetchQuery.andWhere(
        new Brackets(qb => {
          for (const { condition, parameters } of conditions.values()) {
            qb.orWhere(condition, parameters);
          }
        })
      );
    }

    if (domainContext.currentRole.role === ServiceRoleEnum.ASSESSMENT) {
      innovationFetchQuery.andWhere('innovations.status IN (:...assessmentInnovationStatus)', {
        assessmentInnovationStatus: [
          InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT,
          InnovationStatusEnum.NEEDS_ASSESSMENT,
          InnovationStatusEnum.IN_PROGRESS
        ]
      });
    }

    if (
      domainContext.currentRole.role === ServiceRoleEnum.ACCESSOR ||
      domainContext.currentRole.role === ServiceRoleEnum.QUALIFYING_ACCESSOR
    ) {
      innovationFetchQuery.innerJoin('innovations.organisationShares', 'shares');
      innovationFetchQuery.leftJoin(
        'innovations.innovationSupports',
        'accessorSupports',
        'accessorSupports.organisation_unit_id = :accessorSupportsOrganisationUnitId',
        { accessorSupportsOrganisationUnitId: domainContext.organisation?.organisationUnit?.id }
      );
      innovationFetchQuery.andWhere('innovations.status IN (:...accessorInnovationStatus)', {
        accessorInnovationStatus: [InnovationStatusEnum.IN_PROGRESS, InnovationStatusEnum.COMPLETE]
      });
      innovationFetchQuery.andWhere('shares.id = :accessorOrganisationId', {
        accessorOrganisationId: domainContext.organisation?.id
      });

      if (domainContext.currentRole.role === ServiceRoleEnum.ACCESSOR) {
        innovationFetchQuery.andWhere('accessorSupports.status IN (:...accessorSupportsSupportStatuses01)', {
          accessorSupportsSupportStatuses01: [InnovationSupportStatusEnum.ENGAGING, InnovationSupportStatusEnum.CLOSED]
        });
      }

      if (filters.supportStatuses && filters.supportStatuses.length > 0) {
        innovationFetchQuery.andWhere(
          `(accessorSupports.status IN (:...accessorSupportsSupportStatuses02) ${
            filters.supportStatuses.includes(InnovationSupportStatusEnum.UNASSIGNED)
              ? ' OR accessorSupports.status IS NULL'
              : ''
          })`,
          { accessorSupportsSupportStatuses02: filters.supportStatuses }
        );
      }
    }

    if (domainContext.currentRole.role === ServiceRoleEnum.ADMIN && filters.withDeleted) {
      innovationFetchQuery.withDeleted();
    }

    if (filters.groupedStatuses && filters.groupedStatuses.length > 0) {
      innovationFetchQuery.innerJoin('innovations.innovationGroupedStatus', 'innovationGroupedStatus');
      innovationFetchQuery.addSelect('innovationGroupedStatus.groupedStatus', 'innovationGroupedStatus_grouped_status');

      innovationFetchQuery.andWhere('innovationGroupedStatus.groupedStatus IN (:...groupedStatuses)', {
        groupedStatuses: filters.groupedStatuses
      });
    }

    // Filters.
    if (filters.status && filters.status.length > 0) {
      innovationFetchQuery.andWhere('innovations.status IN (:...status) ', {
        status: filters.status
      });
    }

    if (filters.name) {
      if (domainContext.currentRole.role === ServiceRoleEnum.ADMIN && filters.name.match(/^\S+@\S+$/)) {
        const targetUser = await this.domainService.users.getUserByEmail(filters.name);

        if (targetUser.length > 0 && targetUser[0]) {
          innovationFetchQuery.andWhere('(innovations.owner_id = :userId OR innovations.name LIKE :name)', {
            userId: targetUser[0].id,
            name: `%${filters.name}%`
          });
        } else {
          // This means that the user is NOT registered in the service.
          innovationFetchQuery.andWhere('innovations.name LIKE :name', {
            name: `%${filters.name}%`
          });
        }
      } else {
        innovationFetchQuery.andWhere('innovations.name LIKE :name', { name: `%${filters.name}%` });
      }
    }

    if (filters.mainCategories && filters.mainCategories.length > 0) {
      innovationFetchQuery.andWhere('innovations.main_category IN (:...mainCategories)', {
        mainCategories: filters.mainCategories
      });
    }

    if (filters.locations && filters.locations.length > 0) {
      if (!filters.locations.includes(InnovationLocationEnum['Based outside UK'])) {
        innovationFetchQuery.andWhere('innovations.country_name IN (:...locations)', {
          locations: filters.locations
        });
      } else {
        const knownLocations = Object.values(InnovationLocationEnum).filter(
          item => item !== InnovationLocationEnum['Based outside UK']
        );
        const knownLocationsNotOnFilter = knownLocations.filter(item => !filters.locations?.includes(item));
        const filterLocationsExceptOutsideUK = filters.locations.filter(
          item => item !== InnovationLocationEnum['Based outside UK']
        );

        innovationFetchQuery.andWhere(
          `(
        1 <> 1
        ${
          filterLocationsExceptOutsideUK.length > 0
            ? ' OR innovations.country_name  IN (:...filterLocationsExceptOutsideUK)'
            : ''
        }
        ${
          knownLocationsNotOnFilter.length > 0
            ? ' OR innovations.country_name NOT IN (:...knownLocationsNotOnFilter)'
            : ''
        }
        )`,
          { filterLocationsExceptOutsideUK, knownLocationsNotOnFilter }
        );
      }
    }

    if (filters.engagingOrganisations && filters.engagingOrganisations.length > 0) {
      innovationFetchQuery.andWhere(
        `EXISTS (
          SELECT eofilter_is.id
          FROM innovation_support eofilter_is
          INNER JOIN organisation_unit eofilter_ou ON eofilter_ou.id = eofilter_is.organisation_unit_id AND inactivated_at IS NULL AND eofilter_ou.deleted_at IS NULL
          WHERE eofilter_is.innovation_id = innovations.id AND eofilter_ou.organisation_id IN (:...engagingOrganisationsFilterSupportStatuses) AND eofilter_is.deleted_at IS NULL)`,
        { engagingOrganisationsFilterSupportStatuses: filters.engagingOrganisations }
      );
    }

    // this is similar to assignedToMe for A/QAs but simplier. They never overlap since this is admin only, but we should probably refactor this.
    if (filters.engagingOrganisationUnits && filters.engagingOrganisationUnits.length > 0) {
      innovationFetchQuery
        .innerJoin('innovations.innovationSupports', 'supports')
        .andWhere('supports.organisation_unit_id IN (:...engagingOrganisationsUnits)', {
          engagingOrganisationsUnits: filters.engagingOrganisationUnits
        });

      if (filters.supportStatuses && filters.supportStatuses.length > 0) {
        innovationFetchQuery
          .leftJoin(
            'innovations.innovationSupports',
            'accessorSupports',
            'accessorSupports.organisation_unit_id IN (:...engagingOrganisationsUnits)',
            { engagingOrganisationsUnits: filters.engagingOrganisationUnits }
          )
          .andWhere(`accessorSupports.status IN (:...supportStatuses)`, {
            supportStatuses: filters.supportStatuses
          });
      }
    }

    if (filters.assignedToMe) {
      if (domainContext.currentRole.role === ServiceRoleEnum.ASSESSMENT) {
        innovationFetchQuery.andWhere('assessments.assign_to_id = :assignToId', {
          assignToId: user.id
        });
      }

      if ([ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR].includes(domainContext.currentRole.role)) {
        innovationFetchQuery.innerJoin('innovations.innovationSupports', 'supports');
        innovationFetchQuery.innerJoin('supports.userRoles', 'userRole');
        innovationFetchQuery.innerJoin('userRole.user', 'supportingUsers');
        innovationFetchQuery.andWhere('supportingUsers.id = :supportingUserId', {
          supportingUserId: user.id
        });
        innovationFetchQuery.andWhere('userRole.organisation_unit_id = :orgUnitId', {
          orgUnitId: domainContext.organisation?.organisationUnit?.id
        });
      }
    }

    if (filters.suggestedOnly) {
      innovationFetchQuery.leftJoin('assessments.organisationUnits', 'assessmentOrganisationUnits');
      innovationFetchQuery.leftJoin(
        'innovations.innovationSupportLogs',
        'supportLogs',
        'supportLogs.type = :supportLogType',
        { supportLogType: InnovationSupportLogTypeEnum.ACCESSOR_SUGGESTION }
      );
      innovationFetchQuery.leftJoin('supportLogs.suggestedOrganisationUnits', 'supportLogOrgUnit');

      innovationFetchQuery.andWhere(
        `(assessmentOrganisationUnits.id = :suggestedOrganisationUnitId OR supportLogOrgUnit.id =:suggestedOrganisationUnitId)`,
        { suggestedOrganisationUnitId: domainContext.organisation?.organisationUnit?.id }
      );
    }

    if (filters.dateFilter && filters.dateFilter.length > 0) {
      const dateFilterKeyMap = new Map([['submittedAt', 'innovations.lastAssessmentRequestAt']]);

      for (const dateFilter of filters.dateFilter) {
        const filterKey = dateFilterKeyMap.get(dateFilter.field);
        if (dateFilter.startDate) {
          innovationFetchQuery.andWhere(`${filterKey} >= :startDate`, {
            startDate: dateFilter.startDate
          });
        }

        if (dateFilter.endDate) {
          // This is needed because default TimeStamp for a DD/MM/YYYY date is 00:00:00
          const beforeDateWithTimestamp = new Date(dateFilter.endDate);
          beforeDateWithTimestamp.setDate(beforeDateWithTimestamp.getDate() + 1);

          innovationFetchQuery.andWhere(`${filterKey} < :endDate`, {
            endDate: beforeDateWithTimestamp
          });
        }
      }
    }

    // Pagination and order is builtin in the latestWorkedByMe query, otherwise extra joins would be required... OR CTEs
    if (!filters.latestWorkedByMe) {
      // Pagination and ordering.
      innovationFetchQuery.skip(pagination.skip);
      innovationFetchQuery.take(pagination.take);

      for (const [key, order] of Object.entries(pagination.order)) {
        let field: string;
        switch (key) {
          case 'name':
            field = 'innovations.name';
            break;
          case 'location':
            field = 'innovations.countryName';
            break;
          case 'mainCategory':
            field = 'innovations.mainCategory';
            break;
          case 'submittedAt':
            field = 'innovations.lastAssessmentRequestAt';
            break;
          case 'updatedAt':
            field = 'innovations.updatedAt';
            break;
          case 'assessmentStartedAt':
            field = 'assessments.createdAt';
            break;
          case 'assessmentFinishedAt':
            field = 'assessments.finishedAt';
            break;
          default:
            field = 'innovations.createdAt';
            break;
        }
        innovationFetchQuery.addOrderBy(field, order);
      }
    }

    const [innovations, innovationsCount] = await innovationFetchQuery.getManyAndCount();
    const innovationsIds = [...new Set(innovations.map(item => item.id))]; // there shouldn't be repeated ids, but just in case...
    //#endregion

    // Fallback fast if no innovations
    if (innovationsCount === 0) return { count: 0, data: [] };

    //#region fetch assessments
    // Grab the assessments for the innovations (if required)
    let assessmentsMap = new Map<string, InnovationAssessmentEntity>(); // not exactly InnovationAssessmentEntity, but just the required fields
    let innovationsReassessmentCount = new Map<string, number>();
    if (filters.fields?.includes('assessment')) {
      const innovationsAssessmentsQuery = connection
        .createQueryBuilder(InnovationAssessmentEntity, 'assessments')
        .select('assessments.id', 'assessments_id')
        .addSelect('assessments.createdAt', 'assessments_created_at')
        .addSelect('assessments.finishedAt', 'assessments_finished_at')
        .addSelect('assessments.exemptedAt', 'assessments_exempted_at')
        .innerJoin('assessments.innovation', 'innovation')
        .addSelect('innovation.id', 'innovation_id')
        .where('assessments.innovation_id IN (:...innovationsIds)', { innovationsIds });

      if (fetchUsers) {
        innovationsAssessmentsQuery.leftJoin('assessments.assignTo', 'assignTo');
        innovationsAssessmentsQuery.addSelect('assignTo.id', 'assignTo_id');
        innovationsAssessmentsQuery.addSelect('assignTo.status', 'assignTo_status');
      }

      assessmentsMap = new Map((await innovationsAssessmentsQuery.getMany()).map(a => [a.innovation.id, a]));

      // Required to count reassessments
      innovationsReassessmentCount = new Map(
        (
          await connection
            .createQueryBuilder(InnovationReassessmentRequestEntity, 'reassessments')
            .select('innovation_id', 'innovation_id')
            .addSelect('COUNT(*)', 'reassessments_count')
            .where('innovation_id IN (:...innovationsIds)', { innovationsIds })
            .groupBy('innovation_id')
            .getRawMany()
        ).map(r => [r.innovation_id, r.reassessments_count])
      );
    }
    //#endregion

    //#region fetch supporting organisations
    // Grab the supporting organisations for the innovations (if required)
    const supportingOrganisationsMap = new Map<string, InnovationSupportEntity[]>(); // not exactly InnovationSupportEntity, but just the required fields
    if (filters.fields?.includes('supports')) {
      const innovationsSupportsQuery = connection
        .createQueryBuilder(InnovationSupportEntity, 'supports')
        .select('supports.id', 'supports_id')
        .addSelect('supports.status', 'supports_status')
        .addSelect('supports.updatedAt', 'supports_updated_at')
        .innerJoin('supports.innovation', 'innovation')
        .addSelect('innovation.id', 'innovation_id')
        .innerJoin('supports.organisationUnit', 'organisationUnit')
        .addSelect('organisationUnit.id', 'organisationUnit_id')
        .addSelect('organisationUnit.name', 'organisationUnit_name')
        .addSelect('organisationUnit.acronym', 'organisationUnit_acronym')
        .innerJoin('organisationUnit.organisation', 'organisation')
        .addSelect('organisation.id', 'organisation_id')
        .addSelect('organisation.name', 'organisation_name')
        .addSelect('organisation.acronym', 'organisation_acronym')
        .where('supports.innovation_id IN (:...innovationsIds)', { innovationsIds });

      if (filters.engagingOrganisationUnits && filters.engagingOrganisationUnits.length > 0) {
        innovationsSupportsQuery.andWhere('organisationUnit.id IN (:...engagingOrganisationUnits)', {
          engagingOrganisationUnits: filters.engagingOrganisationUnits
        });
      }

      if (fetchUsers) {
        innovationsSupportsQuery
          .leftJoin('supports.userRoles', 'userRole')
          .addSelect('userRole.id', 'userRole_id')
          .leftJoin('userRole.user', 'user')
          .addSelect('user.id', 'user_id')
          .addSelect('user.status', 'user_status');
      }

      (await innovationsSupportsQuery.getMany()).forEach(s => {
        if (!supportingOrganisationsMap.has(s.innovation.id)) {
          supportingOrganisationsMap.set(s.innovation.id, []);
        }
        supportingOrganisationsMap.get(s.innovation.id)?.push(s);
      });
    }
    //#endregion

    // Fetch users names.
    let usersInfo = new Map<string, Awaited<ReturnType<DomainUsersService['getUsersList']>>[0]>();
    if (fetchUsers) {
      const assessmentUsersIds = new Set(
        [...assessmentsMap.values()]
          .filter(
            (a): a is InnovationAssessmentEntity & { assignTo: { id: string } } =>
              a.assignTo != null && a.assignTo?.status !== UserStatusEnum.DELETED
          )
          .map(a => a.assignTo.id)
      );
      const supportingUsersIds = new Set(
        [...supportingOrganisationsMap.values()].flatMap(s =>
          s.flatMap(support =>
            support.userRoles.filter(item => item.user.status !== UserStatusEnum.DELETED).map(item => item.user.id)
          )
        )
      );
      usersInfo = new Map(
        (
          await this.domainService.users.getUsersList({
            userIds: [...assessmentUsersIds, ...supportingUsersIds]
          })
        ).map(u => [u.id, u])
      );
    }

    //#region notifications
    // Notifications.
    const notificationsMap = new Map<string, { notificationsUnread: number; tasks: number; messages: number }>(); // not exactly NotificationEntity, but just the required fields
    if (filters.fields?.includes('notifications') || filters.fields?.includes('statistics')) {
      const notificationsQuery = connection
        .createQueryBuilder(NotificationEntity, 'notifications')
        .select('notifications.id', 'notifications_id')
        // .addSelect('notifications.type', 'notifications_type')
        .innerJoin('notifications.innovation', 'innovation')
        .addSelect('innovation.id', 'innovation_id')
        .innerJoin(
          'notifications.notificationUsers',
          'notificationUsers',
          'notificationUsers.user_role_id = :notificationUserId AND notificationUsers.read_at IS NULL',
          { notificationUserId: domainContext.currentRole.id }
        )
        .where('notifications.innovation_id IN (:...innovationsIds)', { innovationsIds });

      if (domainContext.organisation?.organisationUnit?.id) {
        notificationsQuery.innerJoin('notificationUsers.userRole', 'userRole');
        notificationsQuery
          .innerJoin('userRole.organisationUnit', 'organisationUnit')
          .where('organisationUnit.id = :orgUnitId', {
            orgUnitId: domainContext.organisation.organisationUnit.id
          });
      }

      if (filters.fields?.includes('statistics')) {
        notificationsQuery
          .addSelect('notifications.contextType', 'notifications_context_type')
          .addSelect('notifications.contextDetail', 'notifications_context_detail')
          .addSelect('notifications.params', 'notifications_params');
      }

      // Process the notification / statistics.
      (await notificationsQuery.getMany()).forEach(n => {
        if (!notificationsMap.has(n.innovation.id)) {
          notificationsMap.set(n.innovation.id, {
            notificationsUnread: 0,
            tasks: 0,
            messages: 0
          });
        }
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const notificationCounter = notificationsMap.get(n.innovation.id)!;
        notificationCounter.notificationsUnread++;

        if (filters.fields?.includes('statistics')) {
          if (n.contextType === 'MESSAGES') {
            notificationCounter.messages++;
          }
          if (
            n.contextDetail === 'TA01_TASK_CREATION_TO_INNOVATOR' ||
            n.contextDetail === 'TA06_TASK_REOPEN_TO_INNOVATOR'
          ) {
            notificationCounter.tasks++;
          }
        }
      });
    }

    let innovationsGroupedStatus = new Map<string, InnovationGroupedStatusEnum>();
    if (filters.fields?.includes('groupedStatus')) {
      if (filters.groupedStatuses && filters.groupedStatuses.length > 0) {
        // means that inner join was made
        innovationsGroupedStatus = new Map(innovations.map(cur => [cur.id, cur.innovationGroupedStatus.groupedStatus]));
      } else {
        const innovationIds = innovations.map(i => i.id);
        innovationsGroupedStatus = await this.domainService.innovations.getInnovationsGroupedStatus({ innovationIds });
      }
    }

    return {
      count: innovationsCount,
      data: await Promise.all(
        innovations.map(async innovation => {
          let assessment:
            | undefined
            | null
            | {
                id: string;
                createdAt: Date;
                finishedAt: null | Date;
                assignedTo?: { name: string };
                reassessmentCount: number;
              };
          const supports = supportingOrganisationsMap.get(innovation.id);

          // Assessment parsing.
          if (filters.fields?.includes('assessment')) {
            const assessmentRaw = assessmentsMap.get(innovation.id);
            if (assessmentRaw) {
              assessment = {
                id: assessmentRaw.id,
                createdAt: assessmentRaw.createdAt,
                ...(assessmentRaw.assignTo && {
                  assignedTo: { name: usersInfo.get(assessmentRaw.assignTo?.id)?.displayName ?? '' }
                }),
                finishedAt: assessmentRaw.finishedAt,
                reassessmentCount: innovationsReassessmentCount.get(innovation.id) ?? 0,
                ...(domainContext.currentRole.role === ServiceRoleEnum.ASSESSMENT
                  ? { isExempted: !!assessmentRaw.exemptedAt }
                  : {})
              };
            } else {
              assessment = null;
            }
          }

          return {
            id: innovation.id,
            name: innovation.name,
            description: innovation.description,
            status: innovation.status,
            statusUpdatedAt: innovation.statusUpdatedAt,
            submittedAt: innovation.lastAssessmentRequestAt,
            updatedAt: innovation.updatedAt,
            countryName: innovation.countryName,
            postCode: innovation.postcode,
            mainCategory: innovation.mainCategory,
            otherMainCategoryDescription: innovation.otherCategoryDescription,

            ...(filters.fields?.includes('groupedStatus') && {
              groupedStatus:
                innovationsGroupedStatus.get(innovation.id) ?? InnovationGroupedStatusEnum.RECORD_NOT_SHARED
            }),
            ...(assessment && { assessment }),
            ...(supports && {
              supports: supports.map(support => ({
                id: support.id,
                status: support.status,
                updatedAt: support.updatedAt,
                organisation: {
                  id: support.organisationUnit.organisation.id,
                  name: support.organisationUnit.organisation.name,
                  acronym: support.organisationUnit.organisation.acronym,
                  unit: {
                    id: support.organisationUnit.id,
                    name: support.organisationUnit.name,
                    acronym: support.organisationUnit.acronym,
                    // Users are only returned only for ENGAGING supports status, returning nothing on all other cases.
                    ...((support.userRoles ?? []).length > 0 && {
                      users: support.userRoles
                        .map(su => ({
                          name: usersInfo.get(su.user.id)?.displayName || '',
                          role: su.role
                        }))
                        .filter(authUser => authUser.name)
                    })
                  }
                }
              }))
            }),
            // Add notifications
            ...(filters.fields?.includes('notifications') && {
              notifications: notificationsMap.get(innovation.id)?.notificationsUnread ?? 0
            }),

            // Add statistics
            ...(filters.fields?.includes('statistics') && {
              statistics: {
                tasks: notificationsMap.get(innovation.id)?.tasks ?? 0,
                messages: notificationsMap.get(innovation.id)?.messages ?? 0
              }
            })
          };
        })
      )
    };
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
   *  - filters: the filters to apply
   * @param em optional entity manager
   * @returns list of innovations with only the selected fields
   */
  async getInnovationsListNew<S extends InnovationListSelectType>(
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
    const fieldGroups = groupBy(params.fields, item => item.split('.')[0]);

    const connection = em ?? this.sqlConnection.manager;
    const query = connection
      .createQueryBuilder(InnovationListView, 'innovation')
      // currently I'm only handling the root selects here, might change in the future. ie: withSupports add the selects
      //.select(xpto.select.map(item => (item.includes('.') ? item : `innovation.${item}`)));
      .select(params.fields.filter(item => !item.includes('.')).map(item => `innovation.${item}`));

    // Special role constraints (maybe make handler in the future)
    if (isAccessorDomainContextType(domainContext)) {
      // force the innovation to be shared with the support organisation
      query.innerJoin(
        'innovation_share',
        'shares',
        'shares.innovation_id = innovation.id AND shares.organisation_id = :organisationId',
        {
          organisationId: domainContext.organisation.id
        }
      );
      // automatically add in_progress since A/QA can't see the others (yet). This might become a filter for A/QAs in the future
      query.andWhere('innovation.status IN (:...innovationStatus)', {
        innovationStatus: [InnovationStatusEnum.IN_PROGRESS]
      });

      // Accessors can only see innovations that they are supporting
      if (domainContext.currentRole.role === ServiceRoleEnum.ACCESSOR) {
        if (!nestedObjects.has('support')) {
          nestedObjects.add('support');
        }
        query.andWhere('support.status IN (:...accessorSupportStatusFilter)', {
          accessorSupportStatusFilter: [InnovationSupportStatusEnum.ENGAGING, InnovationSupportStatusEnum.CLOSED]
        });
      }
    }

    // Exclude withdrawn innovations from non admin users (at least for now)
    if (!isAdminDomainContextType(domainContext)) {
      query.andWhere('innovation.status != :deletedStatus', { deletedStatus: InnovationStatusEnum.WITHDRAWN });
    }

    // Nested object handlers and joins
    nestedObjects.forEach(join => {
      this.joinHandlers[join as keyof typeof this.joinHandlers](domainContext, query, fieldGroups[join] as any[]);
    });

    // filters
    for (const [key, value] of Object.entries(params.filters ?? {})) {
      // add to do a as any for the filters as the value was evaluated as never but this should be safe to use
      await (this.filtersHandlers[key as keyof typeof this.filtersHandlers] as any)(domainContext, query, value);
    }

    // pagination
    query.skip(params.pagination.skip);
    query.take(params.pagination.take);
    Object.entries(params.pagination.order).forEach(([key, value]) => {
      if (value === 'ASC' || value === 'DESC') {
        // Special case for orders we might improve this in the future if it becomes the norm
        if (key.startsWith('owner.')) {
          key = 'owner' + key.split('.')[1]!.charAt(0).toUpperCase() + key.split('.')[1]?.slice(1);
        }
        query.addOrderBy(key.includes('.') ? key : `innovation.${key}`, value);
      }
    });

    const queryResult = await query.getManyAndCount();

    // Optimization to only fetch users once
    const usersMap = nestedObjects.has('owner')
      ? await this.domainService.users.getUsersMap({
          userIds: queryResult[0].map(i => i.ownerId).filter(isString)
        })
      : new Map();

    // Transform the entity into the response DTO
    return {
      count: queryResult[1],
      data: queryResult[0].map(item => {
        const res = {} as any;
        Object.entries(fieldGroups).forEach(([key, value]) => {
          if (nestedObjects.has(key)) {
            if (key === 'value') {
              // This will allow asking for support and getting all the default fields
              throw new NotImplementedError(GenericErrorsEnum.NOT_IMPLEMENTED_ERROR, {
                message: 'support for nested objects not implemented yet'
              });
            }
            const handler = this.displayHandlers[key as keyof typeof this.displayHandlers];
            if (handler) {
              res[key] = handler(item, value as any[], { usersMap }); // this any should be safe since it comes from the groupBy
            }
          } else {
            // Handle plain object directly from the view
            res[key] = item[value[0] as keyof InnovationListView];
          }
        });
        return res;
      }) // I'm filtering by select and adding the support field
    };
  }

  //#region join handlers
  // Nested object handlers / joins
  private readonly joinHandlers: {
    [k in InnovationListJoinTypes]: (
      domainContext: DomainContextType,
      query: SelectQueryBuilder<InnovationListView>,
      value: InnovationListChildrenType<k> | any
    ) => void;
  } = {
    support: this.withSupport.bind(this),
    owner: this.withOwner.bind(this)
  };

  /**
   * Add support information to the query
   * @param query the innovation list view query
   * @param organisationUnitId the organisation unit id to add the support
   * @returns query with the support information
   */
  private withSupport(
    domainContext: DomainContextType,
    query: SelectQueryBuilder<InnovationListView>,
    fields: ('support.id' | 'support.status' | 'support.updatedAt')[] = ['support.id']
  ): void {
    if (fields.length) {
      if (!isAccessorDomainContextType(domainContext)) {
        throw new BadRequestError(GenericErrorsEnum.INVALID_PAYLOAD, {
          message: 'Support is only valid for accessor domain context'
        });
      }

      query
        .addSelect(fields)
        .leftJoin('innovation.supports', 'support', 'support.organisation_unit_id = :organisationUnitId', {
          organisationUnitId: domainContext.organisation.organisationUnit.id
        });
    }
  }

  private withOwner(
    _domainContext: DomainContextType,
    query: SelectQueryBuilder<InnovationListView>,
    fields: ('owner.id' | 'owner.name' | 'owner.companyName')[] = ['owner.id']
  ): void {
    if (fields.length) {
      query.addSelect([
        'innovation.ownerId',
        ...(fields.includes('owner.companyName') ? ['innovation.ownerCompanyName'] : [])
      ]);
    }
  }
  //#endregion

  //#region filter handlers
  private readonly filtersHandlers: {
    [k in keyof Required<InnovationListFilters>]:
      | ((
          domainContext: DomainContextType,
          query: SelectQueryBuilder<InnovationListView>,
          value: Required<InnovationListFilters>[k]
        ) => void | Promise<void>)
      | ((
          domainContext: DomainContextType,
          query: SelectQueryBuilder<InnovationListView>,
          value: Required<InnovationListFilters>[k][]
        ) => void | Promise<void>);
  } = {
    assignedToMe: this.addAssignedToMeFilter.bind(this),
    careSettings: this.addJsonArrayInFilter('careSettings').bind(this),
    categories: this.addJsonArrayInFilter('categories').bind(this),
    dateFilters: this.addDateFilters.bind(this),
    diseasesAndConditions: this.addJsonArrayInFilter('diseasesAndConditions').bind(this),
    engagingOrganisations: this.addJsonArrayInFilter('engagingOrganisations', {
      fieldSelector: '$.organisationId'
    }).bind(this),
    groupedStatuses: this.addInFilter('groupedStatuses', 'groupedStatus').bind(this),
    involvedAACProgrammes: this.addJsonArrayInFilter('involvedAACProgrammes').bind(this),
    keyHealthInequalities: this.addJsonArrayInFilter('keyHealthInequalities').bind(this),
    locations: this.addLocationFilter.bind(this),
    search: this.addSearchFilter.bind(this),
    suggestedOnly: this.addSuggestedOnlyFilter.bind(this),
    supportStatuses: this.addSupportFilter.bind(this)
  };

  /**
   * adds a filter that searches for a value in the json arrays of the innovation list view
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
        query.innerJoin('support.userRoles', 'supportUserRoles');
        query.andWhere('supportUserRoles.id = :userRoleId', {
          userRoleId: domainContext.currentRole.id
        });
      }
      if (isAssessmentDomainContextType(domainContext)) {
        throw new NotImplementedError(GenericErrorsEnum.NOT_IMPLEMENTED_ERROR, {
          message: 'Assigned to me filter not implemented for Needs Assessment Team yet'
        });
      }
      // Choose to do nothing instead of throwing an error if this is passed when not supposed (joi should handle it)
      // but as a behavior think it's better to ignore the filter than to throw an error
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
          qb.where('1 <> 1'); // ugly shortcut to not worry about the first OR
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
    if (value && isAccessorDomainContextType(domainContext)) {
      query
        .innerJoin('innovation', 'i', 'i.id = innovation.id')
        .leftJoin('i.assessments', 'assessments')

        .leftJoin('assessments.organisationUnits', 'assessmentOrganisationUnits')
        .leftJoin('i.innovationSupportLogs', 'supportLogs', 'supportLogs.type = :supportLogType', {
          supportLogType: InnovationSupportLogTypeEnum.ACCESSOR_SUGGESTION
        })
        .leftJoin('supportLogs.suggestedOrganisationUnits', 'supportLogOrgUnit')
        .andWhere(
          `(assessmentOrganisationUnits.id = :suggestedOrganisationUnitId OR supportLogOrgUnit.id =:suggestedOrganisationUnitId)`,
          { suggestedOrganisationUnitId: domainContext.organisation.organisationUnit.id }
        );

      // while ugly the above is better performant when filtering only by suggested units without using documents and other filters, pretty much the same otherwise (maybe a bit slower)
      // query.andWhere(
      //   `EXISTS(SELECT 1 FROM OPENJSON(innovation.suggested_units) WHERE JSON_VALUE(value, '$.unitId') = :contextOrganisationUnitId)`,
      //   { contextOrganisationUnitId: domainContext.organisation.organisationUnit.id }
      // );
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
      query.andWhere(
        new Brackets(qb => {
          qb.where('support.status IN (:...supportStatuses)', { supportStatuses: supportStatuses });
          if (supportStatuses.includes(InnovationSupportStatusEnum.UNASSIGNED)) {
            qb.orWhere('support.id IS NULL');
          }
        })
      );
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
    [k in InnovationListJoinTypes]: (
      item: InnovationListView,
      fields: InnovationListChildrenType<k>[],
      extra: { usersMap: Map<string, Awaited<ReturnType<DomainUsersService['getUsersList']>>[0]> }
    ) => Partial<InnovationListFullResponseType[k]>;
  } = {
    support: this.displaySupport.bind(this),
    owner: this.displayOwner.bind(this)
  };

  private displaySupport(
    item: InnovationListView,
    fields: InnovationListChildrenType<'support'>[]
  ): Partial<InnovationListFullResponseType['support']> {
    // support is handled differently to remove the nested array since it's only 1 element in this case
    return {
      ...(fields.includes('support.status' as any) && {
        status: item.supports?.[0]?.status ?? InnovationSupportStatusEnum.UNASSIGNED
      }),
      ...(fields.includes('support.updatedAt' as any) && { updatedAt: item.supports?.[0]?.updatedAt })
    };
  }

  private displayOwner(
    item: InnovationListView,
    fields: InnovationListChildrenType<'owner'>[],
    extra: { usersMap: Map<string, Awaited<ReturnType<DomainUsersService['getUsersList']>>[0]> }
  ): Partial<InnovationListFullResponseType['owner']> {
    if (!item.ownerId) {
      return null;
    }
    return {
      ...(fields.includes('owner.id') && { id: item.ownerId }),
      ...(fields.includes('owner.name') && {
        name: extra.usersMap.get(item.ownerId)?.displayName ?? null
      }),
      ...(fields.includes('owner.companyName') && {
        companyName: item.ownerCompanyName ?? null
      })
    };
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
    groupedStatus: InnovationGroupedStatusEnum;
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
      organisation?: { name: string; size: null | string };
    };
    lastEndSupportAt: null | Date;
    assessment?: null | {
      id: string;
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
        'innovation.description',
        'innovation.status',
        'innovation.statusUpdatedAt',
        'innovation.lastAssessmentRequestAt',
        'innovation.countryName',
        'innovation.postcode',
        'innovation.createdAt',
        'innovationOwner.id',
        'innovationOwner.status',
        'innovationOwnerUserRole.id',
        'innovationOwnerOrganisation.isShadow',
        'innovationOwnerOrganisation.name',
        'innovationOwnerOrganisation.size',
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
      query.leftJoin('innovation.assessments', 'innovationAssessments');
      query.leftJoin('innovationAssessments.assignTo', 'assignTo');
      query.leftJoin('assignTo.serviceRoles', 'assignToRoles', 'assignToRoles.role = :assessmentRole', {
        assessmentRole: ServiceRoleEnum.ASSESSMENT
      });
      query.addSelect([
        'innovationAssessments.id',
        'innovationAssessments.createdAt',
        'innovationAssessments.finishedAt',
        'assignTo.id',
        'assignTo.status',
        'assignToRoles.id'
      ]);
    }

    // Supports relations.
    if (filters.fields?.includes('supports')) {
      query.leftJoin('innovation.innovationSupports', 'innovationSupports');
      query.leftJoin('innovationSupports.organisationUnit', 'supportingOrganisationUnit');
      query.addSelect(['innovationSupports.id', 'innovationSupports.status', 'supportingOrganisationUnit.id']);
    }

    const innovation = await query.getOne();
    if (!innovation) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    // Only fetch the document version and category data (maybe create a helper for this in the future)
    const documentData = await connection
      .createQueryBuilder(InnovationDocumentEntity, 'innovationDocument')
      .select("JSON_QUERY(document, '$.INNOVATION_DESCRIPTION.categories')", 'categories')
      .addSelect(
        "JSON_VALUE(document, '$.INNOVATION_DESCRIPTION.otherCategoryDescription')",
        'otherCategoryDescription'
      )
      .addSelect('version', 'version')
      .where('innovationDocument.id = :innovationId', { innovationId: innovation.id })
      .getRawOne();

    // Fetch users names.
    const assessmentUsersIds = filters.fields?.includes('assessment')
      ? innovation.assessments
          ?.filter(
            (assessment): assessment is InnovationAssessmentEntity & { assignTo: { id: string } } =>
              assessment.assignTo != null && assessment.assignTo?.status !== UserStatusEnum.DELETED
          )
          .map(assessment => assessment.assignTo.id)
      : [];
    const categories = documentData.categories ? JSON.parse(documentData.categories) : [];
    let usersInfo = [];
    let ownerInfo = undefined;
    let ownerPreferences = undefined;

    if (innovation.owner && innovation.owner.status !== UserStatusEnum.DELETED) {
      ownerPreferences = await this.domainService.users.getUserPreferences(innovation.owner.id);
      usersInfo = await this.domainService.users.getUsersList({
        userIds: [...assessmentUsersIds, ...[innovation.owner.id]]
      });
      ownerInfo = usersInfo.find(item => item.id === innovation.owner?.id);
    } else {
      usersInfo = await this.domainService.users.getUsersList({ userIds: [...assessmentUsersIds] });
    }

    // Assessment parsing.
    let assessment:
      | undefined
      | null
      | {
          id: string;
          createdAt: Date;
          finishedAt: null | Date;
          assignedTo?: { id: string; name: string; userRoleId: string };
          reassessmentCount: number;
        };

    if (filters.fields?.includes('assessment')) {
      if (innovation.assessments.length === 0) {
        assessment = null;
      } else {
        if (innovation.assessments.length > 1) {
          // This should never happen, but...
          this.logger.error(`Innovation ${innovation.id} with ${innovation.assessments.length} assessments detected`);
        }

        const assignTo = usersInfo.find(item => item.id === innovation.assessments[0]?.assignTo?.id && item.isActive);

        if (innovation.assessments[0]) {
          // ... but if exists, on this list, we show information about one of them.
          assessment = {
            id: innovation.assessments[0].id,
            createdAt: innovation.assessments[0].createdAt,
            finishedAt: innovation.assessments[0].finishedAt,
            ...(assignTo &&
              assignTo.roles[0] && {
                assignedTo: { id: assignTo.id, name: assignTo.displayName, userRoleId: assignTo.roles[0].id }
              }),
            reassessmentCount: (await innovation.reassessmentRequests).length
          };
        }
      }
    }

    return {
      id: innovation.id,
      name: innovation.name,
      description: innovation.description,
      version: documentData.version,
      status: innovation.status,
      groupedStatus: innovation.innovationGroupedStatus.groupedStatus,
      statusUpdatedAt: innovation.statusUpdatedAt,
      submittedAt: innovation.lastAssessmentRequestAt,
      countryName: innovation.countryName,
      postCode: innovation.postcode,
      categories,
      otherCategoryDescription: documentData.otherCategoryDescription,
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
                    size: innovation.owner.serviceRoles[0].organisation.size
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
      .leftJoinAndSelect('innovation.assessments', 'assessments')
      .where('innovation.status IN (:...innovationStatus)', {
        innovationStatus: filters.innovationStatus
      })
      .andWhere(`DATEDIFF(day, innovation.submitted_at, GETDATE()) > 7 AND assessments.finished_at IS NULL`);

    if (filters.assignedToMe) {
      query.andWhere('assessments.assign_to_id = :assignToId', { assignToId: domainContext.id });
    }

    return query.getCount();
  }

  async createInnovation(
    domainContext: DomainContextType,
    data: {
      name: string;
      description: string;
      countryName: string;
      postcode?: string;
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

          countryName: data.countryName,
          description: data.description,
          owner: UserEntity.new({ id: domainContext.id }),
          postcode: data.postcode,
          status: InnovationStatusEnum.CREATED,
          statusUpdatedAt: new Date(),

          createdAt: now,
          createdBy: domainContext.id,
          updatedAt: now,
          updatedBy: domainContext.id
        })
      );

      await transaction.save(
        InnovationDocumentEntity,
        createDocumentFromInnovation(savedInnovation, { website: data.website })
      );

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
        {
          activity: ActivityEnum.INNOVATION_CREATION,
          domainContext,
          innovationId: savedInnovation.id
        },
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
    const em = entityManager || this.sqlConnection.manager;

    // Sanity check if all organisation exists.
    const organisations = await em
      .createQueryBuilder(OrganisationEntity, 'organisation')
      .select('organisation.name')
      .where('organisation.id IN (:...organisationIds)', { organisationIds: organisationShares })
      .getMany();
    if (organisations.length != organisationShares.length) {
      throw new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATIONS_NOT_FOUND, {
        details: { error: 'Unknown organisations' }
      });
    }

    const innovation = await em
      .createQueryBuilder(InnovationEntity, 'innovation')
      .select(['innovation.id', 'innovation.status', 'organisationShares.id'])
      .leftJoin('innovation.organisationShares', 'organisationShares')
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

    await em.transaction(async transaction => {
      // Delete shares
      if (deletedShares.length > 0) {
        // Check for active supports
        const supports = await transaction
          .createQueryBuilder(InnovationSupportEntity, 'innovationSupport')
          .innerJoin('innovationSupport.innovation', 'innovation')
          .innerJoin('innovationSupport.organisationUnit', 'organisationUnit')
          .where('innovation.id = :innovationId', { innovationId })
          .andWhere('organisationUnit.organisation IN (:...ids)', { ids: deletedShares })
          .getMany();

        const supportIds = supports.map(support => support.id);
        if (supportIds.length > 0) {
          // Decline all tasks for the deleted shares supports
          await transaction
            .getRepository(InnovationTaskEntity)
            .createQueryBuilder()
            .update()
            .where('innovation_support_id IN (:...ids)', { ids: supportIds })
            .andWhere('status IN (:...status)', {
              status: [InnovationTaskStatusEnum.OPEN]
            })
            .set({
              status: InnovationTaskStatusEnum.DECLINED,
              updatedBy: domainContext.id,
              updatedByUserRole: UserRoleEntity.new({ id: domainContext.currentRole.id })
            })
            .execute();

          await transaction
            .getRepository(InnovationSupportEntity)
            .createQueryBuilder()
            .update()
            .where('id IN (:...ids)', { ids: supportIds })
            .set({
              status: InnovationSupportStatusEnum.UNASSIGNED,
              updatedBy: domainContext.id,
              deletedAt: new Date().toISOString()
            })
            .execute();
        }
      }

      innovation.organisationShares = organisationShares.map(id => OrganisationEntity.new({ id }));
      await this.domainService.innovations.addActivityLog(
        transaction,
        { innovationId, activity: ActivityEnum.SHARING_PREFERENCES_UPDATE, domainContext },
        { organisations: organisations.map(o => o.name) }
      );
      await transaction.save(InnovationEntity, innovation);
    });

    if (addedShares.length > 0 && innovation.status === InnovationStatusEnum.IN_PROGRESS) {
      await this.notifierService.send(domainContext, NotifierTypeEnum.INNOVATION_DELAYED_SHARE, {
        innovationId: innovation.id,
        newSharedOrgIds: addedShares
      });
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
          updatedBy: domainContext.id
        }
      );

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

  async withdrawInnovation(
    context: DomainContextType,
    innovationId: string,
    reason: string,
    entityManager?: EntityManager
  ): Promise<{ id: string }> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const dbInnovation = await connection
      .createQueryBuilder(InnovationEntity, 'innovations')
      .select(['innovations.id'])
      .where('innovations.id = :innovationId', { innovationId })
      .getOne();
    if (!dbInnovation) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    const savedInnovations = await connection.transaction(async transaction => {
      return this.domainService.innovations.withdrawInnovations(
        { id: context.id, roleId: context.currentRole.id },
        [{ id: dbInnovation.id, reason }],
        transaction
      );
    });

    for (const savedInnovation of savedInnovations) {
      await this.notifierService.send(context, NotifierTypeEnum.INNOVATION_WITHDRAWN, {
        innovation: {
          id: savedInnovation.id,
          name: savedInnovation.name,
          affectedUsers: savedInnovation.affectedUsers
        }
      });
    }
    return { id: dbInnovation.id };
  }

  async pauseInnovation(
    domainContext: DomainContextType,
    innovationId: string,
    data: { message: string },
    entityManager?: EntityManager
  ): Promise<{ id: string }> {
    const connection = entityManager ?? this.sqlConnection.manager;

    const dbSupports = await connection
      .createQueryBuilder(InnovationSupportEntity, 'supports')
      .innerJoinAndSelect('supports.userRoles', 'userRole')
      .innerJoinAndSelect('userRole.user', 'user')
      .where('supports.innovation_id = :innovationId', { innovationId })
      .andWhere('user.status <> :userDeleted', { userDeleted: UserStatusEnum.DELETED })
      .getMany();

    const previousAssignedAccessors = dbSupports.flatMap(support =>
      support.userRoles.map(item => ({
        id: item.user.id,
        role: item.role,
        unitId: item.organisationUnitId
      }))
    );

    const result = await connection.transaction(async transaction => {
      const sections = await transaction
        .createQueryBuilder(InnovationSectionEntity, 'section')
        .select(['section.id'])
        .addSelect('section.innovation_id')
        .where('section.innovation_id = :innovationId', { innovationId })
        .getMany();

      // Decline all tasks for all innovation supports.
      await transaction.getRepository(InnovationTaskEntity).update(
        {
          innovationSection: In(sections.map(section => section.id)),
          status: In([InnovationTaskStatusEnum.OPEN])
        },
        {
          status: InnovationTaskStatusEnum.DECLINED,
          updatedBy: domainContext.id,
          updatedByUserRole: UserRoleEntity.new({ id: domainContext.currentRole.id })
        }
      );

      // Update all support to UNASSIGNED.
      for (const innovationSupport of dbSupports) {
        innovationSupport.status = InnovationSupportStatusEnum.UNASSIGNED;
        innovationSupport.userRoles = []; //TODO: refactor this. Delete from innovation_support_user table directly
        innovationSupport.updatedBy = domainContext.id;
        await transaction.save(InnovationSupportEntity, innovationSupport);
      }

      // Update innovation status.
      await transaction.update(
        InnovationEntity,
        { id: innovationId },
        {
          status: InnovationStatusEnum.PAUSED,
          statusUpdatedAt: new Date().toISOString(),
          updatedBy: domainContext.id
        }
      );

      // Reject all PENDING AND APPROVED export requests
      await transaction
        .createQueryBuilder(InnovationExportRequestEntity, 'request')
        .update({
          status: InnovationExportRequestStatusEnum.REJECTED,
          rejectReason: TranslationHelper.translate('DEFAULT_MESSAGES.EXPORT_REQUEST.STOP_SHARING'),
          updatedBy: domainContext.id
        })
        .where(
          'innovation_id = :innovationId AND (status = :pendingStatus OR (status = :approvedStatus AND updated_at >= :expiredAt))',
          {
            innovationId,
            pendingStatus: InnovationExportRequestStatusEnum.PENDING,
            approvedStatus: InnovationExportRequestStatusEnum.APPROVED,
            expiredAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString()
          }
        )
        .execute();

      await this.domainService.innovations.addActivityLog(
        transaction,
        { innovationId, activity: ActivityEnum.INNOVATION_PAUSE, domainContext },
        { message: data.message }
      );

      return { id: innovationId };
    });

    await this.notifierService.send(domainContext, NotifierTypeEnum.INNOVATION_STOP_SHARING, {
      innovationId,
      affectedUsers: previousAssignedAccessors,
      message: data.message
    });

    return result;
  }

  async getInnovationActivitiesLog(
    innovationId: string,
    filters: { activityTypes?: ActivityTypeEnum[]; startDate?: string; endDate?: string },
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
    if (filters.startDate) {
      query.andWhere('activityLog.createdAt >= :startDate', { startDate: filters.startDate });
    }
    if (filters.endDate) {
      // This is needed because default TimeStamp for a DD/MM/YYYY date is 00:00:00
      const beforeDateWithTimestamp = new Date(filters.endDate);
      beforeDateWithTimestamp.setDate(beforeDateWithTimestamp.getDate() + 1);

      query.andWhere('activityLog.createdAt < :endDate', { endDate: beforeDateWithTimestamp });
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
      if (params.interveningUserId) {
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

        if (params.interveningUserId) {
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
}
