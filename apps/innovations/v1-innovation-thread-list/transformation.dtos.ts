export type ResponseDTO = {
  count: number;
  data: {
    id: string;
    subject: string;
    createdBy: {
      id: string;
      name: string;
      displayTeam?: string;
    };
    lastMessage: {
      id: string;
      createdAt: Date;
      createdBy: {
        id: string;
        name: string;
        displayTeam?: string;
      };
    };
    messageCount: number;
    hasUnreadNotifications: boolean;
  }[];
};
