import SQLDB_SEEDS_CONNECTION from '../config/seeds-connection.config';

import { OrganisationEntity, OrganisationUnitEntity } from '../../shared/entities';
import { OrganisationTypeEnum } from '../../shared/enums';

export class loadInitialOrganisations1626172199310 {
  async up(): Promise<void> {
    const data = [
      {
        name: 'NOCRI/NIHR',
        acronym: 'NOCRI/NIHR',
        units: [{ name: 'NOCRI/NIHR', acronym: 'NOCRI/NIHR', isShadow: true }],
      },
      {
        name: 'NHS Supply Chain',
        acronym: 'NHS-SC',
        units: [{ name: 'NHS Supply Chain', acronym: 'NHS-SC', isShadow: true }],
      },
      {
        name: 'NICE',
        acronym: 'NICE',
        units: [{ name: 'NICE', acronym: 'NICE', isShadow: true }],
      },
      {
        name: 'Scottish Heath Technology Group',
        acronym: 'SHTG',
        units: [{ name: 'Scottish Heath Technology Group', acronym: 'SHTG', isShadow: true }],
      },
      {
        name: 'NHSE Specialised Commissioning',
        acronym: 'NHSE-SC',
        units: [{ name: 'NHSE Specialised Commissioning', acronym: 'NHSE-SC', isShadow: true }],
      },
      {
        name: 'Life Sciences Hub Wales',
        acronym: 'LSHW',
        units: [{ name: 'Life Sciences Hub Wales', acronym: 'LSHW', isShadow: true }],
      },
      {
        name: 'Department for International Trade',
        acronym: 'DIT',
        units: [{ name: 'Department for International Trade', acronym: 'DIT', isShadow: true }],
      },
      {
        name: 'Health Technology Wales',
        acronym: 'HTW',
        units: [{ name: 'Health Technology Wales', acronym: 'HTW', isShadow: true }],
      },
      {
        name: 'MHRA',
        acronym: 'MHRA',
        units: [
          { name: 'Devices Regulatory Group', acronym: 'DRG' },
          { name: 'Devices Information & Operations Group', acronym: 'DIOG' },
          { name: 'Devices Safety & Surveillance Group', acronym: 'DSSG' },
          { name: 'Software Group', acronym: 'SG' },
        ],
      },
      {
        name: 'AHSN Network',
        acronym: 'AHSN',
        units: [
          { name: 'NENC', acronym: 'NENC' },
          { name: 'EMAHSN', acronym: 'EMAHSN' },
          { name: 'West of England', acronym: 'WoE' },
          { name: 'Eastern', acronym: 'EAST' },
          { name: 'NWC', acronym: 'NWC' },
          { name: 'WMAHSN', acronym: 'WMAHSN' },
          { name: 'WEAHSN', acronym: 'WEAHSN' },
          { name: 'HIN', acronym: 'HIN' },
          { name: 'Oxford', acronym: 'Oxford' },
          { name: 'UCLP', acronym: 'UCLP' },
          { name: 'YHAHSN', acronym: 'YHAHSN' },
          { name: 'HInM', acronym: 'HInM' },
          { name: 'KSS', acronym: 'KSS' },
          { name: 'Wessex', acronym: 'Wessex' },
          { name: 'ICHP', acronym: 'ICHP' },
          { name: 'SWAHSN', acronym: 'SWAHSN' },
        ],
      },
    ];

    for (const organisation of data) {
      const orgObj = OrganisationEntity.new({
        name: organisation.name,
        acronym: organisation.acronym,
        type: OrganisationTypeEnum.ACCESSOR,
        createdBy: 'seed',
        updatedBy: 'seed',
      });
      const savedOrganisation = await SQLDB_SEEDS_CONNECTION.manager
        .getRepository(OrganisationEntity)
        .save(orgObj);

      for (const organisationUnit of organisation.units) {
        const orgUnitObj = OrganisationUnitEntity.new({
          name: organisationUnit.name,
          acronym: organisationUnit.acronym,
          organisation: savedOrganisation,
          createdBy: 'seed',
          updatedBy: 'seed',
        });
        await SQLDB_SEEDS_CONNECTION.getRepository(OrganisationUnitEntity).save(orgUnitObj);
      }
    }
  }

  async down(): Promise<void> {
    const query = SQLDB_SEEDS_CONNECTION.createQueryBuilder().delete();

    await query.from(OrganisationUnitEntity).execute();
    await query.from(OrganisationEntity).execute();
  }
}
