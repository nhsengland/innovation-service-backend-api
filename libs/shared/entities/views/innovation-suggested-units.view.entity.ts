import { Column, JoinColumn, ManyToOne, PrimaryColumn, ViewColumn, ViewEntity } from 'typeorm';
import { InnovationListView } from './innovation-list-view.entity';

@ViewEntity('innovation_suggested_units_view')
export class InnovationSuggestedUnitsView {
  @PrimaryColumn({ name: 'innovation_id' })
  innovationId: string;

  @ViewColumn({ name: 'suggested_unit_id' })
  suggestedUnitId: string;

  @Column({ name: 'suggested_by_units_acronyms', type: 'simple-json' })
  suggestedBy: string[];

  @ViewColumn({ name: 'suggested_on' })
  suggestedOn: Date;

  @ManyToOne(() => InnovationListView, record => record.suggestions)
  @JoinColumn({ name: 'innovation_id' })
  innovation: InnovationListView;
}
