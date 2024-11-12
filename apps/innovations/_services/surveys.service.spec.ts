import { type EntityManager } from 'typeorm';

import { TestsHelper } from '@innovations/shared/tests';

import { container } from '../_config';
import SYMBOLS from './symbols';
import type { SurveysService } from './surveys.service';
import { InnovationSupportEntity, InnovationSurveyEntity } from '@innovations/shared/entities';
import { DTOsHelper } from '@innovations/shared/tests/helpers/dtos.helper';
import {
  InnovationSurveyBuilder,
  type TestInnovationSurveyType
} from '@innovations/shared/tests/builders/innovation-survey.builder';
import { InnovationSupportStatusEnum } from '@innovations/shared/enums';
import { randUuid } from '@ngneat/falso';

describe('Innovations / _services / surveys.service.ts suite', () => {
  let sut: SurveysService;

  let em: EntityManager;

  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  beforeAll(async () => {
    sut = container.get<SurveysService>(SYMBOLS.SurveysService);
    await testsHelper.init();
  });

  beforeEach(async () => {
    em = await testsHelper.getQueryRunnerEntityManager();
  });

  afterEach(async () => {
    await testsHelper.releaseQueryRunnerEntityManager();
  });

  describe('createSurvey', () => {
    it('should create surveys for multiple users', async () => {
      const john = scenario.users.johnInnovator;
      const jane = scenario.users.janeInnovator;
      const innovation = john.innovations.johnInnovation;

      await sut.createSurvey('SUPPORT_END', innovation.id, innovation.supports.supportByHealthOrgUnit.id, em);

      const dbSurveys = await em
        .createQueryBuilder(InnovationSurveyEntity, 'survey')
        .select('survey.targetUserRole', 'target')
        .where('survey.innovation_id = :innovationId', { innovationId: innovation.id })
        .getRawMany();

      expect(dbSurveys).toMatchObject([
        { target: john.roles.innovatorRole.id },
        { target: jane.roles.innovatorRole.id }
      ]);
    });
  });

  describe('getUnansweredSurveys', () => {
    const john = scenario.users.johnInnovator;
    const innovation = john.innovations.johnInnovation;
    const support = innovation.supports.supportByHealthOrgUnit;
    const closedDate = new Date();

    let survey: TestInnovationSurveyType;

    beforeEach(async () => {
      await em.update(
        InnovationSupportEntity,
        { id: support.id },
        { finishedAt: closedDate, status: InnovationSupportStatusEnum.CLOSED }
      );

      // One survey that was answered.
      await new InnovationSurveyBuilder(em)
        .setTarget(john.roles.innovatorRole.id)
        .setTypeAndContext('SUPPORT_END', randUuid())
        .setInnovation(innovation.id)
        .setAnswers({} as any)
        .save();

      // One that is unanswered
      survey = await new InnovationSurveyBuilder(em)
        .setTarget(john.roles.innovatorRole.id)
        .setTypeAndContext('SUPPORT_END', support.id)
        .setInnovation(innovation.id)
        .save();
    });

    it('should return all unanswered surveys for an innovation', async () => {
      const surveys = await sut.getUnansweredSurveys(DTOsHelper.getUserRequestContext(john), innovation.id, em);

      expect(surveys).toMatchObject([
        {
          id: survey.id,
          createdAt: survey.createdAt,
          info: {
            type: 'SUPPORT_END',
            supportId: support.id,
            supportUnit: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
            supportFinishedAt: closedDate
          }
        }
      ]);
    });
  });
});
