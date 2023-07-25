import { container } from '../_config';

import { randEmail, randUuid } from '@ngneat/falso';
import type { EntityManager } from 'typeorm';

import { ConflictError, NotFoundError, OrganisationErrorsEnum } from '@users/shared/errors';
import { TestsHelper } from '@users/shared/tests';
import type { OrganisationsService } from './organisations.service';
import SYMBOLS from './symbols';
import { ServiceRoleEnum } from '@users/shared/enums';
import { UserRoleEntity } from '@users/shared/entities';

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
    it('should get the organisation info', async () => {
      const org = scenario.organisations.healthOrg;
      const organisationInfo = await sut.getOrganisationInfo(org.id, false, em);

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
        ],
        isActive: true
      });
    });

    it('should get the organisation info with only active users', async () => {
      const org = scenario.organisations.healthOrg;
      const organisationInfo = await sut.getOrganisationInfo(org.id, true, em);

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
        ],
        isActive: true
      });
    });

    it(`should throw an error if the organisation doesn't exist`, async () => {
      await expect(() => sut.getOrganisationInfo(randUuid())).rejects.toThrowError(
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
      await expect(() => sut.getOrganisationUnitInfo(randUuid())).rejects.toThrowError(
        new NotFoundError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND)
      );
    });
  });

  describe('getOrganisationUnitUserByEmail', () => {
    it.each([
      [ServiceRoleEnum.ACCESSOR, scenario.users.ingridAccessor],
      [ServiceRoleEnum.QUALIFYING_ACCESSOR, scenario.users.aliceQualifyingAccessor]
    ])('should get the user info for ', async (userType, user) => {
      const result = await sut.getOrganisationUnitUserByEmail(
        scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id,
        user.email,
        em
      );

      expect(result).toMatchObject({
        id: user.id,
        name: user.name,
        email: user.email,
        role: userType
      });
    });

    it(`should throw an error if the user doesn't exist`, async () => {
      await expect(() =>
        sut.getOrganisationUnitUserByEmail(
          scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id,
          randEmail(),
          em
        )
      ).rejects.toThrowError(new NotFoundError(OrganisationErrorsEnum.ORGANISATION_USER_NOT_FOUND));
    });

    it(`should throw an error if the organisation doesn't exist`, async () => {
      await expect(() =>
        sut.getOrganisationUnitUserByEmail(randUuid(), scenario.users.aliceQualifyingAccessor.email, em)
      ).rejects.toThrowError(new NotFoundError(OrganisationErrorsEnum.ORGANISATION_NOT_FOUND));
    });

    it('should throw an error if the user has no roles', async () => {

      await em.getRepository(UserRoleEntity).delete({ id: scenario.users.adamInnovator.roles.innovatorRole.id });
      
      await expect(() =>
        sut.getOrganisationUnitUserByEmail(
          scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id,
          scenario.users.adamInnovator.email,
          em
        )
      ).rejects.toThrowError(new NotFoundError(OrganisationErrorsEnum.ORGANISATION_USER_NOT_FOUND));
    });

    it.each([
      [ServiceRoleEnum.INNOVATOR, scenario.users.adamInnovator],
      [ServiceRoleEnum.ADMIN, scenario.users.allMighty]
    ])(`should throw an error if the user is %s`, async (_userType, user) => {
      await expect(() =>
        sut.getOrganisationUnitUserByEmail(
          scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id,
          user.email,
          em
        )
      ).rejects.toThrowError(
        new ConflictError(OrganisationErrorsEnum.ORGANISATION_UNIT_USER_CANT_BE_INNOVATOR_OR_ADMIN)
      );
    });

    it(`should throw an error if the user is from another organisation`, async () => {
      await expect(() =>
        sut.getOrganisationUnitUserByEmail(
          scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id,
          scenario.users.samAccessor.email,
          em
        )
      ).rejects.toThrowError(new ConflictError(OrganisationErrorsEnum.ORGANISATION_USER_FROM_OTHER_ORG));
    });

    it(`should throw an error if the user already exists in the organisation unit`, async () => {
      await expect(() =>
        sut.getOrganisationUnitUserByEmail(
          scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id,
          scenario.users.bartQualifyingAccessor.email,
          em
        )
      ).rejects.toThrowError(new ConflictError(OrganisationErrorsEnum.ORGANISATION_UNIT_USER_ALREADY_EXISTS));
    });
  });
});
