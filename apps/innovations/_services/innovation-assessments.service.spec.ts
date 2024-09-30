import { container } from '../_config';

import {
  InnovationAssessmentEntity,
  InnovationEntity,
  InnovationReassessmentRequestEntity,
  InnovationSectionEntity,
  InnovationSupportEntity
} from '@innovations/shared/entities';
import { InnovationStatusEnum, InnovationSupportStatusEnum } from '@innovations/shared/enums';
import {
  ConflictError,
  ForbiddenError,
  InnovationErrorsEnum,
  NotFoundError,
  UnprocessableEntityError,
  UserErrorsEnum
} from '@innovations/shared/errors';
import { DomainInnovationsService, NotifierService } from '@innovations/shared/services';
import { TestsHelper } from '@innovations/shared/tests';
import { InnovationReassessmentRequestBuilder } from '@innovations/shared/tests/builders/innovation-reassessment-request.builder';
import { DTOsHelper } from '@innovations/shared/tests/helpers/dtos.helper';
import type { InnovationAssessmentKPIExemptionType } from '@innovations/shared/types/assessment.types';
import { randText, randUuid } from '@ngneat/falso';
import { randomUUID } from 'crypto';
import type { EntityManager } from 'typeorm';
import type { InnovationAssessmentsService } from './innovation-assessments.service';
import SYMBOLS from './symbols';

describe('Innovation Assessments Suite', () => {
  let sut: InnovationAssessmentsService;

  let em: EntityManager;

  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  beforeAll(async () => {
    sut = container.get<InnovationAssessmentsService>(SYMBOLS.InnovationAssessmentsService);
    await testsHelper.init();

    // Setup mocks
    jest.spyOn(DomainInnovationsService.prototype, 'addActivityLog').mockResolvedValue();
    jest.spyOn(NotifierService.prototype, 'send').mockResolvedValue(true);
  });

  beforeEach(async () => {
    em = await testsHelper.getQueryRunnerEntityManager();
  });

  afterEach(async () => {
    await testsHelper.releaseQueryRunnerEntityManager();
  });

  const innovationWithAssessment = scenario.users.johnInnovator.innovations.johnInnovation;
  const innovationWithoutAssessment = scenario.users.adamInnovator.innovations.adamInnovation;
  const innovationWithAssessmentInProgress =
    scenario.users.ottoOctaviusInnovator.innovations.brainComputerInterfaceInnovation;
  const innovationWithArchivedStatus = scenario.users.johnInnovator.innovations.johnInnovationArchived;
  const innovationWithMultipleAssessments = scenario.users.tristanInnovator.innovations.innovationMultipleAssessments;

  describe('getAssessmentsList', () => {
    it('should return all the assessments completed ordered by startedAt', async () => {
      await em.update(
        InnovationAssessmentEntity,
        { id: innovationWithMultipleAssessments.assessment.id },
        { finishedAt: null }
      );

      const result = await sut.getAssessmentsList(innovationWithMultipleAssessments.id, em);

      const previous = innovationWithMultipleAssessments.previousAssessment;
      expect(result).toMatchObject([
        {
          id: previous.id,
          majorVersion: previous.majorVersion,
          minorVersion: previous.minorVersion,
          startedAt: new Date(previous.startedAt!),
          finishedAt: new Date(previous.finishedAt!)
        }
      ]);
    });
  });

  describe('getInnovationAssessmentInfo', () => {
    const naUser = DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor);
    it.each([
      ['QA', scenario.users.aliceQualifyingAccessor],
      ['A', scenario.users.ingridAccessor],
      ['NA', scenario.users.paulNeedsAssessor],
      ['I', scenario.users.johnInnovator]
    ])("should get an innovation assessment that's submitted as %s", async (_label, user) => {
      const assessment = innovationWithAssessment.assessment;
      const res = await sut.getInnovationAssessmentInfo(
        DTOsHelper.getUserRequestContext(user),
        innovationWithAssessment.assessment.id
      );

      expect(res).toEqual({
        id: assessment.id,
        majorVersion: assessment.majorVersion,
        minorVersion: assessment.minorVersion,
        editReason: assessment.editReason,
        summary: assessment.summary,
        description: assessment.description,
        startedAt: new Date(assessment.startedAt!),
        finishedAt: new Date(assessment.finishedAt!),
        assignTo: { id: assessment.assignedTo.id, name: assessment.assignedTo.name },
        maturityLevel: assessment.maturityLevel,
        maturityLevelComment: assessment.maturityLevelComment,
        hasRegulatoryApprovals: assessment.hasRegulatoryApprovals,
        hasRegulatoryApprovalsComment: assessment.hasRegulatoryApprovalsComment,
        hasEvidence: assessment.hasEvidence,
        hasEvidenceComment: assessment.hasEvidenceComment,
        hasValidation: assessment.hasValidation,
        hasValidationComment: assessment.hasValidationComment,
        hasProposition: assessment.hasProposition,
        hasPropositionComment: assessment.hasPropositionComment,
        hasCompetitionKnowledge: assessment.hasCompetitionKnowledge,
        hasCompetitionKnowledgeComment: assessment.hasCompetitionKnowledgeComment,
        hasImplementationPlan: assessment.hasImplementationPlan,
        hasImplementationPlanComment: assessment.hasImplementationPlanComment,
        hasScaleResource: assessment.hasScaleResource,
        hasScaleResourceComment: assessment.hasScaleResourceComment,
        suggestedOrganisations: [
          {
            id: scenario.organisations.healthOrg.id,
            name: scenario.organisations.healthOrg.name,
            acronym: scenario.organisations.healthOrg.acronym,
            units: [
              {
                id: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id,
                name: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
                acronym: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.acronym
              }
            ]
          },
          {
            id: scenario.organisations.innovTechOrg.id,
            name: scenario.organisations.innovTechOrg.name,
            acronym: scenario.organisations.innovTechOrg.acronym,
            units: [
              {
                id: scenario.organisations.innovTechOrg.organisationUnits.innovTechOrgUnit.id,
                name: scenario.organisations.innovTechOrg.organisationUnits.innovTechOrgUnit.name,
                acronym: scenario.organisations.innovTechOrg.organisationUnits.innovTechOrgUnit.acronym
              }
            ]
          }
        ],
        updatedAt: expect.any(Date),
        updatedBy: { id: scenario.users.paulNeedsAssessor.id, name: scenario.users.paulNeedsAssessor.name },
        isLatest: true
      });
    });

    it('should return null finishedAt if assessment not submitted', async () => {
      const res = await sut.getInnovationAssessmentInfo(
        naUser,
        innovationWithAssessmentInProgress.assessmentInProgress.id,
        em
      );
      expect(res.finishedAt).toBeNull();
    });

    it('should not get an innovation assessment if it does not exist', async () => {
      await expect(() => sut.getInnovationAssessmentInfo(naUser, randUuid())).rejects.toThrow(
        new NotFoundError(InnovationErrorsEnum.INNOVATION_ASSESSMENT_NOT_FOUND)
      );
    });

    it('should get innovation assessment if user is a needs assessor and assessment not submitted', async () => {
      const res = await sut.getInnovationAssessmentInfo(
        naUser,
        innovationWithAssessmentInProgress.assessmentInProgress.id,
        em
      );
      expect(res).toBeDefined();
    });

    it('should return the previous assessment if it exists', async () => {
      const res = await sut.getInnovationAssessmentInfo(naUser, innovationWithMultipleAssessments.assessment.id);
      expect(res.previousAssessment?.id).toBe(innovationWithMultipleAssessments.previousAssessment.id);
    });

    it('should return the sections changed since the previous assessment', async () => {
      const res = await sut.getInnovationAssessmentInfo(naUser, innovationWithMultipleAssessments.assessment.id);
      expect(res.reassessment?.sectionsUpdatedSinceLastAssessment.sort()).toEqual(
        ['COST_OF_INNOVATION', 'INNOVATION_DESCRIPTION'].sort()
      );
    });

    it("should return latest if it's the current assessment", async () => {
      const res = await sut.getInnovationAssessmentInfo(naUser, innovationWithMultipleAssessments.assessment.id);

      expect(res.isLatest).toBe(true);
    });

    it("shouldn't return latest if it isn't the current assessment", async () => {
      const res = await sut.getInnovationAssessmentInfo(
        naUser,
        innovationWithMultipleAssessments.previousAssessment.id
      );

      expect(res.isLatest).toBe(false);
    });

    it.each([
      ['QA', scenario.users.aliceQualifyingAccessor],
      ['A', scenario.users.ingridAccessor],
      ['I', scenario.users.johnInnovator]
    ])('should not get an innovation assessment if user %s and assessment not submitted', async (_label, user) => {
      await expect(
        sut.getInnovationAssessmentInfo(
          DTOsHelper.getUserRequestContext(user),
          innovationWithAssessmentInProgress.assessmentInProgress.id,
          em
        )
      ).rejects.toThrow(new ForbiddenError(InnovationErrorsEnum.INNOVATION_ASSESSMENT_NOT_SUBMITTED));
    });
  });

  describe('getSectionsUpdatedSincePreviousAssessment', () => {
    const innovation = scenario.users.tristanInnovator.innovations.innovationMultipleAssessments;
    it('should return the sections updated since the previous assessment', async () => {
      const res = await sut.getSectionsUpdatedSincePreviousAssessment(innovation.assessment.id, em);

      expect(res.sort()).toEqual(['COST_OF_INNOVATION', 'INNOVATION_DESCRIPTION'].sort());
    });

    // This test is not possible since it leverages the temporal tables feature of SQL Server.
    it.skip("shouldn't return a section updated after the new reassessment", async () => {
      await em.update(
        InnovationAssessmentEntity,
        { id: innovation.previousAssessment.id },
        { finishedAt: '2024-01-01' }
      );
      await em.update(InnovationAssessmentEntity, { id: innovation.assessment.id }, { finishedAt: '2024-02-01' });
      await em.update(
        InnovationSectionEntity,
        { innovation: { id: innovation.id }, section: 'INNOVATION_DESCRIPTION' },
        { updatedAt: '2024-01-15' }
      );
      await em.update(
        InnovationSectionEntity,
        { innovation: { id: innovation.id }, section: 'COST_OF_INNOVATION' },
        { updatedAt: '2024-02-15' }
      );
      const res = await sut.getSectionsUpdatedSincePreviousAssessment(innovation.assessment.id, em);
      expect(res).toEqual(['INNOVATION_DESCRIPTION']);
    });

    it('should return an empty array if there is no previous assessment', async () => {
      const res = await sut.getSectionsUpdatedSincePreviousAssessment(innovation.previousAssessment.id, em);
      expect(res).toEqual([]);
    });

    // This test is not possible since it leverages the temporal tables feature of SQL Server.
    it.skip('should return an empty array if there are no sections updated since the previous assessment', async () => {
      await em.update(InnovationSectionEntity, { innovation: { id: innovation.id } }, { updatedAt: '2022-01-01' });
      const res = await sut.getSectionsUpdatedSincePreviousAssessment(innovation.assessment.id, em);
      expect(res).toEqual([]);
    });
  });

  describe('createInnovationAssessment', () => {
    it('should create an assessment', async () => {
      const assessment = await sut.createInnovationAssessment(
        DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
        innovationWithoutAssessment.id,
        { message: 'test assessment' },
        em
      );

      const dbAssessment = await em.getRepository(InnovationAssessmentEntity).findOne({ where: { id: assessment.id } });

      expect(assessment.id).toBeDefined();
      expect(dbAssessment).toBeDefined();
    });

    it('should not create an innovation assessment if one already exists', async () => {
      await expect(() =>
        sut.createInnovationAssessment(
          DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
          innovationWithAssessment.id,
          { message: 'test assessment' },
          em
        )
      ).rejects.toThrow(new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_ASSESSMENT_ALREADY_EXISTS));
    });

    it('should update the innovation current assessment', async () => {
      const assessment = await sut.createInnovationAssessment(
        DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
        innovationWithoutAssessment.id,
        { message: 'test assessment' },
        em
      );

      const innovation = await em
        .getRepository(InnovationEntity)
        .findOne({ where: { id: innovationWithoutAssessment.id }, relations: ['currentAssessment'] });

      expect(innovation?.currentAssessment?.id).toBe(assessment.id);
    });
  });

  describe('editInnovationAssessment', () => {
    it('should create a new assessment when editing an assessment', async () => {
      const assessment = await sut.editInnovationAssessment(
        DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
        innovationWithAssessment.id,
        { reason: 'test edit assessment' },
        em
      );

      const dbAssessment = await em.getRepository(InnovationAssessmentEntity).findOne({ where: { id: assessment.id } });

      expect(assessment.id).toBeDefined();
      expect(dbAssessment).toBeDefined();
    });

    it('should not edit assessment if the assessment does not exist', async () => {
      await expect(
        async () =>
          await sut.editInnovationAssessment(
            DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
            innovationWithoutAssessment.id,
            { reason: 'test edit assessment' },
            em
          )
      ).rejects.toThrow(new NotFoundError(InnovationErrorsEnum.INNOVATION_ASSESSMENT_NOT_FOUND));
    });

    it('should not edit assessment if assessment is not submitted', async () => {
      await expect(
        sut.editInnovationAssessment(
          DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
          innovationWithAssessmentInProgress.id,
          { reason: 'test edit assessment' },
          em
        )
      ).rejects.toThrow(new ConflictError(InnovationErrorsEnum.INNOVATION_ASSESSMENT_NOT_SUBMITTED));
    });
  });

  describe('updateInnovationAssessment', () => {
    it('should update an assessment', async () => {
      const assessment = innovationWithAssessmentInProgress.assessmentInProgress;

      const updatedAssessment = await sut.updateInnovationAssessment(
        DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
        innovationWithAssessmentInProgress.id,
        assessment.id,
        { summary: 'test update assessment' },
        em
      );

      const dbUpdatedAssessment = await em
        .getRepository(InnovationAssessmentEntity)
        .findOne({ where: { id: updatedAssessment.id } });

      expect(updatedAssessment.id).toBe(assessment.id);
      expect(dbUpdatedAssessment?.summary).toBe('test update assessment');
    });

    it('should not update a finished assessment', async () => {
      const assessment = innovationWithAssessment.assessment;

      await expect(
        sut.updateInnovationAssessment(
          DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
          innovationWithAssessment.id,
          assessment.id,
          { summary: 'test update assessment' },
          em
        )
      ).rejects.toThrow(new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_ASSESSMENT_ALREADY_SUBMITTED));
    });

    it('should not update assessment if the innovation does not exist', async () => {
      await expect(
        async () =>
          await sut.updateInnovationAssessment(
            DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
            randomUUID(),
            innovationWithAssessment.id,
            { summary: 'test update assessment' },
            em
          )
      ).rejects.toThrow(new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND));
    });

    it('should not update assessment if the assessment does not exist', async () => {
      await expect(
        async () =>
          await sut.updateInnovationAssessment(
            DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
            innovationWithAssessment.id,
            randomUUID(),
            { summary: 'test update assessment' },
            em
          )
      ).rejects.toThrow(new NotFoundError(InnovationErrorsEnum.INNOVATION_ASSESSMENT_NOT_FOUND));
    });

    it('should not update assessment if the suggestions were removed', async () => {
      const innovation = innovationWithAssessmentInProgress;

      await sut.updateInnovationAssessment(
        DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
        innovation.id,
        innovation.assessmentInProgress.id,
        { suggestedOrganisationUnitsIds: [scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id] },
        em
      );

      await expect(
        sut.updateInnovationAssessment(
          DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
          innovation.id,
          innovation.assessmentInProgress.id,
          {
            isSubmission: true,
            suggestedOrganisationUnitsIds: [scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id]
          },
          em
        )
      ).rejects.toThrow(new ConflictError(InnovationErrorsEnum.INNOVATION_ASSESSMENT_SUGGESTIONS_CANT_BE_REMOVED));
    });

    it('should submit an assessment', async () => {
      const assessment = innovationWithAssessmentInProgress.assessmentInProgress;

      const updatedAssessment = await sut.updateInnovationAssessment(
        DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
        innovationWithAssessment.id,
        assessment.id,
        { isSubmission: true },
        em
      );

      const dbUpdatedInnovation = await em
        .getRepository(InnovationEntity)
        .findOne({ where: { id: innovationWithAssessment.id } });

      expect(updatedAssessment.id).toBe(assessment.id);
      expect(dbUpdatedInnovation).toMatchObject({
        status: InnovationStatusEnum.IN_PROGRESS,
        hasBeenAssessed: true
      });
    });

    it('should save a reassessment', async () => {
      await new InnovationReassessmentRequestBuilder(em)
        .setAssessment(innovationWithAssessment.assessment)
        .setInnovation(innovationWithAssessment)
        .save();

      const assessment = innovationWithAssessment.assessment;

      const updatedAssessment = await sut.updateInnovationAssessment(
        DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
        innovationWithAssessment.id,
        assessment.id,
        { isSubmission: false },
        em
      );

      const dbUpdatedInnovation = await em
        .getRepository(InnovationEntity)
        .findOne({ where: { id: innovationWithAssessment.id } });

      expect(updatedAssessment.id).toBe(assessment.id);
      expect(dbUpdatedInnovation?.status).toBe(InnovationStatusEnum.NEEDS_ASSESSMENT);
    });

    it('should submit a reassessment', async () => {
      await new InnovationReassessmentRequestBuilder(em)
        .setAssessment(innovationWithAssessment.assessment)
        .setInnovation(innovationWithAssessment)
        .save();

      const assessment = innovationWithAssessment.assessment;

      const updatedAssessment = await sut.updateInnovationAssessment(
        DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
        innovationWithAssessment.id,
        assessment.id,
        { isSubmission: true },
        em
      );

      const dbUpdatedInnovation = await em
        .getRepository(InnovationEntity)
        .findOne({ where: { id: innovationWithAssessment.id } });

      expect(updatedAssessment.id).toBe(assessment.id);
      expect(dbUpdatedInnovation).toMatchObject({
        status: InnovationStatusEnum.IN_PROGRESS,
        hasBeenAssessed: true
      });
    });
  });

  describe('createInnovationReassessment', () => {
    it('should create a ressessment', async () => {
      await em.update(
        InnovationSupportEntity,
        { innovation: { id: innovationWithAssessment.id } },
        { status: InnovationSupportStatusEnum.CLOSED }
      );
      const innovationReassessment = await sut.createInnovationReassessment(
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
        innovationWithAssessment.id,
        { reassessmentReason: ['NO_SUPPORT'], description: randText(), whatSupportDoYouNeed: randText() },
        em
      );

      const bdReassessment = await em
        .createQueryBuilder(InnovationReassessmentRequestEntity, 'reassessment')
        .leftJoinAndSelect('reassessment.assessment', 'assessment')
        .where('reassessment.id = :reassessmentId', {
          reassessmentId: innovationReassessment.reassessment.id
        })
        .getOne();

      expect(innovationReassessment).toEqual({
        assessment: { id: bdReassessment?.assessment.id },
        reassessment: { id: bdReassessment?.id }
      });
    });

    it('should create a ressessment and restore old supports', async () => {
      await em.update(
        InnovationSupportEntity,
        { innovation: { id: innovationWithAssessment.id } },
        { status: InnovationSupportStatusEnum.CLOSED }
      );
      await em.update(InnovationEntity, { id: innovationWithAssessment.id }, { status: InnovationStatusEnum.ARCHIVED });

      await sut.createInnovationReassessment(
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
        innovationWithAssessment.id,
        { reassessmentReason: ['NO_SUPPORT'], description: randText(), whatSupportDoYouNeed: randText() },
        em
      );

      const supports = await em
        .createQueryBuilder(InnovationSupportEntity, 'support')
        .select(['support.id', 'support.status', 'userRoles.id'])
        .leftJoin('support.userRoles', 'userRoles')
        .where('support.innovation_id = :innovationId', { innovationId: innovationWithAssessment.id })
        .getMany();

      const prevSupports = [
        innovationWithAssessment.supports.supportByHealthOrgUnit,
        innovationWithAssessment.supports.supportByMedTechOrgUnit,
        innovationWithAssessment.supports.supportByHealthOrgAiUnit
      ];
      for (const prevSupport of prevSupports) {
        const current = supports.find(s => s.id === prevSupport.id);
        if (prevSupport.status === InnovationSupportStatusEnum.ENGAGING) {
          expect(current?.status).toBe(InnovationSupportStatusEnum.SUGGESTED); // TODO MJS - check later
          expect(current?.userRoles).toHaveLength(0);
        } else {
          expect(current?.status).toBe(prevSupport.status);
          expect(current?.userRoles.map(r => r.id)).toMatchObject(prevSupport.userRoles);
        }
      }
    });

    it('should not create a reassessment if the innovation has no assessment', async () => {
      await expect(async () =>
        sut.createInnovationReassessment(
          DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
          innovationWithoutAssessment.id,
          { reassessmentReason: ['NO_SUPPORT'], description: randText(), whatSupportDoYouNeed: randText() },
          em
        )
      ).rejects.toThrow(new NotFoundError(InnovationErrorsEnum.INNOVATION_ASSESSMENT_NOT_FOUND));
    });

    it('should not create a reassessment if the innovation is in archived status and user is a collaborator', async () => {
      await expect(async () =>
        sut.createInnovationReassessment(
          DTOsHelper.getUserRequestContext(scenario.users.janeInnovator),
          innovationWithArchivedStatus.id,
          { reassessmentReason: ['NO_SUPPORT'], description: randText(), whatSupportDoYouNeed: randText() },
          em
        )
      ).rejects.toThrow(new ForbiddenError(InnovationErrorsEnum.INNOVATION_COLLABORATOR_MUST_BE_OWNER));
    });

    it('should not create a reassessment if the innovation has ongoing supports when req by innov', async () => {
      await expect(async () =>
        sut.createInnovationReassessment(
          DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
          innovationWithAssessment.id,
          { reassessmentReason: ['NO_SUPPORT'], description: randText(), whatSupportDoYouNeed: randText() },
          em
        )
      ).rejects.toThrow(new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_CANNOT_REQUEST_REASSESSMENT));
    });

    it('should not create a reassessment if the innovation is not in progress when req by NA', async () => {
      await expect(async () =>
        sut.createInnovationReassessment(
          DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
          innovationWithArchivedStatus.id,
          { reassessmentReason: ['NO_SUPPORT'], description: randText(), whatSupportDoYouNeed: randText() },
          em
        )
      ).rejects.toThrow(new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_CANNOT_REQUEST_REASSESSMENT));
    });

    it('should create a reassessment if the innovation has ongoing supports when req by NA', async () => {
      await em.update(
        InnovationSupportEntity,
        { innovation: { id: innovationWithAssessment.id } },
        { status: InnovationSupportStatusEnum.CLOSED }
      );
      const innovationReassessment = await sut.createInnovationReassessment(
        DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
        innovationWithAssessment.id,
        { reassessmentReason: ['NO_SUPPORT'], description: randText(), whatSupportDoYouNeed: randText() },
        em
      );

      const bdReassessment = await em
        .createQueryBuilder(InnovationReassessmentRequestEntity, 'reassessment')
        .leftJoinAndSelect('reassessment.assessment', 'assessment')
        .where('reassessment.id = :reassessmentId', {
          reassessmentId: innovationReassessment.reassessment.id
        })
        .getOne();

      expect(innovationReassessment).toEqual({
        assessment: { id: bdReassessment?.assessment.id },
        reassessment: { id: bdReassessment?.id }
      });
    });
    it.each(['finishedAt', 'assignTo', 'exemptedAt', 'exemptedReason', 'exemptedMessage'] as const)(
      'should not include field %s from previous assessment',
      async field => {
        await em.update(
          InnovationSupportEntity,
          { innovation: { id: innovationWithAssessment.id } },
          { status: InnovationSupportStatusEnum.CLOSED }
        );
        const innovationReassessment = await sut.createInnovationReassessment(
          DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
          innovationWithAssessment.id,
          { reassessmentReason: ['NO_SUPPORT'], description: randText(), whatSupportDoYouNeed: randText() },
          em
        );

        const bdReassessment = await em
          .createQueryBuilder(InnovationReassessmentRequestEntity, 'reassessment')
          .leftJoinAndSelect('reassessment.assessment', 'assessment')
          .where('reassessment.id = :reassessmentId', {
            reassessmentId: innovationReassessment.reassessment.id
          })
          .getOne();

        expect(bdReassessment?.assessment[field]).toBeFalsy(); // assignTo is undefined others are null
      }
    );

    it('should keep the previous assessment', async () => {
      await em.update(
        InnovationSupportEntity,
        { innovation: { id: innovationWithAssessment.id } },
        { status: InnovationSupportStatusEnum.CLOSED }
      );

      const { assessment } = await sut.createInnovationReassessment(
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
        innovationWithAssessment.id,
        { reassessmentReason: ['NO_SUPPORT'], description: randText(), whatSupportDoYouNeed: randText() },
        em
      );

      const dbAssessment = await em.getRepository(InnovationAssessmentEntity).findOne({ where: { id: assessment.id } });
      expect(dbAssessment?.deletedAt).toBe(null);
    });

    it('should update the innovation current assessment', async () => {
      await em.update(
        InnovationSupportEntity,
        { innovation: { id: innovationWithAssessment.id } },
        { status: InnovationSupportStatusEnum.CLOSED }
      );

      const { assessment } = await sut.createInnovationReassessment(
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
        innovationWithAssessment.id,
        { reassessmentReason: ['NO_SUPPORT'], description: randText(), whatSupportDoYouNeed: randText() },
        em
      );

      const dbInnovation = await em
        .getRepository(InnovationEntity)
        .findOne({ where: { id: innovationWithAssessment.id }, relations: ['currentAssessment'] });
      expect(dbInnovation?.currentAssessment?.id).toBe(assessment.id);
    });

    it('should link the previous assessment', async () => {
      await em.update(
        InnovationSupportEntity,
        { innovation: { id: innovationWithAssessment.id } },
        { status: InnovationSupportStatusEnum.CLOSED }
      );

      const { assessment } = await sut.createInnovationReassessment(
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
        innovationWithAssessment.id,
        { reassessmentReason: ['NO_SUPPORT'], description: randText(), whatSupportDoYouNeed: randText() },
        em
      );

      const dbAssessment = await em
        .getRepository(InnovationAssessmentEntity)
        .findOne({ where: { id: assessment.id }, relations: ['previousAssessment'] });
      expect(dbAssessment?.previousAssessment?.id).toBe(innovationWithAssessment.assessment.id);
    });
  });

  describe('updateAssessor', () => {
    it('should update the assigned assessor', async () => {
      const newAssessor = scenario.users.seanNeedsAssessor;
      const result = await sut.updateAssessor(
        DTOsHelper.getUserRequestContext(newAssessor),
        innovationWithAssessment.id,
        innovationWithAssessment.assessment.id,
        newAssessor.id,
        em
      );

      expect(result).toEqual({
        assessmentId: innovationWithAssessment.assessment.id,
        assessorId: newAssessor.id
      });
    });

    it('should not update assessor if the new assessor does not exist', async () => {
      await expect(() =>
        sut.updateAssessor(
          DTOsHelper.getUserRequestContext(scenario.users.seanNeedsAssessor),
          innovationWithAssessment.id,
          innovationWithAssessment.assessment.id,
          randUuid(),
          em
        )
      ).rejects.toThrow(new NotFoundError(UserErrorsEnum.USER_SQL_NOT_FOUND));
    });

    it('should not update assessor if the innovation has no assessment', async () => {
      const newAssessor = scenario.users.seanNeedsAssessor;
      await expect(() =>
        sut.updateAssessor(
          DTOsHelper.getUserRequestContext(newAssessor),
          innovationWithoutAssessment.id,
          randomUUID(),
          newAssessor.id,
          em
        )
      ).rejects.toThrow(new NotFoundError(InnovationErrorsEnum.INNOVATION_ASSESSMENT_NOT_FOUND));
    });
  });

  describe('upsertExemption', () => {
    const assessment = scenario.users.johnInnovator.innovations.johnInnovation.assessment;
    const paulNeedsAssessor = scenario.users.paulNeedsAssessor;

    it('should create an exemption request for the first time', async () => {
      const data = {
        reason: 'TECHNICAL_DIFFICULTIES' as InnovationAssessmentKPIExemptionType,
        message: randText()
      };

      await sut.upsertExemption(
        DTOsHelper.getUserRequestContext(paulNeedsAssessor, 'assessmentRole'),
        assessment.id,
        data,
        em
      );

      const dbAssessment = await em
        .createQueryBuilder(InnovationAssessmentEntity, 'assessment')
        .where('assessment.id = :assessmentId', { assessmentId: assessment.id })
        .getOne();

      expect(dbAssessment).toMatchObject({
        exemptedReason: data.reason,
        exemptedMessage: data.message,
        exemptedAt: expect.any(Date),
        updatedBy: paulNeedsAssessor.id
      });
    });

    it("should update an exemption request and don't update the exemptedAt date", async () => {
      const oldData = {
        reason: 'TECHNICAL_DIFFICULTIES' as InnovationAssessmentKPIExemptionType,
        message: randText(),
        date: new Date()
      };
      await em.update(
        InnovationAssessmentEntity,
        { id: assessment.id },
        { exemptedReason: oldData.reason, exemptedMessage: randText(), exemptedAt: oldData.date }
      );

      const data = { reason: 'TECHNICAL_DIFFICULTIES' as InnovationAssessmentKPIExemptionType };
      await sut.upsertExemption(
        DTOsHelper.getUserRequestContext(paulNeedsAssessor, 'assessmentRole'),
        assessment.id,
        data,
        em
      );

      const dbAssessment = await em
        .createQueryBuilder(InnovationAssessmentEntity, 'assessment')
        .where('assessment.id = :assessmentId', { assessmentId: assessment.id })
        .getOne();

      expect(dbAssessment).toMatchObject({
        exemptedReason: data.reason,
        exemptedMessage: null,
        exemptedAt: oldData.date,
        updatedBy: paulNeedsAssessor.id
      });
    });

    it("should return an NotFoundError when an assessment doesn't exist", async () => {
      await expect(() =>
        sut.upsertExemption(
          DTOsHelper.getUserRequestContext(paulNeedsAssessor, 'assessmentRole'),
          randUuid(),
          { reason: 'SERVICE_UNAVAILABLE' },
          em
        )
      ).rejects.toThrow(new NotFoundError(InnovationErrorsEnum.INNOVATION_ASSESSMENT_NOT_FOUND));
    });
  });

  describe('getExemption', () => {
    const assessment = scenario.users.johnInnovator.innovations.johnInnovation.assessment;

    it('should return the exemption info and isExempted as true', async () => {
      const expected = {
        reason: 'INCORRECT_DETAILS' as InnovationAssessmentKPIExemptionType,
        message: randText(),
        exemptedAt: new Date()
      };
      await em.update(
        InnovationAssessmentEntity,
        { id: assessment.id },
        { exemptedReason: expected.reason, exemptedMessage: expected.message, exemptedAt: expected.exemptedAt }
      );

      const exemption = await sut.getExemption(assessment.id, em);

      expect(exemption).toStrictEqual({
        isExempted: true,
        exemption: expected
      });
    });

    it('should not return the exemption info and isExempted as false', async () => {
      const exemption = await sut.getExemption(assessment.id, em);

      expect(exemption).toStrictEqual({
        isExempted: false
      });
    });

    it("should return a NotFoundError when an assessment doesn't exist", async () => {
      await expect(() => sut.getExemption(randUuid(), em)).rejects.toThrow(
        new NotFoundError(InnovationErrorsEnum.INNOVATION_ASSESSMENT_NOT_FOUND)
      );
    });
  });
});
