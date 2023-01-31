import fs from 'fs';
import { join } from 'path';
import YAML from 'yaml';

import {
  CacheServiceSymbol,
  CacheServiceType,
  HttpServiceSymbol,
  HttpServiceType,
  NOSQLConnectionServiceSymbol, NOSQLConnectionServiceType,
  SQLConnectionServiceSymbol, SQLConnectionServiceType
} from '@innovations/shared/services';
import type { Container } from 'inversify';

export const startup = async (container: Container): Promise<void> => {

  console.log('Initializing Innovations app function');

  const sqlConnectionService = container.get<SQLConnectionServiceType>(SQLConnectionServiceSymbol);
  const noSqlConnectionService = container.get<NOSQLConnectionServiceType>(NOSQLConnectionServiceSymbol);
  const cacheService = container.get<CacheServiceType>(CacheServiceSymbol);
  const httpService = container.get<HttpServiceType>(HttpServiceSymbol);

  try {

    await sqlConnectionService.init();
    await noSqlConnectionService.init();
    await cacheService.init();

    console.log('Initialization complete');

    if (process.env['LOCAL_MODE'] ?? false) {

      console.group('Generating documentation...');

      const response = await httpService.getHttpInstance().get(`http://localhost:7072/api/swagger.json`);
      console.log('Saving swagger file');
      fs.writeFileSync(`${join(__dirname, '../../../..')}/apps/innovations/.apim/swagger.yaml`, YAML.stringify(response.data));
      console.log('Documentation generated successfully');
      console.groupEnd();

    }

  } catch (error) {

    // TODO: Treat this error! Should we end the process?
    console.error('Innovations app function was UNABLE to start');
    console.error(error);

  }

};