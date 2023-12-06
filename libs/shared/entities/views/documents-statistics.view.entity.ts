import { Column, ViewColumn, ViewEntity } from 'typeorm';

import type { ServiceRoleEnum } from '../../enums';
import type { InnovationFileContextTypeEnum } from '../../enums/innovation.enums';

export type UploadedByRoleType = { role: ServiceRoleEnum; count: number };
export type LocationType = { location: InnovationFileContextTypeEnum; count: number };
export type UploadedByUnitType = { id: string; unit: string; count: number };

@ViewEntity('documents_statistics_view')
export class DocumentsStatisticsViewEntity {
  @ViewColumn({ name: 'innovation_id' })
  innovationId: string;

  @Column({ name: 'uploaded_by_roles', type: 'simple-json' })
  uploadedByRoles: UploadedByRoleType[] | null;

  @Column({ name: 'uploaded_by_units', type: 'simple-json' })
  uploadedByUnits: UploadedByUnitType[] | null;

  @Column({ name: 'locations', type: 'simple-json' })
  locations: LocationType[] | null;
}
