import type { InnovationSupportStatusEnum } from '@innovations/shared/enums';

export type ResponseDTO = {
  id: string;
  name: string;
  support: { status: InnovationSupportStatusEnum; start: Date; end?: Date };
}[];
