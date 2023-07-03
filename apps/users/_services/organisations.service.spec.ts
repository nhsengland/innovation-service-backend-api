import { container } from '../_config';

import { randUuid } from '@ngneat/falso';
import type { EntityManager } from 'typeorm';

import { NotFoundError, OrganisationErrorsEnum } from '@users/shared/errors';
import { TestsHelper } from '@users/shared/tests';
import type { OrganisationsService } from './organisations.service';
import SYMBOLS from './symbols';

describe('Innovation Assessments Suite', () => {
  let sut: OrganisationsService;

  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  let em: EntityManager;

  beforeAll(async () => {
    sut = container.get<OrganisationsService>(SYMBOLS.OrganisationsService);
    await testsHelper.init();
  });

  beforeEach(async () => {
    em = await testsHelper.getQueryRunnerEntityManager();
  });

  afterEach(async () => {
    await testsHelper.releaseQueryRunnerEntityManager();
  });

  describe('getOrganisationInfo', () => {
    it('should get the organisation info', async () => {
      const org = scenario.organisations.healthOrg;
      const organisationInfo = await sut.getOrganisationInfo(org.id, true, em);

      expect(organisationInfo).toStrictEqual({
        id: org.id,
        name: org.name,
        acronym: org.acronym,
        organisationUnits: [
          {
            id: org.organisationUnits.healthOrgUnit.id,
            name: org.organisationUnits.healthOrgUnit.name,
            acronym: org.organisationUnits.healthOrgUnit.acronym,
            isActive: true,
            userCount: 3
          },
          {
            id: org.organisationUnits.healthOrgAiUnit.id,
            name: org.organisationUnits.healthOrgAiUnit.name,
            acronym: org.organisationUnits.healthOrgAiUnit.acronym,
            isActive: true,
            userCount: 3
          }
        ],
        isActive: true
      });
    });

    it('should not get organisation info if it does not exist', async () => {
      await expect(() => sut.getOrganisationInfo(randUuid())).rejects.toThrowError(
        new NotFoundError(OrganisationErrorsEnum.ORGANISATION_NOT_FOUND)
      );
    });
  });
});
