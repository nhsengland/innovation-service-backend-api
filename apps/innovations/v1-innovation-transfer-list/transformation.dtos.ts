export type ResponseDTO = {
  id: string;
  email: string;
  innovation: {
    id: string;
    name: string;
    owner: string;
  };
}[];
