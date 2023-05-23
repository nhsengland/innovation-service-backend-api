import { randCountry, randProduct } from '@ngneat/falso';
import type { EntityManager } from 'typeorm';

import { InnovationStatusEnum, InnovationTransferStatusEnum } from '../../enums/innovation.enums';
import { InnovationEntity } from '../../entities/innovation/innovation.entity';
import { InnovationTransferEntity } from '../../entities/innovation/innovation-transfer.entity';
import { UserEntity } from '../../entities/user/user.entity';
import { NotFoundError } from '../../errors/errors.config';
import { UserErrorsEnum } from '../../errors/errors.enums';

import { BaseBuilder } from './base.builder';

export type TestInnovationType = {
  id: string;
  name: string;
  ownerId: string;
  transfers: { id: string; email: string; status: InnovationTransferStatusEnum }[];
};

export class InnovationBuilder extends BaseBuilder {
  private innovation: InnovationEntity;

  constructor(entityManager: EntityManager) {
    super(entityManager);

    this.innovation = InnovationEntity.new({
      name: randProduct().title,
      countryName: randCountry(),
      status: InnovationStatusEnum.CREATED,
      assessments: [],
      transfers: []
    });
  }

  setOwner(userId: string): this {
    this.innovation.owner = UserEntity.new({ id: userId });
    return this;
  }

  setStatus(status: InnovationStatusEnum): this {
    this.innovation.status = status;
    return this;
  }

  addTransfer(email: string, status?: InnovationTransferStatusEnum): this {
    this.innovation.transfers.push(
      InnovationTransferEntity.new({
        email: email,
        status: status ?? InnovationTransferStatusEnum.PENDING
      })
    );
    return this;
  }

  async save(): Promise<TestInnovationType> {
    if (!this.innovation.owner) {
      throw new NotFoundError(UserErrorsEnum.USER_SQL_NOT_FOUND);
    }

    const savedInnovation = await this.getEntityManager().getRepository(InnovationEntity).save(this.innovation);

    const result = await this.getEntityManager()
      .createQueryBuilder(InnovationEntity, 'innovation')
      .innerJoinAndSelect('innovation.owner', 'owner')
      .leftJoinAndSelect('innovation.transfers', 'transfers')
      .where('innovation.id = :id', { id: savedInnovation.id })
      .getOne();
    if (!result) {
      throw new Error('Error saving/retriving innovation information.');
    }

    this.innovation = result;

    return {
      id: this.innovation.id,
      name: this.innovation.name,
      ownerId: this.innovation.owner?.id,
      transfers: this.innovation.transfers.map(item => ({
        id: item.id,
        email: item.email,
        status: item.status
      }))
    };
  }
}
