import SQLDB_SEEDS_CONNECTION from '../config/seeds-connection.config';

import { OrganisationUnitEntity } from '../../shared/entities';

export class alterOrganisationUnitIsShadow1626707748930 {
  async up(): Promise<void> {
    const data = [
      { acronym: 'NOCRI/NIHR', isShadow: true },
      { acronym: 'NHS-SC', isShadow: true },
      { acronym: 'NICE', isShadow: true },
      { acronym: 'SHTG', isShadow: true },
      { acronym: 'NHSE-SC', isShadow: true },
      { acronym: 'LSHW', isShadow: true },
      { acronym: 'DIT', isShadow: true },
      { acronym: 'HTW', isShadow: true },
    ];

    const organisationUnitRepo = SQLDB_SEEDS_CONNECTION.getRepository(OrganisationUnitEntity);

    for (const organisationUnit of data) {
      const dbOrganisationUnit = await organisationUnitRepo.findOne({
        where: { acronym: organisationUnit.acronym },
      });

      if (!dbOrganisationUnit) continue;

      dbOrganisationUnit.isShadow = true;

      await organisationUnitRepo.save(dbOrganisationUnit);
    }
  }

  async down(): Promise<void> {}
}
