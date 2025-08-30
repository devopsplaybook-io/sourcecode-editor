import { v4 as uuidv4 } from "uuid";

export class Project {
  projectId: string;
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  info: any;

  constructor(partial?: Partial<Project>) {
    this.projectId = uuidv4();
    this.name = "";
    this.info = {};
    if (partial) {
      Object.assign(this, partial);
      if (typeof partial.info === "string") {
        try {
          this.info = JSON.parse(partial.info);
        } catch {
          this.info = {};
        }
      }
    }
  }
}
