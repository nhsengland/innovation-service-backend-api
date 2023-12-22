import { Column, PrimaryColumn, ViewEntity } from 'typeorm';

@ViewEntity('innovation_list_view_2')
export class InnovationListView {
  @PrimaryColumn() // Primary column is required for ViewEntity to work properly with pagination
  id: string;

  @Column({ name: 'engaging_units', type: 'simple-json' })
  engagingUnits: { unitId: string; name: string; acronym: string }[] | null;

  @Column({ name: 'engaging_organisations', type: 'simple-json' })
  engagingOrganisations: { organisationId: string; name: string; acronym: string }[] | null;

  // @OneToOne(() => InnovationEntity, record => record.id)
  // @JoinColumn({ name: 'id' })
  // innovation: InnovationEntity;
}
