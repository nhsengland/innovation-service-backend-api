import azureFunction from '.';

import { ServiceRoleEnum } from '@innovations/shared/enums';
import { DomainInnovationsService } from '@innovations/shared/services';
import { AzureHttpTriggerBuilder, TestsHelper } from '@innovations/shared/tests';
import type { TestUserType } from '@innovations/shared/tests/builders/user.builder';
import type { ErrorResponseType } from '@innovations/shared/types';
import { randAbbreviation, randBoolean, randFullName, randUuid } from '@ngneat/falso';
import type { ResponseDTO } from './transformation.dtos';
import type { ParamsType } from './validation.schemas';

jest.mock('@innovations/shared/decorators', () => ({
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

const expected = [
  {
    id: randUuid(),
    identityId: randUuid(),
    locked: randBoolean(),
    isOwner: true,
    userRole: { id: randUuid(), role: ServiceRoleEnum.INNOVATOR },
    organisationUnit: null
  },
  {
    id: randUuid(),
    identityId: randUuid(),
    name: randFullName(),
    locked: randBoolean(),
    isOwner: false,
    userRole: { id: randUuid(), role: ServiceRoleEnum.ACCESSOR },
    organisationUnit: { id: randUuid(), acronym: randAbbreviation() }
  }
];

const mock = jest.spyOn(DomainInnovationsService.prototype, 'threadFollowers').mockResolvedValue(expected);

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-innovation-thread-followers Suite', () => {
  describe('200', () => {
    it('should return the thread followers', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.aliceQualifyingAccessor)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
          threadId: randUuid()
        })
        .call<ResponseDTO>(azureFunction);

      expect(result.body).toStrictEqual({
        followers: expected.map(follower => ({
          id: follower.id,
          name: follower?.name ?? '',
          ...(follower.isOwner !== undefined && { isOwner: follower.isOwner }),
          isLocked: follower.locked,
          role: follower.userRole,
          organisationUnit: follower.organisationUnit
            ? {
                id: follower.organisationUnit.id,
                acronym: follower.organisationUnit.acronym
              }
            : null
        }))
      });
      expect(result.status).toBe(200);
      expect(mock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Access', () => {
    it.each([
      ['Admin', 200, scenario.users.allMighty],
      ['QA', 200, scenario.users.aliceQualifyingAccessor],
      ['A', 200, scenario.users.ingridAccessor],
      ['NA', 200, scenario.users.paulNeedsAssessor],
      ['Innovator owner', 200, scenario.users.johnInnovator],
      ['Innovator collaborator', 200, scenario.users.janeInnovator],
      ['Innovator other', 403, scenario.users.ottoOctaviusInnovator]
    ])('access with user %s should give %i', async (_role: string, status: number, user: TestUserType) => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(user)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
          threadId: randUuid()
        })
        .call<ErrorResponseType>(azureFunction);

      expect(result.status).toBe(status);
    });
  });
});
