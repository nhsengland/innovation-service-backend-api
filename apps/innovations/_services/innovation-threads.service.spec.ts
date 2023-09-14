import { container } from '../_config';

import { NotifierService } from '@innovations/shared/services';
import { TestsHelper } from '@innovations/shared/tests';
import type { EntityManager } from 'typeorm';
import type { InnovationThreadsService } from './innovation-threads.service';
import SYMBOLS from './symbols';
import {
  InnovationThreadEntity,
  UserRoleEntity
} from '@innovations/shared/entities';
import { DTOsHelper } from '@innovations/shared/tests/helpers/dtos.helper';
import { randUuid } from '@ngneat/falso';
import { NotFoundError, BadRequestError, InnovationErrorsEnum } from '@innovations/shared/errors';

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

    it('should add followers to a thread', async () => {
      const result = await sut.addFollowersToThread(
        thread.id,
        [scenario.users.aliceQualifyingAccessor.roles.qaRole.id],
        em
      );

      const dbThread = await em
        .createQueryBuilder(InnovationThreadEntity, 'thread')
        .leftJoinAndSelect('thread.followers', 'followers')
        .where('thread.id = :threadId', { threadId: thread.id })
        .getOne();

      expect(result).toMatchObject({ threadId: thread.id });
      expect(dbThread?.followers).toMatchObject([
        UserRoleEntity.new({ id: scenario.users.aliceQualifyingAccessor.roles.qaRole.id })
      ]);
    });

    it(`should throw an error if the thread doesn't exist`, async () => {
      await expect(
        sut.addFollowersToThread(
          randUuid(),
          [scenario.users.aliceQualifyingAccessor.roles.qaRole.id],
          em
        )
      ).rejects.toThrowError(new NotFoundError(InnovationErrorsEnum.INNOVATION_THREAD_NOT_FOUND));
    })
  });

  describe('unfollowThread', () => {
    const thread = scenario.users.johnInnovator.innovations.johnInnovation.threads.threadByAliceQA;

    it('should unfollow a thread', async () => {
      // ensure user is a follower
      await em.getRepository(InnovationThreadEntity).save({
        id: thread.id,
        followers: [
          UserRoleEntity.new({ id: scenario.users.aliceQualifyingAccessor.roles.qaRole.id })
        ]
      });

      const result = await sut.unfollowThread(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        thread.id,
        em
      );

      const dbThread = await em
        .createQueryBuilder(InnovationThreadEntity, 'thread')
        .leftJoinAndSelect('thread.followers', 'followers')
        .where('thread.id = :threadId', { threadId: thread.id })
        .getOne();

      expect(result).toMatchObject({ threadId: thread.id });
      expect(dbThread?.followers).toMatchObject([]);

    })

    it('should throw an error if the user is not a follower', async () => {
      await expect(
        sut.unfollowThread(
          DTOsHelper.getUserRequestContext(scenario.users.sarahQualifyingAccessor),
          thread.id,
          em
        )
      ).rejects.toThrowError(new BadRequestError(InnovationErrorsEnum.INNOVATION_THREAD_USER_IS_NOT_FOLLOWER));

    })

    it('should throw an error if the user is an innovator', async () => {
      await expect(
        sut.unfollowThread(
          DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
          thread.id,
          em
        )
      ).rejects.toThrowError(new BadRequestError(InnovationErrorsEnum.INNOVATION_THREAD_INNOVATORS_CANNOT_UNFOLLOW));

    })

    it(`should throw an error if the thread doesn't exist`, async () => {
      await expect(
        sut.unfollowThread(
          DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
          randUuid(),
          em
        )
      ).rejects.toThrowError(new NotFoundError(InnovationErrorsEnum.INNOVATION_THREAD_NOT_FOUND));
    })
  })
});
