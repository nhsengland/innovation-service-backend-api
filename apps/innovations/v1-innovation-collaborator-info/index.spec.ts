import azureFunction from '.';

import { InnovationCollaboratorStatusEnum } from '@innovations/shared/enums';
import { AzureHttpTriggerBuilder, TestsHelper } from '@innovations/shared/tests';
import type { TestUserType } from '@innovations/shared/tests/builders/user.builder';
import type { ErrorResponseType } from '@innovations/shared/types';
import { randEmail, randFullName, randPastDate, randProductName, randRole, randText, randUuid } from '@ngneat/falso';
import { InnovationCollaboratorsService } from '../_services/innovation-collaborators.service';
import type { ResponseDTO } from './transformation.dtos';
import type { ParamsType } from './validation.schemas';

jest.mock('@innovations/shared/decorators', () => ({
  JwtDecoder: jest.fn().mockImplementation(() => (_: any, __: string, descriptor: PropertyDescriptor) => {
    return descriptor;
  })
}));

const testsHelper = new TestsHelper();
const scenario = testsHelper.getCompleteScenario();

beforeAll(async () => {
  await testsHelper.init();
});

const expected = {
  id: randUuid(),
  name: randFullName(),
  role: randRole(),
  email: randEmail(),
  status: InnovationCollaboratorStatusEnum.ACTIVE,
  innovation: {
    id: randUuid(),
    name: randProductName(),
    description: randText()
    // owner: { id: randUuid(), name: randFullName() }
  },
  invitedAt: randPastDate()
};
const mock = jest.spyOn(InnovationCollaboratorsService.prototype, 'getCollaboratorInfo').mockResolvedValue(expected);

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-innovation-collaborator-info Suite', () => {
  describe('200', () => {
    it('should return collaborator info', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.johnInnovator)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
          collaboratorId: randUuid()
        })
        .call<ResponseDTO>(azureFunction);

      expect(result.body).toStrictEqual(expected);
      expect(result.status).toBe(200);
      expect(mock).toHaveBeenCalledTimes(1);
    });

    it('should return owner if present', async () => {
      const expectedWithOwner = {
        ...expected,
        innovation: { ...expected.innovation, owner: { id: randUuid(), name: randFullName() } }
      };
      mock.mockResolvedValueOnce(expectedWithOwner);

      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.johnInnovator)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
          collaboratorId: randUuid()
        })
        .call<ResponseDTO>(azureFunction);

      expect(result.body).toStrictEqual(expectedWithOwner);
      expect(result.status).toBe(200);
      expect(mock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Access', () => {
    it.each([
      ['Admin', 403, scenario.users.allMighty],
      ['QA', 403, scenario.users.aliceQualifyingAccessor],
      ['NA', 403, scenario.users.paulNeedsAssessor],
      ['Innovator owner', 200, scenario.users.johnInnovator]
    ])('access with user %s should give %i', async (_role: string, status: number, user: TestUserType) => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(user)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
          collaboratorId: randUuid()
        })
        .call<ErrorResponseType>(azureFunction);

      expect(result.status).toBe(status);
    });
  });
});
