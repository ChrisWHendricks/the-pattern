export type AppIssue = {
  id: string;
  type: "defect" | "feature";
  title: string;
  description: string;
  status: "open" | "in-progress" | "done";
  createdAt: string;
  updatedAt?: string;
};
