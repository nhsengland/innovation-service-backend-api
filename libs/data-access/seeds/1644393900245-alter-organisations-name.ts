import SQLDB_SEEDS_CONNECTION from '../config/seeds-connection.config';

import { OrganisationEntity } from '../../shared/entities';

export class alterOrganisationsName1644393900245 {
  name = 'alterOrganisationsName1644393900245';

  async up(): Promise<void> {
    const data = [
      { acronym: 'NOCRI/NIHR', name: 'National Institute for Health Research' },
      { acronym: 'SHTG', name: 'Scottish Health Technologies Group' }
    ];

    const orgRepo = SQLDB_SEEDS_CONNECTION.getRepository(OrganisationEntity);

    // UPDATE Organisation Names
    for (const orgObj of data) {
      const org = await orgRepo.findOne({ where: { acronym: orgObj.acronym } });

      if (!org) continue;

      org.name = orgObj.name;

      await orgRepo.save(org);
    }
  }

  async down(): Promise<void> {
    const data = [
      { acronym: 'NOCRI/NIHR', name: 'NOCRI/NIHR' },
      { acronym: 'SHTG', name: 'Scottish Heath Technologies Group' }
    ];

    const orgRepo = SQLDB_SEEDS_CONNECTION.getRepository(OrganisationEntity);

    // UPDATE Organisation Names
    for (const orgObj of data) {
      const org = await orgRepo.findOne({ where: { acronym: orgObj.acronym } });

      if (!org) continue;

      org.name = orgObj.name;

      await orgRepo.save(org);
    }
  }
}
