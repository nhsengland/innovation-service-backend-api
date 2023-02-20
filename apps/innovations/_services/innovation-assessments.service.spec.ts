/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { TestDataType, TestsHelper } from '@innovations/shared/tests/tests.helper';
import { container } from '../_config';

import { InnovationErrorsEnum, NotFoundError, UnprocessableEntityError, UserErrorsEnum } from '@innovations/shared/errors';
import { DomainInnovationsService, DomainUsersService, NOSQLConnectionService, NotifierService } from '@innovations/shared/services';
import { CacheService } from '@innovations/shared/services/storage/cache.service';
import type { EntityManager } from 'typeorm';
import { InnovationAssessmentsServiceSymbol, InnovationAssessmentsServiceType } from './interfaces';
import { InnovationAssessmentEntity, InnovationEntity, InnovationReassessmentRequestEntity } from '@innovations/shared/entities';
import { randText, randUuid } from '@ngneat/falso';
import { InnovationStatusEnum, ServiceRoleEnum, YesOrNoCatalogueEnum } from '@innovations/shared/enums';
// import type { InnovationAssessmentType } from '../_types/innovation.types';
 import { UserBuilder } from '@innovations/shared/builders';

describe('Innovation Assessments Suite', () => {

  let sut: InnovationAssessmentsServiceType;

  let testData: TestDataType;
  let em: EntityManager;

  let innovationWithAssessment: InnovationEntity;
  let innovationWithoutAssessment: InnovationEntity;

  beforeAll(async () => {
    sut = container.get<InnovationAssessmentsServiceType>(InnovationAssessmentsServiceSymbol);
    await TestsHelper.init();
    testData = TestsHelper.sampleData;
  });

  beforeEach(async () => {
    jest.spyOn(NOSQLConnectionService.prototype, 'init').mockResolvedValue();
    jest.spyOn(CacheService.prototype, 'init').mockReturnThis();
    em = await TestsHelper.getQueryRunnerEntityManager();

    innovationWithAssessment = await TestsHelper.TestDataBuilder
      .createInnovation()
      .setOwner(testData.baseUsers.innovator)
      .withAssessments(testData.baseUsers.assessmentUser)
      .build(em);

    innovationWithoutAssessment = await TestsHelper.TestDataBuilder.createInnovation()
      .setOwner(testData.baseUsers.innovator)
      .build(em);
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await TestsHelper.releaseQueryRunnerEntityManager(em);
  });

  describe('getInnovationAssssmentInfo', () => {

    beforeEach(() => {
      jest.spyOn(DomainUsersService.prototype, 'getUsersList').mockResolvedValue(
        [{
          id: testData.baseUsers.assessmentUser.id,
          displayName: 'assessment user name'
        }] as any
      );
    });
    
    it('should get an innovation assessment', async () => {

      const createdAssessment = innovationWithAssessment.assessments[0]!;

      const assessment = await sut.getInnovationAssessmentInfo(createdAssessment.id, em);

      expect(assessment).toEqual({
        id: createdAssessment.id,
        summary: createdAssessment.summary,
        description: createdAssessment.description,
        finishedAt: createdAssessment.finishedAt,
        assignTo: { id: createdAssessment.assignTo.id, name: 'assessment user name' },
        maturityLevel: createdAssessment.maturityLevel,
        maturityLevelComment: createdAssessment.maturityLevelComment,
        hasRegulatoryApprovals: createdAssessment.hasRegulatoryApprovals,
        hasRegulatoryApprovalsComment: createdAssessment.hasRegulatoryApprovalsComment,
        hasEvidence: createdAssessment.hasEvidence,
        hasEvidenceComment: createdAssessment.hasEvidenceComment,
        hasValidation: createdAssessment.hasValidation,
        hasValidationComment: createdAssessment.hasValidationComment,
        hasProposition: createdAssessment.hasProposition,
        hasPropositionComment: createdAssessment.hasPropositionComment,
        hasCompetitionKnowledge: createdAssessment.hasCompetitionKnowledge,
        hasCompetitionKnowledgeComment: createdAssessment.hasCompetitionKnowledgeComment,
        hasImplementationPlan: createdAssessment.hasImplementationPlan,
        hasImplementationPlanComment: createdAssessment.hasImplementationPlanComment,
        hasScaleResource: createdAssessment.hasScaleResource,
        hasScaleResourceComment: createdAssessment.hasScaleResourceComment,
        suggestedOrganisations: createdAssessment.organisationUnits,
        updatedAt: createdAssessment.updatedAt,
        updatedBy: { id: createdAssessment.updatedBy, name: 'assessment user name' }
      });
    });

    it('should not get an innovation assessment if it does not exist', async () => {

      let err: NotFoundError | null = null;
      try {
        await sut.getInnovationAssessmentInfo(randUuid(), em);

      } catch (error) {
        err = error as NotFoundError;
      }

      expect(err).toBeDefined();
      expect(err?.name).toBe(InnovationErrorsEnum.INNOVATION_ASSESSMENT_NOT_FOUND);

    });
  });

  describe('createInnovationAssessment', () => {

    beforeEach(() => {
      jest.spyOn(DomainInnovationsService.prototype, 'addActivityLog').mockResolvedValue();
      jest.spyOn(NotifierService.prototype, 'send').mockResolvedValue(true);
    });

    it('should create an assessment', async () => {

      const assessment = await sut.createInnovationAssessment(
        testData.baseUsers.assessmentUser,
        testData.domainContexts.assessmentUser,
        innovationWithoutAssessment.id,
        { message: 'test assessment' },
        em
      );

      const dbAssessment = await em.getRepository(InnovationAssessmentEntity).findOne({ where: { id: assessment.id } });

      expect(assessment.id).toBeDefined();
      expect(dbAssessment).toBeDefined();

    });

    it('should not create an innovation assessment if one already exists', async () => {

      let err: UnprocessableEntityError | null = null;
      try {
        await sut.createInnovationAssessment(
          testData.baseUsers.assessmentUser,
          testData.domainContexts.assessmentUser,
          innovationWithAssessment.id,
          { message: 'test assessment' },
          em
        );
      } catch (error) {
        err = error as UnprocessableEntityError;
      }

      expect(err).toBeDefined();
      expect(err?.name).toBe(InnovationErrorsEnum.INNOVATION_ASSESSMENT_ALREADY_EXISTS);

    });
  });

  describe('updateInnovationAssessment', () => {

    beforeEach(() => {
      jest.spyOn(DomainInnovationsService.prototype, 'addActivityLog').mockResolvedValue();
      jest.spyOn(NotifierService.prototype, 'send').mockResolvedValue(true);
    });

    it('should update an assessment', async () => {

      const assessment = innovationWithAssessment.assessments[0]!;

      const updatedAssessment = await sut.updateInnovationAssessment(
        testData.baseUsers.assessmentUser,
        testData.domainContexts.assessmentUser,
        innovationWithAssessment.id,
        assessment?.id,
        { summary: 'test update assessment' },
        em
      );

      const dbUpdatedAssessment = await em.getRepository(InnovationAssessmentEntity)
        .findOne({ where: { id: updatedAssessment.id } });

      expect(updatedAssessment.id).toBe(assessment.id);
      expect(dbUpdatedAssessment?.summary).toBe('test update assessment');

    });

    it('should not update assessment if the innovation does not exist', async () => {

      let err: NotFoundError | null = null;
      try {
        await sut.updateInnovationAssessment(
          testData.baseUsers.assessmentUser,
          testData.domainContexts.assessmentUser,
          randUuid(),
          randUuid(),
          {},
          em
        );
      } catch (error) {
        err = error as NotFoundError;
      }

      expect(err).toBeDefined();
      expect(err?.name).toBe(InnovationErrorsEnum.INNOVATION_NOT_FOUND);

    });

    it('should not update assessment if the assessment does not exist', async () => {

      let err: NotFoundError | null = null;
      try {
        await sut.updateInnovationAssessment(
          testData.baseUsers.assessmentUser,
          testData.domainContexts.assessmentUser,
          innovationWithoutAssessment.id,
          randUuid(),
          {},
          em
        );
      } catch (error) {
        err = error as NotFoundError;
      }

      expect(err).toBeDefined();
      expect(err?.name).toBe(InnovationErrorsEnum.INNOVATION_ASSESSMENT_NOT_FOUND);

    });

    it('should submit an assessment', async () => {

      const assessment = innovationWithAssessment.assessments[0]!;

      const updatedAssessment = await sut.updateInnovationAssessment(
        testData.baseUsers.assessmentUser,
        testData.domainContexts.assessmentUser,
        innovationWithAssessment.id,
        assessment?.id,
        { isSubmission: true },
        em
      );

      const dbUpdatedInnovation = await em.getRepository(InnovationEntity)
        .findOne({ where: { id: innovationWithAssessment.id } });

      expect(updatedAssessment.id).toBe(assessment.id);
      expect(dbUpdatedInnovation?.status).toBe(InnovationStatusEnum.IN_PROGRESS);

    });

    it('should save a reassessment', async () => {

      jest.spyOn(DomainInnovationsService.prototype, 'addActivityLog').mockResolvedValue();
      jest.spyOn(NotifierService.prototype, 'send').mockResolvedValue(true);

      const innovationWithReassessment = await TestsHelper.TestDataBuilder.createInnovation()
        .setOwner(testData.baseUsers.innovator)
        .withAssessments(testData.baseUsers.assessmentUser)
        .withReassessment()
        .setStatus(InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT)
        .build(em);

      const assessment = innovationWithReassessment.assessments[0]!;

      const updatedAssessment = await sut.updateInnovationAssessment(
        testData.baseUsers.assessmentUser,
        testData.domainContexts.assessmentUser,
        innovationWithReassessment.id,
        assessment.id,
        { isSubmission: false },
        em
      );

      const dbUpdatedInnovation = await em.getRepository(InnovationEntity)
        .findOne({ where: { id: innovationWithReassessment.id } });

      expect(updatedAssessment.id).toBe(assessment.id);
      expect(dbUpdatedInnovation?.status).toBe(InnovationStatusEnum.NEEDS_ASSESSMENT);

    });

    it('should submit a reassessment', async () => {

      const innovationWithReassessment = await TestsHelper.TestDataBuilder.createInnovation()
        .setOwner(testData.baseUsers.innovator)
        .withAssessments(testData.baseUsers.assessmentUser)
        .withReassessment()
        .setStatus(InnovationStatusEnum.NEEDS_ASSESSMENT)
        .build(em);

      const assessment = innovationWithReassessment.assessments[0]!;
      
      const updatedAssessment = await sut.updateInnovationAssessment(
        testData.baseUsers.assessmentUser,
        testData.domainContexts.assessmentUser,
        innovationWithReassessment.id,
        assessment.id,
        { isSubmission: true },
        em
      );

      const dbUpdatedInnovation = await em.getRepository(InnovationEntity)
        .findOne({ where: { id: innovationWithReassessment.id } });

      expect(updatedAssessment.id).toBe(assessment.id);
      expect(dbUpdatedInnovation?.status).toBe(InnovationStatusEnum.IN_PROGRESS);

    });
  });

  describe('createInnovationReassessment', () => {
    it('should create a ressessment',async () => {
    
      const innovationReassessment = await sut.createInnovationReassessment(
        testData.baseUsers.assessmentUser,
        testData.domainContexts.assessmentUser,
        innovationWithAssessment.id,
        {updatedInnovationRecord: YesOrNoCatalogueEnum.YES, description: randText()},
        em
      );

      const bdReassessment = await em.createQueryBuilder(InnovationReassessmentRequestEntity, 'reassessment')
        .leftJoinAndSelect('reassessment.assessment', 'assessment')
        .where('reassessment.id = :reassessmentId', {reassessmentId: innovationReassessment.reassessment.id})
        .getOne();

      expect(innovationReassessment).toEqual({
        assessment: { id: bdReassessment?.assessment.id },
        reassessment: { id: bdReassessment?.id }
      });
    });

    it('should not create a reassessment if the innovation has no assessment', async () => {
      
      let err: UnprocessableEntityError | null = null;
      try {
        await sut.createInnovationReassessment(
          testData.baseUsers.assessmentUser,
          testData.domainContexts.assessmentUser,
          innovationWithoutAssessment.id,
          {updatedInnovationRecord: YesOrNoCatalogueEnum.YES, description: randText()},
          em
        );
      } catch (error) {
        err = error as UnprocessableEntityError;
      }

      expect(err).toBeDefined();
      expect(err?.name).toBe(InnovationErrorsEnum.INNOVATION_ASSESSMENT_NOT_FOUND);
    });
    
    it('should not create a reassessment if the innovation has ongoing supports', async () => {
      
      let err: UnprocessableEntityError | null = null;

      // not working due to datetime problems
      // const innovationWithSupport = await TestsHelper.TestDataBuilder.createInnovation()
      //   .setOwner(testData.baseUsers.innovator)
      //   .withSupportsAndAccessors(testData.organisationUnit.accessor, [testData.organisationUnitUsers.accessor])
      //   .withAssessments(testData.baseUsers.assessmentUser)
      //   .build(em);

      try {
        await sut.createInnovationReassessment(
          testData.baseUsers.assessmentUser,
          testData.domainContexts.assessmentUser,
          testData.innovation.id,
          {updatedInnovationRecord: YesOrNoCatalogueEnum.YES, description: randText()},
          em
        );
      } catch (error) {
        err = error as UnprocessableEntityError;
      }

      expect(err).toBeDefined();
      expect(err?.name).toBe(InnovationErrorsEnum.INNOVATION_CANNOT_REQUEST_REASSESSMENT);
    });
  });

  describe('updateAssessor', () => {
    it('should update the assigned assessor', async () => {

      const newAssessor = (await new UserBuilder(em).addRole(ServiceRoleEnum.ASSESSMENT).save()).getUser();

      const result = await sut.updateAssessor(
        testData.baseUsers.assessmentUser,
        testData.domainContexts.assessmentUser,
        innovationWithAssessment.id,
        innovationWithAssessment.assessments[0]!.id,
        newAssessor.id,
        em
      );
      
      expect(result).toEqual({
        assessmentId: innovationWithAssessment.assessments[0]!.id,
        assessorId: newAssessor.id
      });
    });

    it('should not update assessor if the new assessor does not exist', async () => {

      let err: NotFoundError | null = null;

      try {
        await sut.updateAssessor(
          testData.baseUsers.assessmentUser,
          testData.domainContexts.assessmentUser,
          innovationWithAssessment.id,
          innovationWithAssessment.assessments[0]!.id,
          randUuid(),
          em
        );
      } catch (error) {
        err = error as NotFoundError;
      }

      expect(err).toBeDefined();
      expect(err?.name).toBe(UserErrorsEnum.USER_SQL_NOT_FOUND);
    
    });

    it('should not update assessor if the innovation has no assessment', async () => {

      let err: NotFoundError | null = null;

      const newAssessor = (await new UserBuilder(em).addRole(ServiceRoleEnum.ASSESSMENT).save()).getUser();

      try {
        await sut.updateAssessor(
          testData.baseUsers.assessmentUser,
          testData.domainContexts.assessmentUser,
          innovationWithoutAssessment.id,
          innovationWithAssessment.assessments[0]!.id,
          newAssessor.id,
          em
        );
      } catch (error) {
        err = error as NotFoundError;
      }

      expect(err).toBeDefined();
      expect(err?.name).toBe(InnovationErrorsEnum.INNOVATION_ASSESSMENT_NOT_FOUND);
    
    });
  });
});


