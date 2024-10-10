import { container } from '../_config';

import { randUuid } from '@ngneat/falso';
import type { EntityManager } from 'typeorm';

import { ForbiddenError, NotFoundError, OrganisationErrorsEnum } from '@users/shared/errors';
import { TestsHelper } from '@users/shared/tests';
import type { OrganisationsService } from './organisations.service';
import SYMBOLS from './symbols';
import { DTOsHelper } from '@users/shared/tests/helpers/dtos.helper';

describe('Users / _services / organisations service suite', () => {
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

  describe('getOrganisationsList', () => {
    it('should get a list of organisations', async () => {
      const result = await sut.getOrganisationsList({}, em);

      expect(result).toMatchObject([
        {
          id: scenario.organisations.healthOrg.id,
          name: scenario.organisations.healthOrg.name,
          acronym: scenario.organisations.healthOrg.acronym,
          isActive: scenario.organisations.healthOrg.isActive
        },
        {
          id: scenario.organisations.innovTechOrg.id,
          name: scenario.organisations.innovTechOrg.name,
          acronym: scenario.organisations.innovTechOrg.acronym,
          isActive: scenario.organisations.innovTechOrg.isActive
        },
        {
          id: scenario.organisations.medTechOrg.id,
          name: scenario.organisations.medTechOrg.name,
          acronym: scenario.organisations.medTechOrg.acronym,
          isActive: scenario.organisations.medTechOrg.isActive
        }
      ]);
    });

    it('should get a list of organisations with units', async () => {
      const result = await sut.getOrganisationsList({ fields: ['organisationUnits'] }, em);

      expect(result).toMatchObject([
        {
          id: scenario.organisations.healthOrg.id,
          name: scenario.organisations.healthOrg.name,
          acronym: scenario.organisations.healthOrg.acronym,
          isActive: scenario.organisations.healthOrg.isActive,
          organisationUnits: [
            {
              id: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id,
              name: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
              acronym: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.acronym,
              isActive: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.isActive
            },
            {
              id: scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id,
              name: scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.name,
              acronym: scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.acronym,
              isActive: scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.isActive
            }
          ]
        },
        {
          id: scenario.organisations.innovTechOrg.id,
          name: scenario.organisations.innovTechOrg.name,
          acronym: scenario.organisations.innovTechOrg.acronym,
          isActive: scenario.organisations.innovTechOrg.isActive,
          organisationUnits: [
            {
              id: scenario.organisations.innovTechOrg.organisationUnits.innovTechOrgUnit.id,
              name: scenario.organisations.innovTechOrg.organisationUnits.innovTechOrgUnit.name,
              acronym: scenario.organisations.innovTechOrg.organisationUnits.innovTechOrgUnit.acronym,
              isActive: scenario.organisations.innovTechOrg.organisationUnits.innovTechOrgUnit.isActive
            },
            {
              id: scenario.organisations.innovTechOrg.organisationUnits.innovTechHeavyOrgUnit.id,
              name: scenario.organisations.innovTechOrg.organisationUnits.innovTechHeavyOrgUnit.name,
              acronym: scenario.organisations.innovTechOrg.organisationUnits.innovTechHeavyOrgUnit.acronym,
              isActive: scenario.organisations.innovTechOrg.organisationUnits.innovTechHeavyOrgUnit.isActive
            }
          ]
        },
        {
          id: scenario.organisations.medTechOrg.id,
          name: scenario.organisations.medTechOrg.name,
          acronym: scenario.organisations.medTechOrg.acronym,
          isActive: scenario.organisations.medTechOrg.isActive,
          organisationUnits: [
            {
              id: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.id,
              name: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.name,
              acronym: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.acronym,
              isActive: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.isActive
            }
          ]
        }
      ]);
    });

    it('should get a list of organisations with inactive organisations', async () => {
      const result = await sut.getOrganisationsList({ withInactive: true }, em);

      expect(result).toMatchObject([
        {
          id: scenario.organisations.healthOrg.id,
          name: scenario.organisations.healthOrg.name,
          acronym: scenario.organisations.healthOrg.acronym,
          isActive: scenario.organisations.healthOrg.isActive
        },
        {
          id: scenario.organisations.inactiveEmptyOrg.id,
          name: scenario.organisations.inactiveEmptyOrg.name,
          acronym: scenario.organisations.inactiveEmptyOrg.acronym,
          isActive: scenario.organisations.inactiveEmptyOrg.isActive
        },
        {
          id: scenario.organisations.innovTechOrg.id,
          name: scenario.organisations.innovTechOrg.name,
          acronym: scenario.organisations.innovTechOrg.acronym,
          isActive: scenario.organisations.innovTechOrg.isActive
        },
        {
          id: scenario.organisations.medTechOrg.id,
          name: scenario.organisations.medTechOrg.name,
          acronym: scenario.organisations.medTechOrg.acronym,
          isActive: scenario.organisations.medTechOrg.isActive
        }
      ]);
    });
  });

  describe('getOrganisationInfo', () => {
    it('should get the full organisation info', async () => {
      const org = scenario.organisations.healthOrg;
      const organisationInfo = await sut.getOrganisationInfo(org.id, 'full', false, em);

      expect(organisationInfo).toMatchObject({
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
        ].sort((a, b) => a.name.localeCompare(b.name)),
        isActive: true
      });
    });

    it('should get the full organisation info with only active users', async () => {
      const org = scenario.organisations.healthOrg;
      const organisationInfo = await sut.getOrganisationInfo(org.id, 'full', true, em);

      expect(organisationInfo).toMatchObject({
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
        ].sort((a, b) => a.name.localeCompare(b.name)),
        isActive: true
      });
    });

    it('should get the simple organisation info', async () => {
      const org = scenario.organisations.healthOrg;
      const organisationInfo = await sut.getOrganisationInfo(org.id, 'simple', false, em);

      expect(organisationInfo).toStrictEqual({
        id: org.id,
        name: org.name,
        acronym: org.acronym,
        isActive: true
      });
    });

    it(`should throw an error if the organisation doesn't exist`, async () => {
      await expect(() => sut.getOrganisationInfo(randUuid(), 'full')).rejects.toThrow(
        new NotFoundError(OrganisationErrorsEnum.ORGANISATION_NOT_FOUND)
      );
    });
  });

  describe('getOrganisationUnitInfo', () => {
    it('should get the info of an organisation unit', async () => {
      const result = await sut.getOrganisationUnitInfo(
        scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id
      );

      expect(result).toMatchObject({
        id: scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id,
        name: scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.name,
        acronym: scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.acronym,
        isActive: scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.isActive,
        canActivate: true
      });
    });

    it('should get the info of an organisation unit without a QA', async () => {
      const result = await sut.getOrganisationUnitInfo(
        scenario.organisations.inactiveEmptyOrg.organisationUnits.inactiveEmptyOrgUnit.id
      );

      expect(result).toMatchObject({
        id: scenario.organisations.inactiveEmptyOrg.organisationUnits.inactiveEmptyOrgUnit.id,
        name: scenario.organisations.inactiveEmptyOrg.organisationUnits.inactiveEmptyOrgUnit.name,
        acronym: scenario.organisations.inactiveEmptyOrg.organisationUnits.inactiveEmptyOrgUnit.acronym,
        isActive: scenario.organisations.inactiveEmptyOrg.organisationUnits.inactiveEmptyOrgUnit.isActive,
        canActivate: false
      });
    });

    it(`should throw an error if the organisation unit doesn't exist`, async () => {
      await expect(() => sut.getOrganisationUnitInfo(randUuid())).rejects.toThrow(
        new NotFoundError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND)
      );
    });
  });

  describe('getAccessorAndInnovations', () => {
    const alice = scenario.users.aliceQualifyingAccessor;

    it('should return the accessors and their assigned innovations', async () => {
      const jamie = scenario.users.jamieMadroxAccessor;
      const ingrid = scenario.users.ingridAccessor;

      const result = await sut.getAccessorAndInnovations(
        DTOsHelper.getUserRequestContext(alice),
        alice.organisations.healthOrg.organisationUnits.healthOrgUnit.id,
        em
      );

      const johnInnovation = scenario.users.johnInnovator.innovations.johnInnovation;
      const adamInnovation = scenario.users.adamInnovator.innovations.adamInnovation;
      const ottoChestInnovation = scenario.users.ottoOctaviusInnovator.innovations.chestHarnessInnovation;
      const ottoTentaclesInnovation = scenario.users.ottoOctaviusInnovator.innovations.tentaclesInnovation;

      expect(result.count).toBe(3);
      expect(result.data).toStrictEqual([
        {
          accessor: { name: alice.name, role: alice.roles.qaRole.role },
          innovations: [
            { id: johnInnovation.id, name: johnInnovation.name },
            { id: adamInnovation.id, name: adamInnovation.name },
            { id: ottoChestInnovation.id, name: ottoChestInnovation.name }
          ]
        },
        {
          accessor: { name: ingrid.name, role: ingrid.roles.accessorRole.role },
          innovations: []
        },
        {
          accessor: { name: jamie.name, role: jamie.roles.healthAccessorRole.role },
          innovations: [
            { id: johnInnovation.id, name: johnInnovation.name },
            { id: adamInnovation.id, name: adamInnovation.name },
            { id: ottoChestInnovation.id, name: ottoChestInnovation.name },
            { id: ottoTentaclesInnovation.id, name: ottoTentaclesInnovation.name }
          ]
        }
      ]);
    });

    it("it should give an error if the unitId doesn't match his", async () => {
      await expect(() =>
        sut.getAccessorAndInnovations(DTOsHelper.getUserRequestContext(alice), randUuid(), em)
      ).rejects.toThrow(new ForbiddenError(OrganisationErrorsEnum.ORGANISATION_USER_FROM_OTHER_ORG));
    });
  });
});
