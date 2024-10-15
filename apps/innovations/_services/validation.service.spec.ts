import { type EntityManager } from 'typeorm';
import type { ValidationService } from './validation.service';
import { TestsHelper } from '@innovations/shared/tests';
import SYMBOLS from './symbols';
import { container } from '../_config';
import { InnovationSupportEntity } from '@innovations/shared/entities';
import { DTOsHelper } from '@innovations/shared/tests/helpers/dtos.helper';
import { BadRequestError, GenericErrorsEnum } from '@innovations/shared/errors';

describe('Innovations / _services / validation suite', () => {
  let sut: ValidationService;

  let em: EntityManager;

  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  beforeAll(async () => {
    sut = container.get<ValidationService>(SYMBOLS.ValidationService);
    await testsHelper.init();
  });

  beforeEach(async () => {
    em = await testsHelper.getQueryRunnerEntityManager();
  });

  afterEach(async () => {
    await testsHelper.releaseQueryRunnerEntityManager();
  });

  describe('checkIfSupportHadAlreadyStartedAtDate', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
    const support = innovation.supports.supportByHealthOrgUnit;
    const unit = scenario.organisations.healthOrg.organisationUnits.healthOrgUnit;

    it('should return valid if support had already started at a given date', async () => {
      await em.getRepository(InnovationSupportEntity).update({ id: support.id }, { startedAt: new Date('2000-01-01') });

      const result = await sut.checkIfSupportHadAlreadyStartedAtDate(
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
        innovation.id,
        {
          unitId: unit.id,
          date: new Date('2000-01-01')
        },
        em
      );

      expect(result.valid).toBe(true);
    });

    it('should return invalid if support had not yet started at a given date', async () => {
      await em.getRepository(InnovationSupportEntity).update({ id: support.id }, { startedAt: new Date('2000-01-01') });

      const result = await sut.checkIfSupportHadAlreadyStartedAtDate(
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
        innovation.id,
        {
          unitId: unit.id,
          date: new Date('1999-01-01')
        },
        em
      );

      expect(result.valid).toBe(false);
    });

    it('should throw an error if the date is in the future', async () => {
      await em.getRepository(InnovationSupportEntity).update({ id: support.id }, { startedAt: new Date('2000-01-01') });

      const today = new Date();
      const tomorrow = today.setDate(today.getDate() + 1);

      await expect(() =>
        sut.checkIfSupportHadAlreadyStartedAtDate(
          DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
          innovation.id,
          {
            unitId: unit.id,
            date: new Date(tomorrow)
          },
          em
        )
      ).rejects.toThrow(
        new BadRequestError(GenericErrorsEnum.INVALID_PAYLOAD, { message: 'Date cannot be in the future' })
      );
    });
  });
});
