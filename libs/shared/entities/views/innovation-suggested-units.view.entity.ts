import { Column, JoinColumn, ManyToOne, PrimaryColumn, ViewColumn, ViewEntity } from 'typeorm';
import { OrganisationUnitEntity } from '../organisation/organisation-unit.entity';
import { InnovationListView } from './innovation-list-view.entity';
import { InnovationEntity } from '../innovation/innovation.entity';

@ViewEntity('innovation_suggested_units_view')
export class InnovationSuggestedUnitsView {
  @PrimaryColumn({ name: 'innovation_id' })
  innovationId: string;

  @Column({ name: 'suggested_unit_id' })
  suggestedUnitId: string;

  @Column({ name: 'suggested_by_units_acronyms', type: 'simple-json' })
  suggestedBy: string[];

  @ViewColumn({ name: 'suggested_on' })
  suggestedOn: Date;

  @ManyToOne(() => InnovationListView, record => record.suggestions)
  @JoinColumn({ name: 'innovation_id' })
  innovation: InnovationListView;

  @ManyToOne(() => InnovationEntity, record => record.id)
  @JoinColumn({ name: 'innovation_id' })
  innovationInfo: InnovationEntity;

  @ManyToOne(() => OrganisationUnitEntity, record => record.id)
  @JoinColumn({ name: 'suggested_unit_id' })
  suggestedUnit: OrganisationUnitEntity;
}
