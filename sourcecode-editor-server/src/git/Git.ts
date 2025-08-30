import { Span } from "@opentelemetry/sdk-trace-base";
import { Project } from "../model/Project";
import { OTelLogger, OTelTracer } from "../OTelContext";
import { Config } from "../Config";
import { SystemCommandExecute } from "../utils-std-ts/SystemCommand";
import { ensureDir, remove } from "fs-extra";
import path from "path";
import { SSHGetPrivateKeyPath } from "../ssh/SSH";

const logger = OTelLogger().createModuleLogger("Git");
let config: Config;
let projectParentFolder = "";

export async function GitInit(context: Span, configIn: Config): Promise<void> {
  const span = OTelTracer().startSpan("GitClone", context);
  config = configIn;
  projectParentFolder = path.join(config.DATA_DIR, "/projects/");
  ensureDir(projectParentFolder);
  span.end();
}

export async function GitClone(context: Span, project: Project): Promise<void> {
  const span = OTelTracer().startSpan("GitClone", context);
  try {
    logger.info(`Cloning project: ${project.projectId} ${project.name}`);
    await remove(path.join(projectParentFolder, project.projectId));
    await SystemCommandExecute(
      span,
      `GIT_SSH_COMMAND='ssh -i ${await SSHGetPrivateKeyPath(span)}' git clone ${
        project.info.url
      } ${projectParentFolder}/${project.projectId}`
    );
  } catch (err) {
    logger.error(`Failed to clone project: ${err.message}`);
    throw err;
  } finally {
    span.end();
  }
}
