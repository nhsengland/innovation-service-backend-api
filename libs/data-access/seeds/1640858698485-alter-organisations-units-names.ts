import SQLDB_SEEDS_CONNECTION from '../config/seeds-connection.config';

import { OrganisationUnitEntity } from '../../shared/entities';

export class alterOrganisationsUnitsNames1640858698485 {
  name = 'alterOrganisationsUnitsNames1640858698485';

  async up(): Promise<void> {
    const data = [
      { acronym: 'NOCRI/NIHR', name: 'National Institute for Health Research' },
      { acronym: 'SHTG', name: 'Scottish Health Technologies Group' },
    ];

    const orgUnitRepo = SQLDB_SEEDS_CONNECTION.getRepository(OrganisationUnitEntity);

    // UPDATE Organisation Units Names
    for (const orgUnitObj of data) {
      const filterOptions = {
        where: { acronym: orgUnitObj.acronym },
      };
      const orgUnit = await orgUnitRepo.findOne(filterOptions);

      if (!orgUnit) continue;

      orgUnit.name = orgUnitObj.name;

      await orgUnitRepo.save(orgUnit);
    }
  }

  async down(): Promise<void> {
    const data = [
      { acronym: 'NOCRI/NIHR', name: 'NOCRI/NIHR' },
      { acronym: 'SHTG', name: 'Scottish Health Technology Group' },
    ];

    const orgUnitRepo = SQLDB_SEEDS_CONNECTION.getRepository(OrganisationUnitEntity);

    // UPDATE Organisation Units Names
    for (const orgUnitObj of data) {
      const orgUnit = await orgUnitRepo.findOne({ where: { acronym: orgUnitObj.acronym } });

      if (!orgUnit) continue;

      orgUnit.name = orgUnitObj.name;

      await orgUnitRepo.save(orgUnit);
    }
  }
}
