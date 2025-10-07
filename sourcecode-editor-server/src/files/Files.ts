export async function FilesProjectCreate(
  context: Span,
  project: Project,
  parentPath: string,
  fileName: string
): Promise<void> {
  const span = OTelTracer().startSpan("FilesProjectCreate", context);
  try {
    const projectFolder = path.join(projectParentFolder, project.projectId);
    const absParentPath = path.join(projectFolder, parentPath);
    await ensureDir(absParentPath);
    const absFilePath = path.join(absParentPath, fileName);
    await fs.writeFile(absFilePath, "", { flag: "wx" }); // create new file, fail if exists
    span.end();
  } catch (err) {
    span.end();
    throw err;
  }
}
export async function FilesProjectDelete(
  context: Span,
  project: Project,
  filePath: string
): Promise<void> {
  const span = OTelTracer().startSpan("FilesProjectDelete", context);
  try {
    const projectFolder = path.join(projectParentFolder, project.projectId);
    const absPath = path.join(projectFolder, filePath);
    await fs.rm(absPath, { recursive: true, force: true });
    span.end();
  } catch (err) {
    span.end();
    throw err;
  }
}
import { Span } from "@opentelemetry/sdk-trace-base";
import { Project } from "../model/Project";
import { OTelTracer } from "../OTelContext";
import { Config } from "../Config";
import { ensureDir } from "fs-extra";
import path from "path";
import fs from "fs/promises";

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

export async function FilesProjectGet(
  context: Span,
  project: Project,
  filePath: string
): Promise<string> {
  const span = OTelTracer().startSpan("FilesProjectGet", context);
  try {
    const projectFolder = path.join(projectParentFolder, project.projectId);
    const absPath = path.join(projectFolder, filePath);
    // Optionally: add security checks to prevent path traversal
    const content = await fs.readFile(absPath, "utf-8");
    span.end();
    return content;
  } catch (err) {
    span.end();
    throw err;
  }
}

export async function FilesProjectUpdate(
  context: Span,
  project: Project,
  filePath: string,
  content: string
): Promise<void> {
  const span = OTelTracer().startSpan("FilesProjectUpdate", context);
  try {
    const projectFolder = path.join(projectParentFolder, project.projectId);
    const absPath = path.join(projectFolder, filePath);
    await ensureDir(path.dirname(absPath));
    await fs.writeFile(absPath, content, "utf-8");
    span.end();
  } catch (err) {
    span.end();
    throw err;
  }
}

export async function FilesProjectRename(
  context: Span,
  project: Project,
  oldPath: string,
  newPath: string
): Promise<void> {
  const span = OTelTracer().startSpan("FilesProjectRename", context);
  try {
    const projectFolder = path.join(projectParentFolder, project.projectId);
    const absOldPath = path.join(projectFolder, oldPath);
    const absNewPath = path.join(projectFolder, newPath);
    await ensureDir(path.dirname(absNewPath));
    await fs.rename(absOldPath, absNewPath);
    span.end();
  } catch (err) {
    span.end();
    throw err;
  }
}

const FILES_IGNORE_LIST = ["node_modules", ".git"];
