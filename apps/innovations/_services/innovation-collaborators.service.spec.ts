/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { container } from '../_config';

import { InnovationCollaboratorEntity } from '@innovations/shared/entities/innovation/innovation-collaborator.entity';
import { InnovationCollaboratorStatusEnum } from '@innovations/shared/enums';
import {
  ConflictError,
  ForbiddenError,
  InnovationErrorsEnum,
  NotFoundError,
  UnprocessableEntityError
} from '@innovations/shared/errors';
import { NotifierService } from '@innovations/shared/services';
import { TestsHelper } from '@innovations/shared/tests';
import { DTOsHelper } from '@innovations/shared/tests/helpers/dtos.helper';
import { randEmail, randUuid } from '@ngneat/falso';
import type { EntityManager } from 'typeorm';
import type { InnovationCollaboratorsService } from './innovation-collaborators.service';
import SYMBOLS from './symbols';

describe('Innovation Collaborators Suite', () => {
  let sut: InnovationCollaboratorsService;

  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  let em: EntityManager;

  beforeAll(async () => {
    sut = container.get<InnovationCollaboratorsService>(SYMBOLS.InnovationCollaboratorsService);
    await testsHelper.init();

    // Setup mocks
    jest.spyOn(NotifierService.prototype, 'send').mockResolvedValue(true);
  });

  beforeEach(async () => {
    em = await testsHelper.getQueryRunnerEntityManager();
  });

  afterEach(async () => {
    await testsHelper.releaseQueryRunnerEntityManager();
  });

  describe('createCollaborator', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

    it('create a collaborator for an existing user', async () => {
      const collaborator = await sut.createCollaborator(
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
        innovation.id,
        {
          email: scenario.users.ottoOctaviusInnovator.email,
          role: 'my role'
        },
        em
      );

      const dbCollaborator = await em
        .createQueryBuilder(InnovationCollaboratorEntity, 'collaborators')
        .where('collaborators.id = :collaboratorId', { collaboratorId: collaborator.id })
        .getOne();

      expect(dbCollaborator).toMatchObject({
        id: collaborator.id,
        collaboratorRole: 'my role',
        status: InnovationCollaboratorStatusEnum.PENDING,
        innovationId: innovation.id,
        createdBy: scenario.users.johnInnovator.id,
        updatedBy: scenario.users.johnInnovator.id,
        userId: scenario.users.ottoOctaviusInnovator.id,
        invitedAt: expect.any(Date)
      });
    });

    it('create a collaborator for a non existing user', async () => {
      const collaborator = await sut.createCollaborator(
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
        innovation.id,
        {
          email: randEmail(),
          role: 'my role'
        },
        em
      );

      const dbCollaborator = await em
        .createQueryBuilder(InnovationCollaboratorEntity, 'collaborators')
        .where('collaborators.id = :collaboratorId', { collaboratorId: collaborator.id })
        .getOne();

      expect(dbCollaborator).toMatchObject({
        id: collaborator.id,
        collaboratorRole: 'my role',
        status: InnovationCollaboratorStatusEnum.PENDING,
        innovationId: innovation.id,
        createdBy: scenario.users.johnInnovator.id,
        updatedBy: scenario.users.johnInnovator.id,
        userId: null,
        invitedAt: expect.any(Date)
      });
    });

    it('invite again for a user that is valid to invite again', async () => {
      await em.update(
        InnovationCollaboratorEntity,
        { id: innovation.collaborators.elisaPendingCollaborator.id },
        { invitedAt: new Date('2021-01-01') }
      );
      const collaborator = await sut.createCollaborator(
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
        innovation.id,
        {
          email: innovation.collaborators.elisaPendingCollaborator.email,
          role: 'my role'
        },
        em
      );

      const dbCollaborator = await em
        .createQueryBuilder(InnovationCollaboratorEntity, 'collaborators')
        .where('collaborators.id = :collaboratorId', {
          collaboratorId: collaborator.id
        })
        .getOne();

      expect(dbCollaborator).toMatchObject({
        id: collaborator.id,
        collaboratorRole: 'my role',
        status: InnovationCollaboratorStatusEnum.PENDING,
        innovationId: innovation.id,
        updatedBy: scenario.users.johnInnovator.id,
        userId: null,
        invitedAt: expect.any(Date)
      });
    });

    it('return a error if there is an invite associated with an email/innovation', async () => {
      await expect(() =>
        sut.createCollaborator(DTOsHelper.getUserRequestContext(scenario.users.johnInnovator), innovation.id, {
          email: innovation.collaborators.elisaPendingCollaborator.email,
          role: 'my role'
        })
      ).rejects.toThrowError(new ConflictError(InnovationErrorsEnum.INNOVATION_COLLABORATOR_WITH_VALID_REQUEST));
    });

    it('return a error if the owner is trying to create a invite for himself', async () => {
      await expect(() =>
        sut.createCollaborator(DTOsHelper.getUserRequestContext(scenario.users.johnInnovator), innovation.id, {
          email: scenario.users.johnInnovator.email,
          role: 'my role'
        })
      ).rejects.toThrowError(new ConflictError(InnovationErrorsEnum.INNOVATION_COLLABORATOR_CANT_BE_OWNER));
    });

    it.each([
      ['QA', scenario.users.aliceQualifyingAccessor],
      ['NA', scenario.users.paulNeedsAssessor]
    ])('return a error if he is trying to invite a %s', async (_label, user) => {
      await expect(() =>
        sut.createCollaborator(DTOsHelper.getUserRequestContext(scenario.users.johnInnovator), innovation.id, {
          email: user.email,
          role: 'my role'
        })
      ).rejects.toThrowError(
        new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_COLLABORATOR_MUST_BE_INNOVATOR)
      );
    });
  });

  describe('getCollaboratorsList', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
    const jane = innovation.collaborators.janeCollaborator;
    const elisa = innovation.collaborators.elisaPendingCollaborator;

    it('should return all collaborators independent of the status', async () => {
      const collaborators = await sut.getCollaboratorsList(
        innovation.id,
        {},
        { order: { createdAt: 'DESC' }, skip: 0, take: 10 },
        em
      );

      expect(collaborators.count).toBe(4);
      expect(collaborators.data).toMatchObject(
        expect.arrayContaining([
          {
            id: jane.id,
            status: jane.status,
            email: jane.email,
            role: expect.any(String),
            name: scenario.users.janeInnovator.name,
            isActive: scenario.users.janeInnovator.isActive
          },
          { id: elisa.id, status: elisa.status, email: elisa.email }
        ])
      );
    });

    it('should return all collaborators in status PENDING and ACTIVE', async () => {
      const collaborators = await sut.getCollaboratorsList(
        innovation.id,
        {
          status: [InnovationCollaboratorStatusEnum.ACTIVE, InnovationCollaboratorStatusEnum.PENDING]
        },
        { order: { createdAt: 'DESC' }, skip: 0, take: 10 },
        em
      );
      expect(collaborators.count).toBe(3);
      expect(collaborators.data.map(c => c.status)).toMatchObject(expect.arrayContaining(['ACTIVE', 'PENDING']));
    });

    it('should return all collaborators in status EXPIRED', async () => {
      await em.update(
        InnovationCollaboratorEntity,
        { id: innovation.collaborators.elisaPendingCollaborator.id },
        { invitedAt: new Date('2021-01-01') }
      );

      const collaborators = await sut.getCollaboratorsList(
        innovation.id,
        { status: [InnovationCollaboratorStatusEnum.EXPIRED] },
        { order: { createdAt: 'DESC' }, skip: 0, take: 10 },
        em
      );

      expect(collaborators.count).toBe(1);
      expect(collaborators.data).toMatchObject([{ status: InnovationCollaboratorStatusEnum.EXPIRED }]);
    });
  });

  describe('getCollaboratorInfo', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

    describe('asOwner', () => {
      it('for a new user it should return info for a new collaborator without the name', async () => {
        const collaborator = await sut.getCollaboratorInfo(
          DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
          innovation.id,
          innovation.collaborators.elisaPendingCollaborator.id,
          em
        );

        expect(collaborator).toMatchObject({
          id: innovation.collaborators.elisaPendingCollaborator.id,
          email: innovation.collaborators.elisaPendingCollaborator.email,
          status: innovation.collaborators.elisaPendingCollaborator.status,
          innovation: {
            id: innovation.id,
            name: innovation.name,
            description: expect.any(String),
            owner: { id: scenario.users.johnInnovator.id, name: scenario.users.johnInnovator.name }
          },
          invitedAt: expect.any(Date)
        });
        expect(collaborator.name).toBeUndefined();
      });

      it('for a existing user should return info for a new collaborator with the name of the user', async () => {
        const collaborator = await sut.getCollaboratorInfo(
          DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
          innovation.id,
          innovation.collaborators.janeCollaborator.id,
          em
        );

        expect(collaborator).toMatchObject({
          id: innovation.collaborators.janeCollaborator.id,
          email: innovation.collaborators.janeCollaborator.email,
          status: innovation.collaborators.janeCollaborator.status,
          role: expect.any(String),
          innovation: {
            id: innovation.id,
            name: innovation.name,
            description: expect.any(String),
            owner: { id: scenario.users.johnInnovator.id, name: scenario.users.johnInnovator.name }
          },
          invitedAt: expect.any(Date)
        });
      });
    });

    describe('asCollaborator', () => {
      it('should return info (with the name of the user) as collaborator user', async () => {
        const collaborator = await sut.getCollaboratorInfo(
          DTOsHelper.getUserRequestContext(scenario.users.janeInnovator),
          innovation.id,
          innovation.collaborators.janeCollaborator.id,
          em
        );

        expect(collaborator).toMatchObject({
          id: innovation.collaborators.janeCollaborator.id,
          name: scenario.users.janeInnovator.name,
          email: innovation.collaborators.janeCollaborator.email,
          status: innovation.collaborators.janeCollaborator.status,
          innovation: {
            id: innovation.id,
            name: innovation.name,
            description: expect.any(String),
            owner: { id: scenario.users.johnInnovator.id, name: scenario.users.johnInnovator.name }
          },
          invitedAt: expect.any(Date)
        });
      });

      it('should return error if the collaborator invite is not for him', async () => {
        await expect(() =>
          sut.getCollaboratorInfo(
            DTOsHelper.getUserRequestContext(scenario.users.janeInnovator),
            innovation.id,
            innovation.collaborators.elisaPendingCollaborator.id,
            em
          )
        ).rejects.toThrowError(new ForbiddenError(InnovationErrorsEnum.INNOVATION_COLLABORATOR_NO_ACCESS));
      });

      it("should return error if collaborator doesn't exist", async () => {
        await expect(() =>
          sut.getCollaboratorInfo(
            DTOsHelper.getUserRequestContext(scenario.users.janeInnovator),
            innovation.id,
            randUuid(),
            em
          )
        ).rejects.toThrowError(new NotFoundError(InnovationErrorsEnum.INNOVATION_COLLABORATOR_NOT_FOUND));
      });
    });
  });

  describe('updateCollaborator', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

    describe('asOwner', () => {
      it('should update from ACTIVE to REMOVED', async () => {
        const collaborator = await sut.updateCollaborator(
          DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
          innovation.collaborators.janeCollaborator.id,
          innovation.id,
          true,
          { status: InnovationCollaboratorStatusEnum.REMOVED },
          em
        );

        const dbCollaborator = await em
          .createQueryBuilder(InnovationCollaboratorEntity, 'collaborator')
          .where('collaborator.id = :collaboratorId', { collaboratorId: collaborator.id })
          .getOne();

        expect(dbCollaborator).toMatchObject({
          status: InnovationCollaboratorStatusEnum.REMOVED,
          updatedBy: scenario.users.johnInnovator.id
        });
      });

      it('should update from PENDING to CANCELLED', async () => {
        const collaborator = await sut.updateCollaborator(
          DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
          innovation.collaborators.elisaPendingCollaborator.id,
          innovation.id,
          true,
          { status: InnovationCollaboratorStatusEnum.CANCELLED },
          em
        );

        const dbCollaborator = await em
          .createQueryBuilder(InnovationCollaboratorEntity, 'collaborator')
          .where('collaborator.id = :collaboratorId', { collaboratorId: collaborator.id })
          .getOne();

        expect(dbCollaborator).toMatchObject({
          status: InnovationCollaboratorStatusEnum.CANCELLED,
          updatedBy: scenario.users.johnInnovator.id
        });
      });

      it('should return error while changing status to REMOVED and current status is not ACTIVE', async () => {
        await expect(() =>
          sut.updateCollaborator(
            DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
            innovation.collaborators.elisaPendingCollaborator.id,
            innovation.id,
            true,
            { status: InnovationCollaboratorStatusEnum.REMOVED },
            em
          )
        ).rejects.toThrowError(
          new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_COLLABORATOR_WITH_UNPROCESSABLE_STATUS)
        );
      });

      it('should return error while changing status to CANCELLED and current status is not PENDING', async () => {
        await expect(() =>
          sut.updateCollaborator(
            DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
            innovation.collaborators.janeCollaborator.id,
            innovation.id,
            true,
            { status: InnovationCollaboratorStatusEnum.CANCELLED },
            em
          )
        ).rejects.toThrowError(
          new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_COLLABORATOR_WITH_UNPROCESSABLE_STATUS)
        );
      });

      it('should update collaboratorRole', async () => {
        const collaborator = await sut.updateCollaborator(
          DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
          innovation.collaborators.elisaPendingCollaborator.id,
          innovation.id,
          true,
          { role: 'randomRole' },
          em
        );

        const dbCollaborator = await em
          .createQueryBuilder(InnovationCollaboratorEntity, 'collaborator')
          .where('collaborator.id = :collaboratorId', { collaboratorId: collaborator.id })
          .getOne();

        expect(dbCollaborator).toMatchObject({
          status: InnovationCollaboratorStatusEnum.PENDING,
          collaboratorRole: 'randomRole'
        });
      });
    });

    describe('asInvitedCollaborator', () => {
      it('should update from PENDING to ACTIVE', async () => {
        const collaborator = await sut.updateCollaborator(
          DTOsHelper.getUserRequestContext(scenario.users.adamInnovator),
          innovation.collaborators.adamCollaborator.id,
          innovation.id,
          false,
          { status: InnovationCollaboratorStatusEnum.ACTIVE },
          em
        );

        const dbCollaborator = await em
          .createQueryBuilder(InnovationCollaboratorEntity, 'collaborator')
          .where('collaborator.id = :collaboratorId', { collaboratorId: collaborator.id })
          .getOne();

        expect(dbCollaborator).toMatchObject({
          status: InnovationCollaboratorStatusEnum.ACTIVE,
          updatedBy: scenario.users.adamInnovator.id,
          userId: scenario.users.adamInnovator.id
        });
      });

      it('should update from PENDING to DECLINED', async () => {
        const collaborator = await sut.updateCollaborator(
          DTOsHelper.getUserRequestContext(scenario.users.adamInnovator),
          innovation.collaborators.adamCollaborator.id,
          innovation.id,
          false,
          { status: InnovationCollaboratorStatusEnum.DECLINED },
          em
        );

        const dbCollaborator = await em
          .createQueryBuilder(InnovationCollaboratorEntity, 'collaborator')
          .where('collaborator.id = :collaboratorId', { collaboratorId: collaborator.id })
          .getOne();

        expect(dbCollaborator).toMatchObject({
          status: InnovationCollaboratorStatusEnum.DECLINED,
          updatedBy: scenario.users.adamInnovator.id,
          userId: scenario.users.adamInnovator.id
        });
      });

      it('should update from ACTIVE to LEFT', async () => {
        const collaborator = await sut.updateCollaborator(
          DTOsHelper.getUserRequestContext(scenario.users.janeInnovator),
          innovation.collaborators.janeCollaborator.id,
          innovation.id,
          false,
          { status: InnovationCollaboratorStatusEnum.LEFT },
          em
        );

        const dbCollaborator = await em
          .createQueryBuilder(InnovationCollaboratorEntity, 'collaborator')
          .where('collaborator.id = :collaboratorId', { collaboratorId: collaborator.id })
          .getOne();

        expect(dbCollaborator).toMatchObject({
          status: InnovationCollaboratorStatusEnum.LEFT,
          updatedBy: scenario.users.janeInnovator.id,
          userId: scenario.users.janeInnovator.id
        });
      });

      it('should return error while changing status to ACTIVE and current status is not PENDING', async () => {
        await expect(() =>
          sut.updateCollaborator(
            DTOsHelper.getUserRequestContext(scenario.users.janeInnovator),
            innovation.collaborators.janeCollaborator.id,
            innovation.id,
            false,
            { status: InnovationCollaboratorStatusEnum.ACTIVE },
            em
          )
        ).rejects.toThrowError(
          new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_COLLABORATOR_WITH_UNPROCESSABLE_STATUS)
        );
      });

      it('should return error while changing status to DECLINED and current status is not PENDING', async () => {
        await expect(() =>
          sut.updateCollaborator(
            DTOsHelper.getUserRequestContext(scenario.users.janeInnovator),
            innovation.collaborators.janeCollaborator.id,
            innovation.id,
            false,
            { status: InnovationCollaboratorStatusEnum.DECLINED },
            em
          )
        ).rejects.toThrowError(
          new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_COLLABORATOR_WITH_UNPROCESSABLE_STATUS)
        );
      });

      it('should return error while changing status to LEFT and current status is not ACTIVE', async () => {
        await expect(() =>
          sut.updateCollaborator(
            DTOsHelper.getUserRequestContext(scenario.users.adamInnovator),
            innovation.collaborators.adamCollaborator.id,
            innovation.id,
            false,
            { status: InnovationCollaboratorStatusEnum.LEFT },
            em
          )
        ).rejects.toThrowError(
          new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_COLLABORATOR_WITH_UNPROCESSABLE_STATUS)
        );
      });

      it('should return error when update role', async () => {
        await expect(() =>
          sut.updateCollaborator(
            DTOsHelper.getUserRequestContext(scenario.users.janeInnovator),
            innovation.collaborators.janeCollaborator.id,
            innovation.id,
            false,
            { role: 'randomRole' },
            em
          )
        ).rejects.toThrowError(
          new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_COLLABORATOR_WITH_UNPROCESSABLE_STATUS)
        );
      });
    });
  });
});
