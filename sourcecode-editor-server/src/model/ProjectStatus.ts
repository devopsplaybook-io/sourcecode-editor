export class ProjectStatus {
  projectId: string;
  branches: string[];
  currentBranch: string;
  constructor(partial?: Partial<ProjectStatus>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}
