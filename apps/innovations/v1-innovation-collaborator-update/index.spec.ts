import azureFunction from '.';

import { InnovationCollaboratorStatusEnum } from '@innovations/shared/enums';
import { AzureHttpTriggerBuilder, TestsHelper } from '@innovations/shared/tests';
import type { TestUserType } from '@innovations/shared/tests/builders/user.builder';
import type { ErrorResponseType } from '@innovations/shared/types';
import { randText, randUuid } from '@ngneat/falso';
import { InnovationCollaboratorsService } from '../_services/innovation-collaborators.service';
import type { ResponseDTO } from './transformation.dtos';
import type { BodyType, ParamsType } from './validation.schemas';

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

const expected = { id: randUuid() };
const updateMock = jest
  .spyOn(InnovationCollaboratorsService.prototype, 'updateCollaborator')
  .mockResolvedValue(expected);
const collaborationInfoMock = jest
  .spyOn(InnovationCollaboratorsService.prototype, 'getCollaborationInfo')
  .mockResolvedValue({ type: 'OWNER' });

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-innovation_collaborator-update Suite', () => {
  describe('200', () => {
    it('should update', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.johnInnovator)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
          collaboratorId: randUuid()
        })
        .setBody<BodyType>({ status: InnovationCollaboratorStatusEnum.CANCELLED, role: randText() })
        .call<ResponseDTO>(azureFunction);

      expect(result.body).toMatchObject(expected);
      expect(result.status).toBe(200);
      expect(collaborationInfoMock).toHaveBeenCalledTimes(1);
      expect(updateMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('400', () => {
    it.each([
      ['should', InnovationCollaboratorStatusEnum.CANCELLED, 200],
      ['should', InnovationCollaboratorStatusEnum.REMOVED, 200],
      ["shouldn't", InnovationCollaboratorStatusEnum.ACTIVE, 400],
      ["shouldn't", InnovationCollaboratorStatusEnum.DECLINED, 400],
      ["shouldn't", InnovationCollaboratorStatusEnum.LEFT, 400],
      ["shouldn't", InnovationCollaboratorStatusEnum.PENDING, 400],
      ["shouldn't", InnovationCollaboratorStatusEnum.EXPIRED, 400]
    ])('%s allow %s if collaborator is owner', async (_label, status, resCode) => {
      collaborationInfoMock.mockResolvedValue({ type: 'OWNER' });
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.johnInnovator)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
          collaboratorId: randUuid()
        })
        .setBody<BodyType>({ status: status as any })
        .call<ErrorResponseType>(azureFunction);

      expect(result.status).toBe(resCode);
    });

    it.each([
      ['should', InnovationCollaboratorStatusEnum.ACTIVE, 200],
      ['should', InnovationCollaboratorStatusEnum.DECLINED, 200],
      ['should', InnovationCollaboratorStatusEnum.LEFT, 200],
      ["shouldn't", InnovationCollaboratorStatusEnum.CANCELLED, 400],
      ["shouldn't", InnovationCollaboratorStatusEnum.REMOVED, 400],
      ["shouldn't", InnovationCollaboratorStatusEnum.PENDING, 400],
      ["shouldn't", InnovationCollaboratorStatusEnum.EXPIRED, 400]
    ])("%s allow %s if collaborator isn't owner", async (_label, status, resCode) => {
      collaborationInfoMock.mockResolvedValueOnce({ type: 'COLLABORATOR' });
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.johnInnovator)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
          collaboratorId: randUuid()
        })
        .setBody<BodyType>({ status: status as any })
        .call<ErrorResponseType>(azureFunction);

      expect(result.status).toBe(resCode);
    });

    it.each([
      ['should', 'OWNER' as const, 200],
      ["shouldn't", 'COLLABORATOR' as const, 400]
    ])('%s update role as %s', async (_label, type, resCode) => {
      collaborationInfoMock.mockResolvedValueOnce({ type: type });
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.johnInnovator)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
          collaboratorId: randUuid()
        })
        .setBody<BodyType>({ role: randText() })
        .call<ErrorResponseType>(azureFunction);

      expect(result.status).toBe(resCode);
    });
  });

  describe('Access', () => {
    it.each([
      ['Admin', 403, scenario.users.allMighty],
      ['QA', 403, scenario.users.aliceQualifyingAccessor],
      ['NA', 403, scenario.users.paulNeedsAssessor],
      ['Innovator', 200, scenario.users.johnInnovator]
    ])('access with user %s should give %i', async (_role: string, status: number, user: TestUserType) => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(user)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
          collaboratorId: randUuid()
        })
        .setBody<BodyType>({ status: InnovationCollaboratorStatusEnum.CANCELLED, role: randText() })
        .call<ErrorResponseType>(azureFunction);

      expect(result.status).toBe(status);
    });
  });
});
