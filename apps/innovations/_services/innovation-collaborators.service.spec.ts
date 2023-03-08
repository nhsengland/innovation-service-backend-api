/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { TestDataType, TestsHelper } from '@innovations/shared/tests/tests.helper';
import { container } from '../_config';

import { InnovationCollaboratorEntity } from '@innovations/shared/entities/innovation/innovation-collaborator.entity';
import { InnovationCollaboratorStatusEnum } from '@innovations/shared/enums';
import type { NotFoundError, UnauthorizedError, UnprocessableEntityError } from '@innovations/shared/errors';
import { DomainUsersService, IdentityProviderService, NOSQLConnectionService, NotifierService } from '@innovations/shared/services';
import { CacheService } from '@innovations/shared/services/storage/cache.service';
import type { DomainContextType } from '@innovations/shared/types';
import { randEmail, randRole, randUserName, randUuid } from '@ngneat/falso';
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
    jest.spyOn(NotifierService.prototype, 'send').mockResolvedValue(true);
    em = await TestsHelper.getQueryRunnerEntityManager();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await TestsHelper.releaseQueryRunnerEntityManager(em);
  });

  describe('createCollaborator', () => {


    beforeEach(() => {
      jest.spyOn(DomainUsersService.prototype, 'getUserByEmail').mockResolvedValue([]);
    });

    it('create a collaborator for an existing user', async () => {

      jest.spyOn(DomainUsersService.prototype, 'getUserByEmail').mockResolvedValue([{ id: testData.baseUsers.innovator2.id } as any]);

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

  describe('getCollaboratorsList', () => {
    let collaboratorsMap = new Map<string, InnovationCollaboratorEntity>();

    beforeAll(async () => {
      collaboratorsMap.set(InnovationCollaboratorStatusEnum.PENDING, testData.collaborators.collaboratorPending);
      collaboratorsMap.set(InnovationCollaboratorStatusEnum.ACTIVE, testData.collaborators.collaboratorActive);
      collaboratorsMap.set(InnovationCollaboratorStatusEnum.EXPIRED, testData.collaborators.collaboratorExpired);

      jest.spyOn(DomainUsersService.prototype, 'getUsersList').mockResolvedValue([]);
    });

    it('should return all collaborators independent of the status', async () => {
      const collaborators = await sut.getCollaboratorsList(
        testData.innovationWithCollaborators.id,
        {},
        { order: { createdAt: 'DESC' }, skip: 0, take: 10 },
        em
      );

      expect(collaborators.count).toBe(collaboratorsMap.size);

      for (const collaborator of collaborators.data) {
        const dbCollaborator = collaboratorsMap.get(collaborator.status);


        if (dbCollaborator) {
          // This is needed since expired is not persisted in DB
          dbCollaborator.status = collaborator.status === InnovationCollaboratorStatusEnum.EXPIRED ? InnovationCollaboratorStatusEnum.EXPIRED : collaborator.status;

          expect(collaborator.id).toBe(dbCollaborator.id);
          expect(collaborator.email).toBe(dbCollaborator.email);
          expect(collaborator.status).toBe(dbCollaborator.status);
          expect(collaborator.collaboratorRole).toBeDefined();
        }

      }
    });

    it('should return all collaborators in status PENDING and ACTIVE', async () => {
      const collaborators = await sut.getCollaboratorsList(
        testData.innovationWithCollaborators.id,
        { status: [InnovationCollaboratorStatusEnum.ACTIVE, InnovationCollaboratorStatusEnum.PENDING] },
        { order: { createdAt: 'DESC' }, skip: 0, take: 10 },
        em
      );

      expect(collaborators.count).toBe(2);

      for (const collaborator of collaborators.data) {
        expect([InnovationCollaboratorStatusEnum.ACTIVE, InnovationCollaboratorStatusEnum.PENDING]).toContain(collaborator.status);
      }
    });

    it('should return all collaborators in status EXPIRED and check if name is returned', async () => {
      jest.spyOn(DomainUsersService.prototype, 'getUsersList').mockResolvedValue([
        { id: testData.baseUsers.innovator2.id, displayName: 'Innovator 2 Name' } as any
      ]);

      const collaborators = await sut.getCollaboratorsList(
        testData.innovationWithCollaborators.id,
        { status: [InnovationCollaboratorStatusEnum.EXPIRED] },
        { order: { createdAt: 'DESC' }, skip: 0, take: 10 },
        em
      );

      expect(collaborators.count).toBe(1);

      for (const collaborator of collaborators.data) {
        expect(collaborator.status).toBe(InnovationCollaboratorStatusEnum.EXPIRED);
        expect(collaborator.name).toBe('Innovator 2 Name');
      }
    });

  });

  describe('getCollaboratorInfo', () => {
    let collaboratorPendingWithoutUser: InnovationCollaboratorEntity;
    let collaboratorPendingWithUser: InnovationCollaboratorEntity;

    beforeEach(async () => {
      collaboratorPendingWithoutUser = await TestsHelper.TestDataBuilder.createCollaborator(testData.domainContexts.innovator, testData.innovation).build(em);
      collaboratorPendingWithUser = await TestsHelper.TestDataBuilder.createCollaborator(testData.domainContexts.innovator, testData.innovation).setEmail('innovator2@gmail.com').setUser(testData.baseUsers.innovator2).build(em);

      jest.spyOn(IdentityProviderService.prototype, 'getUsersList').mockResolvedValue([
        { identityId: testData.domainContexts.innovator.identityId, displayName: 'Innovator 1 name' } as any,
        { identityId: testData.domainContexts.innovator2.identityId, displayName: 'Innovator 2 name' } as any
      ]);
    });

    describe('asOwner', () => {
      it('for a new user it should return info for a new collaborator without the name', async () => {

        const expected = {
          id: collaboratorPendingWithoutUser.id,
          collaboratorRole: collaboratorPendingWithoutUser.collaboratorRole,
          email: collaboratorPendingWithoutUser.email,
          status: collaboratorPendingWithoutUser.status,
          innovation: {
            id: testData.innovation.id,
            name: testData.innovation.name,
            description: testData.innovation.description,
            owner: { id: testData.innovation.owner.id, name: 'Innovator 1 name' }
          },
        }

        const collaborator = await sut.getCollaboratorInfo(
          testData.domainContexts.innovator,
          testData.innovation.id,
          collaboratorPendingWithoutUser.id,
          em
        );

        expect(collaborator).toMatchObject(expected);
      });

      it('for a existing user should return info for a new collaborator with the name of the user', async () => {
        const expected = {
          id: collaboratorPendingWithUser.id,
          collaboratorRole: collaboratorPendingWithUser.collaboratorRole,
          name: 'Innovator 2 name',
          email: collaboratorPendingWithUser.email,
          status: collaboratorPendingWithUser.status,
          innovation: {
            id: testData.innovation.id,
            name: testData.innovation.name,
            description: testData.innovation.description,
            owner: { id: testData.innovation.owner.id, name: 'Innovator 1 name' }
          },
        }

        const collaborator = await sut.getCollaboratorInfo(
          testData.domainContexts.innovator,
          testData.innovation.id,
          collaboratorPendingWithUser.id,
          em
        );

        expect(collaborator).toMatchObject(expected);
      });

    });

    describe('asCollaborator', () => {
      it('should return info (with the name of the user) as collaborator user', async () => {
        jest.spyOn(IdentityProviderService.prototype, 'getUserInfo').mockResolvedValue(
          { identityId: testData.domainContexts.innovator2.identityId, displayName: 'Innovator 2 name', email: 'innovator2@gmail.com' } as any
        );

        const expected = {
          id: collaboratorPendingWithUser.id,
          collaboratorRole: collaboratorPendingWithUser.collaboratorRole,
          name: 'Innovator 2 name',
          email: collaboratorPendingWithUser.email,
          status: collaboratorPendingWithUser.status,
          innovation: {
            id: testData.innovation.id,
            name: testData.innovation.name,
            description: testData.innovation.description,
            owner: { id: testData.innovation.owner.id, name: 'Innovator 1 name' }
          },
        }

        const collaborator = await sut.getCollaboratorInfo(
          testData.domainContexts.innovator2,
          testData.innovation.id,
          collaboratorPendingWithUser.id,
          em
        );

        expect(collaborator).toMatchObject(expected);
      });

      it('should return error if the collaborator invite is not for him', async () => {
        const randomUserId = randUuid();
        jest.spyOn(IdentityProviderService.prototype, 'getUserInfo').mockResolvedValue(
          { id: randomUserId, identityId: randomUserId, displayName: 'randomUserId', email: 'randomUserId@gmail.com' } as any
        );

        let err: NotFoundError | null = null;
        try {
          await sut.getCollaboratorInfo(
            { id: randomUserId, identityId: randomUserId } as DomainContextType,
            testData.innovation.id,
            collaboratorPendingWithUser.id,
            em
          );
        } catch (error) {
          err = error as UnauthorizedError;
        }

        expect(err).toBeDefined();
        expect(err?.name).toBe('ICB.0003');
      });
    });

    it('should return error if collaborator doesn\'t exist', async () => {

      let err: NotFoundError | null = null;
      try {
        await sut.getCollaboratorInfo(
          testData.domainContexts.innovator,
          testData.innovation.id,
          randUuid(),
          em
        );
      } catch (error) {
        err = error as NotFoundError;
      }

      expect(err).toBeDefined();
      expect(err?.name).toBe('ICB.0001');
    });
  });

  describe('updateCollaborator', () => {

    describe('asOwner', () => {

      it('should update from ACTIVE to REMOVED', async () => {

        const collaborator = await sut.updateCollaborator(
          testData.domainContexts.innovator,
          testData.collaborators.collaboratorActive.id,
          true,
          { status: InnovationCollaboratorStatusEnum.REMOVED },
          em
        );

        const dbCollaborator = await em.createQueryBuilder(InnovationCollaboratorEntity, 'collaborator')
          .where('collaborator.id = :collaboratorId', { collaboratorId: collaborator.id })
          .getOne();

        expect(dbCollaborator).toHaveProperty('status', InnovationCollaboratorStatusEnum.REMOVED);
        expect(dbCollaborator).toHaveProperty('updatedBy', testData.domainContexts.innovator.id);
      });

      it('should update from PENDING to CANCELLED', async () => {

        const collaborator = await sut.updateCollaborator(
          testData.domainContexts.innovator,
          testData.collaborators.collaboratorPending.id,
          true,
          { status: InnovationCollaboratorStatusEnum.CANCELLED },
          em
        );

        const dbCollaborator = await em.createQueryBuilder(InnovationCollaboratorEntity, 'collaborator')
          .where('collaborator.id = :collaboratorId', { collaboratorId: collaborator.id })
          .getOne();

        expect(dbCollaborator).toHaveProperty('status', InnovationCollaboratorStatusEnum.CANCELLED);
        expect(dbCollaborator).toHaveProperty('updatedBy', testData.domainContexts.innovator.id);
        expect(dbCollaborator).not.toHaveProperty('user');
      });

      it('should return error while changing status to REMOVED and current status is not ACTIVE', async () => {

        let err: UnprocessableEntityError | null = null;
        try {
          await sut.updateCollaborator(
            testData.domainContexts.innovator,
            testData.collaborators.collaboratorPending.id,
            true,
            { status: InnovationCollaboratorStatusEnum.REMOVED },
            em
          );
        } catch (error) {
          err = error as UnprocessableEntityError;
        }

        expect(err).toBeDefined();
        expect(err?.name).toBe('ICB.0004');
      });

      it('should return error while changing status to CANCELLED and current status is not PENDING', async () => {

        let err: UnprocessableEntityError | null = null;
        try {
          await sut.updateCollaborator(
            testData.domainContexts.innovator,
            testData.collaborators.collaboratorActive.id,
            true,
            { status: InnovationCollaboratorStatusEnum.CANCELLED },
            em
          );
        } catch (error) {
          err = error as UnprocessableEntityError;
        }

        expect(err).toBeDefined();
        expect(err?.name).toBe('ICB.0004');
      });
    });


    describe('asInvitedCollaborator', () => {

      beforeEach(() => {
        jest.spyOn(IdentityProviderService.prototype, 'getUserInfo').mockResolvedValue(
          {
            id: testData.domainContexts.innovator3.id,
            identityId: testData.domainContexts.innovator3.identityId,
            displayName: randUserName(),
            email: testData.collaborators.collaboratorPending.email
          } as any
        );
      });

      it('should update collaboratorRole', async () => {

        const collaborator = await sut.updateCollaborator(
          testData.domainContexts.innovator,
          testData.collaborators.collaboratorPending.id,
          true,
          { collaboratorRole: 'randomRole' },
          em
        );

        const dbCollaborator = await em.createQueryBuilder(InnovationCollaboratorEntity, 'collaborator')
          .where('collaborator.id = :collaboratorId', { collaboratorId: collaborator.id })
          .getOne();

        expect(dbCollaborator).toHaveProperty('status', InnovationCollaboratorStatusEnum.PENDING);
        expect(dbCollaborator).toHaveProperty('collaboratorRole', 'randomRole')
      });

      it('should update from PENDING to ACTIVE', async () => {

        const collaborator = await sut.updateCollaborator(
          testData.domainContexts.innovator3,
          testData.collaborators.collaboratorPending.id,
          false,
          { status: InnovationCollaboratorStatusEnum.ACTIVE },
          em
        );

        const dbCollaborator = await em.createQueryBuilder(InnovationCollaboratorEntity, 'collaborator')
          .where('collaborator.id = :collaboratorId', { collaboratorId: collaborator.id })
          .getOne();

        expect(dbCollaborator).toHaveProperty('status', InnovationCollaboratorStatusEnum.ACTIVE);
        expect(dbCollaborator).toHaveProperty('updatedBy', testData.domainContexts.innovator3.id);
        expect(dbCollaborator?.userId).toBe(testData.domainContexts.innovator3.id)
      });

      it('should update from PENDING to DECLINED', async () => {

        const collaborator = await sut.updateCollaborator(
          testData.domainContexts.innovator3,
          testData.collaborators.collaboratorPending.id,
          false,
          { status: InnovationCollaboratorStatusEnum.DECLINED },
          em
        );

        const dbCollaborator = await em.createQueryBuilder(InnovationCollaboratorEntity, 'collaborator')
          .where('collaborator.id = :collaboratorId', { collaboratorId: collaborator.id })
          .getOne();

        expect(dbCollaborator).toHaveProperty('status', InnovationCollaboratorStatusEnum.DECLINED);
        expect(dbCollaborator).toHaveProperty('updatedBy', testData.domainContexts.innovator3.id);
        expect(dbCollaborator?.userId).toBe(testData.domainContexts.innovator3.id)
      });

      it('should update from ACTIVE to LEFT', async () => {

        const collaborator = await sut.updateCollaborator(
          testData.domainContexts.innovator3,
          testData.collaborators.collaboratorActive.id,
          false,
          { status: InnovationCollaboratorStatusEnum.LEFT },
          em
        );

        const dbCollaborator = await em.createQueryBuilder(InnovationCollaboratorEntity, 'collaborator')
          .where('collaborator.id = :collaboratorId', { collaboratorId: collaborator.id })
          .getOne();

        expect(dbCollaborator).toHaveProperty('status', InnovationCollaboratorStatusEnum.LEFT);
        expect(dbCollaborator).toHaveProperty('updatedBy', testData.domainContexts.innovator3.id);
        expect(dbCollaborator?.userId).toBe(testData.domainContexts.innovator3.id)
      });

      it('should return error while changing status to ACTIVE and current status is not PENDING', async () => {

        let err: UnprocessableEntityError | null = null;
        try {
          await sut.updateCollaborator(
            testData.domainContexts.innovator3,
            testData.collaborators.collaboratorExpired.id,
            false,
            { status: InnovationCollaboratorStatusEnum.ACTIVE },
            em
          );
        } catch (error) {
          err = error as UnprocessableEntityError;
        }

        expect(err).toBeDefined();
        expect(err?.name).toBe('ICB.0004');
      });

      it('should return error while changing status to DECLINED and current status is not PENDING', async () => {

        let err: UnprocessableEntityError | null = null;
        try {
          await sut.updateCollaborator(
            testData.domainContexts.innovator3,
            testData.collaborators.collaboratorExpired.id,
            false,
            { status: InnovationCollaboratorStatusEnum.DECLINED },
            em
          );
        } catch (error) {
          err = error as UnprocessableEntityError;
        }

        expect(err).toBeDefined();
        expect(err?.name).toBe('ICB.0004');
      });

      it('should return error while changing status to LEFT and current status is not ACTIVE', async () => {

        let err: UnprocessableEntityError | null = null;
        try {
          await sut.updateCollaborator(
            testData.domainContexts.innovator3,
            testData.collaborators.collaboratorExpired.id,
            false,
            { status: InnovationCollaboratorStatusEnum.LEFT },
            em
          );
        } catch (error) {
          err = error as UnprocessableEntityError;
        }

        expect(err).toBeDefined();
        expect(err?.name).toBe('ICB.0004');
      });

    });
  });


});


