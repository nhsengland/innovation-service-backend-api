import { TestsHelper } from '@admin/shared/tests';

import { container } from '../_config';
import SYMBOLS from './symbols';
import { AnnouncementsService } from './announcements.service';
import {
  AnnouncementEntity,
  AnnouncementUserEntity,
  InnovationDocumentEntity,
  UserEntity,
  InnovationCollaboratorEntity
} from '@admin/shared/entities';
import { randFutureDate, randPastDate, randText, randUuid } from '@ngneat/falso';
import {
  AnnouncementStatusEnum,
  AnnouncementTypeEnum,
  InnovationCollaboratorStatusEnum,
  ServiceRoleEnum
} from '@admin/shared/enums';
import {
  AnnouncementErrorsEnum,
  BadRequestError,
  NotFoundError,
  UnprocessableEntityError,
  ConflictError
} from '@admin/shared/errors';
import { DTOsHelper } from '@admin/shared/tests/helpers/dtos.helper';
import type { EntityManager } from 'typeorm';
import { NotifierService } from '@admin/shared/services';

describe('Admin / _services / announcements service suite', () => {
  let sut: AnnouncementsService;

  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  const updateStatusMock = jest.spyOn(AnnouncementsService.prototype as any, 'updateAnnouncementStatus');
  const notifierSendSpy = jest.spyOn(NotifierService.prototype, 'sendSystemNotification').mockResolvedValue(true);

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
    jest.clearAllMocks();
  });

  describe('getAnnouncementsList', () => {
    it('should get the list of announcements', async () => {
      const result = await sut.getAnnouncementsList({ take: 3, skip: 0, order: {} }, em);

      const qaAnnouncement = scenario.announcements.announcementForQAs;
      const specificInnovationAnnouncement = scenario.announcements.announcementForSpecificInnovations;
      const naScheduledAnnouncement = scenario.announcements.announcementForNAScheduled;

      expect(result).toMatchObject({
        count: 3,
        data: [
          {
            id: naScheduledAnnouncement.id,
            title: naScheduledAnnouncement.title,
            userRoles: naScheduledAnnouncement.userRoles,
            params: naScheduledAnnouncement.params,
            startsAt: new Date(naScheduledAnnouncement.startsAt),
            expiresAt: null,
            status: naScheduledAnnouncement.status
          },
          {
            id: specificInnovationAnnouncement.id,
            title: specificInnovationAnnouncement.title,
            userRoles: specificInnovationAnnouncement.userRoles,
            params: specificInnovationAnnouncement.params,
            startsAt: new Date(specificInnovationAnnouncement.startsAt),
            expiresAt: specificInnovationAnnouncement.expiresAt
              ? new Date(specificInnovationAnnouncement.expiresAt)
              : null,
            status: specificInnovationAnnouncement.status
          },
          {
            id: qaAnnouncement.id,
            title: qaAnnouncement.title,
            userRoles: qaAnnouncement.userRoles,
            params: qaAnnouncement.params,
            startsAt: new Date(qaAnnouncement.startsAt),
            expiresAt: qaAnnouncement.expiresAt ? new Date(qaAnnouncement.expiresAt) : null,
            status: qaAnnouncement.status
          }
        ]
      });
    });
  });

  describe('getAnnouncementInfo', () => {
    it('should get the announcement info', async () => {
      const announcement = scenario.announcements.announcementForQAs;
      const result = await sut.getAnnouncementInfo(announcement.id, em);

      expect(result).toMatchObject({
        id: announcement.id,
        title: announcement.title,
        userRoles: announcement.userRoles,
        params: announcement.params,
        startsAt: new Date(announcement.startsAt),
        ...(announcement.expiresAt && { expiresAt: new Date(announcement.expiresAt) }),
        status: announcement.status,
        type: announcement.type
      });
    });

    it(`should throw an error if the announcement doesn't exist`, async () => {
      await expect(() => sut.getAnnouncementInfo(randUuid())).rejects.toThrow(
        new NotFoundError(AnnouncementErrorsEnum.ANNOUNCEMENT_NOT_FOUND)
      );
    });
  });

  describe('createAnnouncement', () => {
    it('should create an announcement', async () => {
      const announcementParams = {
        title: randText({ charCount: 10 }),
        userRoles: [ServiceRoleEnum.INNOVATOR],
        params: { content: randText() },
        startsAt: randFutureDate(),
        type: AnnouncementTypeEnum.LOG_IN
      };

      const result = await sut.createAnnouncement(
        DTOsHelper.getUserRequestContext(scenario.users.allMighty),
        announcementParams,
        undefined,
        em
      );

      expect(result.id).toBeDefined();
    });

    it('should exclude specified users from the announcement', async () => {
      const announcementParams = {
        title: randText({ charCount: 10 }),
        userRoles: [ServiceRoleEnum.QUALIFYING_ACCESSOR],
        params: { content: randText() },
        startsAt: new Date(),
        type: AnnouncementTypeEnum.LOG_IN
      };

      const result = await sut.createAnnouncement(
        DTOsHelper.getUserRequestContext(scenario.users.allMighty),
        announcementParams,
        { usersToExclude: [scenario.users.aliceQualifyingAccessor.id] },
        em
      );

      const dbAnnouncementUser = await em
        .createQueryBuilder(AnnouncementUserEntity, 'au')
        .where('au.announcement_id = :announcementId', { announcementId: result.id })
        .andWhere('au.user_id = :userId', { userId: scenario.users.aliceQualifyingAccessor.id })
        .getOne();

      expect(result).toBeDefined();
      expect(dbAnnouncementUser?.readAt).toBeTruthy();
    });

    it('should throw an error if no target roles are speficifed', async () => {
      const announcementParams = {
        title: randText({ charCount: 10 }),
        userRoles: [],
        params: { content: randText() },
        startsAt: randFutureDate(),
        type: AnnouncementTypeEnum.LOG_IN
      };

      await expect(() =>
        sut.createAnnouncement(
          DTOsHelper.getUserRequestContext(scenario.users.allMighty),
          announcementParams,
          undefined,
          em
        )
      ).rejects.toThrow(new BadRequestError(AnnouncementErrorsEnum.ANNOUNCEMENT_NO_TARGET_ROLES));
    });
  });

  describe('updateAnnouncement', () => {
    it('should update an announcement', async () => {
      const announcement = await em.getRepository(AnnouncementEntity).save({
        title: randText({ charCount: 10 }),
        userRoles: [ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR],
        params: { content: randText() },
        startsAt: randFutureDate(),
        expiresAt: null,
        type: AnnouncementTypeEnum.LOG_IN
      });

      const updatedAnnouncementParams = {
        title: randText({ charCount: 10 }),
        userRoles: [ServiceRoleEnum.INNOVATOR],
        params: { content: randText() },
        startsAt: new Date(),
        type: AnnouncementTypeEnum.LOG_IN
      };

      await sut.updateAnnouncement(
        DTOsHelper.getUserRequestContext(scenario.users.allMighty),
        announcement.id,
        updatedAnnouncementParams,
        em
      );

      const dbAnnouncement = await em
        .createQueryBuilder(AnnouncementEntity, 'announcement')
        .where('announcement.id = :announcementId', { announcementId: announcement.id })
        .getOne();

      expect(dbAnnouncement?.title).toBe(updatedAnnouncementParams.title);
      expect(dbAnnouncement?.userRoles).toMatchObject([ServiceRoleEnum.INNOVATOR]);
      expect(dbAnnouncement?.startsAt).toStrictEqual(new Date(updatedAnnouncementParams.startsAt));
    });

    it('should throw an error if the announcement is in DONE status', async () => {
      const announcement = await em.getRepository(AnnouncementEntity).save({
        title: randText({ charCount: 10 }),
        userRoles: [ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR],
        params: { content: randText() },
        startsAt: randPastDate(),
        expiresAt: randPastDate()
      });

      const updatedAnnouncementParams = {
        title: randText({ charCount: 10 })
      };

      await expect(() =>
        sut.updateAnnouncement(
          DTOsHelper.getUserRequestContext(scenario.users.allMighty),
          announcement.id,
          updatedAnnouncementParams,
          em
        )
      ).rejects.toThrow(
        new UnprocessableEntityError(AnnouncementErrorsEnum.ANNOUNCEMENT_CANT_BE_UPDATED_IN_DONE_STATUS)
      );
    });

    it('should throw an error if the announcement is in SCHEDULEDED status and new expiration date is before activation date', async () => {
      const announcement = await em.getRepository(AnnouncementEntity).save({
        title: randText({ charCount: 10 }),
        userRoles: [ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR],
        params: { content: randText() },
        startsAt: randFutureDate(),
        expiresAt: null
      });

      const updatedAnnouncementParams = {
        expiresAt: randPastDate()
      };

      await expect(() =>
        sut.updateAnnouncement(
          DTOsHelper.getUserRequestContext(scenario.users.allMighty),
          announcement.id,
          updatedAnnouncementParams,
          em
        )
      ).rejects.toThrow(
        new UnprocessableEntityError(AnnouncementErrorsEnum.ANNOUNCEMENT_INVALID_PAYLOAD_FOR_THE_CUR_STATUS)
      );
    });

    it('should throw an error if the announcement is in ACTIVE status and arguments other than expiration date are passed', async () => {
      const announcement = await em.getRepository(AnnouncementEntity).save({
        title: randText({ charCount: 10 }),
        userRoles: [ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR],
        params: { content: randText() },
        startsAt: randPastDate(),
        expiresAt: null
      });

      const updatedAnnouncementParams = {
        title: randText({ charCount: 10 })
      };

      await expect(() =>
        sut.updateAnnouncement(
          DTOsHelper.getUserRequestContext(scenario.users.allMighty),
          announcement.id,
          updatedAnnouncementParams,
          em
        )
      ).rejects.toThrow(
        new UnprocessableEntityError(AnnouncementErrorsEnum.ANNOUNCEMENT_INVALID_PAYLOAD_FOR_THE_CUR_STATUS)
      );
    });

    it('should throw an error if the announcement is in ACTIVE status and new expiration date is before activation date', async () => {
      const announcement = await em.getRepository(AnnouncementEntity).save({
        title: randText({ charCount: 10 }),
        userRoles: [ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR],
        params: { content: randText() },
        startsAt: randPastDate(),
        expiresAt: null
      });

      const updatedAnnouncementParams = {
        expiresAt: new Date(announcement.startsAt.getDate() - 2)
      };

      await expect(() =>
        sut.updateAnnouncement(
          DTOsHelper.getUserRequestContext(scenario.users.allMighty),
          announcement.id,
          updatedAnnouncementParams,
          em
        )
      ).rejects.toThrow(
        new UnprocessableEntityError(AnnouncementErrorsEnum.ANNOUNCEMENT_INVALID_PAYLOAD_FOR_THE_CUR_STATUS)
      );
    });

    it(`should throw an error if the announcement doesn't exist`, async () => {
      await expect(() =>
        sut.updateAnnouncement(DTOsHelper.getUserRequestContext(scenario.users.allMighty), randUuid(), {}, em)
      ).rejects.toThrow(new NotFoundError(AnnouncementErrorsEnum.ANNOUNCEMENT_NOT_FOUND));
    });
  });

  // TODO: Add a test to check if announcement_users that didn't read are deleted.
  describe('deleteAnnouncement', () => {
    const adminContext = DTOsHelper.getUserRequestContext(scenario.users.allMighty);
    it('should delete an announcement', async () => {
      const announcement = await em.getRepository(AnnouncementEntity).save({
        title: randText({ charCount: 10 }),
        userRoles: [ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR],
        params: { content: randText() },
        startsAt: randPastDate(),
        expiresAt: null
      });

      await sut.deleteAnnouncement(adminContext, announcement.id, em);

      const dbAnnouncement = await em
        .createQueryBuilder(AnnouncementEntity, 'announcement')
        .where('announcement.id = :announcementId', { announcementId: announcement.id })
        .getOneOrFail();

      expect(dbAnnouncement.status).toBe(AnnouncementStatusEnum.DELETED);
    });

    it('should throw an error if the announcement is in DONE status', async () => {
      const announcement = await em.getRepository(AnnouncementEntity).save({
        title: randText({ charCount: 10 }),
        userRoles: [ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR],
        params: { content: randText() },
        startsAt: randPastDate(),
        expiresAt: randPastDate(),
        status: AnnouncementStatusEnum.DONE
      });

      await expect(() => sut.deleteAnnouncement(adminContext, announcement.id, em)).rejects.toThrow(
        new ConflictError(AnnouncementErrorsEnum.ANNOUNCEMENT_INVALID_UPDATE_STATUS)
      );
    });

    it(`should throw an error if the announcement doesn't exist`, async () => {
      await expect(() => sut.deleteAnnouncement(adminContext, randUuid(), em)).rejects.toThrow(
        new NotFoundError(AnnouncementErrorsEnum.ANNOUNCEMENT_NOT_FOUND)
      );
    });
  });

  describe('activateAnnouncement', () => {
    const admin = scenario.users.allMighty;

    it('should activate a non filtered announcement and send email', async () => {
      const announcement = scenario.announcements.announcementForQAs;

      await em.delete(AnnouncementUserEntity, { announcement: { id: announcement.id } });

      await sut.activateAnnouncement(admin.id, announcement.id, {}, em);

      const affectedUsersCount = await em
        .createQueryBuilder(AnnouncementUserEntity, 'au')
        .where('au.announcement = :announcementId', { announcementId: announcement.id })
        .andWhere('au.readAt IS NULL')
        .getCount();

      const qasCount = await em
        .createQueryBuilder(UserEntity, 'u')
        .innerJoin('u.serviceRoles', 'r', 'r.role = :qaRole AND r.isActive = 1', {
          qaRole: ServiceRoleEnum.QUALIFYING_ACCESSOR
        })
        .getCount();

      expect(affectedUsersCount).toBe(qasCount);
      expect(updateStatusMock).toHaveBeenCalledTimes(0);
      expect(notifierSendSpy).toHaveBeenCalledTimes(1);
    });

    it('should activate a filtered announcement', async () => {
      const announcement = scenario.announcements.announcementForSpecificInnovations;
      await em.delete(AnnouncementUserEntity, { announcement: { id: announcement.id } });

      await sut.activateAnnouncement(admin.id, announcement.id, {}, em);

      const affectedUsersCount = await em
        .createQueryBuilder(AnnouncementUserEntity, 'au')
        .where('au.announcement = :announcementId', { announcementId: announcement.id })
        .andWhere('au.readAt IS NULL')
        .getCount();

      const documents = await em
        .createQueryBuilder(InnovationDocumentEntity, 'document')
        .select(['document.id', 'innovation.id'])
        .innerJoin('document.innovation', 'innovation')
        .where(`JSON_QUERY(document.document, '$.INNOVATION_DESCRIPTION.areas') LIKE '%COVID_19%'`)
        .andWhere('innovation.submittedAt IS NOT NULL')
        .getMany();

      const collaboratorsCount = await em
        .createQueryBuilder(InnovationCollaboratorEntity, 'c')
        .where('c.innovation_id IN (:...innovations)', { innovations: documents.map(d => d.innovation.id) })
        .andWhere('c.status = :active', { active: InnovationCollaboratorStatusEnum.ACTIVE })
        .getCount();

      expect(affectedUsersCount).toBe(documents.length + collaboratorsCount);
      expect(updateStatusMock).toHaveBeenCalledTimes(0);
    });

    it('should update the status is not ACTIVE yet', async () => {
      const announcement = scenario.announcements.announcementForQAs;
      await em.update(AnnouncementEntity, { id: announcement.id }, { status: AnnouncementStatusEnum.SCHEDULED });

      await sut.activateAnnouncement(admin.id, announcement.id, {}, em);

      expect(updateStatusMock).toHaveBeenCalledTimes(1);
    });

    it('should delete announcement when all the filters are invalid', async () => {
      const announcement = scenario.announcements.announcementForSpecificInnovations;

      await em.update(
        AnnouncementEntity,
        { id: announcement.id },
        { filters: [{ section: 'INNOVATION_DESCRIPTION', question: 'INVALID_QUESTION', answers: ['COVID_19'] }] }
      );

      await sut.activateAnnouncement(admin.id, announcement.id, {}, em);

      const dbAnnouncement = await em
        .createQueryBuilder(AnnouncementEntity, 'a')
        .select(['a.id', 'a.status'])
        .where('a.id = :announcementId', { announcementId: announcement.id })
        .getOneOrFail();

      expect(updateStatusMock).toHaveBeenCalledTimes(1);
      expect(dbAnnouncement.status).toBe(AnnouncementStatusEnum.DELETED);
    });
  });

  describe('getAnnouncementsToActivate', () => {
    it('should return the announcements to be activated today', async () => {
      const announcements = await sut.getAnnouncementsToActivate(em);
      expect(announcements.map(a => a.id)).toStrictEqual([scenario.announcements.announcementForNAScheduled.id]);
    });
  });

  describe('expireAnnouncements', () => {
    it('should change the announcement to done when it expires', async () => {
      const announcement = scenario.announcements.announcementForQAs;
      await em.update(AnnouncementEntity, { id: announcement.id }, { expiresAt: randPastDate() });
      const expired = await sut.expireAnnouncements(em);

      const dbAnnouncement = await em
        .createQueryBuilder(AnnouncementEntity, 'a')
        .select(['a.id', 'a.status'])
        .where('a.id = :announcementId', { announcementId: announcement.id })
        .getOneOrFail();

      expect(expired).toBe(1);
      expect(dbAnnouncement.status).toBe(AnnouncementStatusEnum.DONE);
    });
  });
});
