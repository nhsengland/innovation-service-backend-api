export type ResponseDTO = {
  id: string;
  title: string;
  startsAt: Date;
  expiresAt: null | Date;
  params: null | Record<string, unknown>;
}[];
