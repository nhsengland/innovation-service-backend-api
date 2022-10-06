//import { container } from '../_config';
import * as dotenv from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';

//import { RecipientsServiceSymbol, RecipientsServiceType } from './interfaces';
import { GENERAL_ENTITIES, INNOVATION_ENTITIES, ORGANISATION_ENTITIES, USER_ENTITIES } from '@notifications/shared/entities';
import { TypeORMCustomStrategy } from '@notifications/shared/config/typeorm/custom-strategy.config';
import { join } from 'path';

dotenv.config();

export async function connect(): Promise<DataSource> {
  let connection: DataSource;
  
  const SQLDB_DEFAULT_CONNECTION: DataSourceOptions = Object.freeze({
    name: 'default',
    type: 'mssql',
    host: process.env['DB_HOST'] || '',
    username: process.env['DB_USER'] || '',
    password: process.env['DB_PWD'] || '',
    database: process.env['DB_NAME'] || '',
    entities: [...GENERAL_ENTITIES, ...INNOVATION_ENTITIES, ...ORGANISATION_ENTITIES, ...USER_ENTITIES],
    namingStrategy: new TypeORMCustomStrategy(),
    synchronize: false,
    extra: {
      options: {
        enableArithAbort: true,
        trustServerCertificate: true
      }
    },
    cli: { migrationsDir: `${join(__dirname, '..', '..')}/data-access/migrations` }
  });

  const TESTS_DB_CONNECTION = {
    ...SQLDB_DEFAULT_CONNECTION,
    host: process.env['DB_TESTS_HOST'],
    username: process.env['DB_TESTS_USER'],
    password: process.env['DB_TESTS_PWD'],
    database: process.env['DB_TESTS_NAME'],
  } as DataSourceOptions;

  connection = new DataSource(TESTS_DB_CONNECTION);
  connection.initialize();

  return connection;
}

export async function closeConnection(connection?: DataSource): Promise<void> {
  const conn = connection

  if (conn) await conn.destroy();
}

describe('Recipients service suite', () => {

  let connection: DataSource;

  //let sut: RecipientsServiceType;
  beforeAll(async () => {
    connection = await connect();
    //sut = container.get<RecipientsServiceType>(RecipientsServiceSymbol);
  });

  afterEach(async () => {
    
  })

  afterAll(async () => {
    
    await closeConnection(connection);
  });

});