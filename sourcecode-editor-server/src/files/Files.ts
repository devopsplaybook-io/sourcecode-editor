import { Span } from "@opentelemetry/sdk-trace-base";
import { Project } from "../model/Project";
import { OTelLogger, OTelTracer } from "../OTelContext";
import { Config } from "../Config";
import { SystemCommandExecute } from "../utils-std-ts/SystemCommand";
import { ensureDir, remove } from "fs-extra";
import path from "path";
import { SSHGetPrivateKeyPath } from "../ssh/SSH";
import fs from "fs/promises";

const logger = OTelLogger().createModuleLogger("Files");
let config: Config;
let projectParentFolder = "";

export async function FilesInit(
  context: Span,
  configIn: Config
): Promise<void> {
  const span = OTelTracer().startSpan("FilesInit", context);
  config = configIn;
  projectParentFolder = path.join(config.DATA_DIR, "/projects/");
  ensureDir(projectParentFolder);
  span.end();
}

export async function FilesProjectList(
  context: Span,
  project: Project
): Promise<string[]> {
  const span = OTelTracer().startSpan("FilesProjectList", context);
  logger.info(`Cloning project: ${project.projectId} ${project.name}`);
  const projectFolder = path.join(projectParentFolder, project.projectId);

  async function listFiles(dir: string, relDir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    let files: string[] = [];
    for (const entry of entries) {
      if (FILES_IGNORE_LIST.includes(entry.name)) continue;
      const fullPath = path.join(dir, entry.name);
      const relPath = path.join(relDir, entry.name);
      if (entry.isDirectory()) {
        files = files.concat(await listFiles(fullPath, relPath));
      } else if (entry.isFile()) {
        files.push(relPath);
      }
    }
    return files;
  }

  const fileList = await listFiles(projectFolder, "");
  span.end();
  return fileList;
}

const FILES_IGNORE_LIST = ["node_modules", ".git"];
