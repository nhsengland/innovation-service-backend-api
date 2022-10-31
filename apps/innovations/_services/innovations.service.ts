import { inject, injectable } from 'inversify';
import type { SelectQueryBuilder } from 'typeorm';

import { InnovationStatusEnum, ActivityEnum, AccessorOrganisationRoleEnum, InnovationSupportStatusEnum, UserTypeEnum, InnovationSectionEnum, InnovationSectionStatusEnum, NotifierTypeEnum, InnovatorOrganisationRoleEnum, InnovationCategoryCatalogueEnum, ActivityTypeEnum } from '@innovations/shared/enums';
import { InnovationCategoryEntity, InnovationSupportTypeEntity, InnovationEntity, OrganisationEntity, UserEntity, InnovationSectionEntity, ActivityLogEntity } from '@innovations/shared/entities';
import { DatesHelper, PaginationQueryParamsType } from '@innovations/shared/helpers';
import { UnprocessableEntityError, InnovationErrorsEnum, OrganisationErrorsEnum, NotFoundError, InternalServerError, GenericErrorsEnum } from '@innovations/shared/errors';
import { SurveyAnswersType, SurveyModel } from '@innovations/shared/schemas';
import { DomainServiceType, DomainServiceSymbol, NotifierServiceSymbol, NotifierServiceType } from '@innovations/shared/services';
import type { ActivityLogListParamsType, DateISOType, DomainUserInfoType } from '@innovations/shared/types';

import type { InnovationSectionModel } from '../_types/innovation.types';
import { AssessmentSupportFilterEnum, InnovationLocationEnum } from '../_enums/innovation.enums';

import { BaseService } from './base.service';


@injectable()
export class InnovationsService extends BaseService {

  constructor(
    @inject(DomainServiceSymbol) private domainService: DomainServiceType,
    @inject(NotifierServiceSymbol) private notifService: NotifierServiceType,
  ) { super(); }


  /**
  * Extracts information about the initial survey taken by the Innovator from CosmosDb
  */
  private async getSurveyInfo(surveyId: null | string): Promise<null | SurveyAnswersType> {

    if (!surveyId) { return null; }

    const survey = await SurveyModel.findById(surveyId).exec();

    if (!survey) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SURVEY_ID_NOT_FOUND)
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


  async getInnovationsList(
    user: { id: string, type: UserTypeEnum, organisationId?: string, organisationRole?: AccessorOrganisationRoleEnum | InnovatorOrganisationRoleEnum, organizationUnitId?: string },
    filters: {
      status: InnovationStatusEnum[],
      name?: string,
      mainCategories?: InnovationCategoryCatalogueEnum[],
      locations?: InnovationLocationEnum[],
      assessmentSupportStatus?: AssessmentSupportFilterEnum,
      supportStatuses?: InnovationSupportStatusEnum[],
      engagingOrganisations?: string[],
      assignedToMe?: boolean,
      suggestedOnly?: boolean,
      fields?: ('isAssessmentOverdue' | 'assessment' | 'supports' | 'notifications')[]
    },
    pagination: PaginationQueryParamsType<'name' | 'location' | 'mainCategory' | 'submittedAt' | 'updatedAt' | 'assessmentStartedAt' | 'assessmentFinishedAt'>
  ): Promise<{
    count: number;
    data: {
      id: string,
      name: string,
      description: null | string,
      status: InnovationStatusEnum,
      submittedAt: null | DateISOType,
      countryName: null | string,
      postCode: null | string,
      mainCategory: null | InnovationCategoryCatalogueEnum,
      otherMainCategoryDescription: null | string,
      isAssessmentOverdue?: boolean,
      assessment?: null | { id: string, createdAt: DateISOType, finishedAt: null | DateISOType, assignedTo: { name: string } },
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
      notifications?: number
    }[]
  }> {

    const query = this.sqlConnection.createQueryBuilder(InnovationEntity, 'innovations');

    // Assessment relations.
    if (filters.fields?.includes('assessment') || filters.suggestedOnly || pagination.order.assessmentStartedAt || pagination.order.assessmentFinishedAt) {
      query.leftJoinAndSelect('innovations.assessments', 'assessments');
      query.leftJoinAndSelect('assessments.assignTo', 'assignTo');
    }
    // Supports relations.
    if (filters.fields?.includes('supports') || (filters.engagingOrganisations && filters.engagingOrganisations.length > 0) || filters.assignedToMe) {
      query.leftJoinAndSelect('innovations.innovationSupports', 'supports');
      query.leftJoinAndSelect('supports.organisationUnit', 'supportingOrganisationUnit');
      query.leftJoinAndSelect('supportingOrganisationUnit.organisation', 'supportingOrganisation');
      query.leftJoinAndSelect('supports.organisationUnitUsers', 'supportingUnitUsers');
      query.leftJoinAndSelect('supportingUnitUsers.organisationUser', 'supportingOrganisationUser');
      query.leftJoinAndSelect('supportingOrganisationUser.user', 'supportingUsers');
    }
    // Notifications.
    if (filters.fields?.includes('notifications')) {
      query.leftJoinAndSelect('innovations.notifications', 'notifications')
      query.leftJoinAndSelect('notifications.notificationUsers', 'notificationUsers', 'notificationUsers.user_id = :notificationUserId AND notificationUsers.read_at IS NULL', { notificationUserId: user.id })
    }


    if (user.type === UserTypeEnum.INNOVATOR) {
      query.andWhere('innovations.owner_id = :innovatorUserId', { innovatorUserId: user.id });
    }

    if (user.type === UserTypeEnum.ASSESSMENT) {
      query.andWhere('innovations.status IN (:...assessmentInnovationStatus)', { assessmentInnovationStatus: [InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT, InnovationStatusEnum.NEEDS_ASSESSMENT, InnovationStatusEnum.IN_PROGRESS] });
    }

    if (user.type === UserTypeEnum.ACCESSOR) {

      query.innerJoin('innovations.organisationShares', 'shares');
      query.leftJoin('innovations.innovationSupports', 'accessorSupports', 'accessorSupports.organisation_unit_id = :accessorSupportsOrganisationUnitId', { accessorSupportsOrganisationUnitId: user.organizationUnitId });
      query.andWhere('innovations.status IN (:...accessorInnovationStatus)', { accessorInnovationStatus: [InnovationStatusEnum.IN_PROGRESS, InnovationStatusEnum.COMPLETE] });
      query.andWhere('shares.id = :accessorOrganisationId', { accessorOrganisationId: user.organisationId });

      if (user.organisationRole === AccessorOrganisationRoleEnum.ACCESSOR) {
        query.andWhere('accessorSupports.status IN (:...accessorSupportsSupportStatuses01)', { accessorSupportsSupportStatuses01: [InnovationSupportStatusEnum.ENGAGING, InnovationSupportStatusEnum.COMPLETE] });
        // query.andWhere('accessorSupports.organisation_unit_id = :organisationUnitId ', { organisationUnitId: user.organizationUnitId });
      }

      if (filters.supportStatuses && filters.supportStatuses.length > 0) {
        query.andWhere(`(accessorSupports.status IN (:...accessorSupportsSupportStatuses02) ${filters.supportStatuses.includes(InnovationSupportStatusEnum.UNASSIGNED) ? ' OR accessorSupports.status IS NULL' : ''})`, { accessorSupportsSupportStatuses02: filters.supportStatuses });
      }

    }


    // Filters.
    if (filters.status && filters.status.length > 0) {
      query.andWhere('innovations.status IN (:...status) ', { status: filters.status });
    }

    if (filters.name) {
      query.andWhere('innovations.name LIKE :name', { name: `%${filters.name}%` });
    }

    if (filters.mainCategories && filters.mainCategories.length > 0) {
      query.andWhere('innovations.main_category IN (:...mainCategories)', { mainCategories: filters.mainCategories });
    }

    if (filters.locations && filters.locations.length > 0) {

      if (!filters.locations.includes(InnovationLocationEnum['Based outside UK'])) {
        query.andWhere('innovations.country_name IN (:...locations)', { locations: filters.locations });
      } else {

        const knownLocations = Object.values(InnovationLocationEnum).filter(item => item !== InnovationLocationEnum['Based outside UK']);
        const knownLocationsNotOnFilter = knownLocations.filter(item => !filters.locations?.includes(item));
        const filterLocationsExceptOutsideUK = filters.locations.filter(item => item !== InnovationLocationEnum['Based outside UK']);

        query.andWhere(`(
        1 <> 1
        ${filterLocationsExceptOutsideUK.length > 0 ? ' OR innovations.country_name  IN (:...filterLocationsExceptOutsideUK)' : ''}
        ${knownLocationsNotOnFilter.length > 0 ? ' OR innovations.country_name NOT IN (:...knownLocationsNotOnFilter)' : ''}
        )`, { filterLocationsExceptOutsideUK, knownLocationsNotOnFilter });

      }
    }

    if (filters.assessmentSupportStatus) {
      this.addInnovationSupportFilterSQL(query, filters.assessmentSupportStatus);
    }

    if (filters.engagingOrganisations && filters.engagingOrganisations.length > 0) {
      query.andWhere(
        `EXISTS (
          SELECT eofilter_is.id
          FROM innovation_support eofilter_is
          INNER JOIN organisation_unit eofilter_ou ON eofilter_ou.id = eofilter_is.organisation_unit_id AND inactivated_at IS NULL AND eofilter_ou.deleted_at IS NULL
          WHERE eofilter_is.innovation_id = innovations.id AND eofilter_ou.organisation_id IN (:...engagingOrganisationsFilterSupportStatuses) AND eofilter_is.deleted_at IS NULL)`,
        { engagingOrganisationsFilterSupportStatuses: filters.engagingOrganisations }
      );
    }

    if (filters.assignedToMe) {
      query.andWhere('supportingUsers.id = :supportingUserId', { supportingUserId: user.id });
    }

    if (filters.suggestedOnly) {
      query.leftJoin('assessments.organisationUnits', 'assessmentOrganisationUnits');
      query.andWhere('assessmentOrganisationUnits.id = :suggestedOrganisationUnitId', { suggestedOrganisationUnitId: user.organizationUnitId });
    }

    // Pagination and ordering.
    query.skip(pagination.skip);
    query.take(pagination.take);

    for (const [key, order] of Object.entries(pagination.order || { 'default': 'DESC' })) {
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
      query.addOrderBy(field, order);
    }

    // console.log('SQL', query.getQueryAndParameters());

    const result = await query.getManyAndCount();

    // Fetch users names.
    const assessmentUsersIds = filters.fields?.includes('assessment') ? result[0]
      .filter(innovation => innovation.assessments?.length > 0)
      .flatMap(innovation => innovation.assessments.map(a => a.assignTo.id))
      : [];
    const supportingUsersIds = filters.fields?.includes('supports') ? result[0]
      .filter(innovation => innovation.innovationSupports?.length > 0)
      .flatMap(innovation => innovation.innovationSupports.flatMap(support => support.organisationUnitUsers.map(item => item.organisationUser.user.id)))
      : [];

    const usersInfo = (await this.domainService.users.getUsersList({ userIds: [...assessmentUsersIds, ...supportingUsersIds] }));


    try {

      return {
        count: result[1],
        data: await Promise.all(result[0].map(async innovation => {

          // Assessment parsing.
          let assessment: undefined | null | { id: string, createdAt: DateISOType, finishedAt: null | DateISOType, assignedTo: { name: string } };

          if (filters.fields?.includes('assessment')) {

            if (innovation.assessments.length === 0) { assessment = null; }
            else {

              if (innovation.assessments.length > 1) { // This should never happen, but...
                this.logger.error(`Innovation ${innovation.id} with ${innovation.assessments.length} assessments detected`);
              }

              if (innovation.assessments[0]) { // ... but if exists, on this list, we show information about one of them.
                assessment = {
                  id: innovation.assessments[0].id,
                  createdAt: innovation.assessments[0].createdAt,
                  finishedAt: innovation.assessments[0].finishedAt,
                  assignedTo: {
                    name: usersInfo.find(item => (item.id === innovation.assessments[0]?.assignTo.id) && item.isActive)?.displayName ?? ''
                  }
                };
              }

            }

          }

          return {
            id: innovation.id,
            name: innovation.name,
            description: innovation.description,
            status: innovation.status,
            submittedAt: innovation.submittedAt,
            countryName: innovation.countryName,
            postCode: innovation.postcode,
            mainCategory: innovation.mainCategory,
            otherMainCategoryDescription: innovation.otherMainCategoryDescription,

            ...(!filters.fields?.includes('isAssessmentOverdue') ? {} : { isAssessmentOverdue: !!(innovation.submittedAt && !assessment?.finishedAt && DatesHelper.dateDiffInDays(innovation.submittedAt, new Date().toISOString()) > 7) }),
            ...(assessment === undefined ? {} : { assessment }),

            ...(!filters.fields?.includes('supports') ? {} : {
              supports: (innovation.innovationSupports || []).map(support => ({
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
                    ...(support.organisationUnitUsers.length === 0 ? {} : {
                      users: support.organisationUnitUsers.map(su => ({
                        name: usersInfo.find(item => item.id === su.organisationUser.user.id && item.isActive)?.displayName || '',
                        role: su.organisationUser.role
                      })).filter(authUser => authUser.name)
                    })
                  }
                }
              }))
            }),

            ...(!filters.fields?.includes('notifications') ? {} : {
              notifications: await Promise.resolve(
                (await innovation.notifications).reduce(async (acc, item) =>
                  (await acc) + (await item.notificationUsers).length,
                  Promise.resolve(0)
                )
              )
            })
          };

        }))
      };

    } catch (error: any) {
      if (Object.values(InnovationErrorsEnum).includes(error.name)) { throw error; }
      else {
        throw new InternalServerError(GenericErrorsEnum.UNKNOWN_ERROR);
      }
    }

  }

  async getNeedsAssessmentOverdueInnovations(innovationStatus: (InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT | InnovationStatusEnum.NEEDS_ASSESSMENT)[], supportFilter?: AssessmentSupportFilterEnum): Promise<number> {

    const query = this.sqlConnection.createQueryBuilder(InnovationEntity, 'innovation')
      .leftJoinAndSelect('innovation.assessments', 'assessments')
      .where('innovation.status IN (:...innovationStatus)', { innovationStatus })
      .andWhere(`DATEDIFF(day, innovation.submitted_at, GETDATE()) > 7 AND assessments.finished_at IS NULL`);

    if (supportFilter) {
      this.addInnovationSupportFilterSQL(query, supportFilter);
    }

    return query.getCount();

  }


  async createInnovation(
    user: { id: string },
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


      await this.domainService.innovations.addActivityLog<'INNOVATION_CREATION'>(
        transaction,
        { userId: user.id, innovationId: savedInnovation.id, activity: ActivityEnum.INNOVATION_CREATION },
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

  async submitInnovation(requestUser: DomainUserInfoType, innovationId: string, updatedById: string): Promise<{ id: string; status: InnovationStatusEnum; }> {

    const sections = await this.findInnovationSections(innovationId)

    if (!sections) {
      throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NO_SECTIONS);
    }

    const canSubmit = !(await this.hasIncompleteSections(sections));

    if (!canSubmit) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SECTIONS_INCOMPLETE);
    }

    await this.sqlConnection.transaction(async transaction => {

      return transaction.update(
        InnovationEntity,
        { id: innovationId },
        {
          submittedAt: new Date().toISOString(),
          status: InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT,
          updatedBy: updatedById,
        }
      );

    });

    this.notifService.send<NotifierTypeEnum.INNOVATION_SUBMITED>({
      id: requestUser.id, identityId: requestUser.identityId, type: requestUser.type
    }, NotifierTypeEnum.INNOVATION_SUBMITED, { innovationId });

    return {
      id: innovationId,
      status: InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT
    };

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

    for (const [key, order] of Object.entries(pagination.order || { 'default': 'DESC' })) {
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
    })

    const usersInfo = (await this.domainService.users.getUsersList({ userIds: [...usersIds] }));

    try {
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
          }
        })
      }
    } catch (error: any) {
      if (Object.values(InnovationErrorsEnum).includes(error.name)) { throw error; }
      else {
        throw new InternalServerError(GenericErrorsEnum.UNKNOWN_ERROR);
      }
    }

  }

  private async findInnovationSections(innovationId: string): Promise<InnovationSectionEntity[] | undefined> {

    const innovation = await this.sqlConnection.createQueryBuilder(InnovationEntity, 'innovations')
      .leftJoinAndSelect('innovations.sections', 'sections')
      .where('innovations.id = :innovationId', { innovationId })
      .getOne()

    const sections = innovation?.sections;

    return sections;
  }

  private async hasIncompleteSections(sections: InnovationSectionEntity[]): Promise<boolean> {

    const innovationSections = this.getInnovationSectionsMetadata(sections);

    return innovationSections.some(
      (x) => x.status !== InnovationSectionStatusEnum.SUBMITTED
    );

  }

  private getInnovationSectionsMetadata(sections: InnovationSectionEntity[]): InnovationSectionModel[] {

    const innovationSections: InnovationSectionModel[] = [];

    for (const key in InnovationSectionEnum) {
      const section = sections.find((sec) => sec.section === key);
      innovationSections.push(this.getInnovationSectionMetadata(key, section));
    }

    return innovationSections;
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

}
