export type ResponseDTO = {
  id: string;
  subject: string;
  createdAt: Date;
  createdBy: {
    id: string;
    name: string;
  };
};
