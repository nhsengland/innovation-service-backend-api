import { inject, injectable } from 'inversify';
import type { Repository } from 'typeorm';

import {
  DomainServiceType, DomainServiceSymbol,
} from '@innovations/shared/services';

import { BaseAppService } from './base-app.service';
import { InnovationCategoryEntity, InnovationSupportTypeEntity, InnovationEntity, InnovationAssessmentEntity, InnovationSupportLogEntity, ActivityLogEntity, OrganisationEntity, OrganisationUnitEntity, UserEntity, InnovationSupportEntity } from '@innovations/shared/entities';
import { type HasProblemTackleKnowledgeCatalogueEnum, type HasMarketResearchCatalogueEnum, type HasBenefitsCatalogueEnum, type HasTestsCatalogueEnum, type HasEvidenceCatalogueEnum, InnovationStatusEnum, ActivityEnum, InnovationCategoryCatalogueEnum, AccessorOrganisationRoleEnum, InnovationSupportStatusEnum, UserTypeEnum } from '@innovations/shared/enums';
import { UnprocessableEntityError, InnovationErrorsEnum, OrganisationErrorsEnum } from '@innovations/shared/errors';

import { SurveyModel } from '@innovations/shared/schemas/survey.schema';
import type { DomainUserInfoType } from '@innovations/shared/types';

type SurveyInfo = {
  mainCategory: InnovationCategoryCatalogueEnum | null | undefined;
  otherMainCategoryDescription: string | null;
  hasProblemTackleKnowledge: HasProblemTackleKnowledgeCatalogueEnum;
  hasMarketResearch: HasMarketResearchCatalogueEnum;
  hasBenefits: HasBenefitsCatalogueEnum;
  hasTests: HasTestsCatalogueEnum;
  hasEvidence: HasEvidenceCatalogueEnum;
  otherCategoryDescription: string | null;
  categories: InnovationCategoryEntity[];
  supportTypes: InnovationSupportTypeEntity[];
};

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

  async createInnovation(
    user: { id: string },
    data: { name: string, description: string, countryName: string, postcode: null | string, organisationShares: string[] },
    surveyId?: string | null,
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

    // either gets a survey object or an empty object.
    // If an empty object is returned this means that a null surveyId was passed in as input. Which means this innovation shouldn't contain survey answers.
    // If a survey id is passed in as argument, it will return a survey object or it will throw an error.
    const surveyInfo = await this.getSurveyInfo(user.id, surveyId);

    return this.sqlConnection.transaction(async transaction => {

      const savedInnovation = await transaction.save(InnovationEntity, InnovationEntity.new({
        categories: Promise.resolve(surveyInfo?.categories || []),
        supportTypes: Promise.resolve(surveyInfo?.supportTypes || []),
        hasBenefits: surveyInfo?.hasBenefits || null,
        name: data.name,
        description: data.description,
        countryName: data.countryName,
        postcode: data.postcode,
        owner: UserEntity.new({ id: user.id }),
        createdBy: user.id,
        updatedBy: user.id,
        status: InnovationStatusEnum.CREATED,
        organisationShares: data.organisationShares.map(id => OrganisationEntity.new({ id }))
      }));

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

  /**
  * Extracts information about the initial survey taken by the Innovator from CosmosDb
  */

  private async getSurveyInfo(userId: string, surveyId?: string | null): Promise<SurveyInfo | undefined> {

    if (!surveyId) return;

    const survey = await SurveyModel.findById(surveyId).exec()

    // if a surveyId was passed in as argument and is not null/undefined, then it is expected to be found on CosmosDb.
    if (!survey) {
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SURVEY_ID_NOT_FOUND)
    }

    const answers = survey.answers
    const surveyInfo = {
      mainCategory: answers.mainCategory,
      otherMainCategoryDescription: answers.otherMainCategoryDescription,
      hasProblemTackleKnowledge: answers.hasProblemTackleKnowledge,
      hasMarketResearch: answers.hasMarketResearch,
      hasBenefits: answers.hasBenefits,
      hasTests: answers.hasTests,
      hasEvidence: answers.hasEvidence,
      otherCategoryDescription: answers.otherCategoryDescription,
      categories: (answers.categories || []).map((e) => InnovationCategoryEntity.new({
        type: e,
        createdBy: userId,
        updatedBy: userId
      })),
      supportTypes: (answers.supportTypes || []).map((e) => InnovationSupportTypeEntity.new({
        type: e,
        createdBy: userId,
        updatedBy: userId
      }))
    }

    return surveyInfo;

  }

}
