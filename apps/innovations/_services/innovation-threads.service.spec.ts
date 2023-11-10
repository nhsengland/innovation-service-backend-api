import { container } from '../_config';

import { InnovationThreadEntity, UserRoleEntity } from '@innovations/shared/entities';
import { ThreadContextTypeEnum } from '@innovations/shared/enums';
import { BadRequestError, InnovationErrorsEnum, NotFoundError } from '@innovations/shared/errors';
import { NotifierService } from '@innovations/shared/services';
import { TestsHelper } from '@innovations/shared/tests';
import { DTOsHelper } from '@innovations/shared/tests/helpers/dtos.helper';
import { randUuid } from '@ngneat/falso';
import type { EntityManager } from 'typeorm';
import type { InnovationThreadsService } from './innovation-threads.service';
import SYMBOLS from './symbols';

describe('Innovations / _services / innovation-threads suite', () => {
  let sut: InnovationThreadsService;

  let em: EntityManager;

  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  // Setup global mocks for these tests
  const notifierSendSpy = jest.spyOn(NotifierService.prototype, 'send').mockResolvedValue(true);

  beforeAll(async () => {
    sut = container.get<InnovationThreadsService>(SYMBOLS.InnovationThreadsService);
    await testsHelper.init();
  });

  beforeEach(async () => {
    em = await testsHelper.getQueryRunnerEntityManager();
  });

  afterEach(async () => {
    await testsHelper.releaseQueryRunnerEntityManager();
    notifierSendSpy.mockReset();
  });

  describe('addFollowersToThread', () => {
    const thread = scenario.users.johnInnovator.innovations.johnInnovation.threads.threadByAliceQA;
    const requestUserContext = DTOsHelper.getUserRequestContext(scenario.users.johnInnovator);

    it('should add followers to a thread and send notification', async () => {
      await sut.addFollowersToThread(
        requestUserContext,
        thread.id,
        [scenario.users.aliceQualifyingAccessor.roles.qaRole.id],
        true,
        em
      );

      const dbThread = await em
        .createQueryBuilder(InnovationThreadEntity, 'thread')
        .leftJoinAndSelect('thread.followers', 'followers')
        .where('thread.id = :threadId', { threadId: thread.id })
        .getOne();

      expect(dbThread?.followers).toMatchObject([
        UserRoleEntity.new({ id: scenario.users.aliceQualifyingAccessor.roles.qaRole.id })
      ]);
      expect(notifierSendSpy).toBeCalled();
    });

    it(`should throw an error if the thread doesn't exist`, async () => {
      await expect(
        sut.addFollowersToThread(
          requestUserContext,
          randUuid(),
          [scenario.users.aliceQualifyingAccessor.roles.qaRole.id],
          false,
          em
        )
      ).rejects.toThrowError(new NotFoundError(InnovationErrorsEnum.INNOVATION_THREAD_NOT_FOUND));
    });
  });

  describe('unfollowThread', () => {
    const thread = scenario.users.johnInnovator.innovations.johnInnovation.threads.threadByAliceQA;

    it('should unfollow a thread', async () => {
      // ensure user is a follower
      await em.getRepository(InnovationThreadEntity).save({
        id: thread.id,
        followers: [UserRoleEntity.new({ id: scenario.users.aliceQualifyingAccessor.roles.qaRole.id })]
      });

      await sut.unfollowThread(thread.id, scenario.users.aliceQualifyingAccessor.roles.qaRole.id, em);

      const dbThread = await em
        .createQueryBuilder(InnovationThreadEntity, 'thread')
        .leftJoinAndSelect('thread.followers', 'followers')
        .where('thread.id = :threadId', { threadId: thread.id })
        .getOne();

      expect(dbThread?.followers).toMatchObject([]);
    });

    it('should throw an error if the user is not a follower', async () => {
      await expect(
        sut.unfollowThread(thread.id, scenario.users.sarahQualifyingAccessor.roles.qaRole.id, em)
      ).rejects.toThrowError(new BadRequestError(InnovationErrorsEnum.INNOVATION_THREAD_USER_IS_NOT_FOLLOWER));
    });

    it(`should throw an error if the thread doesn't exist`, async () => {
      await expect(
        sut.unfollowThread(randUuid(), scenario.users.sarahQualifyingAccessor.roles.qaRole.id, em)
      ).rejects.toThrowError(new NotFoundError(InnovationErrorsEnum.INNOVATION_THREAD_NOT_FOUND));
    });
  });

  describe('removeFollowers', () => {
    const thread = scenario.users.johnInnovator.innovations.johnInnovation.threads.threadByAliceQA;

    beforeEach(async () => {
      await em.getRepository(InnovationThreadEntity).save({
        id: thread.id,
        followers: [
          UserRoleEntity.new({ id: scenario.users.aliceQualifyingAccessor.roles.qaRole.id }),
          UserRoleEntity.new({ id: scenario.users.ingridAccessor.roles.accessorRole.id })
        ]
      });
    });

    it('should remove users as followers from threads', async () => {
      await sut.removeFollowers(
        thread.id,
        [scenario.users.aliceQualifyingAccessor.roles.qaRole.id, scenario.users.ingridAccessor.roles.accessorRole.id],
        em
      );

      const dbThread = await em
        .createQueryBuilder(InnovationThreadEntity, 'thread')
        .leftJoinAndSelect('thread.followers', 'followers')
        .where('thread.id = :threadId', { threadId: thread.id })
        .getOne();

      expect(dbThread?.followers).toHaveLength(0);
    });

    it('should not remove users as followers from threads when an empty array is passed', async () => {
      await sut.removeFollowers(thread.id, [], em);

      const dbThread = await em
        .createQueryBuilder(InnovationThreadEntity, 'thread')
        .leftJoinAndSelect('thread.followers', 'followers')
        .where('thread.id = :threadId', { threadId: thread.id })
        .getOne();

      expect(dbThread?.followers).toHaveLength(2);
    });
  });

  describe('getThreadByContextId', () => {
    it('returns a thread by context id', async () => {
      const thread = scenario.users.johnInnovator.innovations.johnInnovation.threads.threadByAliceQA;
      const support = scenario.users.johnInnovator.innovations.johnInnovation.supports.supportByHealthOrgUnit;

      const result = await sut.getThreadByContextId(ThreadContextTypeEnum.SUPPORT, support.id, em);

      expect(result).toMatchObject({ id: thread.id, subject: thread.subject });
    });

    it('returns null if no thread is found', async () => {
      const result = await sut.getThreadByContextId(ThreadContextTypeEnum.SUPPORT, randUuid(), em);
      expect(result).toBeNull();
    });
  });
});
