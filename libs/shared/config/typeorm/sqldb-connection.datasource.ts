import { DataSource } from 'typeorm';

import { SQLDB_DEFAULT_CONNECTION } from './connections.config';


export const SQLDB_DATASOURCE = new DataSource(SQLDB_DEFAULT_CONNECTION);

// export default SQLDB_CONNECTION;
