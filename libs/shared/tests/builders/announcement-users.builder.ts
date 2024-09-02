import { AnnouncementEntity, AnnouncementUserEntity, InnovationEntity, UserEntity } from '../../entities/';
import type { EntityManager } from 'typeorm';
import { BaseBuilder } from './base.builder';

export type TestAnnouncementUserType = {
  id: string;
  userId: UserEntity;
  innovationId: null | InnovationEntity;
};

export class AnnouncementUserBuilder extends BaseBuilder {
  private announcementUser: AnnouncementUserEntity;

  constructor(entityManager: EntityManager) {
    super(entityManager);

    this.announcementUser = new AnnouncementUserEntity();
  }

  setUserAndInnovation(user: string, innovation: null | string): this {
    this.announcementUser.user = UserEntity.new({ id: user });
    this.announcementUser.innovation = innovation ? InnovationEntity.new({ id: innovation }) : null;
    return this;
  }

  setAnnouncement(announcementId: string): this {
    const announcement = AnnouncementEntity.new({ id: announcementId });

    this.announcementUser.announcement = announcement;

    return this;
  }

  async save(): Promise<TestAnnouncementUserType> {
    if (!this.announcementUser.user || !this.announcementUser.announcement) {
      throw new Error('User needs to be associated to an announcement and a user');
    }
    const savedAnnouncementUser = await this.getEntityManager()
      .getRepository(AnnouncementUserEntity)
      .save(this.announcementUser);

    const result = await this.getEntityManager()
      .createQueryBuilder(AnnouncementUserEntity, 'announcementUser')
      .innerJoinAndSelect('announcementUser.user', 'user')
      .leftJoinAndSelect('announcementUser.innovation', 'innovation')
      .where('announcementUser.id = :id', { id: savedAnnouncementUser.id })
      .getOne();

    if (!result) {
      throw new Error('Error saving/retrieving announcement users information.');
    }

    return { id: result.id, userId: result.user, innovationId: result.innovation };
  }
}
