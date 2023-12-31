import { Column, OneToMany, PrimaryColumn, ViewColumn, ViewEntity } from 'typeorm';
import type { InnovationGroupedStatusEnum, InnovationStatusEnum } from '../../enums';
import type {
  catalogCareSettings,
  catalogCategory,
  catalogInvolvedAACProgrammes,
  catalogKeyHealthInequalities
} from '../../schemas/innovation-record/202304/catalog.types';
import { InnovationSupportEntity } from '../innovation/innovation-support.entity';

@ViewEntity('innovation_list_view')
export class InnovationListView {
  @PrimaryColumn() // Primary column is required for ViewEntity to work properly with pagination
  id: string;

  @ViewColumn()
  name: string;

  @ViewColumn({ name: 'owner_id' })
  ownerId: string | null;

  @ViewColumn({ name: 'owner_company_name' })
  ownerCompanyName: string | null;

  @ViewColumn({ name: 'submitted_at' })
  submittedAt: Date | null;

  @ViewColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ViewColumn()
  status: InnovationStatusEnum;

  @ViewColumn({ name: 'grouped_status' })
  groupedStatus: InnovationGroupedStatusEnum;

  @ViewColumn({ name: 'country_name' })
  countryName: string;

  @ViewColumn()
  postcode: string;

  @ViewColumn({ name: 'main_category' })
  mainCategory: catalogCategory;

  @ViewColumn({ name: 'other_category_description' })
  otherCategoryDescription: string | null;

  @Column({ type: 'simple-json' })
  categories: catalogCategory[] | null;

  @Column({ name: 'care_settings', type: 'simple-json' })
  careSettings: catalogCareSettings[] | null;

  @Column({ name: 'other_care_setting' })
  otherCareSetting: string | null;

  @Column({ name: 'involved_aac_programmes', type: 'simple-json' })
  involvedAACProgrammes: catalogInvolvedAACProgrammes[] | null;

  @Column({ name: 'diseases_and_conditions', type: 'simple-json' })
  diseasesAndConditions: string[] | null;

  @Column({ name: 'key_health_inequalities', type: 'simple-json' })
  keyHealthInequalities: catalogKeyHealthInequalities[] | null;

  @Column({ name: 'engaging_organisations', type: 'simple-json' })
  engagingOrganisations: { organisationId: string; name: string; acronym: string }[] | null;

  @Column({ name: 'engaging_units', type: 'simple-json' })
  engagingUnits: { unitId: string; name: string; acronym: string }[] | null;

  @Column({ name: 'suggested_units', type: 'simple-json' })
  suggestedUnits: { unitId: string; name: string; acronym: string }[] | null;

  @OneToMany(() => InnovationSupportEntity, record => record.innovation)
  supports: InnovationSupportEntity[] | null;
}
