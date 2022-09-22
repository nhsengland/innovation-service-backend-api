import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { BaseEntity } from '../base.entity';

import { InnovationEntity } from '../innovation/innovation.entity';


@Entity('innovation_user_test')
export class InnovationUserTestEntity extends BaseEntity {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  kind: string;

  @Column({ nullable: true })
  feedback: string;


  @ManyToOne(() => InnovationEntity, { nullable: false })
  @JoinColumn({ name: 'innovation_id' })
  innovation: InnovationEntity;


  static new(data: Partial<InnovationUserTestEntity>): InnovationUserTestEntity {
    const instance = new InnovationUserTestEntity();
    Object.assign(instance, data);
    return instance;
  }

}
