import type { EntityManager } from 'typeorm';
import type { InnovationTransferService } from './innovation-transfer.service';
import { TestsHelper } from '@innovations/shared/tests';
import { container } from '../_config';
import SYMBOLS from './symbols';
import { DomainInnovationsService, DomainUsersService, NotifierService } from '@innovations/shared/services';
import { InnovationErrorsEnum, NotFoundError, UserErrorsEnum } from '@innovations/shared/errors';
import { IdentityProviderService } from '@innovations/shared/services';
import { randUuid } from '@ngneat/falso';
import { DTOsHelper } from '@innovations/shared/tests/helpers/dtos.helper';
import { InnovationEntity, InnovationTransferEntity } from '@innovations/shared/entities';
import { UnprocessableEntityError } from '@innovations/shared/errors';
import { InnovationTransferStatusEnum } from '@innovations/shared/enums';
import type { TestUserType } from '@innovations/shared/tests/builders/user.builder';
import { InnovationCollaboratorsService } from './innovation-collaborators.service';

describe('Innovations / _services / innovation transfer suite', () => {
  let sut: InnovationTransferService;

  let em: EntityManager;

  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  // Setup global mocks for these tests
  const activityLogSpy = jest.spyOn(DomainInnovationsService.prototype, 'addActivityLog');
  const notifierSendSpy = jest.spyOn(NotifierService.prototype, 'send').mockResolvedValue(true);

  beforeAll(async () => {
    sut = container.get<InnovationTransferService>(SYMBOLS.InnovationTransferService);
    await testsHelper.init();
  });

  beforeEach(async () => {
    em = await testsHelper.getQueryRunnerEntityManager();
  });

  afterEach(async () => {
    await testsHelper.releaseQueryRunnerEntityManager();
    activityLogSpy.mockReset();
    notifierSendSpy.mockReset();
  });

  describe('getInnovationTransfersList', () => {
    it('should get all transfers created by request user', async () => {
      const innovation = scenario.users.adamInnovator.innovations.adamInnovation;
      const transfer = innovation.transfer;
      const transfers = await sut.getInnovationTransfersList(scenario.users.adamInnovator.id, undefined, em);

      expect(transfers).toMatchObject([
        {
          id: transfer.id,
          email: transfer.email,
          innovation: {
            id: innovation.id,
            name: innovation.name,
            owner: scenario.users.adamInnovator.name
          }
        }
      ]);
    });

    it('should get all transfers assigned to request user', async () => {
      const transfers = await sut.getInnovationTransfersList(scenario.users.janeInnovator.id, true, em);

      expect(transfers).toMatchObject([
        {
          id: scenario.users.johnInnovator.innovations.johnInnovation.transfer.id,
          email: scenario.users.johnInnovator.innovations.johnInnovation.transfer.email,
          innovation: {
            id: scenario.users.johnInnovator.innovations.johnInnovation.id,
            name: scenario.users.johnInnovator.innovations.johnInnovation.name,
            owner: scenario.users.johnInnovator.name
          }
        },
        {
          id: scenario.users.adamInnovator.innovations.adamInnovation.transfer.id,
          email: scenario.users.adamInnovator.innovations.adamInnovation.transfer.email,
          innovation: {
            id: scenario.users.adamInnovator.innovations.adamInnovation.id,
            name: scenario.users.adamInnovator.innovations.adamInnovation.name,
            owner: scenario.users.adamInnovator.name
          }
        }
      ]);
    });

    it('should omit innovation owner info when it is not found', async () => {
      const innovation = scenario.users.adamInnovator.innovations.adamInnovation;
      const transfer = innovation.transfer;

      jest
        .spyOn(DomainUsersService.prototype, 'getUserInfo')
        .mockRejectedValueOnce(new NotFoundError(UserErrorsEnum.USER_SQL_NOT_FOUND));

      const transfers = await sut.getInnovationTransfersList(scenario.users.adamInnovator.id, undefined, em);

      expect(transfers).toMatchObject([
        {
          id: transfer.id,
          email: transfer.email,
          innovation: {
            id: innovation.id,
            name: innovation.name
          }
        }
      ]);
    });
  });

  describe('getPendingInnovationTransferInfo', () => {
    it('should get the pending transfer info when the assigned user exists', async () => {
      const transferInfo = await sut.getPendingInnovationTransferInfo(
        scenario.users.johnInnovator.innovations.johnInnovation.transfer.id,
        em
      );

      expect(transferInfo).toMatchObject({ userExists: true });
    });

    it(`should get the pending transfer info when the assigned doesn't exist yet`, async () => {
      jest.spyOn(IdentityProviderService.prototype, 'getUserInfoByEmail').mockRejectedValueOnce(new Error());
      const transferInfo = await sut.getPendingInnovationTransferInfo(
        scenario.users.johnInnovator.innovations.johnInnovation.transfer.id,
        em
      );

      expect(transferInfo).toMatchObject({ userExists: false });
    });

    it('should throw a not found error when the transfer is not found', async () => {
      await expect(() => sut.getPendingInnovationTransferInfo(randUuid(), em)).rejects.toThrow(
        new NotFoundError(InnovationErrorsEnum.INNOVATION_TRANSFER_NOT_FOUND)
      );
    });
  });

  describe('getInnovationTransferInfo', () => {
    it('should get the innovation transfer info', async () => {
      const transfer = scenario.users.adamInnovator.innovations.adamInnovation.transfer;
      const transferInfo = await sut.getInnovationTransferInfo(transfer.id, em);

      expect(transferInfo).toMatchObject({
        id: transfer.id,
        email: transfer.email,
        innovation: {
          id: scenario.users.adamInnovator.innovations.adamInnovation.id,
          name: scenario.users.adamInnovator.innovations.adamInnovation.name,
          owner: { name: scenario.users.adamInnovator.name }
        }
      });
    });

    it('should throw a not found error when the transfer is not found', async () => {
      await expect(() => sut.getInnovationTransferInfo(randUuid(), em)).rejects.toThrow(
        new NotFoundError(InnovationErrorsEnum.INNOVATION_TRANSFER_NOT_FOUND)
      );
    });
  });

  describe('createInnovationTransfer', () => {
    it('should create an innovation transfer', async () => {
      const innovation = scenario.users.johnInnovator.innovations.johnInnovationEmpty;
      const result = await sut.createInnovationTransfer(
        { id: scenario.users.johnInnovator.id, identityId: scenario.users.johnInnovator.identityId },
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
        innovation.id,
        scenario.users.janeInnovator.email,
        false,
        em
      );

      const dbTranfer = await em
        .createQueryBuilder(InnovationTransferEntity, 'transfer')
        .where('transfer.id = :transferId', { transferId: result.id })
        .getOne();

      expect(dbTranfer?.createdBy).toBe(scenario.users.johnInnovator.id);
      expect(dbTranfer?.email).toBe(scenario.users.janeInnovator.email);
      expect(dbTranfer?.id).toBe(result.id);
    });

    it('should throw a not found error when the innovation is not found', async () => {
      await expect(() =>
        sut.createInnovationTransfer(
          { id: scenario.users.johnInnovator.id, identityId: scenario.users.johnInnovator.identityId },
          DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
          randUuid(),
          scenario.users.janeInnovator.email,
          false,
          em
        )
      ).rejects.toThrow(new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND));
    });

    it('should throw an unprocessable entity error when the innovation already has a pending transfer', async () => {
      await expect(() =>
        sut.createInnovationTransfer(
          { id: scenario.users.johnInnovator.id, identityId: scenario.users.johnInnovator.identityId },
          DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
          scenario.users.johnInnovator.innovations.johnInnovation.id,
          scenario.users.janeInnovator.email,
          false,
          em
        )
      ).rejects.toThrow(new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_TRANSFER_ALREADY_EXISTS));
    });

    it('should throw an unprocessable entity error when the transfer is to the current owner', async () => {
      await expect(() =>
        sut.createInnovationTransfer(
          { id: scenario.users.johnInnovator.id, identityId: scenario.users.johnInnovator.identityId },
          DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
          scenario.users.johnInnovator.innovations.johnInnovation.id,
          scenario.users.johnInnovator.email,
          false,
          em
        )
      ).rejects.toThrow(new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_TRANSFER_REQUESTED_FOR_SELF));
    });

    it('should throw an unprocessable entity error when the transfer target is not an innovator', async () => {
      await expect(() =>
        sut.createInnovationTransfer(
          { id: scenario.users.johnInnovator.id, identityId: scenario.users.johnInnovator.identityId },
          DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
          scenario.users.johnInnovator.innovations.johnInnovationEmpty.id,
          scenario.users.aliceQualifyingAccessor.email,
          false,
          em
        )
      ).rejects.toThrow(
        new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_TRANSFER_TARGET_USER_MUST_BE_INNOVATOR)
      );
    });
  });

  describe('updateInnovationTransferStatus', () => {
    it.each([
      [InnovationTransferStatusEnum.CANCELED as const, scenario.users.johnInnovator],
      [InnovationTransferStatusEnum.COMPLETED as const, scenario.users.janeInnovator],
      [InnovationTransferStatusEnum.DECLINED as const, scenario.users.janeInnovator]
    ])(
      'should update the transfer status to %s',
      async (
        status:
          | InnovationTransferStatusEnum.CANCELED
          | InnovationTransferStatusEnum.COMPLETED
          | InnovationTransferStatusEnum.DECLINED,
        requestUser: TestUserType
      ) => {
        const dbInnovation = await em
          .createQueryBuilder(InnovationEntity, 'innovation')
          .innerJoinAndSelect('innovation.owner', 'owner')
          .where('innovation.id = :innovationId', {
            innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id
          })
          .getOne();

        const innovationMock = jest
          .spyOn(DomainInnovationsService.prototype, 'getInnovationInfo')
          .mockResolvedValueOnce(dbInnovation);

        const result = await sut.updateInnovationTransferStatus(
          {
            id: requestUser.id,
            identityId: requestUser.identityId
          },
          DTOsHelper.getUserRequestContext(requestUser),
          scenario.users.johnInnovator.innovations.johnInnovation.transfer.id,
          status,
          em
        );

        const dbTransfer = await em
          .createQueryBuilder(InnovationTransferEntity, 'transfer')
          .where('transfer.id = :transferId', {
            transferId: scenario.users.johnInnovator.innovations.johnInnovation.transfer.id
          })
          .getOne();

        expect(result.id).toBe(scenario.users.johnInnovator.innovations.johnInnovation.transfer.id);
        expect(dbTransfer?.status).toBe(status);

        if (status === InnovationTransferStatusEnum.COMPLETED) {
          expect(activityLogSpy).toHaveBeenCalled();
        }

        expect(notifierSendSpy).toHaveBeenCalled();

        innovationMock.mockReset();
      }
    );

    it('should update collaborators when changing transfer to COMPLETED', async () => {
      const dbInnovation = await em
        .createQueryBuilder(InnovationEntity, 'innovation')
        .innerJoinAndSelect('innovation.owner', 'owner')
        .where('innovation.id = :innovationId', {
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id
        })
        .getOne();

      jest.spyOn(DomainInnovationsService.prototype, 'getInnovationInfo').mockResolvedValueOnce(dbInnovation);

      const upsertCollabSpy = jest.spyOn(InnovationCollaboratorsService.prototype, 'upsertCollaborator');
      const deleteCollabSpy = jest.spyOn(InnovationCollaboratorsService.prototype, 'deleteCollaborator');

      const result = await sut.updateInnovationTransferStatus(
        {
          id: scenario.users.janeInnovator.id,
          identityId: scenario.users.janeInnovator.identityId
        },
        DTOsHelper.getUserRequestContext(scenario.users.janeInnovator),
        scenario.users.johnInnovator.innovations.johnInnovation.transfer.id,
        InnovationTransferStatusEnum.COMPLETED,
        em
      );

      expect(result.id).toBeDefined();
      expect(upsertCollabSpy).toHaveBeenCalled();
      expect(deleteCollabSpy).toHaveBeenCalled();
    });

    it('should archive innovation without owner when changing transfer to DECLINED', async () => {
      const dbInnovation = await em
        .createQueryBuilder(InnovationEntity, 'innovation')
        .where('innovation.id = :innovationId', {
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id
        })
        .getOne();

      jest
        .spyOn(DomainInnovationsService.prototype, 'getInnovationInfo')
        .mockResolvedValueOnce({ ...dbInnovation, owner: null } as InnovationEntity);

      const archiveInnovationSpy = jest.spyOn(
        DomainInnovationsService.prototype,
        'archiveInnovationsWithDeleteSideffects'
      );

      const result = await sut.updateInnovationTransferStatus(
        { id: scenario.users.janeInnovator.id, identityId: scenario.users.janeInnovator.identityId },
        DTOsHelper.getUserRequestContext(scenario.users.janeInnovator),
        scenario.users.johnInnovator.innovations.johnInnovation.transfer.id,
        InnovationTransferStatusEnum.DECLINED,
        em
      );

      expect(result.id).toBeDefined();
      expect(archiveInnovationSpy).toHaveBeenCalled();
    });

    it('should throw a not found error when the transfer is not found', async () => {
      await expect(() =>
        sut.updateInnovationTransferStatus(
          {
            id: scenario.users.johnInnovator.id,
            identityId: scenario.users.johnInnovator.identityId
          },
          DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
          randUuid(),
          InnovationTransferStatusEnum.COMPLETED,
          em
        )
      ).rejects.toThrow(new NotFoundError(InnovationErrorsEnum.INNOVATION_TRANSFER_NOT_FOUND));
    });
  });
});
