/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { CompleteScenarioType, TestsHelper } from '@notifications/shared/tests';
import type { RecipientsService } from './recipients.service';
import { container } from '../_config';
import type { EntityManager } from 'typeorm';
import { ServiceRoleEnum } from '@notifications/shared/enums';
import { randUuid } from '@ngneat/falso';
import { InnovationErrorsEnum, NotFoundError } from '@notifications/shared/errors';
import { SYMBOLS } from './symbols';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';

describe('Notifications / _services / recipients service suite', () => {
  let sut: RecipientsService;

  let testsHelper: TestsHelper;
  let scenario: CompleteScenarioType;

  let em: EntityManager;

  beforeAll(async () => {
    sut = container.get<RecipientsService>(SYMBOLS.RecipientsService);
    testsHelper = await new TestsHelper().init();
    scenario = testsHelper.getCompleteScenario();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
  });

  beforeEach(async () => {
    em = await testsHelper.getQueryRunnerEntityManager();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await testsHelper.releaseQueryRunnerEntityManager();
  });

  describe('getUsersRecipients suite', () => {
    it('Should get a recipient when passed a valid user', async () => {
      const recipient = await sut.getUsersRecipient(
        scenario.users.johnInnovator.id,
        ServiceRoleEnum.INNOVATOR,
        undefined,
        em
      );

      expect(recipient).toMatchObject(DTOsHelper.getRecipientUser(scenario.users.johnInnovator, 'innovatorRole'));
    });

    it('Should get multiple recipients when passed an array of userIds', async () => {
      const recipients = await sut.getUsersRecipient(
        [scenario.users.johnInnovator.id, scenario.users.adamInnovator.id],
        ServiceRoleEnum.INNOVATOR,
        undefined,
        em
      );

      expect(recipients).toHaveLength(2);
      expect(recipients[0]).toMatchObject(DTOsHelper.getRecipientUser(scenario.users.johnInnovator, 'innovatorRole'));
      expect(recipients[1]).toMatchObject(DTOsHelper.getRecipientUser(scenario.users.adamInnovator, 'innovatorRole'));
    });

    it('Should return null when passed a non existent role for a single user', async () => {
      const recipient = await sut.getUsersRecipient(
        scenario.users.johnInnovator.id,
        ServiceRoleEnum.ACCESSOR,
        undefined,
        em
      );

      expect(recipient).toBeNull();
    });

    it('It should return empty array when passed a non existent role for all users', async () => {
      const recipients = await sut.getUsersRecipient(
        [scenario.users.johnInnovator.id, scenario.users.adamInnovator.id],
        ServiceRoleEnum.ACCESSOR,
        undefined,
        em
      );

      expect(recipients).toHaveLength(0);
    });

    it('It should return empty array when passed an empty array of userIds', async () => {
      const recipients = await sut.getUsersRecipient([], ServiceRoleEnum.ACCESSOR, undefined, em);

      expect(recipients).toHaveLength(0);
    });
  });

  describe('innovationInfo suite', () => {
    it('Should get innovation info', async () => {
      const dbInnovation = scenario.users.johnInnovator.innovations.johnInnovation;

      const innovation = await sut.innovationInfo(dbInnovation.id);

      expect(innovation).toMatchObject({
        name: dbInnovation.name,
        ownerId: scenario.users.johnInnovator.id,
        ownerIdentityId: scenario.users.johnInnovator.identityId
      });
    });

    it('Should fail to get non-existent innovation info', async () => {
      await expect(() => sut.innovationInfo(randUuid())).rejects.toThrowError(
        new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND)
      );
    });
  });

  describe('actionInfoWithOwner suite', () => {
    it('Should get action info', async () => {
      const dbInnovation = scenario.users.johnInnovator.innovations.johnInnovation;
      const dbAction = dbInnovation.actions.actionByAlice;

      const actionInfo = await sut.actionInfoWithOwner(dbAction.id);

      expect(actionInfo).toMatchObject({
        id: dbAction.id,
        displayId: dbAction.displayId,
        status: dbAction.status,
        owner: DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor, 'qaRole')
      });
    });

    it('Should fail to get non-existent action info', async () => {
      await expect(() => sut.actionInfoWithOwner(randUuid())).rejects.toThrowError(
        new NotFoundError(InnovationErrorsEnum.INNOVATION_ACTION_NOT_FOUND)
      );
    });
  });

  describe('getInnovationActiveCollaborators suite', () => {
    it('Should get collaborators', async () => {
      const dbInnovation = scenario.users.johnInnovator.innovations.johnInnovation;

      const collaborators = await sut.getInnovationActiveCollaborators(dbInnovation.id);

      expect(collaborators).toHaveLength(1);
      expect(collaborators[0]).toEqual(scenario.users.janeInnovator.id);
    });

    it('Should get an empty array for a non-existent innovation', async () => {
      const collaborators = await sut.getInnovationActiveCollaborators(randUuid());

      expect(collaborators).toHaveLength(0);
    });
  });
});
