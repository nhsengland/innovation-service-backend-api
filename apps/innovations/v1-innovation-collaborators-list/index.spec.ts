import azureFunction from '.';

import { InnovationCollaboratorStatusEnum } from '@innovations/shared/enums';
import { AzureHttpTriggerBuilder, TestsHelper } from '@innovations/shared/tests';
import type { TestUserType } from '@innovations/shared/tests/builders/user.builder';
import type { ErrorResponseType } from '@innovations/shared/types';
import { randEmail, randRole, randUserName, randUuid } from '@ngneat/falso';
import { omit } from 'lodash';
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
  count: 2,
  data: [
    {
      id: randUuid(),
      email: randEmail(),
      status: InnovationCollaboratorStatusEnum.PENDING
    },
    {
      id: randUuid(),
      name: randUserName(),
      role: randRole(),
      email: randEmail(),
      status: InnovationCollaboratorStatusEnum.PENDING
    }
  ]
};
const mock = jest.spyOn(InnovationCollaboratorsService.prototype, 'getCollaboratorsList').mockResolvedValue(expected);

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-innovation-collaborators-list Suite', () => {
  describe('200', () => {
    it('should return the collaborators list', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.johnInnovator)
        .setParams<ParamsType>({ innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id })
        .call<ResponseDTO>(azureFunction);

      expect(result.body).toMatchObject(expected);
      expect(result.status).toBe(200);
      expect(mock).toHaveBeenCalledTimes(1);
    });

    it('should return the collaborators list without email for QAs', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.aliceQualifyingAccessor)
        .setParams<ParamsType>({ innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id })
        .call<ResponseDTO>(azureFunction);

      expect(result.body.data).toMatchObject(expected.data.map(item => omit(item, 'email')));
      expect(result.status).toBe(200);
      expect(mock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Access', () => {
    it.each([
      ['Admin', 200, scenario.users.allMighty],
      ['QA', 200, scenario.users.aliceQualifyingAccessor],
      ['NA', 200, scenario.users.paulNeedsAssessor],
      ['Innovator', 200, scenario.users.johnInnovator],
      ['Innovator other', 403, scenario.users.ottoOctaviusInnovator]
    ])('access with user %s should give %i', async (_role: string, status: number, user: TestUserType) => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(user)
        .setParams<ParamsType>({ innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id })
        .call<ErrorResponseType>(azureFunction);

      expect(result.status).toBe(status);
    });
  });
});
