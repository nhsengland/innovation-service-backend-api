import { Column, OneToMany, ViewColumn, ViewEntity } from 'typeorm';
import type { InnovationStatusEnum } from '../../enums';
import type {
  catalogCareSettings,
  catalogCategory,
  catalogInvolvedAACProgrammes,
  catalogKeyHealthInequalities
} from '../../schemas/innovation-record/202304/catalog.types';
import { InnovationSupportEntity } from '../innovation/innovation-support.entity';

@ViewEntity('innovation_list_view')
export class InnovationListView {
  @ViewColumn()
  id: string;

  @ViewColumn()
  name: string;

  // make relation?, should it be identity?
  @ViewColumn({ name: 'owner_id' })
  ownerId: string;

  @ViewColumn({ name: 'submitted_at' })
  submittedAt: Date | null;

  @ViewColumn({ name: 'updated_at' })
  updatedAt: Date | null;

  @ViewColumn()
  status: InnovationStatusEnum;

  @ViewColumn({ name: 'country_name' })
  countryName: string;

  @ViewColumn({ name: 'main_category' })
  mainCategory: catalogCategory;

  @Column({ type: 'simple-json' })
  categories: catalogCategory[];

  @Column({ name: 'care_settings', type: 'simple-json' })
  careSettings: catalogCareSettings[];

  @Column({ name: 'involved_aac_programmes', type: 'simple-json' })
  involvedAACProgrammes: catalogInvolvedAACProgrammes[];

  @Column({ name: 'diseases_and_conditions', type: 'simple-json' })
  diseasesAndConditions: string[];

  @Column({ name: 'key_health_inequalities', type: 'simple-json' })
  keyHealthInequalities: catalogKeyHealthInequalities[];

  @Column({ name: 'engaging_units', type: 'simple-json' })
  engagingUnits: { unit_id: string; name: string; acronym: string }[];

  @Column({ name: 'suggested_units', type: 'simple-json' })
  suggestedUnits: { unit_id: string; name: string; acronym: string }[];

  @OneToMany(() => InnovationSupportEntity, record => record.innovation)
  supports: InnovationSupportEntity[];
}
