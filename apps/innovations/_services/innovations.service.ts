import { inject, injectable } from 'inversify';
import type { Repository } from 'typeorm';

import { InnovationStatusEnum, ActivityEnum, AccessorOrganisationRoleEnum, InnovationSupportStatusEnum, UserTypeEnum, InnovationSectionCatalogueEnum, InnovationSectionStatusEnum } from '@innovations/shared/enums';
import { InnovationCategoryEntity, InnovationSupportTypeEntity, InnovationEntity, InnovationAssessmentEntity, InnovationSupportLogEntity, ActivityLogEntity, OrganisationEntity, OrganisationUnitEntity, UserEntity, InnovationSupportEntity, InnovationSectionEntity } from '@innovations/shared/entities';
import { UnprocessableEntityError, InnovationErrorsEnum, OrganisationErrorsEnum, NotFoundError } from '@innovations/shared/errors';
import { SurveyAnswersType, SurveyModel } from '@innovations/shared/schemas';
import { DomainServiceType, DomainServiceSymbol } from '@innovations/shared/services';
import type { DomainUserInfoType } from '@innovations/shared/types';

import type { InnovationSectionModel } from '../_types/innovation.types';

import { BaseAppService } from './base-app.service';


@injectable()
export class InnovationsService extends BaseAppService {

  innovationRepository: Repository<InnovationEntity>;
  innovationAssessmentRepository: Repository<InnovationAssessmentEntity>;
  innovationSupportLogRepository: Repository<InnovationSupportLogEntity>;
  activityLogRepository: Repository<ActivityLogEntity>;
  organisationRepository: Repository<OrganisationEntity>;
  organisationUnitRepository: Repository<OrganisationUnitEntity>;

  constructor(
    @inject(DomainServiceSymbol) private domainService: DomainServiceType,
    // @inject(NotifierServiceSymbol) private notifService: NotifierServiceType,
  ) {
    super();
    this.innovationRepository = this.sqlConnection.getRepository<InnovationEntity>(InnovationEntity);
    this.innovationAssessmentRepository = this.sqlConnection.getRepository<InnovationAssessmentEntity>(InnovationAssessmentEntity);
    this.innovationSupportLogRepository = this.sqlConnection.getRepository<InnovationSupportLogEntity>(InnovationSupportLogEntity);
    this.activityLogRepository = this.sqlConnection.getRepository<ActivityLogEntity>(ActivityLogEntity);
    this.organisationRepository = this.sqlConnection.getRepository<OrganisationEntity>(OrganisationEntity);
    this.organisationUnitRepository = this.sqlConnection.getRepository<OrganisationUnitEntity>(OrganisationUnitEntity);
  }


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


  async createInnovation(
    user: { id: string },
    data: { name: string, description: string, countryName: string, postcode: null | string, organisationShares: string[] },
    surveyId: null | string
  ): Promise<{ id: string }> {

    // Sanity check if innovation name already exists (for the same user).
    const repeatedNamesCount = await this.innovationRepository.createQueryBuilder('innovation')
      .where('innovation.owner_id = :ownerId', { ownerId: user.id })
      .andWhere('TRIM(LOWER(innovation.name)) = :innovationName', { innovationName: data.name.trim().toLowerCase() })
      .getCount();
    if (repeatedNamesCount > 0) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_ALREADY_EXISTS);
    }

    // Sanity check if all organisation units exists.
    const organisationsCount = await this.organisationRepository.createQueryBuilder('organisation')
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
      let sectionsToBeInDraft: InnovationSectionCatalogueEnum[] = [];

      if (surveyInfo) {
        sectionsToBeInDraft = [
          InnovationSectionCatalogueEnum.INNOVATION_DESCRIPTION,
          InnovationSectionCatalogueEnum.VALUE_PROPOSITION,
          InnovationSectionCatalogueEnum.UNDERSTANDING_OF_BENEFITS,
          InnovationSectionCatalogueEnum.EVIDENCE_OF_EFFECTIVENESS,
          InnovationSectionCatalogueEnum.MARKET_RESEARCH,
          InnovationSectionCatalogueEnum.TESTING_WITH_USERS
        ];
      } else {
        sectionsToBeInDraft = [InnovationSectionCatalogueEnum.INNOVATION_DESCRIPTION];
      }

      for (const sectionKey of sectionsToBeInDraft) {
        await transaction.save(InnovationSectionEntity, InnovationSectionEntity.new({
          innovation: savedInnovation,
          section: InnovationSectionCatalogueEnum[sectionKey],
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

  async getInnovationShares(innovationId: string, requestUser: DomainUserInfoType): Promise<{ id: string; status: InnovationSupportStatusEnum; }[] | undefined> {

    const baseQuery = this.sqlConnection.createQueryBuilder(InnovationEntity, 'innovation')
      .innerJoinAndSelect('innovation.organisationShares', 'organisationShares')
      .leftJoinAndSelect('innovation.innovationSupports', 'innovationSupports')
      .leftJoinAndSelect('innovation.assessments', 'assessments')
      .leftJoinAndSelect('innovationSupports.organisationUnit', 'organisationUnit')
      .leftJoinAndSelect('organisationUnit.organisation', 'organisation')
      .where('innovation.id = :innovationId', { innovationId });

    switch (requestUser.type) {
      case UserTypeEnum.INNOVATOR: {
        baseQuery.andWhere('innovation.owner_id = :ownerId', { ownerId: requestUser.id });
        break;
      }
      case UserTypeEnum.ACCESSOR: {
        const organisation = requestUser.organisations[0];

        if (organisation!.role === AccessorOrganisationRoleEnum.QUALIFYING_ACCESSOR) {
          baseQuery.andWhere('organisationShares.organisation_id = :organisationId', { organisationId: organisation!.id });
        } else {
          baseQuery.andWhere('innovationSupports.organisation_unit_id = :organisationUnitId', { organisationUnitId: organisation!.organisationUnits[0]!.id });
        }

        break;
      }

      case UserTypeEnum.ASSESSMENT: {
        baseQuery.loadAllRelationIds();
        break;
      }
      default:
        break;
    }


    const innovation = await baseQuery.getOne();

    const supports = innovation?.innovationSupports;
    const shares = innovation?.organisationShares;

    const result = shares?.map((os: OrganisationEntity) => {
      const organisationSupports = supports?.filter(
        (is: InnovationSupportEntity) => is.organisationUnit.organisation.id === os.id
      ) || [];

      let status: InnovationSupportStatusEnum = InnovationSupportStatusEnum.UNASSIGNED;
      if (organisationSupports?.length === 1) {
        status = organisationSupports[0]!.status;
      } else if (organisationSupports?.length > 1) {
        const idx = organisationSupports.findIndex(
          (is: InnovationSupportEntity) =>
            is.status != InnovationSupportStatusEnum.COMPLETE &&
            is.status != InnovationSupportStatusEnum.WITHDRAWN &&
            is.status != InnovationSupportStatusEnum.UNSUITABLE
        );

        if (idx !== -1) {
          status = organisationSupports[idx]!.status;
        } else {
          status = organisationSupports[0]!.status;
        }
      }

      return {
        id: os.id,
        status,
      };
    });

    return result;
  }

  async submitInnovation(innovationId: string, updatedById: string): Promise<{ id: string; status: InnovationStatusEnum; }> {

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

    return {
      id: innovationId,
      status: InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT
    };

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

    for (const key in InnovationSectionCatalogueEnum) {
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
        section: InnovationSectionCatalogueEnum[key as keyof typeof InnovationSectionCatalogueEnum],
        status: InnovationSectionStatusEnum.NOT_STARTED,
        updatedAt: null,
        submittedAt: null,
        actionStatus: null,
      };
    }

    return result;
  }

}
