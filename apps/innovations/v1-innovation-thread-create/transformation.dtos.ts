export type ResponseDTO = {
  thread: {
    id: string;
    subject: string;
    createdBy: {
      id: string;
    };
    createdAt: Date;
  };
};
