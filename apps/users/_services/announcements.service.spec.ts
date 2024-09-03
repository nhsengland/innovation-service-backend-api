import { container } from '../_config';

import { TestsHelper } from '@users/shared/tests';
import SYMBOLS from './symbols';
import type { EntityManager } from 'typeorm';
import type { AnnouncementsService } from './announcements.service';
import { AnnouncementUserEntity } from '@users/shared/entities';
import { randUuid } from '@ngneat/falso';
import { DTOsHelper } from '@users/shared/tests/helpers/dtos.helper';
import { AnnouncementErrorsEnum, NotFoundError } from '@users/shared/errors';

describe('Users / _services / announcements service suite', () => {
  let sut: AnnouncementsService;

  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  let em: EntityManager;

  beforeAll(async () => {
    sut = container.get<AnnouncementsService>(SYMBOLS.AnnouncementsService);
    await testsHelper.init();
  });

  beforeEach(async () => {
    em = await testsHelper.getQueryRunnerEntityManager();
  });

  afterEach(async () => {
    await testsHelper.releaseQueryRunnerEntityManager();
  });

  describe('getUserRoleAnnouncements', () => {
    it('should list all announcements for the given roleId', async () => {
      const announcement = scenario.announcements.announcementForSpecificInnovations;
      const result = await sut.getUserRoleAnnouncements(scenario.users.johnInnovator.roles.innovatorRole.id, {}, em);

      expect(result).toMatchObject([
        {
          id: announcement.id,
          title: announcement.title,
          params: announcement.params,
          startsAt: new Date(announcement.startsAt),
          ...(announcement.expiresAt && { expiresAt: new Date(announcement.expiresAt) })
        }
      ]);
    });

    it('should return an empty array when there are no announcements for the given roleId', async () => {
      const result = await sut.getUserRoleAnnouncements(randUuid(), {}, em);
      expect(result).toHaveLength(0);
    });
  });

  describe('readUserAnnouncement', () => {
    it('should read the announcement', async () => {
      // create announcement
      const announcement = scenario.announcements.announcementForQAs;

      await sut.readUserAnnouncement(
        DTOsHelper.getUserRequestContext(scenario.users.bartQualifyingAccessor),
        announcement.id,
        em
      );

      const dbAnnouncementUser = await em
        .createQueryBuilder(AnnouncementUserEntity, 'au')
        .select(['au.readAt'])
        .where('au.announcement_id = :announcementId', { announcementId: announcement.id })
        .andWhere('au.user_id = :userId', { userId: scenario.users.bartQualifyingAccessor.id })
        .getOne();

      expect(dbAnnouncementUser?.readAt).toBeTruthy();
    });

    it(`should throw an error if the announcement doesn't exist`, async () => {
      await expect(() =>
        sut.readUserAnnouncement(DTOsHelper.getUserRequestContext(scenario.users.adamInnovator), randUuid(), em)
      ).rejects.toThrow(new NotFoundError(AnnouncementErrorsEnum.ANNOUNCEMENT_NOT_FOUND));
    });
  });
});
