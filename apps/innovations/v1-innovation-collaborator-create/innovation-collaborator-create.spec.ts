import { TestDataType, TestsHelper } from '@innovations/shared/tests';

import { HttpTestBuilder } from '@innovations/shared/builders/http-test.builder';
import { MockBuilder } from '@innovations/shared/builders/mock.builder';
import { ServiceRoleEnum } from '@innovations/shared/enums';
import type { GenericErrorsEnum } from '@innovations/shared/errors/errors.enums';
import { AuthErrorsEnum } from '@innovations/shared/services/auth/authorization-validation.model';
import { randEmail, randText, randUuid } from '@ngneat/falso';
import type { EntityManager } from 'typeorm';
import { default as v1InnovationCollaboratorCreate } from '.';
import { InnovationCollaboratorsService } from '../_services/innovation-collaborators.service';
import type { ResponseDTO } from './transformation.dtos';

jest.mock('@innovations/shared/decorators', () => ({
  JwtDecoder: jest
    .fn()
    .mockImplementation(() => (_: any, __: string, descriptor: PropertyDescriptor) => {
      return descriptor;
    }),
}));

describe('v1-innovation-collaborator-create Suite', () => {
  let testData: TestDataType;
  let em: EntityManager;

  beforeAll(async () => {
    await TestsHelper.init();
    testData = TestsHelper.sampleData;
  });

  beforeEach(async () => {
    em = await TestsHelper.getQueryRunnerEntityManager();
  });

  afterEach(async () => {
    await TestsHelper.releaseQueryRunnerEntityManager(em);
  });

  describe('200', () => {
    it('should create a collaborator as a innovation owner', async () => {
      const httpTestBuilder = new HttpTestBuilder();

      const mocks = await new MockBuilder().mockDomainUser(testData.baseUsers.innovator).build(em);

      const expected = { id: randUuid() };

      const createCollaboratorSpy = jest
        .spyOn(InnovationCollaboratorsService.prototype, 'createCollaborator')
        .mockResolvedValue(expected);

      const result = await httpTestBuilder
        .setUrl('/v1/:innovationId/collaborators')
        .setContext()
        .setParams({ innovationId: testData.innovation.id })
        .setMethod('POST')
        .setAuth(testData.domainContexts.innovator)
        .setBody({ email: randEmail(), role: randText() })
        .invoke<{ status: number; body: ResponseDTO }>(v1InnovationCollaboratorCreate);

      expect(result.body).toMatchObject(expected);
      expect(result.status).toBe(200);
      expect(createCollaboratorSpy).toHaveBeenCalledTimes(1);

      mocks.reset();
    });
  });

  describe('403', () => {
    it('should return error if the user is not the owner', async () => {
      const httpTestBuilder = new HttpTestBuilder();

      const mocks = await new MockBuilder().mockDomainUser(testData.baseUsers.innovator2).build(em);

      const result = await httpTestBuilder
        .setUrl('/v1/:innovationId/collaborators')
        .setContext()
        .setParams({ innovationId: testData.innovation.id })
        .setMethod('POST')
        .setAuth(testData.domainContexts.innovator2)
        .setBody({ email: randEmail(), role: randText() })
        .invoke<{ status: number; body: { error: GenericErrorsEnum; message: string } }>(
          v1InnovationCollaboratorCreate
        );

      expect(result.body.error).toMatch(AuthErrorsEnum.AUTH_INNOVATION_UNAUTHORIZED);
      expect(result.body.message).toMatch('Forbidden operation');
      expect(result.status).toBe(403);

      mocks.reset();
    });
  });

  describe('Access', () => {
    it.each([
      [ServiceRoleEnum.ADMIN, 403],
      [ServiceRoleEnum.ACCESSOR, 403],
      [ServiceRoleEnum.ASSESSMENT, 403],
      [ServiceRoleEnum.INNOVATOR, 200],
    ])('access with user %s should give %i', async (userType: ServiceRoleEnum, status: number) => {
      const [user, context] = TestsHelper.getUser(userType);

      const httpTestBuilder = new HttpTestBuilder();

      const mocks = await new MockBuilder().mockDomainUser(user!).build(em);

      jest
        .spyOn(InnovationCollaboratorsService.prototype, 'createCollaborator')
        .mockResolvedValue({ id: randUuid() });

      const result = await httpTestBuilder
        .setUrl('/v1/:innovationId/collaborators')
        .setContext()
        .setParams({ innovationId: testData.innovation.id })
        .setMethod('POST')
        .setAuth(context!)
        .setBody({ email: randEmail(), role: randText() })
        .invoke<{ status: number; body: ResponseDTO }>(v1InnovationCollaboratorCreate);

      expect(result.status).toBe(status);

      mocks.reset();
    });
  });
});
