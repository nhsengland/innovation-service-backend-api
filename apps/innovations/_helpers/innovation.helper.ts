export class InnovationHelper {

  /**
  * Transforms organisations / units information.
  * Given the format units -> organisation, transform to organisation -> units format.
  */
  static parseOrganisationUnitsToOrganisationsFormat(organisationUnits: {
    id: string, name: string, acronym: string,
    organisation: { id: string, name: string, acronym: null | string }
  }[]): { id: string, name: string, acronym: null | string, units: { id: string, name: string, acronym: string }[] }[] {

    const toReturn: {
      id: string, name: string, acronym: null | string,
      units: { id: string, name: string, acronym: string }[]
    }[] = [];

    const uniqueOrganisationIds = [...new Set(organisationUnits.map(item => item.organisation.id))];
    for (const organisationId of uniqueOrganisationIds) {

      const units = organisationUnits.filter(unit => unit.organisation.id === organisationId);

      toReturn.push({
        id: units[0]!.organisation.id,
        name: units[0]!.organisation.name,
        acronym: units[0]!.organisation.acronym,
        units: units.map(item => ({ id: item.id, name: item.name, acronym: item.acronym }))
      });

    }

    return toReturn;

  }

}
