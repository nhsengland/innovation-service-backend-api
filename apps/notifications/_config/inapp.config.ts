export type InAppTemplatesType = {
  TA01_TASK_CREATION_TO_INNOVATOR: {
    innovationName: string;
    organisationUnitName: string;
    taskId: string;
  };
  TA02_TASK_RESPONDED_TO_OTHER_INNOVATORS: {
    innovationName: string;
    organisationUnitName: string;
  };
  TA03_TASK_DONE_TO_ACCESSOR_OR_ASSESSMENT: Record<string, unknown>;
  TA04_TASK_DECLINED_TO_ACCESSOR_OR_ASSESSMENT: Record<string, unknown>;
  TA05_TASK_CANCELLED_TO_INNOVATOR: Record<string, unknown>;
  TA06_TASK_REOPEN_TO_INNOVATOR: Record<string, unknown>;
};
