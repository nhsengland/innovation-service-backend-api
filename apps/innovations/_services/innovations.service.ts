import { inject, injectable } from 'inversify';
import { EntityManager, In, SelectQueryBuilder } from 'typeorm';

import { ActivityLogEntity, InnovationActionEntity, InnovationAssessmentEntity, InnovationCategoryEntity, InnovationEntity, InnovationExportRequestEntity, InnovationReassessmentRequestEntity, InnovationSectionEntity, InnovationSupportEntity, InnovationSupportTypeEntity, LastSupportStatusViewEntity, NotificationEntity, NotificationUserEntity, OrganisationEntity, OrganisationUnitEntity, UserEntity, UserRoleEntity } from '@innovations/shared/entities';
import { AccessorOrganisationRoleEnum, ActivityEnum, ActivityTypeEnum, InnovationActionStatusEnum, InnovationCategoryCatalogueEnum, InnovationExportRequestStatusEnum, InnovationGroupedStatusEnum, InnovationSectionEnum, InnovationSectionStatusEnum, InnovationStatusEnum, InnovationSupportStatusEnum, InnovatorOrganisationRoleEnum, NotificationContextDetailEnum, NotificationContextTypeEnum, NotifierTypeEnum, PhoneUserPreferenceEnum, ServiceRoleEnum } from '@innovations/shared/enums';
import { ForbiddenError, InnovationErrorsEnum, NotFoundError, OrganisationErrorsEnum, UnprocessableEntityError } from '@innovations/shared/errors';
import { DatesHelper, PaginationQueryParamsType, TranslationHelper } from '@innovations/shared/helpers';
import { SurveyAnswersType, SurveyModel } from '@innovations/shared/schemas';
import { DomainServiceSymbol, DomainServiceType, NotifierServiceSymbol, NotifierServiceType, type DomainUsersService } from '@innovations/shared/services';
import type { ActivityLogListParamsType, DateISOType, DomainContextType, DomainUserInfoType } from '@innovations/shared/types';

import { InnovationSupportLogTypeEnum } from '@innovations/shared/enums';
import { AssessmentSupportFilterEnum, InnovationLocationEnum } from '../_enums/innovation.enums';
import type { InnovationExportRequestItemType, InnovationExportRequestListType, InnovationSectionModel } from '../_types/innovation.types';

import { ActionEnum } from '@innovations/shared/services/integrations/audit.service';
import { BaseService } from './base.service';


@injectable()
export class InnovationsService extends BaseService {

  constructor(
    @inject(DomainServiceSymbol) private domainService: DomainServiceType,
    @inject(NotifierServiceSymbol) private notifierService: NotifierServiceType
  ) { super(); }


  async getInnovationsList(
    user: { id: string },
    domainContext: DomainContextType,
    filters: {
      status: InnovationStatusEnum[],
      name?: string,
      mainCategories?: InnovationCategoryCatalogueEnum[],
      locations?: InnovationLocationEnum[],
      assessmentSupportStatus?: AssessmentSupportFilterEnum,
      supportStatuses?: InnovationSupportStatusEnum[],
      groupedStatuses?: InnovationGroupedStatusEnum[],
      engagingOrganisations?: string[],
      assignedToMe?: boolean,
      suggestedOnly?: boolean,
      latestWorkedByMe?: boolean,
      dateFilter?: {
        field: 'submittedAt',
        startDate?: DateISOType,
        endDate?: DateISOType
      }[],
      fields?: ('isAssessmentOverdue' | 'assessment' | 'supports' | 'notifications' | 'statistics' | 'groupedStatus')[]
    },
    pagination: PaginationQueryParamsType<'name' | 'location' | 'mainCategory' | 'submittedAt' | 'updatedAt' | 'assessmentStartedAt' | 'assessmentFinishedAt'>
  ): Promise<{
    count: number;
    data: {
      id: string,
      name: string,
      description: null | string,
      status: InnovationStatusEnum,
      statusUpdatedAt: DateISOType,
      submittedAt: null | DateISOType,
      updatedAt: null | DateISOType,
      countryName: null | string,
      postCode: null | string,
      mainCategory: null | InnovationCategoryCatalogueEnum,
      otherMainCategoryDescription: null | string,
      isAssessmentOverdue?: boolean,
      groupedStatus?: InnovationGroupedStatusEnum,
      assessment?: null | { id: string, createdAt: DateISOType, finishedAt: null | DateISOType, assignedTo: { name: string }, reassessmentCount: number },
      supports?: {
        id: string,
        status: InnovationSupportStatusEnum,
        updatedAt: DateISOType,
        organisation: {
          id: string, name: string, acronym: null | string,
          unit: {
            id: string, name: string, acronym: string,
            users?: { name: string, role: AccessorOrganisationRoleEnum | InnovatorOrganisationRoleEnum }[]
          }
        }
      }[],
      notifications?: number,
      statistics?: { actions: number, messages: number }
    }[]
  }> {
    // Innovators don't require to fetch user names (maybe make this a parameter)
    const fetchUsers = domainContext.currentRole.role !== ServiceRoleEnum.INNOVATOR;

    //#region Innovation query with filters
    const innovationFetchQuery = this.sqlConnection.createQueryBuilder(InnovationEntity, 'innovations')
      .select('innovations.id', 'innovations_id')
      .addSelect('innovations.name', 'innovations_name')
      .addSelect('innovations.description', 'innovations_description')
      .addSelect('innovations.countryName', 'innovations_country_name')
      .addSelect('innovations.mainCategory', 'innovations_main_category')
      .addSelect('innovations.createdAt', 'innovations_created_at')
      .addSelect('innovations.submittedAt', 'innovations_submitted_at')
      .addSelect('innovations.updatedAt', 'innovations_updated_at')
      .addSelect('innovations.status', 'innovations_status')
      .addSelect('innovations.statusUpdatedAt', 'innovations_status_updated_at')
      .addSelect('innovations.postcode', 'innovations_postcode')
      .addSelect('innovations.otherMainCategoryDescription', 'innovations_other_main_category_description');

    // Assessment relations.
    if (filters.suggestedOnly || pagination.order.assessmentStartedAt || pagination.order.assessmentFinishedAt || (filters.assignedToMe && domainContext.currentRole.role === ServiceRoleEnum.ASSESSMENT)) {
      innovationFetchQuery.leftJoin('innovations.assessments', 'assessments');

      // These two are required for the order by
      if (pagination.order.assessmentStartedAt || pagination.order.assessmentFinishedAt) {
        innovationFetchQuery.addSelect('assessments.createdAt', 'assessments_created_at');
        innovationFetchQuery.addSelect('assessments.finishedAt', 'assessments_finished_at');
      }
    }

    // Last worked on.
    if (filters.latestWorkedByMe) {
      innovationFetchQuery.andWhere('innovations.id IN (SELECT innovation_id FROM audit WHERE user_id=:userId AND action IN (:...actions) GROUP BY innovation_id ORDER BY MAX(date) DESC OFFSET :offset ROWS FETCH NEXT :fetch ROWS ONLY)',
        { userId: user.id, actions: [ActionEnum.CREATE, ActionEnum.UPDATE], offset: pagination.skip, fetch: pagination.take });
    }

    if (domainContext.currentRole.role === ServiceRoleEnum.INNOVATOR) {
      innovationFetchQuery.andWhere('innovations.owner_id = :innovatorUserId', { innovatorUserId: user.id });
    }

    if (domainContext.currentRole.role === ServiceRoleEnum.ASSESSMENT) {
      innovationFetchQuery.andWhere('innovations.status IN (:...assessmentInnovationStatus)', { assessmentInnovationStatus: [InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT, InnovationStatusEnum.NEEDS_ASSESSMENT, InnovationStatusEnum.IN_PROGRESS] });
    }

    if (domainContext.currentRole.role === ServiceRoleEnum.ACCESSOR || domainContext.currentRole.role === ServiceRoleEnum.QUALIFYING_ACCESSOR) {

      innovationFetchQuery.innerJoin('innovations.organisationShares', 'shares');
      innovationFetchQuery.leftJoin('innovations.innovationSupports', 'accessorSupports', 'accessorSupports.organisation_unit_id = :accessorSupportsOrganisationUnitId', { accessorSupportsOrganisationUnitId: domainContext.organisation?.organisationUnit?.id });
      innovationFetchQuery.andWhere('innovations.status IN (:...accessorInnovationStatus)', { accessorInnovationStatus: [InnovationStatusEnum.IN_PROGRESS, InnovationStatusEnum.COMPLETE] });
      innovationFetchQuery.andWhere('shares.id = :accessorOrganisationId', { accessorOrganisationId: domainContext.organisation?.id });

      if (domainContext.organisation?.role === AccessorOrganisationRoleEnum.ACCESSOR) {
        innovationFetchQuery.andWhere('accessorSupports.status IN (:...accessorSupportsSupportStatuses01)', { accessorSupportsSupportStatuses01: [InnovationSupportStatusEnum.ENGAGING, InnovationSupportStatusEnum.COMPLETE] });
      }

      if (filters.supportStatuses && filters.supportStatuses.length > 0) {
        innovationFetchQuery.andWhere(`(accessorSupports.status IN (:...accessorSupportsSupportStatuses02) ${filters.supportStatuses.includes(InnovationSupportStatusEnum.UNASSIGNED) ? ' OR accessorSupports.status IS NULL' : ''})`, { accessorSupportsSupportStatuses02: filters.supportStatuses });
      }

    }

    if (domainContext.currentRole.role === ServiceRoleEnum.ADMIN) {
      innovationFetchQuery.withDeleted();
    }

    if (filters.groupedStatuses && filters.groupedStatuses.length > 0) {
      innovationFetchQuery.innerJoin('innovations.innovationGroupedStatus', 'innovationGroupedStatus');
      innovationFetchQuery.addSelect('innovationGroupedStatus.groupedStatus', 'innovationGroupedStatus_grouped_status');

      innovationFetchQuery.andWhere('innovationGroupedStatus.groupedStatus IN (:...groupedStatuses)', { groupedStatuses: filters.groupedStatuses });
    }

    // Filters.
    if (filters.status && filters.status.length > 0) {
      innovationFetchQuery.andWhere('innovations.status IN (:...status) ', { status: filters.status });
    }

    if (filters.name) {
      if (domainContext.currentRole.role === ServiceRoleEnum.ADMIN && filters.name.match(/^\S+@\S+$/)) {
        const targetUser = await this.domainService.users.getUserByEmail(filters.name);

        if (targetUser.length > 0 && targetUser[0]) {
          innovationFetchQuery.andWhere('(innovations.owner_id = :userId OR innovations.name LIKE :name)', { userId: targetUser[0].id, name: `%${filters.name}%` });
        } else {
          // This means that the user is NOT registered in the service.
          innovationFetchQuery.andWhere('innovations.name LIKE :name', { name: `%${filters.name}%` });
        }
      } else {
        innovationFetchQuery.andWhere('innovations.name LIKE :name', { name: `%${filters.name}%` });
      }
    }

    if (filters.mainCategories && filters.mainCategories.length > 0) {
      innovationFetchQuery.andWhere('innovations.main_category IN (:...mainCategories)', { mainCategories: filters.mainCategories });
    }

    if (filters.locations && filters.locations.length > 0) {

      if (!filters.locations.includes(InnovationLocationEnum['Based outside UK'])) {
        innovationFetchQuery.andWhere('innovations.country_name IN (:...locations)', { locations: filters.locations });
      } else {

        const knownLocations = Object.values(InnovationLocationEnum).filter(item => item !== InnovationLocationEnum['Based outside UK']);
        const knownLocationsNotOnFilter = knownLocations.filter(item => !filters.locations?.includes(item));
        const filterLocationsExceptOutsideUK = filters.locations.filter(item => item !== InnovationLocationEnum['Based outside UK']);

        innovationFetchQuery.andWhere(`(
        1 <> 1
        ${filterLocationsExceptOutsideUK.length > 0 ? ' OR innovations.country_name  IN (:...filterLocationsExceptOutsideUK)' : ''}
        ${knownLocationsNotOnFilter.length > 0 ? ' OR innovations.country_name NOT IN (:...knownLocationsNotOnFilter)' : ''}
        )`, { filterLocationsExceptOutsideUK, knownLocationsNotOnFilter });

      }
    }

    if (filters.assessmentSupportStatus) {
      this.addInnovationSupportFilterSQL(innovationFetchQuery, filters.assessmentSupportStatus);
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

    if (filters.assignedToMe) {

      if (domainContext.currentRole.role === ServiceRoleEnum.ASSESSMENT) {
        innovationFetchQuery.andWhere('assessments.assign_to_id = :assignToId', { assignToId: user.id });
      }

      if ([ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR].includes(domainContext.currentRole.role)) {
        innovationFetchQuery.innerJoin('innovations.innovationSupports', 'supports');
        innovationFetchQuery.innerJoin('supports.organisationUnitUsers', 'supportingUnitUsers');
        innovationFetchQuery.innerJoin('supportingUnitUsers.organisationUser', 'supportingOrganisationUser');
        innovationFetchQuery.innerJoin('supportingOrganisationUser.user', 'supportingUsers');
        innovationFetchQuery.andWhere('supportingUsers.id = :supportingUserId', { supportingUserId: user.id });
        innovationFetchQuery.andWhere('supportingUnitUsers.organisation_unit_id = :orgUnitId', { orgUnitId: domainContext.organisation?.organisationUnit?.id });
      }

    }

    if (filters.suggestedOnly) {
      innovationFetchQuery.leftJoin('assessments.organisationUnits', 'assessmentOrganisationUnits');
      innovationFetchQuery.leftJoin('innovations.innovationSupportLogs', 'supportLogs', 'supportLogs.type = :supportLogType', { supportLogType: InnovationSupportLogTypeEnum.ACCESSOR_SUGGESTION });
      innovationFetchQuery.leftJoin('supportLogs.suggestedOrganisationUnits', 'supportLogOrgUnit');

      innovationFetchQuery.andWhere(
        `(assessmentOrganisationUnits.id = :suggestedOrganisationUnitId OR supportLogOrgUnit.id =:suggestedOrganisationUnitId)`,
        { suggestedOrganisationUnitId: domainContext.organisation?.organisationUnit?.id }
      );
    }

    if (filters.dateFilter && filters.dateFilter.length > 0) {
      const dateFilterKeyMap = new Map([
        ["submittedAt", "innovations.submittedAt"]
      ]);

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
          case 'name': field = 'innovations.name'; break;
          case 'location': field = 'innovations.countryName'; break;
          case 'mainCategory': field = 'innovations.mainCategory'; break;
          case 'submittedAt': field = 'innovations.submittedAt'; break;
          case 'updatedAt': field = 'innovations.updatedAt'; break;
          case 'assessmentStartedAt': field = 'assessments.createdAt'; break;
          case 'assessmentFinishedAt': field = 'assessments.finishedAt'; break;
          default:
            field = 'innovations.createdAt'; break;
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
      const innovationsAssessmentsQuery = this.sqlConnection.createQueryBuilder(InnovationAssessmentEntity, 'assessments')
        .select('assessments.id', 'assessments_id')
        .addSelect('assessments.createdAt', 'assessments_created_at')
        .addSelect('assessments.finishedAt', 'assessments_finished_at')
        .innerJoin('assessments.innovation', 'innovation')
        .addSelect('innovation.id', 'innovation_id')
        .where('assessments.innovation_id IN (:...innovationsIds)', { innovationsIds });

      if (fetchUsers) {
        innovationsAssessmentsQuery.leftJoin('assessments.assignTo', 'assignTo');
        innovationsAssessmentsQuery.addSelect('assignTo.id', 'assignTo_id');
      }

      assessmentsMap = new Map((await innovationsAssessmentsQuery.getMany()).map(a => [a.innovation.id, a]));

      // Required to count reassessments
      innovationsReassessmentCount = new Map((await this.sqlConnection.createQueryBuilder(InnovationReassessmentRequestEntity, 'reassessments')
        .select('innovation_id', 'innovation_id')
        .addSelect('COUNT(*)', 'reassessments_count')
        .where('innovation_id IN (:...innovationsIds)', { innovationsIds })
        .groupBy('innovation_id')
        .getRawMany()).map(r => [r.innovation_id, r.reassessments_count]));
    }
    //#endregion


    //#region fetch supporting organisations
    // Grab the supporting organisations for the innovations (if required)
    const supportingOrganisationsMap = new Map<string, InnovationSupportEntity[]>(); // not exactly InnovationSupportEntity, but just the required fields
    if (filters.fields?.includes('supports')) {
      const innovationsSupportsQuery = this.sqlConnection.createQueryBuilder(InnovationSupportEntity, 'supports')
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

      if (fetchUsers) {
        innovationsSupportsQuery
          .leftJoin('supports.organisationUnitUsers', 'organisationUnitUsers')
          .addSelect('organisationUnitUsers.id', 'organisationUnitUsers_id')
          .leftJoin('organisationUnitUsers.organisationUser', 'organisationUser')
          .addSelect('organisationUser.role', 'organisationUser_role')
          .leftJoin('organisationUser.user', 'user')
          .addSelect('user.id', 'user_id');
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
      const assessmentUsersIds = new Set([...assessmentsMap.values()].map(a => a.assignTo.id));
      const supportingUsersIds = new Set([...supportingOrganisationsMap.values()].flatMap(s => s.flatMap(support => support.organisationUnitUsers.map(item => item.organisationUser.user.id))));
      usersInfo = new Map((await this.domainService.users.getUsersList({ userIds: [...assessmentUsersIds, ...supportingUsersIds] })).map(u => [u.id, u]));
    }

    //#region notifications
    // Notifications.
    const notificationsMap = new Map<string, { notificationsUnread: number, actions: number, messages: number }>(); // not exactly NotificationEntity, but just the required fields
    if (filters.fields?.includes('notifications') || filters.fields?.includes('statistics')) {
      const notificationsQuery = this.sqlConnection.createQueryBuilder(NotificationEntity, 'notifications')
        .select('notifications.id', 'notifications_id')
        // .addSelect('notifications.type', 'notifications_type')
        .innerJoin('notifications.innovation', 'innovation')
        .addSelect('innovation.id', 'innovation_id')
        .innerJoin('notifications.notificationUsers', 'notificationUsers', 'notificationUsers.user_id = :notificationUserId AND notificationUsers.read_at IS NULL', { notificationUserId: user.id })
        .where('notifications.innovation_id IN (:...innovationsIds)', { innovationsIds });

      if (domainContext.organisation?.organisationUnit?.id) {
        notificationsQuery.innerJoin('notificationUsers.organisationUnit', 'organisationUnit')
          .where('organisationUnit.id = :orgUnitId', { orgUnitId: domainContext.organisation.organisationUnit.id });
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
            actions: 0,
            messages: 0,
          });
        }
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const notificationCounter = notificationsMap.get(n.innovation.id)!;
        notificationCounter.notificationsUnread++;

        if (filters.fields?.includes('statistics')) {
          if (n.contextType === NotificationContextTypeEnum.THREAD) {
            notificationCounter.messages++;
          }
          if (n.contextDetail === NotificationContextDetailEnum.ACTION_CREATION || (n.contextDetail === NotificationContextDetailEnum.ACTION_UPDATE && JSON.parse(n.params).actionStatus === InnovationActionStatusEnum.REQUESTED)) {
            notificationCounter.actions++;
          }
        }
      });
    }

    let innovationsGroupedStatus = new Map<string, InnovationGroupedStatusEnum>();
    if (filters.fields?.includes('groupedStatus')) {
      if (filters.groupedStatuses && filters.groupedStatuses.length > 0) { // means that inner join was made
        innovationsGroupedStatus = new Map(innovations.map(cur => [cur.id, cur.innovationGroupedStatus.groupedStatus]));
      } else {
        const innovationIds = innovations.map(i => i.id);
        innovationsGroupedStatus = await this.domainService.innovations.getInnovationsGroupedStatus({ innovationIds });
      }
    }

    return {
      count: innovationsCount,
      data: await Promise.all(innovations.map(async innovation => {

        let assessment: undefined | null | { id: string, createdAt: DateISOType, finishedAt: null | DateISOType, assignedTo: { name: string }, reassessmentCount: number };
        const supports = supportingOrganisationsMap.get(innovation.id);

        // Assessment parsing.
        if (filters.fields?.includes('assessment')) {
          const assessmentRaw = assessmentsMap.get(innovation.id);
          if (assessmentRaw) {
            assessment = {
              id: assessmentRaw.id,
              createdAt: assessmentRaw.createdAt,
              assignedTo: { name: usersInfo.get(assessmentRaw.assignTo?.id)?.displayName ?? '' },
              finishedAt: assessmentRaw.finishedAt,
              reassessmentCount: innovationsReassessmentCount.get(innovation.id) ?? 0
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
          submittedAt: innovation.submittedAt,
          updatedAt: innovation.updatedAt,
          countryName: innovation.countryName,
          postCode: innovation.postcode,
          mainCategory: innovation.mainCategory,
          otherMainCategoryDescription: innovation.otherMainCategoryDescription,

          ...(filters.fields?.includes('groupedStatus') && { groupedStatus: innovationsGroupedStatus.get(innovation.id) ?? InnovationGroupedStatusEnum.RECORD_NOT_SHARED }),
          ...(!filters.fields?.includes('isAssessmentOverdue') ? {} : { isAssessmentOverdue: !!(innovation.submittedAt && !assessment?.finishedAt && DatesHelper.dateDiffInDays((innovation as any).submittedAt, new Date().toISOString()) > 7) }),
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
                  ...((support.organisationUnitUsers ?? []).length > 0 && {
                    users: support.organisationUnitUsers.map(su => ({
                      name: usersInfo.get(su.organisationUser.user.id)?.displayName || '',
                      role: su.organisationUser.role
                    })).filter(authUser => authUser.name)
                  })
                }
              }
            }))
          }),
          // Add notifications
          ...filters.fields?.includes('notifications') && { notifications: notificationsMap.get(innovation.id)?.notificationsUnread ?? 0 },

          // Add statistics
          ...filters.fields?.includes('statistics') && {
            statistics: {
              actions: notificationsMap.get(innovation.id)?.actions ?? 0,
              messages: notificationsMap.get(innovation.id)?.messages ?? 0,
            }
          },
        };

      }))
    };

  }

  // This is the original function just in case we need to check something (to be deleted later)
  // async getInnovationsList(
  //   user: { id: string, type: UserTypeEnum, organisationId?: string, organisationRole?: AccessorOrganisationRoleEnum | InnovatorOrganisationRoleEnum, organisationUnitId?: string },
  //   filters: {
  //     status: InnovationStatusEnum[],
  //     name?: string,
  //     mainCategories?: InnovationCategoryCatalogueEnum[],
  //     locations?: InnovationLocationEnum[],
  //     assessmentSupportStatus?: AssessmentSupportFilterEnum,
  //     supportStatuses?: InnovationSupportStatusEnum[],
  //     groupedStatuses?: InnovationGroupedStatusEnum[],
  //     engagingOrganisations?: string[],
  //     assignedToMe?: boolean,
  //     suggestedOnly?: boolean,
  //     latestWorkedByMe?: boolean,
  //     fields?: ('isAssessmentOverdue' | 'assessment' | 'supports' | 'notifications' | 'statistics')[]
  //   },
  //   pagination: PaginationQueryParamsType<'name' | 'location' | 'mainCategory' | 'submittedAt' | 'updatedAt' | 'assessmentStartedAt' | 'assessmentFinishedAt'>
  // ): Promise<{
  //   count: number;
  //   data: {
  //     id: string,
  //     name: string,
  //     description: null | string,
  //     status: InnovationStatusEnum,
  //     statusUpdatedAt: DateISOType,
  //     submittedAt: null | DateISOType,
  //     updatedAt: null | DateISOType,
  //     countryName: null | string,
  //     postCode: null | string,
  //     mainCategory: null | InnovationCategoryCatalogueEnum,
  //     otherMainCategoryDescription: null | string,
  //     isAssessmentOverdue?: boolean,
  //     assessment?: null | { id: string, createdAt: DateISOType, finishedAt: null | DateISOType, assignedTo: { name: string }, reassessmentCount: number },
  //     supports?: {
  //       id: string,
  //       status: InnovationSupportStatusEnum,
  //       updatedAt: DateISOType,
  //       organisation: {
  //         id: string, name: string, acronym: null | string,
  //         unit: {
  //           id: string, name: string, acronym: string,
  //           users?: { name: string, role: AccessorOrganisationRoleEnum | InnovatorOrganisationRoleEnum }[]
  //         }
  //       }
  //     }[],
  //     notifications?: number,
  //     statistics?: { actions: number, messages: number }
  //   }[]
  // }> {

  //   const query = this.sqlConnection.createQueryBuilder(InnovationEntity, 'innovations');

  //   // Assessment relations.
  //   if (filters.fields?.includes('assessment') || filters.suggestedOnly || pagination.order.assessmentStartedAt || pagination.order.assessmentFinishedAt) {
  //     query.leftJoinAndSelect('innovations.assessments', 'assessments');
  //     query.leftJoinAndSelect('assessments.assignTo', 'assignTo');
  //     query.leftJoinAndSelect('innovations.reassessmentRequests', 'reassessmentRequests');
  //   }
  //   // Supports relations.
  //   if (filters.fields?.includes('supports') || (filters.engagingOrganisations && filters.engagingOrganisations.length > 0) || filters.assignedToMe) {
  //     query.leftJoinAndSelect('innovations.innovationSupports', 'supports');
  //     query.leftJoinAndSelect('supports.organisationUnit', 'supportingOrganisationUnit');
  //     query.leftJoinAndSelect('supportingOrganisationUnit.organisation', 'supportingOrganisation');
  //     query.leftJoinAndSelect('supports.organisationUnitUsers', 'supportingUnitUsers');
  //     query.leftJoinAndSelect('supportingUnitUsers.organisationUser', 'supportingOrganisationUser');
  //     query.leftJoinAndSelect('supportingOrganisationUser.user', 'supportingUsers');
  //   }
  //   // Notifications.
  //   if (filters.fields?.includes('notifications') || filters.fields?.includes('statistics')) {
  //     query.leftJoinAndSelect('innovations.notifications', 'notifications')
  //     query.leftJoinAndSelect('notifications.notificationUsers', 'notificationUsers', 'notificationUsers.user_id = :notificationUserId AND notificationUsers.read_at IS NULL', { notificationUserId: user.id })
  //   }
  //   // Last worked on.
  //   if (filters.latestWorkedByMe) {
  //     query.andWhere('innovations.id IN (SELECT innovation_id FROM audit WHERE user_id=:userId AND action IN (:...actions) GROUP BY innovation_id ORDER BY MAX(date) DESC OFFSET :offset ROWS FETCH NEXT :fetch ROWS ONLY)',
  //       { userId: user.id, actions: [ActionEnum.CREATE, ActionEnum.UPDATE], offset: pagination.skip, fetch: pagination.take });
  //   }

  //   if (user.type === UserTypeEnum.INNOVATOR) {
  //     query.andWhere('innovations.owner_id = :innovatorUserId', { innovatorUserId: user.id });
  //   }

  //   if (user.type === UserTypeEnum.ASSESSMENT) {
  //     query.andWhere('innovations.status IN (:...assessmentInnovationStatus)', { assessmentInnovationStatus: [InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT, InnovationStatusEnum.NEEDS_ASSESSMENT, InnovationStatusEnum.IN_PROGRESS] });
  //   }

  //   if (user.type === UserTypeEnum.ACCESSOR) {

  //     query.innerJoin('innovations.organisationShares', 'shares');
  //     query.leftJoin('innovations.innovationSupports', 'accessorSupports', 'accessorSupports.organisation_unit_id = :accessorSupportsOrganisationUnitId', { accessorSupportsOrganisationUnitId: user.organisationUnitId });
  //     query.andWhere('innovations.status IN (:...accessorInnovationStatus)', { accessorInnovationStatus: [InnovationStatusEnum.IN_PROGRESS, InnovationStatusEnum.COMPLETE] });
  //     query.andWhere('shares.id = :accessorOrganisationId', { accessorOrganisationId: user.organisationId });

  //     if (user.organisationRole === AccessorOrganisationRoleEnum.ACCESSOR) {
  //       query.andWhere('accessorSupports.status IN (:...accessorSupportsSupportStatuses01)', { accessorSupportsSupportStatuses01: [InnovationSupportStatusEnum.ENGAGING, InnovationSupportStatusEnum.COMPLETE] });
  //       // query.andWhere('accessorSupports.organisation_unit_id = :organisationUnitId ', { organisationUnitId: user.organisationUnitId });
  //     }

  //     if (filters.supportStatuses && filters.supportStatuses.length > 0) {
  //       query.andWhere(`(accessorSupports.status IN (:...accessorSupportsSupportStatuses02) ${filters.supportStatuses.includes(InnovationSupportStatusEnum.UNASSIGNED) ? ' OR accessorSupports.status IS NULL' : ''})`, { accessorSupportsSupportStatuses02: filters.supportStatuses });
  //     }

  //   }

  //   if (user.type === UserTypeEnum.ADMIN) {
  //     query.withDeleted();
  //   }

  //   if (filters.groupedStatuses && filters.groupedStatuses.length > 0) {
  //     const status = this.getGroupedToInnovationStatusMap(filters.groupedStatuses);

  //     if (
  //       (filters.groupedStatuses.includes(InnovationGroupedStatusEnum.AWAITING_NEEDS_ASSESSMENT) === true && filters.groupedStatuses.includes(InnovationGroupedStatusEnum.AWAITING_NEEDS_REASSESSMENT) === false)
  //       || (filters.groupedStatuses.includes(InnovationGroupedStatusEnum.AWAITING_NEEDS_ASSESSMENT) === false && filters.groupedStatuses.includes(InnovationGroupedStatusEnum.AWAITING_NEEDS_REASSESSMENT) === true)
  //     ) {

  //       status.splice(status.indexOf(InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT), 1);

  //       const isReassessment = filters.groupedStatuses.includes(InnovationGroupedStatusEnum.AWAITING_NEEDS_REASSESSMENT);

  //       query.orWhere(
  //         `innovations.id IN (
  //           SELECT innovations.id
  //           FROM innovation innovations
  //           FULL JOIN innovation_reassessment_request reassessmentRequests
  //           ON reassessmentRequests.innovation_id = innovations.id
  //           WHERE (innovations.status = :waitingNeedsAssessmentStatus AND reassessmentRequests.innovation_id ${isReassessment ? 'IS NOT' : 'IS'} NULL))`,
  //         { waitingNeedsAssessmentStatus: InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT }
  //       );

  //     }

  //     if (
  //       (filters.groupedStatuses.includes(InnovationGroupedStatusEnum.AWAITING_SUPPORT) === true && filters.groupedStatuses.includes(InnovationGroupedStatusEnum.RECEIVING_SUPPORT) === false)
  //       || (filters.groupedStatuses.includes(InnovationGroupedStatusEnum.AWAITING_SUPPORT) === false && filters.groupedStatuses.includes(InnovationGroupedStatusEnum.RECEIVING_SUPPORT) === true)
  //     ) {

  //       status.splice(status.indexOf(InnovationStatusEnum.IN_PROGRESS), 1);

  //       const isAwaitingSupport = filters.groupedStatuses.includes(InnovationGroupedStatusEnum.AWAITING_SUPPORT);
  //       const receivingSupportQuery = '(SELECT supports.innovation_id FROM innovation_support supports WHERE supports.status IN (:...receivingSupportStatus))';

  //       query.orWhere(
  //         `innovations.id IN (
  //           SELECT innovations.id
  //           FROM innovation innovations
  //           WHERE (innovations.status = :inProgressStatus AND innovations.id ${isAwaitingSupport ? 'NOT IN' : 'IN'} ${receivingSupportQuery}))`,
  //         { inProgressStatus: InnovationStatusEnum.IN_PROGRESS, receivingSupportStatus: [InnovationSupportStatusEnum.FURTHER_INFO_REQUIRED, InnovationSupportStatusEnum.ENGAGING] }
  //       );

  //     }

  //     if (status.length > 0) {
  //       query.andWhere('innovations.status IN (:...status) ', { status });
  //     }

  //   }

  //   // Filters.
  //   if (filters.status && filters.status.length > 0) {
  //     query.andWhere('innovations.status IN (:...status) ', { status: filters.status });
  //   }

  //   if (filters.name) {
  //     query.andWhere('innovations.name LIKE :name', { name: `%${filters.name}%` });
  //   }

  //   if (filters.mainCategories && filters.mainCategories.length > 0) {
  //     query.andWhere('innovations.main_category IN (:...mainCategories)', { mainCategories: filters.mainCategories });
  //   }

  //   if (filters.locations && filters.locations.length > 0) {

  //     if (!filters.locations.includes(InnovationLocationEnum['Based outside UK'])) {
  //       query.andWhere('innovations.country_name IN (:...locations)', { locations: filters.locations });
  //     } else {

  //       const knownLocations = Object.values(InnovationLocationEnum).filter(item => item !== InnovationLocationEnum['Based outside UK']);
  //       const knownLocationsNotOnFilter = knownLocations.filter(item => !filters.locations?.includes(item));
  //       const filterLocationsExceptOutsideUK = filters.locations.filter(item => item !== InnovationLocationEnum['Based outside UK']);

  //       query.andWhere(`(
  //       1 <> 1
  //       ${filterLocationsExceptOutsideUK.length > 0 ? ' OR innovations.country_name  IN (:...filterLocationsExceptOutsideUK)' : ''}
  //       ${knownLocationsNotOnFilter.length > 0 ? ' OR innovations.country_name NOT IN (:...knownLocationsNotOnFilter)' : ''}
  //       )`, { filterLocationsExceptOutsideUK, knownLocationsNotOnFilter });

  //     }
  //   }

  //   if (filters.assessmentSupportStatus) {
  //     this.addInnovationSupportFilterSQL(query, filters.assessmentSupportStatus);
  //   }

  //   if (filters.engagingOrganisations && filters.engagingOrganisations.length > 0) {
  //     query.andWhere(
  //       `EXISTS (
  //         SELECT eofilter_is.id
  //         FROM innovation_support eofilter_is
  //         INNER JOIN organisation_unit eofilter_ou ON eofilter_ou.id = eofilter_is.organisation_unit_id AND inactivated_at IS NULL AND eofilter_ou.deleted_at IS NULL
  //         WHERE eofilter_is.innovation_id = innovations.id AND eofilter_ou.organisation_id IN (:...engagingOrganisationsFilterSupportStatuses) AND eofilter_is.deleted_at IS NULL)`,
  //       { engagingOrganisationsFilterSupportStatuses: filters.engagingOrganisations }
  //     );
  //   }

  //   if (filters.assignedToMe) {
  //     query.andWhere('supportingUsers.id = :supportingUserId', { supportingUserId: user.id });
  //   }

  //   if (filters.suggestedOnly) {
  //     query.leftJoin('assessments.organisationUnits', 'assessmentOrganisationUnits');
  //     query.andWhere('assessmentOrganisationUnits.id = :suggestedOrganisationUnitId', { suggestedOrganisationUnitId: user.organisationUnitId });
  //   }

  //   // Pagination and order is builtin in the latestWorkedByMe query, otherwise extra joins would be required... OR CTEs
  //   if (!filters.latestWorkedByMe) {
  //     // Pagination and ordering.
  //     query.skip(pagination.skip);
  //     query.take(pagination.take);

  //     for (const [key, order] of Object.entries(pagination.order)) {
  //       let field: string;
  //       switch (key) {
  //         case 'name': field = 'innovations.name'; break;
  //         case 'location': field = 'innovations.countryName'; break;
  //         case 'mainCategory': field = 'innovations.mainCategory'; break;
  //         case 'submittedAt': field = 'innovations.submittedAt'; break;
  //         case 'updatedAt': field = 'innovations.updatedAt'; break;
  //         case 'assessmentStartedAt': field = 'assessments.createdAt'; break;
  //         case 'assessmentFinishedAt': field = 'assessments.finishedAt'; break;
  //         default:
  //           field = 'innovations.createdAt'; break;
  //       }
  //       query.addOrderBy(field, order);
  //     }
  //   }


  //   const result = await query.getManyAndCount();

  //   // Fetch users names.
  //   const assessmentUsersIds = filters.fields?.includes('assessment') ? result[0]
  //     .filter(innovation => innovation.assessments?.length > 0)
  //     .flatMap(innovation => innovation.assessments.map(a => a.assignTo.id))
  //     : [];
  //   const supportingUsersIds = filters.fields?.includes('supports') ? result[0]
  //     .filter(innovation => innovation.innovationSupports?.length > 0)
  //     .flatMap(innovation => innovation.innovationSupports.flatMap(support => support.organisationUnitUsers.map(item => item.organisationUser.user.id)))
  //     : [];

  //   const usersInfo = (await this.domainService.users.getUsersList({ userIds: [...assessmentUsersIds, ...supportingUsersIds] }));


  //   try {

  //     return {
  //       count: result[1],
  //       data: await Promise.all(result[0].map(async innovation => {

  //         // Assessment parsing.
  //         let assessment: undefined | null | { id: string, createdAt: DateISOType, finishedAt: null | DateISOType, assignedTo: { name: string }, reassessmentCount: number };

  //         if (filters.fields?.includes('assessment')) {

  //           if (innovation.assessments.length === 0) { assessment = null; }
  //           else {

  //             if (innovation.assessments.length > 1) { // This should never happen, but...
  //               this.logger.error(`Innovation ${innovation.id} with ${innovation.assessments.length} assessments detected`);
  //             }

  //             if (innovation.assessments[0]) { // ... but if exists, on this list, we show information about one of them.

  //               assessment = {
  //                 id: innovation.assessments[0].id,
  //                 createdAt: innovation.assessments[0].createdAt,
  //                 finishedAt: innovation.assessments[0].finishedAt,
  //                 assignedTo: {
  //                   name: usersInfo.find(item => (item.id === innovation.assessments[0]?.assignTo.id) && item.isActive)?.displayName ?? ''
  //                 },
  //                 reassessmentCount: (await innovation.reassessmentRequests).length
  //               };

  //             }

  //           }

  //         }

  //         return {
  //           id: innovation.id,
  //           name: innovation.name,
  //           description: innovation.description,
  //           status: innovation.status,
  //           statusUpdatedAt: innovation.statusUpdatedAt,
  //           submittedAt: innovation.submittedAt,
  //           updatedAt: innovation.updatedAt,
  //           countryName: innovation.countryName,
  //           postCode: innovation.postcode,
  //           mainCategory: innovation.mainCategory,
  //           otherMainCategoryDescription: innovation.otherMainCategoryDescription,

  //           ...(!filters.fields?.includes('isAssessmentOverdue') ? {} : { isAssessmentOverdue: !!(innovation.submittedAt && !assessment?.finishedAt && DatesHelper.dateDiffInDays(innovation.submittedAt, new Date().toISOString()) > 7) }),
  //           ...(assessment === undefined ? {} : { assessment }),

  //           ...(!filters.fields?.includes('supports') ? {} : {
  //             supports: (innovation.innovationSupports || []).map(support => ({
  //               id: support.id,
  //               status: support.status,
  //               updatedAt: support.updatedAt,
  //               organisation: {
  //                 id: support.organisationUnit.organisation.id,
  //                 name: support.organisationUnit.organisation.name,
  //                 acronym: support.organisationUnit.organisation.acronym,
  //                 unit: {
  //                   id: support.organisationUnit.id,
  //                   name: support.organisationUnit.name,
  //                   acronym: support.organisationUnit.acronym,
  //                   // Users are only returned only for ENGAGING supports status, returning nothing on all other cases.
  //                   ...(support.organisationUnitUsers.length === 0 ? {} : {
  //                     users: support.organisationUnitUsers.map(su => ({
  //                       name: usersInfo.find(item => item.id === su.organisationUser.user.id && item.isActive)?.displayName || '',
  //                       role: su.organisationUser.role
  //                     })).filter(authUser => authUser.name)
  //                   })
  //                 }
  //               }
  //             }))
  //           }),

  //           ...(!filters.fields?.includes('notifications') ? {} : {
  //             notifications: await Promise.resolve(
  //               (await innovation.notifications).reduce(async (acc, item) =>
  //                 (await acc) + (await item.notificationUsers).length,
  //                 Promise.resolve(0)
  //               )
  //             )
  //           }),

  //           ...(!filters.fields?.includes('statistics') ? {} : { statistics: await this.getInnovationStatistics(innovation) })

  //         };

  //       }))
  //     };

  //   } catch (error: any) {
  //     if (Object.values(InnovationErrorsEnum).includes(error.name)) { throw error; }
  //     else {
  //       throw new InternalServerError(GenericErrorsEnum.UNKNOWN_ERROR);
  //     }
  //   }

  // }

  async getInnovationInfo(
    domainContext: DomainContextType,
    id: string,
    filters: { fields?: ('assessment' | 'supports')[] }
  ): Promise<{
    id: string,
    name: string,
    description: null | string,
    status: InnovationStatusEnum,
    groupedStatus: InnovationGroupedStatusEnum,
    statusUpdatedAt: DateISOType,
    submittedAt: null | DateISOType,
    countryName: null | string,
    postCode: null | string,
    categories: InnovationCategoryCatalogueEnum[],
    otherCategoryDescription: null | string,
    owner: { id: string, name: string, email: string, contactByEmail: boolean, contactByPhone: boolean, contactByPhoneTimeframe: PhoneUserPreferenceEnum | null, contactDetails: string | null, mobilePhone: null | string, organisations: { name: string, size: null | string }[], isActive: boolean, lastLoginAt?: null | DateISOType },
    lastEndSupportAt: null | DateISOType,
    export: { canUserExport: boolean, pendingRequestsCount: number },
    assessment?: null | { id: string, createdAt: DateISOType, finishedAt: null | DateISOType, assignedTo: { id: string, name: string }, reassessmentCount: number },
    supports?: { id: string, status: InnovationSupportStatusEnum, organisationUnitId: string }[]
  }> {

    const query = this.sqlConnection.createQueryBuilder(InnovationEntity, 'innovation')
      .innerJoinAndSelect('innovation.owner', 'innovationOwner')
      .innerJoinAndSelect('innovationOwner.userOrganisations', 'userOrganisations')
      .innerJoinAndSelect('userOrganisations.organisation', 'organisation')
      .leftJoinAndSelect('innovation.categories', 'innovationCategories')
      .innerJoinAndSelect('innovation.innovationGroupedStatus', 'innovationGroupedStatus')
      .where('innovation.id = :innovationId', { innovationId: id });

    if (domainContext.currentRole.role === ServiceRoleEnum.ACCESSOR || domainContext.currentRole.role === ServiceRoleEnum.QUALIFYING_ACCESSOR) {
      query.leftJoinAndSelect('innovation.exportRequests', 'exportRequests', 'exportRequests.status IN (:...requestStatuses) AND exportRequests.organisation_unit_id = :organisationUnitId', { requestStatuses: [InnovationExportRequestStatusEnum.APPROVED, InnovationExportRequestStatusEnum.PENDING], organisationUnitId: domainContext.organisation?.organisationUnit?.id });
    }

    // Assessment relations.
    if (filters.fields?.includes('assessment')) {
      query.leftJoinAndSelect('innovation.assessments', 'innovationAssessments');
      query.leftJoinAndSelect('innovationAssessments.assignTo', 'assignTo');
    }

    // Supports relations.
    if (filters.fields?.includes('supports')) {
      query.leftJoinAndSelect('innovation.innovationSupports', 'innovationSupports');
      query.leftJoinAndSelect('innovationSupports.organisationUnit', 'supportingOrganisationUnit');
    }

    const result = await query.getOne();
    if (!result) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    // Fetch users names.
    const ownerId = result.owner.id;
    const assessmentUsersIds = filters.fields?.includes('assessment') ? result.assessments?.map(assessment => assessment.assignTo.id) : [];

    const usersInfo = (await this.domainService.users.getUsersList({ userIds: [...assessmentUsersIds, ...[ownerId]] }));

    const categories = (await result.categories).map(item => item.type);
    const ownerInfo = usersInfo.find(item => item.id === result.owner.id);
    const ownerPreferences = (await this.domainService.users.getUserPreferences(ownerId));

    // Export requests parsing.
    const innovationExport = {
      canUserExport: false,
      pendingRequestsCount: (await result.exportRequests).filter(item => item.isRequestPending).length
    };

    switch (domainContext.currentRole.role) {
      case ServiceRoleEnum.INNOVATOR:
        innovationExport.canUserExport = true;
        break;
      case ServiceRoleEnum.ASSESSMENT:
        innovationExport.canUserExport = false;
        break;
      case ServiceRoleEnum.ACCESSOR:
      case ServiceRoleEnum.QUALIFYING_ACCESSOR:
        innovationExport.canUserExport = (await result.exportRequests).filter(item => item.isExportActive).length > 0;
        break;
    }

    // Assessment parsing.
    let assessment: undefined | null | { id: string, createdAt: DateISOType, finishedAt: null | DateISOType, assignedTo: { id: string, name: string }, reassessmentCount: number };

    if (filters.fields?.includes('assessment')) {

      if (result.assessments.length === 0) { assessment = null; }
      else {

        if (result.assessments.length > 1) { // This should never happen, but...
          this.logger.error(`Innovation ${result.id} with ${result.assessments.length} assessments detected`);
        }

        if (result.assessments[0]) { // ... but if exists, on this list, we show information about one of them.
          const assignTo = usersInfo.find(item => (item.id === result.assessments[0]?.assignTo.id) && item.isActive);
          assessment = {
            id: result.assessments[0].id,
            createdAt: result.assessments[0].createdAt,
            finishedAt: result.assessments[0].finishedAt,
            assignedTo: { id: assignTo?.id ?? '', name: assignTo?.displayName ?? '' },
            reassessmentCount: (await result.reassessmentRequests).length
          };

        }

      }

    }

    return {
      id: result.id,
      name: result.name,
      description: result.description,
      status: result.status,
      groupedStatus: result.innovationGroupedStatus.groupedStatus,
      statusUpdatedAt: result.statusUpdatedAt,
      submittedAt: result.submittedAt,
      countryName: result.countryName,
      postCode: result.postcode,
      categories,
      otherCategoryDescription: result.otherCategoryDescription,
      owner: {
        id: result.owner.id,
        name: ownerInfo?.displayName || '',
        email: ownerInfo?.email || '',
        contactByEmail: ownerPreferences.contactByEmail,
        contactByPhone: ownerPreferences.contactByPhone,
        contactByPhoneTimeframe: ownerPreferences.contactByPhoneTimeframe,
        contactDetails: ownerPreferences.contactDetails,
        mobilePhone: ownerInfo?.mobilePhone || '',
        isActive: !!ownerInfo?.isActive,
        lastLoginAt: ownerInfo?.lastLoginAt ?? null,
        organisations: (await result.owner?.userOrganisations || []).filter(item => !item.organisation.isShadow).map(item => ({
          name: item.organisation.name,
          size: item.organisation.size
        }))
      },
      lastEndSupportAt: await this.lastSupportStatusTransitionFromEngaging(result.id),

      export: innovationExport,

      ...(assessment === undefined ? {} : { assessment }),

      ...(!filters.fields?.includes('supports') ? {} : {
        supports: (result.innovationSupports || []).map(support => ({
          id: support.id,
          status: support.status,
          organisationUnitId: support.organisationUnit.id
        }))
      })
    };

  }


  async getNeedsAssessmentOverdueInnovations(domainContext: DomainContextType, filters: { innovationStatus: (InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT | InnovationStatusEnum.NEEDS_ASSESSMENT)[], assignedToMe: boolean }, supportFilter?: AssessmentSupportFilterEnum): Promise<number> {

    const query = this.sqlConnection.createQueryBuilder(InnovationEntity, 'innovation')
      .leftJoinAndSelect('innovation.assessments', 'assessments')
      .where('innovation.status IN (:...innovationStatus)', { innovationStatus: filters.innovationStatus })
      .andWhere(`DATEDIFF(day, innovation.submitted_at, GETDATE()) > 7 AND assessments.finished_at IS NULL`);

    if (filters.assignedToMe) {
      query.andWhere('assessments.assign_to_id = :assignToId', { assignToId: domainContext.id });
    }

    if (supportFilter) {
      this.addInnovationSupportFilterSQL(query, supportFilter);
    }

    return query.getCount();

  }

  async createInnovation(
    user: { id: string },
    domainContext: DomainContextType,
    data: { name: string, description: string, countryName: string, postcode: null | string, organisationShares: string[] },
    surveyId: null | string
  ): Promise<{ id: string }> {

    // Sanity check if innovation name already exists (for the same user).
    const repeatedNamesCount = await this.sqlConnection.createQueryBuilder(InnovationEntity, 'innovation')
      .where('innovation.owner_id = :ownerId', { ownerId: user.id })
      .andWhere('TRIM(LOWER(innovation.name)) = :innovationName', { innovationName: data.name.trim().toLowerCase() })
      .getCount();
    if (repeatedNamesCount > 0) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_ALREADY_EXISTS);
    }

    // Sanity check if all organisation units exists.
    const organisationsCount = await this.sqlConnection.createQueryBuilder(OrganisationEntity, 'organisation')
      .where('organisation.id IN (:...organisationIds)', { organisationIds: data.organisationShares })
      .getCount();
    if (organisationsCount != data.organisationShares.length) {
      throw new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATION_UNITS_NOT_FOUND, { details: { error: 'Unknown organisations' } });
    }

    // If a surveyId is passed, take that survey answers.
    const surveyInfo = surveyId ? await this.getSurveyInfo(surveyId) : null;

    return this.sqlConnection.transaction(async transaction => {

      const savedInnovation = await transaction.save(InnovationEntity, InnovationEntity.new({

        // Survey information.
        categories: Promise.resolve((surveyInfo?.categories || []).map(item => InnovationCategoryEntity.new({ type: item }))),
        otherCategoryDescription: surveyInfo?.otherCategoryDescription ?? null,
        mainCategory: surveyInfo?.mainCategory ?? null,
        otherMainCategoryDescription: surveyInfo?.otherMainCategoryDescription ?? null,
        hasProblemTackleKnowledge: surveyInfo?.hasProblemTackleKnowledge ?? null,
        hasMarketResearch: surveyInfo?.hasMarketResearch ?? null,
        // hasWhoBenefitsKnowledge: surveyInfo?.hasWhoBenefitsKnowledge ?? null,
        hasBenefits: surveyInfo?.hasBenefits || null,
        hasTests: surveyInfo?.hasTests ?? null,
        // hasRelevantCertifications: surveyInfo.hasRelevantCertifications ?? null,
        hasEvidence: surveyInfo?.hasEvidence ?? null,
        // hasCostEvidence: surveyInfo.hasCostEvidence ?? null,
        supportTypes: Promise.resolve((surveyInfo?.supportTypes || []).map((e) => InnovationSupportTypeEntity.new({ type: e }))),

        // Remaining information.
        name: data.name,
        description: data.description,
        status: InnovationStatusEnum.CREATED,
        statusUpdatedAt: new Date().toISOString(),
        countryName: data.countryName,
        postcode: data.postcode,
        organisationShares: data.organisationShares.map(id => OrganisationEntity.new({ id })),
        owner: UserEntity.new({ id: user.id }),
        createdBy: user.id,
        updatedBy: user.id

      }));


      // Mark some section to status DRAFT.
      let sectionsToBeInDraft: InnovationSectionEnum[] = [];

      if (surveyInfo) {
        sectionsToBeInDraft = [
          InnovationSectionEnum.INNOVATION_DESCRIPTION,
          InnovationSectionEnum.VALUE_PROPOSITION,
          InnovationSectionEnum.UNDERSTANDING_OF_BENEFITS,
          InnovationSectionEnum.EVIDENCE_OF_EFFECTIVENESS,
          InnovationSectionEnum.MARKET_RESEARCH,
          InnovationSectionEnum.TESTING_WITH_USERS
        ];
      } else {
        sectionsToBeInDraft = [InnovationSectionEnum.INNOVATION_DESCRIPTION];
      }

      for (const sectionKey of sectionsToBeInDraft) {
        await transaction.save(InnovationSectionEntity, InnovationSectionEntity.new({
          innovation: savedInnovation,
          section: InnovationSectionEnum[sectionKey],
          status: InnovationSectionStatusEnum.DRAFT,
          createdBy: savedInnovation.createdBy,
          updatedBy: savedInnovation.updatedBy
        }));
      }

      await this.domainService.innovations.addActivityLog(
        transaction,
        { innovationId: savedInnovation.id, activity: ActivityEnum.INNOVATION_CREATION, domainContext },
        {}
      );

      return { id: savedInnovation.id };

    });

  }

  async getInnovationShares(innovationId: string): Promise<{ organisation: { id: string, name: string, acronym: null | string } }[]> {

    const innovation = await this.sqlConnection.createQueryBuilder(InnovationEntity, 'innovation')
      .innerJoinAndSelect('innovation.organisationShares', 'organisationShares')
      .where('innovation.id = :innovationId', { innovationId })
      .getOne();
    if (!innovation) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    return innovation.organisationShares.map(organisation => ({
      organisation: {
        id: organisation.id,
        name: organisation.name,
        acronym: organisation.acronym
      }
    }));

  }

  async updateInnovationShares(domainContext: DomainContextType, innovationId: string, organisationShares: string[], entityManager?: EntityManager): Promise<void> {
    const em = entityManager || this.sqlConnection.manager;

    // Sanity check if all organisation exists.
    const organisations = await em.createQueryBuilder(OrganisationEntity, 'organisation')
      .select('organisation.name')
      .where('organisation.id IN (:...organisationIds)', { organisationIds: organisationShares })
      .getMany();
    if (organisations.length != organisationShares.length) {
      throw new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATIONS_NOT_FOUND, { details: { error: 'Unknown organisations' } });
    }

    const innovation = await em.createQueryBuilder(InnovationEntity, 'innovation')
      .innerJoinAndSelect('innovation.organisationShares', 'organisationShares')
      .where('innovation.id = :innovationId', { innovationId })
      .getOne();

    if (!innovation) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    const newShares = new Set(organisationShares);
    const deletedShares = innovation.organisationShares
      .filter(organisation => !newShares.has(organisation.id))
      .map(organisation => organisation.id);

    await em.transaction(async transaction => {
      // Delete shares
      if (deletedShares.length > 0) {
        // Check for active supports
        const supports = await transaction.createQueryBuilder(InnovationSupportEntity, 'innovationSupport')
          .innerJoin('innovationSupport.innovation', 'innovation')
          .innerJoin('innovationSupport.organisationUnit', 'organisationUnit')
          .where('innovation.id = :innovationId', { innovationId })
          .andWhere('organisationUnit.organisation IN (:...ids)', { ids: deletedShares })
          .getMany();

        const supportIds = supports.map(support => support.id);
        if (supportIds.length > 0) {
          // Decline all actions for the deleted shares supports
          await transaction.getRepository(InnovationActionEntity).createQueryBuilder()
            .update()
            .where('innovation_support_id IN (:...ids)', { ids: supportIds })
            .andWhere('status IN (:...status)', { status: [InnovationActionStatusEnum.REQUESTED, InnovationActionStatusEnum.SUBMITTED] })
            .set({
              status: InnovationActionStatusEnum.DECLINED,
              updatedBy: domainContext.id,
              updatedByUserRole: UserRoleEntity.new({ id: domainContext.currentRole.id }),
            })
            .execute();

          await transaction.getRepository(InnovationSupportEntity).createQueryBuilder()
            .update()
            .where('id IN (:...ids)', { ids: supportIds })
            .set({
              status: InnovationSupportStatusEnum.UNASSIGNED,
              updatedBy: domainContext.id,
              deletedAt: new Date().toISOString(),
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
  }

  async submitInnovation(user: { id: string, identityId: string }, domainContext: DomainContextType, innovationId: string): Promise<{ id: string; status: InnovationStatusEnum; }> {

    const innovation = await this.sqlConnection.createQueryBuilder(InnovationEntity, 'innovations')
      .leftJoinAndSelect('innovations.sections', 'sections')
      .where('innovations.id = :innovationId', { innovationId })
      .getOne();

    const sections = await innovation?.sections;

    if (!sections) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NO_SECTIONS);
    }

    // TODO: I believe that an error exists here.
    // this.hasIncompleteSections does not take into account if ALL sections exists.
    // If a section has never been saved before, is returning as being completed.
    const canSubmit = !(await this.hasIncompleteSections(sections));

    if (!canSubmit) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SECTIONS_INCOMPLETE);
    }

    await this.sqlConnection.transaction(async transaction => {

      const update = transaction.update(InnovationEntity,
        { id: innovationId },
        {
          submittedAt: new Date().toISOString(),
          status: InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT,
          statusUpdatedAt: new Date().toISOString(),
          updatedBy: user.id
        }
      );

      await this.domainService.innovations.addActivityLog(
        transaction,
        { innovationId: innovationId, activity: ActivityEnum.INNOVATION_SUBMISSION, domainContext },
        {}
      );

      return update;

    });

    // Add notification with Innovation submited for needs assessment
    await this.notifierService.send(
      { id: user.id, identityId: user.identityId },
      NotifierTypeEnum.INNOVATION_SUBMITED,
      { innovationId },
      domainContext,
    );

    return {
      id: innovationId,
      status: InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT
    };

  }

  async withdrawInnovation(context: DomainContextType, innovationId: string, reason: string): Promise<{ id: string }> {

    const dbInnovation = await this.sqlConnection.createQueryBuilder(InnovationEntity, 'innovations')
      .select(['innovations.id'])
      .where('innovations.id = :innovationId', { innovationId })
      .getOne();
    if (!dbInnovation) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    const savedInnovations = await this.sqlConnection.transaction(async transaction => {

      return this.domainService.innovations.withdrawInnovations(
        transaction,
        { id: context.id, roleId: context.currentRole.id },
        [{ id: dbInnovation.id, reason }]
      );

    });

    for (let savedInnovation of savedInnovations) {
      await this.notifierService.send(
        { id: context.id, identityId: context.identityId },
        NotifierTypeEnum.INNOVATION_WITHDRAWN,
        { innovation: { id: savedInnovation.id, name: savedInnovation.name, assignedUserIds: savedInnovation.supportingUserIds } },
        context
      );
    }

    return { id: dbInnovation.id };

  }

  async pauseInnovation(
    user: { id: string, identityId: string },
    domainContext: DomainContextType,
    innovationId: string,
    data: { message: string }
  ): Promise<{ id: string }> {

    // This query should be reviewed when using the service roles in supports instead of the organisationUnitUser
    const dbSupports = await this.sqlConnection.createQueryBuilder(InnovationSupportEntity, 'supports')
      .innerJoinAndSelect('supports.organisationUnitUsers', 'organisationUnitUser')
      .innerJoinAndSelect('organisationUnitUser.organisationUser', 'organisationUser')
      .innerJoinAndSelect('organisationUnitUser.organisationUnit', 'organisationUnit')
      .innerJoinAndSelect('organisationUser.user', 'user')
      .where('supports.innovation_id = :innovationId', { innovationId })
      .getMany();

    const previousAssignedAccessors = dbSupports.flatMap(support => support.organisationUnitUsers.map(item => ({
      id: item.organisationUser.user.id,
      organisationUnitId: item.organisationUnit.id,
      userType: item.organisationUser.role === AccessorOrganisationRoleEnum.ACCESSOR ? ServiceRoleEnum.ACCESSOR : ServiceRoleEnum.QUALIFYING_ACCESSOR,
    })));

    const result = await this.sqlConnection.transaction(async transaction => {
      const sections = await transaction
        .createQueryBuilder(InnovationSectionEntity, 'section')
        .select(['section.id'])
        .addSelect('section.innovation_id')
        .where('section.innovation_id = :innovationId', { innovationId })
        .getMany();

      // Decline all actions for all innovation supports.
      await transaction.getRepository(InnovationActionEntity).update(
        { innovationSection: In(sections.map(section => section.id)), status: In([InnovationActionStatusEnum.REQUESTED, InnovationActionStatusEnum.SUBMITTED]) },
        { status: InnovationActionStatusEnum.DECLINED, updatedBy: user.id, updatedByUserRole: UserRoleEntity.new({ id: domainContext.currentRole.id }) }
      );

      // Update all support to UNASSIGNED.
      for (const innovationSupport of dbSupports) {
        innovationSupport.status = InnovationSupportStatusEnum.UNASSIGNED;
        innovationSupport.organisationUnitUsers = []; // To be able to save many-to-many relations, the full entity must me saved. That's why we are saving this part with different code.
        innovationSupport.updatedBy = user.id;
        await transaction.save(InnovationSupportEntity, innovationSupport);
      }

      // Update innovation status.
      await transaction.update(InnovationEntity,
        { id: innovationId },
        {
          status: InnovationStatusEnum.PAUSED,
          statusUpdatedAt: new Date().toISOString(),
          updatedBy: user.id
        }
      );

      // Reject all PENDING AND APPROVED export requests
      await transaction.createQueryBuilder(InnovationExportRequestEntity, 'request')
        .update({
          status: InnovationExportRequestStatusEnum.REJECTED,
          rejectReason: TranslationHelper.translate('DEFAULT_MESSAGES.EXPORT_REQUEST.STOP_SHARING'),
          updatedBy: user.id
        })
        .where('innovation_id = :innovationId AND (status = :pendingStatus OR (status = :approvedStatus AND updated_at >= :expiredAt))',
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

    await this.notifierService.send(
      user,
      NotifierTypeEnum.INNOVATION_STOP_SHARING,
      { innovationId, previousAssignedAccessors: previousAssignedAccessors, message: data.message },
      domainContext,
    );

    return result;

  }

  async getInnovationActivitiesLog(
    innovationId: string,
    filters: { activityTypes?: ActivityTypeEnum, startDate?: string, endDate?: string },
    pagination: PaginationQueryParamsType<'createdAt'>
  ): Promise<{
    count: number,
    data: { type: ActivityTypeEnum, activity: ActivityEnum, date: DateISOType, params: ActivityLogListParamsType }[]
  }> {

    const query = this.sqlConnection
      .createQueryBuilder(ActivityLogEntity, 'activityLog')
      .where('activityLog.innovation_id = :innovationId', { innovationId });

    // Filters
    if (filters.activityTypes && filters.activityTypes.length > 0) {
      query.andWhere('activityLog.type IN (:...activityTypes)', { activityTypes: filters.activityTypes });
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
        case 'createdAt': field = 'activityLog.createdAt'; break;
        default: field = 'activityLog.createdAt'; break;
      }
      query.addOrderBy(field, order);
    }

    const [dbActivities, dbActivitiesCount] = await query.getManyAndCount();

    const usersIds = dbActivities.flatMap(item => {
      const params = JSON.parse(item.param) as ActivityLogListParamsType;
      const p: string[] = [];

      if (params.actionUserId) { p.push(params.actionUserId); }
      if (params.interveningUserId) { p.push(params.interveningUserId); }

      return p;
    });

    const usersInfo = (await this.domainService.users.getUsersList({ userIds: [...usersIds] }));

    return {
      count: dbActivitiesCount,
      data: dbActivities.map(item => {
        const params = JSON.parse(item.param) as ActivityLogListParamsType;

        if (params.actionUserId) {
          params.actionUserName = usersInfo.find(user => user.id === params.actionUserId)?.displayName ?? '';
        }
        if (params.interveningUserId) {
          params.interveningUserName = usersInfo.find(user => user.id === params.interveningUserId)?.displayName ?? '';
        }

        return {
          activity: item.activity,
          type: item.type,
          date: item.createdAt,
          params
        };
      })
    };

  }


  async createInnovationRecordExportRequest(requestUser: { id: string, identityId: string }, domainContext: DomainContextType, organisationUnitId: string, innovationId: string, data: { requestReason: string }): Promise<{ id: string; }> {

    const unitPendingAndApprovedRequests = await this.sqlConnection.createQueryBuilder(InnovationExportRequestEntity, 'request')
      .where('request.innovation_id = :innovationId', { innovationId })
      .andWhere('request.organisation_unit_id = :organisationUnitId', { organisationUnitId })
      .andWhere('request.status IN (:...status)', { status: [InnovationExportRequestStatusEnum.PENDING, InnovationExportRequestStatusEnum.APPROVED] })
      .getMany();

    // In DB "EXPIRED" status doesn't exist, they are "PENDING" so the query above will bring some pending that are really EXPIRED
    const pendingAndApprovedRequests = unitPendingAndApprovedRequests.filter(request => request.status !== InnovationExportRequestStatusEnum.EXPIRED);

    if (pendingAndApprovedRequests.length > 0) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_EXPORT_REQUEST_ALREADY_EXISTS);
    }

    const request = await this.sqlConnection.getRepository(InnovationExportRequestEntity).save({
      innovation: InnovationEntity.new({ id: innovationId }),
      status: InnovationExportRequestStatusEnum.PENDING,
      createdAt: new Date().toISOString(),
      createdBy: requestUser.id,
      updatedBy: requestUser.id,
      organisationUnit: OrganisationUnitEntity.new({ id: organisationUnitId }),
      requestReason: data.requestReason,
    });

    // Create notification

    await this.notifierService.send(
      { id: requestUser.id, identityId: requestUser.identityId },
      NotifierTypeEnum.INNOVATION_RECORD_EXPORT_REQUEST,
      { innovationId: innovationId, requestId: request.id },
      domainContext,
    );

    return {
      id: request.id,
    };

  }

  async updateInnovationRecordExportRequest(requestUser: DomainUserInfoType, domainContext: DomainContextType, exportRequestId: string, data: { status: InnovationExportRequestStatusEnum, rejectReason: null | string }): Promise<{ id: string; }> {

    // TODO: This will, most likely, be refactored to be a mandatory property of the requestUser object.

    const organisationUnitId = domainContext.organisation?.organisationUnit?.id;

    if (domainContext.currentRole.role === ServiceRoleEnum.ACCESSOR || domainContext.currentRole.role === ServiceRoleEnum.QUALIFYING_ACCESSOR) {
      if (!organisationUnitId) {
        throw new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND);
      }
    }

    const exportRequest = await this.sqlConnection.createQueryBuilder(InnovationExportRequestEntity, 'request')
      .innerJoinAndSelect('request.innovation', 'innovation')
      .innerJoinAndSelect('request.organisationUnit', 'organisationUnit')
      .where('request.id = :exportRequestId', { exportRequestId })
      .getOne();

    // TODO: Integrate this in the authorization service.
    if (!exportRequest) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_EXPORT_REQUEST_NOT_FOUND);
    }

    if (domainContext.currentRole.role === ServiceRoleEnum.ACCESSOR || domainContext.currentRole.role === ServiceRoleEnum.QUALIFYING_ACCESSOR) {
      if (exportRequest.organisationUnit.id !== organisationUnitId) {
        throw new ForbiddenError(InnovationErrorsEnum.INNOVATION_RECORD_EXPORT_REQUEST_FROM_DIFFERENT_UNIT);
      }
    }

    const { status, rejectReason } = data;

    // TODO: Integrate this in the joi validation.
    if (status === InnovationExportRequestStatusEnum.REJECTED) {
      if (!rejectReason) {
        throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_RECORD_EXPORT_REQUEST_REJECT_REASON_REQUIRED);
      }
    }

    const updatedRequest = await this.sqlConnection.getRepository(InnovationExportRequestEntity).save({
      ...exportRequest,
      status,
      rejectReason,
    });


    // Create notification
    await this.notifierService.send(
      { id: requestUser.id, identityId: requestUser.identityId },
      NotifierTypeEnum.INNOVATION_RECORD_EXPORT_FEEDBACK,
      { innovationId: exportRequest.innovation.id, requestId: updatedRequest.id },
      domainContext,
    );

    return {
      id: updatedRequest.id,
    };

  }

  async getInnovationRecordExportRequests(
    domainContext: DomainContextType,
    innovationId: string,
    filters: {
      statuses?: InnovationExportRequestStatusEnum[]
    },
    pagination: PaginationQueryParamsType<'createdAt' | 'updatedAt'>
  ): Promise<{
    count: number;
    data: InnovationExportRequestListType,
  }> {

    const query = this.sqlConnection.createQueryBuilder(InnovationExportRequestEntity, 'request')
      .innerJoinAndSelect('request.organisationUnit', 'organisationUnit')
      .innerJoinAndSelect('organisationUnit.organisation', 'organisation')
      .innerJoinAndSelect('request.innovation', 'innovation')
      .where('innovation.id = :innovationId', { innovationId });

    if (domainContext.currentRole.role === ServiceRoleEnum.ACCESSOR || domainContext.currentRole.role === ServiceRoleEnum.QUALIFYING_ACCESSOR) {
      const organisationUnitId = domainContext.organisation?.organisationUnit?.id;

      if (!organisationUnitId) {
        throw new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND);
      }

      query.andWhere('organisationUnit.id = :organisationUnitId', { organisationUnitId });
    }

    if (filters.statuses && filters.statuses.length > 0) {
      query.andWhere('request.status IN (:...statuses)', { statuses: filters.statuses });
    }

    query.skip(pagination.skip);
    query.take(pagination.take);

    for (const [key, order] of Object.entries(pagination.order)) {
      let field: string;
      switch (key) {
        case 'updatedAt': field = 'request.updatedAt'; break;
        default:
          field = 'request.createdAt'; break;
      }
      query.addOrderBy(field, order);
    }

    const [requests, count] = await query.getManyAndCount();

    if (requests.length === 0) {
      return {
        count: 0,
        data: [],
      };
    }

    const requestCreators = requests.map(r => r.createdBy);

    const requestCreatorsNames = await this.domainService.users.getUsersList({ userIds: requestCreators });

    const retval = requests.map(r => ({
      id: r.id,
      status: r.status,
      requestReason: r.requestReason,
      rejectReason: r.rejectReason,
      createdAt: r.createdAt,
      createdBy: {
        id: r.createdBy,
        name: requestCreatorsNames.find(u => u.id === r.createdBy)?.displayName || 'unknown',
      },
      organisation: {
        id: r.organisationUnit.organisation.id,
        name: r.organisationUnit.organisation.name,
        acronym: r.organisationUnit.organisation.acronym,
        organisationUnit: {
          id: r.organisationUnit.id,
          name: r.organisationUnit.name,
          acronym: r.organisationUnit.acronym,
        },
      },
      expiresAt: r.exportExpiresAt?.toISOString(),
      isExportable: r.status === InnovationExportRequestStatusEnum.APPROVED,
      updatedAt: r.updatedAt
    }));

    return {
      count,
      data: retval,
    };
  }

  async getInnovationRecordExportRequestInfo(domainContext: DomainContextType, exportRequestId: string): Promise<InnovationExportRequestItemType> {

    const requestQuery = await this.sqlConnection.createQueryBuilder(InnovationExportRequestEntity, 'request')
      .innerJoinAndSelect('request.organisationUnit', 'organisationUnit')
      .innerJoinAndSelect('organisationUnit.organisation', 'organisation')
      .where('request.id = :exportRequestId', { exportRequestId });


    if (domainContext.currentRole.role === ServiceRoleEnum.ACCESSOR || domainContext.currentRole.role === ServiceRoleEnum.QUALIFYING_ACCESSOR) {
      const organisationUnitId = domainContext.organisation?.organisationUnit?.id;

      if (!organisationUnitId) {
        throw new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND);
      }

      requestQuery.andWhere('organisationUnit.id = :organisationUnitId', { organisationUnitId });
    }

    const request = await requestQuery.getOne();

    if (!request) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_EXPORT_REQUEST_NOT_FOUND);
    }

    const requestCreator = await this.domainService.users.getUserInfo({ userId: request.createdBy });

    return {
      id: request.id,
      status: request.status,
      requestReason: request.requestReason,
      rejectReason: request.rejectReason,
      createdAt: request.createdAt,
      createdBy: {
        id: request.createdBy,
        name: requestCreator.displayName,
      },
      organisation: {
        id: request.organisationUnit.organisation.id,
        name: request.organisationUnit.organisation.name,
        acronym: request.organisationUnit.organisation.acronym,
        organisationUnit: {
          id: request.organisationUnit.id,
          name: request.organisationUnit.name,
          acronym: request.organisationUnit.acronym,
        },
      },
      expiresAt: request.exportExpiresAt?.toISOString(),
      isExportable: request.status === InnovationExportRequestStatusEnum.APPROVED,
      updatedAt: request.updatedAt
    };
  }

  async checkInnovationRecordExportRequest(domainContext: DomainContextType, exportRequestId: string): Promise<{ canExport: boolean }> {

    const query = this.sqlConnection.createQueryBuilder(InnovationExportRequestEntity, 'request')
      .innerJoinAndSelect('request.organisationUnit', 'organisationUnit')
      .innerJoinAndSelect('organisationUnit.organisation', 'organisation')
      .innerJoinAndSelect('request.innovation', 'innovation')
      .where('request.id = :exportRequestId', { exportRequestId });

    if (domainContext.currentRole.role === ServiceRoleEnum.ACCESSOR || domainContext.currentRole.role === ServiceRoleEnum.QUALIFYING_ACCESSOR) {

      if (!domainContext.organisation) {
        throw new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATION_NOT_FOUND);
      }

      if (!domainContext.organisation.organisationUnit) {
        throw new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND);
      }

      const organisationUnitId = domainContext.organisation.organisationUnit.id;

      if (!organisationUnitId) {
        throw new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND);
      }

      query.andWhere('organisationUnit.id = :organisationUnitId', { organisationUnitId });

    }

    const request = await query.getOne();
    if (!request) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_EXPORT_REQUEST_NOT_FOUND);
    }

    return {
      canExport: request.status === InnovationExportRequestStatusEnum.APPROVED,
    };

  }

  /**
   * dismisses innovation notification for the requestUser according to optional conditions
   *
   * @param requestUser the user that is dismissing the notification
   * @param innovationId the innovation id
   * @param conditions extra conditions that control the dismissal
   *  - if notificationIds is set, only the notifications with the given ids will be dismissed
   *  - if notificationContext.id is set, only the notifications with the given context id will be dismissed
   *  - if notificationContext.type is set, only the notifications with the given context type will be dismissed
   */
  async dismissNotifications(requestUser: DomainUserInfoType, domainContext: DomainContextType, innovationId: string, conditions: {
    notificationIds: string[],
    contextTypes: string[],
    contextIds: string[]
  }): Promise<void> {
    const params: { userId: string, innovationId: string, notificationIds?: string[], contextIds?: string[], contextTypes?: string[], organisationUnitId?: string } = { userId: requestUser.id, innovationId };
    const query = this.sqlConnection.createQueryBuilder(NotificationEntity, 'notification')
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

    if (conditions.contextTypes.length > 0) {
      query.andWhere('notification.contextType IN (:...contextTypes)');
      params.contextTypes = conditions.contextTypes;
    }

    const updateQuery = this.sqlConnection.createQueryBuilder(NotificationUserEntity, 'user').update()
      .set({ readAt: () => 'CURRENT_TIMESTAMP' })
      .where('notification_id IN ( ' + query.getQuery() + ' )')
      .andWhere('user_id = :userId AND read_at IS NULL');

    if (domainContext.organisation?.organisationUnit?.id) {
      params.organisationUnitId = domainContext.organisation.organisationUnit.id;
      updateQuery.andWhere('organisation_unit_id = :organisationUnitId');
    }

    await updateQuery.setParameters(params).execute();

  }

  async getInnovationSubmissionsState(innovationId: string): Promise<{ submittedAllSections: boolean, submittedForNeedsAssessment: boolean }> {

    const innovation = await this.sqlConnection.createQueryBuilder(InnovationEntity, 'innovation')
      .where('innovation.id = :innovationId', { innovationId }).getOne();

    if (!innovation) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    }

    const sectionsSubmitted = await this.sqlConnection.createQueryBuilder(InnovationSectionEntity, 'section')
      .where('section.innovation_id = :innovationId', { innovationId })
      .andWhere('section.status = :status', { status: InnovationSectionStatusEnum.SUBMITTED }).getCount();

    const totalSections = Object.keys(InnovationSectionEnum).length;


    return {
      submittedAllSections: sectionsSubmitted === totalSections,
      submittedForNeedsAssessment: innovation.status !== InnovationStatusEnum.CREATED,
    };
  }

  /**
  * Extracts information about the initial survey taken by the Innovator from CosmosDb
  */
  private async getSurveyInfo(surveyId: null | string): Promise<null | SurveyAnswersType> {

    if (!surveyId) { return null; }

    const survey = await SurveyModel.findById(surveyId).exec();

    if (!survey) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SURVEY_ID_NOT_FOUND);
    }

    return survey.answers;

  }

  private addInnovationSupportFilterSQL(query: SelectQueryBuilder<InnovationEntity>, filter: AssessmentSupportFilterEnum): SelectQueryBuilder<InnovationEntity> {

    switch (filter) {
      case AssessmentSupportFilterEnum.UNASSIGNED:
        query.andWhere('NOT EXISTS (SELECT 1 FROM innovation_support t_is WHERE t_is.innovation_id = innovations.id AND t_is.deleted_at IS NULL)');
        break;
      case AssessmentSupportFilterEnum.ENGAGING:
        query.andWhere(`EXISTS (SELECT 1 FROM innovation_support t_is WHERE t_is.innovation_id = innovations.id AND t_is.status = '${InnovationSupportStatusEnum.ENGAGING}' AND t_is.deleted_at IS NULL)`);
        break;
      case AssessmentSupportFilterEnum.NOT_ENGAGING:
        query.andWhere(`EXISTS (SELECT 1 FROM innovation_support t_is WHERE t_is.innovation_id = innovations.id AND t_is.status NOT IN ('${InnovationSupportStatusEnum.ENGAGING}') AND t_is.deleted_at IS NULL)`);
        query.andWhere(`NOT EXISTS (SELECT 1 FROM innovation_support t_is WHERE t_is.innovation_id = innovations.id AND t_is.status = '${InnovationSupportStatusEnum.ENGAGING}' AND t_is.deleted_at IS NULL)`);
        break;
      default:
        break;
    }

    return query;

  }

  private async hasIncompleteSections(sections: InnovationSectionEntity[]): Promise<boolean> {

    const innovationSections: InnovationSectionModel[] = [];

    for (const key in InnovationSectionEnum) {
      const section = sections.find((sec) => sec.section === key);
      innovationSections.push(this.getInnovationSectionMetadata(key, section));
    }

    return innovationSections.some(
      (x) => x.status !== InnovationSectionStatusEnum.SUBMITTED
    );

  }

  private async lastSupportStatusTransitionFromEngaging(innovationId: string): Promise<DateISOType | null> {

    const result = await this.sqlConnection.createQueryBuilder(LastSupportStatusViewEntity, 'lastSupportStatus')
      .select('TOP 1 lastSupportStatus.statusChangedAt', 'statusChangedAt')
      .where('lastSupportStatus.innovationId = :innovationId', { innovationId })
      .orderBy('lastSupportStatus.statusChangedAt', 'DESC')
      .getRawOne<{ statusChangedAt: string }>();

    if (!result) return null;

    return result.statusChangedAt;

  }

  private getInnovationSectionMetadata(key: string, section?: InnovationSectionEntity): InnovationSectionModel {

    let result: InnovationSectionModel;

    if (section) {
      result = {
        id: section.id,
        section: section.section,
        status: section.status,
        updatedAt: section.updatedAt,
        submittedAt: section.submittedAt,
        actionStatus: null,
      };
    } else {
      result = {
        id: null,
        section: InnovationSectionEnum[key as keyof typeof InnovationSectionEnum],
        status: InnovationSectionStatusEnum.NOT_STARTED,
        updatedAt: null,
        submittedAt: null,
        actionStatus: null,
      };
    }

    return result;
  }

  /*
   * not used after get list refactor
  private async getInnovationStatistics(innovation: InnovationEntity): Promise<{ messages: number, actions: number }> {

    const statistics = { messages: 0, actions: 0 };

    for (const notification of (await innovation.notifications)) {

      const notificationUsers = await notification.notificationUsers;

      if (notificationUsers.length === 0) { continue; }

      if (notification.contextType === NotificationContextTypeEnum.THREAD) {
        statistics.messages++;
      }

      if (notification.contextDetail === NotificationContextDetailEnum.ACTION_CREATION || (notification.contextDetail === NotificationContextDetailEnum.ACTION_UPDATE && JSON.parse(notification.params).actionStatus === InnovationActionStatusEnum.REQUESTED)) {
        statistics.actions++;
      }

    }

    return statistics;

  }
  */

}
