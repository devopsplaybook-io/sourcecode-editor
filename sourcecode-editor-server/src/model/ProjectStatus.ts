import { FileUpdateStatus } from "./FileUpdateStatus";

export class ProjectStatus {
  projectId: string;
  branches: string[];
  currentBranch: string;
  filesUpdateStatus: FileUpdateStatus[];
  constructor(partial?: Partial<ProjectStatus>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}
