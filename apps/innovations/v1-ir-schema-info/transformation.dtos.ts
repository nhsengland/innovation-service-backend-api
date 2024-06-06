import type { IRSchemaType } from '@innovations/shared/models';

export type ResponseDTO = {
  id: string;
  version: number;
  schema: IRSchemaType;
};
