/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { container } from '../_config';

import {
  InnovationAssessmentEntity,
  InnovationEntity,
  InnovationReassessmentRequestEntity,
  InnovationSupportEntity
} from '@innovations/shared/entities';
import { InnovationStatusEnum, InnovationSupportStatusEnum } from '@innovations/shared/enums';
import {
  InnovationErrorsEnum,
  NotFoundError,
  UnprocessableEntityError,
  UserErrorsEnum
} from '@innovations/shared/errors';
import { DomainInnovationsService, NotifierService } from '@innovations/shared/services';
import { TestsHelper } from '@innovations/shared/tests';
import { InnovationReassessmentRequestBuilder } from '@innovations/shared/tests/builders/innovation-reassessment-request.builder';
import { DTOsHelper } from '@innovations/shared/tests/helpers/dtos.helper';
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

  describe('getInnovationAssessmentInfo', () => {
    it('should get an innovation assessment', async () => {
      const assessment = innovationWithAssessment.assessment;
      const res = await sut.getInnovationAssessmentInfo(innovationWithAssessment.assessment.id);

      expect(res).toEqual({
        id: assessment.id,
        summary: assessment.summary,
        description: assessment.description,
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
          }
        ],
        updatedAt: expect.any(Date),
        updatedBy: { id: scenario.users.paulNeedsAssessor.id, name: scenario.users.paulNeedsAssessor.name }
      });
    });

    it('should return null finishedAt if assessment not submitted', async () => {
      const res = await sut.getInnovationAssessmentInfo(innovationWithAssessmentInProgress.assessmentInProgress.id, em);
      expect(res.finishedAt).toBeNull();
    });

    it('should not get an innovation assessment if it does not exist', async () => {
      await expect(() => sut.getInnovationAssessmentInfo(randUuid())).rejects.toThrowError(
        new NotFoundError(InnovationErrorsEnum.INNOVATION_ASSESSMENT_NOT_FOUND)
      );
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
      ).rejects.toThrowError(new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_ASSESSMENT_ALREADY_EXISTS));
    });
  });

  describe('updateInnovationAssessment', () => {
    it('should update an assessment', async () => {
      const assessment = innovationWithAssessment.assessment;

      const updatedAssessment = await sut.updateInnovationAssessment(
        DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
        innovationWithAssessment.id,
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
      ).rejects.toThrowError(new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND));
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
      ).rejects.toThrowError(new NotFoundError(InnovationErrorsEnum.INNOVATION_ASSESSMENT_NOT_FOUND));
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
      expect(dbUpdatedInnovation?.status).toBe(InnovationStatusEnum.IN_PROGRESS);
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
      expect(dbUpdatedInnovation?.status).toBe(InnovationStatusEnum.IN_PROGRESS);
    });
  });

  describe('createInnovationReassessment', () => {
    it('should create a ressessment', async () => {
      await em.update(
        InnovationSupportEntity,
        { innovation: { id: innovationWithAssessment.id } },
        { status: InnovationSupportStatusEnum.COMPLETE }
      );
      const innovationReassessment = await sut.createInnovationReassessment(
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
        innovationWithAssessment.id,
        { updatedInnovationRecord: 'YES', description: randText() },
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

    it('should not create a reassessment if the innovation has no assessment', async () => {
      await expect(async () =>
        sut.createInnovationReassessment(
          DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
          innovationWithoutAssessment.id,
          { updatedInnovationRecord: 'YES', description: randText() },
          em
        )
      ).rejects.toThrowError(new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_ASSESSMENT_NOT_FOUND));
    });

    it('should not create a reassessment if the innovation has ongoing supports', async () => {
      await expect(async () =>
        sut.createInnovationReassessment(
          DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
          innovationWithAssessment.id,
          { updatedInnovationRecord: 'YES', description: randText() },
          em
        )
      ).rejects.toThrowError(new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_CANNOT_REQUEST_REASSESSMENT));
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
        ).rejects.toThrowError(new NotFoundError(UserErrorsEnum.USER_SQL_NOT_FOUND));
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
        ).rejects.toThrowError(new NotFoundError(InnovationErrorsEnum.INNOVATION_ASSESSMENT_NOT_FOUND));
      });
    });
  });
});
