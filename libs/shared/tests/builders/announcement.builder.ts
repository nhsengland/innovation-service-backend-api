import { EntityManager } from 'typeorm';
import { AnnouncementEntity, AnnouncementUserEntity } from '../../entities';
import { randFutureDate, randPastDate, randText, randUrl } from '@ngneat/falso';
import { AnnouncementParamsType, AnnouncementTypeEnum, ServiceRoleEnum } from '../../enums';
import { BaseBuilder } from './base.builder';
import { AnnouncementUserBuilder } from './announcement-users.builder';

export type TestAnnouncementType = {
  id: string;
  title: string;
  userRoles: ServiceRoleEnum[];
  params: AnnouncementParamsType;
  startsAt: Date;
  expiresAt: null | Date;
  type: AnnouncementTypeEnum;
  sendEmail: boolean;
  announcementUsers: { [key: string]: AnnouncementUserBuilder };
};

export class AnnouncementBuilder extends BaseBuilder {
  private announcement: AnnouncementEntity;

  constructor(entityManager: EntityManager) {
    super(entityManager);

    this.announcement = AnnouncementEntity.new({
      title: randText(),
      userRoles: [ServiceRoleEnum.INNOVATOR],
      params: {
        content: randText(),
        link: { label: randText(), url: randUrl() }
      },
      startsAt: randPastDate(),
      expiresAt: randFutureDate(),
      type: AnnouncementTypeEnum.HOMEPAGE,
      sendEmail: true
    });
  }

  setTitle(title: string): this {
    this.announcement.title = title;
    return this;
  }

  setContent(content: string): this {
    this.announcement.params.content = content;
    return this;
  }

  setLink(label: string, url: string): this {
    this.announcement.params.link = { label, url };
    return this;
  }

  setUserRoles(userRoles: ServiceRoleEnum[]): this {
    this.announcement.userRoles = userRoles;
    return this;
  }

  setStartsAt(date: Date): this {
    this.announcement.startsAt = date;
    return this;
  }

  setExpiresAt(date: Date): this {
    this.announcement.expiresAt = date;
    return this;
  }

  setType(type: AnnouncementTypeEnum): this {
    this.announcement.type = type;
    return this;
  }

  setSendEmail(sendEmail: boolean): this {
    this.announcement.sendEmail = sendEmail;
    return this;
  }

  setAnnouncementUsers(announcementUsers: AnnouncementUserEntity[]): this {
    this.announcement.announcementUsers = announcementUsers;
    return this;
  }

  async save(): Promise<TestAnnouncementType> {
    const savedAnnouncement = await this.getEntityManager().getRepository(AnnouncementEntity).save(this.announcement);

    const result = await this.getEntityManager()
      .createQueryBuilder(AnnouncementEntity, 'announcement')
      .where('announcement.id = :announcementId', { announcementId: savedAnnouncement.id })
      .getOne();

    if (!result) {
      throw new Error(`Error saving/retrieving announcement information.`);
    }

    return {
      id: result.id,
      title: result.title,
      userRoles: result.userRoles,
      params: {
        content: result.params.content,
        link: { label: result.params.link?.label || '', url: result.params.link?.url || '' }
      },
      startsAt: result.startsAt,
      expiresAt: result.expiresAt,
      type: result.type,
      sendEmail: result.sendEmail,
      announcementUsers: {}
    };
  }
}
