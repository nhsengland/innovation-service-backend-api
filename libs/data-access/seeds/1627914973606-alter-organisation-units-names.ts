import SQLDB_SEEDS_CONNECTION from '../config/seeds-connection.config';

import { OrganisationUnitEntity } from '../../shared/entities';

export class alterOrganisationUnitsNames1627914973606 {
  async up(): Promise<void> {
    const organisationUnits = [
      { acronym: 'NENC', name: 'North East and North Cumbria AHSN' },
      { acronym: 'EMAHSN', name: 'East Midlands AHSN' },
      { acronym: 'EAST', name: 'Eastern AHSN' },
      { acronym: 'NWC', name: 'Innovation Agency (North West Coast AHSN)' },
      { acronym: 'WMAHSN', name: 'West Midlands AHSN' },
      { acronym: 'WEAHSN', name: 'West of England AHSN' },
      { acronym: 'HIN', name: 'Health Innovation Network South London' },
      { acronym: 'Oxford', name: 'Oxford AHSN' },
      { acronym: 'UCLP', name: 'UCLPartners' },
      { acronym: 'YHAHSN', name: 'Yorkshire and Humber AHSN' },
      { acronym: 'HInM', name: 'Health Innovation Manchester' },
      { acronym: 'KSS', name: 'Kent Surrey Sussex AHSN' },
      { acronym: 'Wessex', name: 'Wessex AHSN' },
      { acronym: 'ICHP', name: 'Imperial College Health Partners' },
      { acronym: 'SWAHSN', name: 'South West AHSN' }
    ];

    const organisationUnitRepo = SQLDB_SEEDS_CONNECTION.getRepository(OrganisationUnitEntity);

    // UPDATE Organisation Units Names
    for (const organisationUnit of organisationUnits) {
      const orgUnit = await organisationUnitRepo.findOne({
        where: { acronym: organisationUnit.acronym }
      });

      if (!orgUnit) {
        continue;
      }

      orgUnit.name = organisationUnit.name;

      await organisationUnitRepo.save(orgUnit);
    }

    // DELETE WoE Organisation Unit
    const orgUnitToDelete = await organisationUnitRepo.findOne({ where: { acronym: 'WoE' } });
    if (orgUnitToDelete) {
      await organisationUnitRepo.softDelete({ id: orgUnitToDelete.id });
    }
  }

  async down(): Promise<void> {}
}
