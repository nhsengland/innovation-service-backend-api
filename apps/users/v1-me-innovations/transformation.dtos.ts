import type { DateISOType } from "@users/shared/types";

export type ResponseDTO = {
  id: string
  name: string,
  collaboratorsCount: number,
  transferCreatedAt: DateISOType | null
}[];