import { FileUpdateStatus } from "./FileUpdateStatus";

export class ProjectStatus {
  projectId: string;
  branches: string[];
  currentBranch: string;
  filesUpdateStatus: FileUpdateStatus[];
  branchStatus: { behind: number; ahead: number };
  constructor(partial?: Partial<ProjectStatus>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}
