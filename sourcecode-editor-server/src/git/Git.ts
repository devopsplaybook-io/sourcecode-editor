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
  const span = OTelTracer().startSpan("GitInit", context);
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
      `${await GitEnv(span)} && git clone ${
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

export async function GitCheckout(
  context: Span,
  project: Project,
  branch: string
): Promise<void> {
  const span = OTelTracer().startSpan("GitCheckout", context);
  try {
    logger.info(
      `Checkout project branch: ${project.projectId} ${project.name} ${branch}`
    );
    await SystemCommandExecute(
      span,
      `${await GitEnv(span)} && cd ${projectParentFolder}/${
        project.projectId
      } && git checkout ${branch}`
    );
  } catch (err) {
    logger.error(`Failed to clone project: ${err.message}`);
    throw err;
  } finally {
    span.end();
  }
}

export async function GitPull(context: Span, project: Project): Promise<void> {
  const span = OTelTracer().startSpan("GitPull", context);
  try {
    logger.info(`Pulling: ${project.projectId} ${project.name}`);
    await SystemCommandExecute(
      span,
      `${await GitEnv(span)} && cd ${projectParentFolder}/${
        project.projectId
      } && git pull`
    );
  } catch (err) {
    logger.error(`Failed to pull: ${err.message}`);
    throw err;
  } finally {
    span.end();
  }
}

export async function GitListBranches(
  context: Span,
  project: Project
): Promise<string[]> {
  const span = OTelTracer().startSpan("GitListBranches", context);
  try {
    const gitCommandOutput = await SystemCommandExecute(
      span,
      `${await GitEnv(span)} && cd ${projectParentFolder}/${
        project.projectId
      } && git branch -r`
    );
    const branches = gitCommandOutput
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .filter((line) => !line.includes("->"))
      .map((line) => {
        const trimmed = line.trim();
        return trimmed.startsWith("origin/") ? trimmed.slice(7) : trimmed;
      });
    span.end();
    return branches;
  } catch (err) {
    logger.error(`Failed to get branches: ${err.message}`);
    span.end();
    throw err;
  }
}

export async function GitGetBranchCurrent(
  context: Span,
  project: Project
): Promise<string> {
  const span = OTelTracer().startSpan("GitGetBranchCurrent", context);
  try {
    const gitCommandOutput = await SystemCommandExecute(
      span,
      `${await GitEnv(span)} && cd ${projectParentFolder}/${
        project.projectId
      } && git branch`
    );
    const current = gitCommandOutput
      .split("\n")
      .find((branch) => branch.includes("*"))
      ?.split("*")[1]
      .trim();
    span.end();
    return current;
  } catch (err) {
    logger.error(`Failed to get branche: ${err.message}`);
    span.end();
    throw err;
  }
}

// Private Function

async function GitEnv(context: Span): Promise<string> {
  const span = OTelTracer().startSpan("GitEnv", context);
  const privateKeyPath = await SSHGetPrivateKeyPath(span);
  span.end();
  return `export GIT_SSH_COMMAND='ssh -i ${privateKeyPath} -o StrictHostKeyChecking=no'`;
}
