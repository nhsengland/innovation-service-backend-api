/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { TestDataType, TestsHelper } from '@innovations/shared/tests/tests.helper';
import { container } from '../_config';

import { InnovationCollaboratorEntity } from '@innovations/shared/entities/innovation/innovation-collaborator.entity';
import { InnovationCollaboratorStatusEnum } from '@innovations/shared/enums';
import type { UnprocessableEntityError } from '@innovations/shared/errors';
import { DomainUsersService, NOSQLConnectionService } from '@innovations/shared/services';
import { CacheService } from '@innovations/shared/services/storage/cache.service';
import { randEmail, randRole } from '@ngneat/falso';
import type { EntityManager } from 'typeorm';
import type { InnovationCollaboratorsService } from './innovation-collaborators.service';
import { InnovationCollaboratorsServiceSymbol, InnovationCollaboratorsServiceType } from './interfaces';

describe('Innovation Collaborators Suite', () => {

  let sut: InnovationCollaboratorsServiceType;

  let testData: TestDataType;
  let em: EntityManager;

  beforeAll(async () => {
    sut = container.get<InnovationCollaboratorsService>(InnovationCollaboratorsServiceSymbol);
    await TestsHelper.init();
    testData = TestsHelper.sampleData;
  });

  beforeEach(async () => {
    jest.spyOn(NOSQLConnectionService.prototype, 'init').mockResolvedValue();
    jest.spyOn(CacheService.prototype, 'init').mockReturnThis();
    em = await TestsHelper.getQueryRunnerEntityManager();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await TestsHelper.releaseQueryRunnerEntityManager(em);
  });

  describe('createCollaborator', () => {

    beforeEach(() => {
      jest.spyOn(DomainUsersService.prototype, "getUserByEmail").mockResolvedValue([]);
    });

    it('create a collaborator for an existing user', async () => {

      jest.spyOn(DomainUsersService.prototype, "getUserByEmail").mockResolvedValue([{ id: testData.baseUsers.innovator2.id } as any]);

      const expected = {
        email: randEmail(),
        collaboratorRole: randRole(),
        status: InnovationCollaboratorStatusEnum.PENDING,
        innovation: testData.innovation.id,
        createdBy: testData.domainContexts.innovator.id,
        updatedBy: testData.domainContexts.innovator.id,
        user: testData.baseUsers.innovator2.id
      }

      const collaborator = await sut.createCollaborator(
        testData.domainContexts.innovator,
        testData.innovation.id,
        {
          email: expected.email,
          role: expected.collaboratorRole
        },
        em
      );

      const dbCollaborator = await em.createQueryBuilder(InnovationCollaboratorEntity, 'collaborators')
        .where('collaborators.id = :collaboratorId', { collaboratorId: collaborator.id })
        .getOne();

      expect(collaborator).toHaveProperty('id', dbCollaborator?.id);
      expect(dbCollaborator).toHaveProperty('collaboratorRole', expected.collaboratorRole);
      expect(dbCollaborator).toHaveProperty('status', expected.status);
      expect(dbCollaborator).toHaveProperty('innovationId', expected.innovation);
      expect(dbCollaborator).toHaveProperty('createdBy', expected.createdBy);
      expect(dbCollaborator).toHaveProperty('updatedBy', expected.updatedBy);
      expect(dbCollaborator).toHaveProperty('userId', expected.user);
      expect(dbCollaborator).toHaveProperty('invitedAt');
    });

  });

  it('create a collaborator for a non existing user', async () => {

    const expected = {
      email: randEmail(),
      collaboratorRole: randRole(),
      status: InnovationCollaboratorStatusEnum.PENDING,
      innovation: testData.innovation.id,
      createdBy: testData.domainContexts.innovator.id,
      updatedBy: testData.domainContexts.innovator.id,
    }

    const collaborator = await sut.createCollaborator(
      testData.domainContexts.innovator,
      testData.innovation.id,
      {
        email: expected.email,
        role: expected.collaboratorRole
      },
      em
    );

    const dbCollaborator = await em.createQueryBuilder(InnovationCollaboratorEntity, 'collaborators')
      .where('collaborators.id = :collaboratorId', { collaboratorId: collaborator.id })
      .getOne();

    expect(collaborator).toHaveProperty('id', dbCollaborator?.id);
    expect(dbCollaborator).toHaveProperty('collaboratorRole', expected.collaboratorRole);
    expect(dbCollaborator).toHaveProperty('status', expected.status);
    expect(dbCollaborator).toHaveProperty('innovationId', expected.innovation);
    expect(dbCollaborator).toHaveProperty('createdBy', expected.createdBy);
    expect(dbCollaborator).toHaveProperty('updatedBy', expected.updatedBy);
    expect(dbCollaborator).toHaveProperty('invitedAt');
    expect(dbCollaborator).toHaveProperty('userId', null);
  });

  it('return a error if there is an invite associated with an email/innovation', async () => {

    const email = randEmail();
    await sut.createCollaborator(
      testData.domainContexts.innovator,
      testData.innovation.id,
      {
        email: email,
        role: randRole()
      },
      em
    );

    let err: UnprocessableEntityError | null = null;
    try {
      await sut.createCollaborator(
        testData.domainContexts.innovator,
        testData.innovation.id,
        {
          email: email,
          role: randRole()
        },
        em
      );
    } catch (error) {
      err = error as UnprocessableEntityError;
    }

    expect(err).toBeDefined();
    expect(err?.name).toBe('ICB.0002');

  });
});

