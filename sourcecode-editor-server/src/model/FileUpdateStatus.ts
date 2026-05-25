export interface FileUpdateStatus {
  path: string;
  state: "modified" | "deleted" | "new";
}
