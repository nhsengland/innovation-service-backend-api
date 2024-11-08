import { type EntityManager } from 'typeorm';

import { TestsHelper } from '@innovations/shared/tests';

import { container } from '../_config';
import SYMBOLS from './symbols';
import { SurveysService } from './surveys.service';
import { randUuid } from '@ngneat/falso';
import { InnovationSurveyEntity } from '@innovations/shared/entities';

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

      await sut.createSurvey('SUPPORT_END', innovation.id, randUuid(), em);

      const dbSurveys = await em
        .createQueryBuilder(InnovationSurveyEntity, 'survey')
        .select('survey.targetUserRoleId', 'target')
        .where('survey.innovation_id = :innovationId', { innovationId: innovation.id })
        .getRawMany();

      expect(dbSurveys).toMatchObject([
        { target: john.roles.innovatorRole.id },
        { target: jane.roles.innovatorRole.id }
      ]);
    });
  });

  describe('getInnovationInnovatorsRoleId', () => {
    it('should return all active collaborators and owner of innovation', async () => {
      const john = scenario.users.johnInnovator;
      const jane = scenario.users.janeInnovator;

      const targets = await sut['getInnovationInnovatorsRoleId'](john.innovations.johnInnovation.id, em);

      expect(targets).toMatchObject([john.roles.innovatorRole.id, jane.roles.innovatorRole.id]);
    });
  });
});
