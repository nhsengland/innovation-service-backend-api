import azureFunction from '.';

import { ServiceRoleEnum } from '@innovations/shared/enums';
import { AzureHttpTriggerBuilder, TestsHelper } from '@innovations/shared/tests';
import type { TestUserType } from '@innovations/shared/tests/builders/user.builder';
import type { ErrorResponseType } from '@innovations/shared/types';
import {
  randAbbreviation,
  randBoolean,
  randCompanyName,
  randFullName,
  randPastDate,
  randText,
  randUuid
} from '@ngneat/falso';
import { InnovationThreadsService } from '../_services/innovation-threads.service';
import type { ResponseDTO } from './transformation.dtos';
import type { ParamsType, QueryParamsType } from './validation.schemas';

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

const expected = {
  count: 3,
  messages: [
    {
      id: randUuid(),
      message: randText(),
      createdAt: randPastDate(),
      isNew: randBoolean(),
      isEditable: randBoolean(),
      createdBy: {
        id: randUuid(),
        name: randFullName(),
        role: ServiceRoleEnum.ACCESSOR,
        isOwner: false,
        organisation: { id: randUuid(), name: randCompanyName(), acronym: randAbbreviation() },
        organisationUnit: { id: randUuid(), name: randCompanyName(), acronym: randAbbreviation() }
      },
      updatedAt: randPastDate()
    },
    {
      id: randUuid(),
      message: randText(),
      createdAt: randPastDate(),
      isNew: randBoolean(),
      isEditable: randBoolean(),
      createdBy: {
        id: randUuid(),
        name: randFullName(),
        role: ServiceRoleEnum.ASSESSMENT,
        isOwner: false,
        organisation: undefined,
        organisationUnit: undefined
      },
      updatedAt: randPastDate()
    },
    {
      id: randUuid(),
      message: randText(),
      createdAt: randPastDate(),
      isNew: randBoolean(),
      isEditable: randBoolean(),
      createdBy: {
        id: randUuid(),
        name: randFullName(),
        role: ServiceRoleEnum.INNOVATOR,
        isOwner: true,
        organisation: { id: randUuid(), name: randCompanyName(), acronym: randAbbreviation() },
        organisationUnit: undefined
      },
      updatedAt: randPastDate()
    }
  ]
};

const mock = jest.spyOn(InnovationThreadsService.prototype, 'getThreadMessagesList').mockResolvedValue(expected);

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-innovation-thread-list Suite', () => {
  describe('200', () => {
    it('should return the threads list', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.aliceQualifyingAccessor)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
          threadId: randUuid()
        })
        .setQuery<QueryParamsType>({
          order: JSON.stringify({ createdAt: 'DESC' })
        })
        .call<ResponseDTO>(azureFunction);

      expect(result.body).toStrictEqual({
        count: expected.count,
        messages: expected.messages.map(threadMessage => ({
          ...threadMessage,
          createdBy: {
            ...threadMessage.createdBy,
            ...(threadMessage.createdBy.organisation
              ? { organisation: threadMessage.createdBy.organisation }
              : {
                  organisation: {
                    id: '',
                    name: '',
                    acronym: ''
                  }
                }),
            ...(threadMessage.createdBy.organisationUnit
              ? { organisationUnit: threadMessage.createdBy.organisationUnit }
              : {
                  organisationUnit: {
                    id: '',
                    name: '',
                    acronym: ''
                  }
                })
          }
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
