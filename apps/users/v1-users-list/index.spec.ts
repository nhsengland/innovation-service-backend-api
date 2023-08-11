import azureFunction from '.';

import {
  randAbbreviation,
  randCompanyName,
  randEmail,
  randFullName,
  randPastDate,
  randPhoneNumber,
  randUuid
} from '@ngneat/falso';
import { AccessorOrganisationRoleEnum, ServiceRoleEnum } from '@users/shared/enums';
import { GenericErrorsEnum } from '@users/shared/errors';
import { DomainUsersService } from '@users/shared/services';
import { AuthErrorsEnum } from '@users/shared/services/auth/authorization-validation.model';
import { AzureHttpTriggerBuilder, TestsHelper } from '@users/shared/tests';
import { UsersService } from '../_services/users.service';
import type { QueryParamsType } from './validation.schemas';

jest.mock('@users/shared/decorators', () => ({
  JwtDecoder: jest.fn().mockImplementation(() => (_: any, __: string, descriptor: PropertyDescriptor) => {
    return descriptor;
  }),
  Audit: jest.fn().mockImplementation(() => (_: any, __: string, descriptor: PropertyDescriptor) => {
    return descriptor;
  })
}));

const testsHelper = new TestsHelper();
const scenario = testsHelper.getCompleteScenario();

beforeAll(async () => {
  await testsHelper.init();
});

const userByEmail = [
  {
    id: randUuid(),
    identityId: randUuid(),
    email: randEmail(),
    displayName: randFullName(),
    roles: [
      {
        id: randUuid(),
        role: ServiceRoleEnum.ACCESSOR,
        isActive: true
      }
    ],
    phone: randPhoneNumber(),
    isActive: true,
    lockedAt: null,
    passwordResetAt: randPastDate(),
    firstTimeSignInAt: randPastDate(),
    organisations: [
      {
        id: randUuid(),
        name: randCompanyName(),
        acronym: null,
        role: AccessorOrganisationRoleEnum.ACCESSOR,
        isShadow: true,
        size: null,
        description: null,
        registrationNumber: null,
        organisationUnits: [
          {
            id: randUuid(),
            name: randCompanyName(),
            acronym: randAbbreviation(),
            organisationUnitUser: { id: randUuid() }
          }
        ]
      }
    ]
  }
];
const userByEmailMock = jest.spyOn(DomainUsersService.prototype, 'getUserByEmail').mockResolvedValue(userByEmail);
// copy from index
const mapUserByEmailResponse = (item: Awaited<ReturnType<DomainUsersService['getUserByEmail']>>[number]): any => ({
  id: item.id,
  name: item.displayName,
  email: item.email,
  roles: item.roles,
  isActive: item.isActive,
  ...(item.lockedAt && { lockedAt: item.lockedAt }),
  ...(item.organisations && {
    organisations: item.organisations.map(o => ({
      id: o.id,
      name: o.name,
      acronym: o.acronym ?? '',
      role: o.role,
      ...(o.organisationUnits && {
        units: o.organisationUnits.map(u => ({
          id: u.id,
          name: u.name,
          acronym: u.acronym
        }))
      })
    }))
  })
});

const usersList = {
  count: 1,
  data: [
    {
      id: randUuid(),
      name: randFullName(),
      lockedAt: null,
      roles: [] as any,
      email: randEmail(),
      organisationUnitUserId: randUuid()
    }
  ]
};

const usersListMock = jest.spyOn(UsersService.prototype, 'getUserList').mockResolvedValue(usersList);

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-users-list', () => {
  describe('200', () => {
    it('should return the user if listing by email', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.allMighty)
        .setQuery<QueryParamsType>({ email: randEmail(), userTypes: [ServiceRoleEnum.ACCESSOR] })
        .call<never>(azureFunction);

      expect(result.body).toStrictEqual(userByEmail.map(mapUserByEmailResponse));
      expect(result.status).toBe(200);
      expect(userByEmailMock).toHaveBeenCalledTimes(1);
    });

    it('should return the user if listing by email including nullable fields', async () => {
      const mockData = userByEmail.map(u => ({
        ...u,
        lockedAt: randPastDate(),
        organisations: u.organisations.map(o => ({
          ...o,
          acronym: randCompanyName()
        }))
      }));
      userByEmailMock.mockResolvedValueOnce(mockData);
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.allMighty)
        .setQuery<QueryParamsType>({ email: randEmail(), userTypes: [ServiceRoleEnum.ACCESSOR] })
        .call<never>(azureFunction);

      expect(result.body).toStrictEqual(mockData.map(mapUserByEmailResponse));
      expect(result.status).toBe(200);
      expect(userByEmailMock).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['Admin', scenario.users.allMighty],
      ['QA', scenario.users.aliceQualifyingAccessor],
      ['A', scenario.users.ingridAccessor],
      ['NA', scenario.users.paulNeedsAssessor],
      ['Innovator', scenario.users.johnInnovator]
    ])('should be able to list NAs as %s', async (_label, user) => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(user)
        .setQuery<QueryParamsType>({
          userTypes: [ServiceRoleEnum.ASSESSMENT],
          fields: [],
          skip: 0,
          take: 10,
          order: { createdAt: 'ASC' }
        })
        .call<never>(azureFunction);
      expect(result.body).toStrictEqual(usersList);
      expect(result.status).toBe(200);
      expect(usersListMock).toHaveBeenCalledTimes(1);
    });

    it('should be able to return email if requested by admin', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.allMighty)
        .setQuery<QueryParamsType>({
          userTypes: [ServiceRoleEnum.ASSESSMENT],
          fields: ['email'],
          skip: 0,
          take: 10,
          order: { createdAt: 'ASC' }
        })
        .call<never>(azureFunction);
      expect(result.body).toStrictEqual(usersList);
      expect(result.status).toBe(200);
      expect(usersListMock).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['Admin', scenario.users.allMighty],
      ['QA from same unit', scenario.users.aliceQualifyingAccessor]
    ])('should be able to query by organisation unit by %s', async (_label, user) => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(user)
        .setQuery<QueryParamsType>({
          userTypes: [ServiceRoleEnum.QUALIFYING_ACCESSOR],
          fields: [],
          organisationUnitId: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id,
          skip: 0,
          take: 10,
          order: { createdAt: 'ASC' }
        })
        .call<never>(azureFunction);
      expect(result.body).toStrictEqual(usersList);
      expect(result.status).toBe(200);
      expect(usersListMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('400', () => {
    it('should return 400 if the params are not valid', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.allMighty)
        .setQuery<QueryParamsType>({} as any)
        .call<never>(azureFunction);

      expect(result.body).toMatchObject({
        error: GenericErrorsEnum.INVALID_PAYLOAD,
        message: 'Invalid request'
      });
      expect(result.status).toBe(400);
      expect(usersListMock).toHaveBeenCalledTimes(0);
    });
  });

  describe('403', () => {
    it.each([
      ['QA', scenario.users.aliceQualifyingAccessor],
      ['A', scenario.users.ingridAccessor],
      ['NA', scenario.users.paulNeedsAssessor],
      ['Innovator', scenario.users.johnInnovator]
    ])(`should not be able to return email if requested by %s`, async (_label, user) => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(user)
        .setQuery<QueryParamsType>({
          userTypes: [ServiceRoleEnum.ASSESSMENT],
          fields: ['email'],
          skip: 0,
          take: 10,
          order: { createdAt: 'ASC' }
        })
        .call<never>(azureFunction);
      expect(result.body).toMatchObject({
        error: AuthErrorsEnum.AUTH_USER_TYPE_NOT_ALLOWED,
        message: 'Forbidden operation'
      });
      expect(result.status).toBe(403);
      expect(usersListMock).toHaveBeenCalledTimes(0);
    });

    it.each([
      ['QA from other unit', scenario.users.scottQualifyingAccessor],
      ['A', scenario.users.ingridAccessor],
      ['NA', scenario.users.paulNeedsAssessor],
      ['Innovator', scenario.users.johnInnovator]
    ])(`should not be able to to query by organisation unit by %s`, async (_label, user) => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(user)
        .setQuery<QueryParamsType>({
          userTypes: [ServiceRoleEnum.QUALIFYING_ACCESSOR],
          fields: [],
          organisationUnitId: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id,
          skip: 0,
          take: 10,
          order: { createdAt: 'ASC' }
        })
        .call<never>(azureFunction);

      expect(result.body).toMatchObject({
        error: AuthErrorsEnum.AUTH_USER_TYPE_NOT_ALLOWED,
        message: 'Forbidden operation'
      });
      expect(result.status).toBe(403);
      expect(usersListMock).toHaveBeenCalledTimes(0);
    });
  });

  describe.skip('Access dependent on other variables, tested elsewhere', () => {});
});
