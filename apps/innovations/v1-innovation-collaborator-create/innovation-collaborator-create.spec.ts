import { AuthErrorsEnum } from '@innovations/shared/services/auth/authorization-validation.model';
import { AzureHttpTriggerBuilder, TestsHelper } from '@innovations/shared/tests';
import type { TestUserType } from '@innovations/shared/tests/builders/user.builder';
import type { ErrorResponseType } from '@innovations/shared/types';
import { randEmail, randText, randUuid } from '@ngneat/falso';
import { default as v1InnovationCollaboratorCreate } from '.';
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
const createCollaboratorSpy = jest
  .spyOn(InnovationCollaboratorsService.prototype, 'createCollaborator')
  .mockResolvedValue(expected);

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-innovation-collaborator-create Suite', () => {
  describe('200', () => {
    it('should create a collaborator as a innovation owner', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.johnInnovator)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id
        })
        .setBody<BodyType>({ email: randEmail(), role: randText() })
        .call<ResponseDTO>(v1InnovationCollaboratorCreate);

      expect(result.body).toMatchObject(expected);
      expect(result.status).toBe(200);
      expect(createCollaboratorSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('403', () => {
    it('should return error if the user is not the owner', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.janeInnovator)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id
        })
        .setBody<BodyType>({ email: randEmail(), role: randText() })
        .call<ErrorResponseType>(v1InnovationCollaboratorCreate);

      expect(result.body.error).toMatch(AuthErrorsEnum.AUTH_INNOVATION_NOT_OWNER);
      expect(result.body.message).toMatch('Forbidden operation');
      expect(result.status).toBe(403);
    });
  });

  describe('Access', () => {
    it.each([
      ['Admin', 403, scenario.users.allMighty],
      ['QA', 403, scenario.users.aliceQualifyingAccessor],
      ['NA', 403, scenario.users.paulNeedsAssessor],
      ['Innovator owner', 200, scenario.users.johnInnovator],
      ['Innovator other', 403, scenario.users.janeInnovator]
    ])('access with user %s should give %i', async (_role: string, status: number, user: TestUserType) => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(user)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id
        })
        .setBody<BodyType>({ email: randEmail(), role: randText() })
        .call<ErrorResponseType>(v1InnovationCollaboratorCreate);

      expect(result.status).toBe(status);
    });
  });
});
