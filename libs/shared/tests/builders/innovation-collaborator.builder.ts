import type { EntityManager } from 'typeorm';
import { InnovationCollaboratorEntity } from '../../entities/innovation/innovation-collaborator.entity';
import { InnovationCollaboratorStatusEnum } from '../../enums/innovation.enums';
import { BaseBuilder } from './base.builder';
import { UserEntity } from '../../entities/user/user.entity';
import { InnovationEntity } from '../../entities/innovation/innovation.entity';
import { randEmail, randPastDate } from '@ngneat/falso';

export type TestCollaboratorType = {
  id: string;
  status: InnovationCollaboratorStatusEnum;
};

export class InnovationCollaboratorBuilder extends BaseBuilder {
  private collaborator: InnovationCollaboratorEntity;

  constructor(entityManager: EntityManager) {
    super(entityManager);

    this.collaborator = InnovationCollaboratorEntity.new({
      status: InnovationCollaboratorStatusEnum.ACTIVE,
      email: randEmail(),
      invitedAt: randPastDate()
    });
  }

  setUser(userId: string): this {
    this.collaborator.user = UserEntity.new({ id: userId });
    return this;
  }

  setStatus(status: InnovationCollaboratorStatusEnum): this {
    this.collaborator.status = status;
    return this;
  }

  setInnovation(innovationId: string): this {
    this.collaborator.innovation = InnovationEntity.new({ id: innovationId });
    return this;
  }

  async save(): Promise<TestCollaboratorType> {
    const savedCollaborator = await this.getEntityManager()
      .getRepository(InnovationCollaboratorEntity)
      .save(this.collaborator);

    const result = await this.getEntityManager()
      .createQueryBuilder(InnovationCollaboratorEntity, 'collaborator')
      .where('collaborator.id = :collabId', { collabId: savedCollaborator.id })
      .getOne();

    if (!result) {
      throw new Error('Error saving/retriving collaborator information.');
    }

    return {
      id: result.id,
      status: result.status
    };
  }
}
