import azureFunction from '.';

import { TestsHelper } from '@admin/shared/tests';
import { AnnouncementsService } from '../_services/announcements.service';
import { AnnouncementEntity } from '@admin/shared/entities';
import { randUuid } from '@ngneat/falso';

const testsHelper = new TestsHelper();

beforeAll(async () => {
  await testsHelper.init();
});

const getAnnouncementsToActiveMock = jest
  .spyOn(AnnouncementsService.prototype, 'getAnnouncementsToActivate')
  .mockResolvedValue([AnnouncementEntity.new({ id: randUuid() }), AnnouncementEntity.new({ id: randUuid() })]);
const activateAnnouncementMock = jest.spyOn(AnnouncementsService.prototype, 'activateAnnouncement').mockResolvedValue();
const expireAnnouncements = jest.spyOn(AnnouncementsService.prototype, 'expireAnnouncements').mockResolvedValue(1);

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-announcements-scheduler-cron', () => {
  it('should activate the pending announcements', async () => {
    await azureFunction();
    expect(getAnnouncementsToActiveMock).toHaveBeenCalledTimes(1);
    expect(activateAnnouncementMock).toHaveBeenCalledTimes(2);
    expect(expireAnnouncements).toHaveBeenCalledTimes(1);
  });
});
