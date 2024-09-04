import type { Context } from '@azure/functions';
import { ServiceRoleEnum, SimpleAnnouncementType, type NotifierTypeEnum } from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';
import { BaseHandler } from '../base.handler';

import { HandlersHelper } from '../../_helpers/handlers.helper';

export class NewAnnouncementHandler extends BaseHandler<
  NotifierTypeEnum.NEW_ANNOUNCEMENT,
  'AP10_NEW_ANNOUNCEMENT' | 'AP11_NEW_ANNOUNCEMENT_WITH_INNOVATIONS_NAME'
> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.NEW_ANNOUNCEMENT],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    const usersWithoutInnovation = await this.recipientsService.getAnnouncementUsers(this.inputData.announcementId);
    const usersWithInnovationsNames = await this.recipientsService.getAnnouncementUsersWithInnovationsNames(
      this.inputData.announcementId
    );
    const announcement = await this.recipientsService.getAnnouncementInfo(this.inputData.announcementId);

    if (usersWithoutInnovation.length > 0) {
      await this.AP10_NEW_ANNOUNCEMENT(usersWithoutInnovation, announcement);
    }
    if (usersWithInnovationsNames && usersWithInnovationsNames.size > 0) {
      await this.AP11_NEW_ANNOUNCEMENT_WITH_INNOVATIONS_NAME(usersWithInnovationsNames, announcement);
    }
    return this;
  }

  private async AP10_NEW_ANNOUNCEMENT(users: string[], announcement: SimpleAnnouncementType): Promise<void> {
    const batchSize = 1000;
    const chunkArray = (arr: string[], size: number): string[][] => {
      const chunks = [];
      for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
      }
      return chunks;
    };

    const userChunks = chunkArray(users, batchSize);

    for (const userChunk of userChunks) {
      const recipients = await this.recipientsService.getUsersRecipient(userChunk, [
        ServiceRoleEnum.ACCESSOR,
        ServiceRoleEnum.QUALIFYING_ACCESSOR,
        ServiceRoleEnum.ASSESSMENT,
        ServiceRoleEnum.INNOVATOR
      ]);

      this.addEmails('AP10_NEW_ANNOUNCEMENT', recipients, {
        notificationPreferenceType: 'ANNOUNCEMENTS',
        params: {
          announcement_title: announcement.title,
          announcement_body: announcement.params?.content ?? '',
          announcement_url: announcement.params.link
            ? `[${announcement.params.link.label}](${announcement.params.link.url})`
            : ''
        }
      });
    }
  }

  private async AP11_NEW_ANNOUNCEMENT_WITH_INNOVATIONS_NAME(
    usersAndInnovationNames: Map<string, string[]>,
    announcement: SimpleAnnouncementType
  ): Promise<void> {
    const allRecipients = await this.recipientsService.getUsersRecipient(
      Array.from(usersAndInnovationNames.keys()),
      ServiceRoleEnum.INNOVATOR
    );
    for (const [userId, innovationNames] of usersAndInnovationNames.entries()) {
      //TODO: Change this to a get to make sure this run at O(1) time complexity
      const recipients = allRecipients.filter(r => r.userId === userId);
      this.addEmails('AP11_NEW_ANNOUNCEMENT_WITH_INNOVATIONS_NAME', recipients, {
        notificationPreferenceType: 'ANNOUNCEMENTS',
        params: {
          announcement_title: announcement.title,
          innovations_name: HandlersHelper.formatStringArray(innovationNames),
          announcement_body: announcement.params?.content ?? '',
          announcement_url: announcement.params.link
            ? `[${announcement.params.link.label}](${announcement.params.link.url})`
            : ''
        }
      });
    }
  }
}
