import { Span } from "@opentelemetry/sdk-trace-base";
import { Project } from "../model/Project";
import { OTelLogger, OTelTracer } from "../OTelContext";
import { Config } from "../Config";
import { SystemCommandExecute } from "../utils-std-ts/SystemCommand";
import { ensureDir, remove } from "fs-extra";
import path from "path";
import { SSHGetPrivateKeyPath } from "../ssh/SSH";
import { FileUpdateStatus } from "../model/FileUpdateStatus";

const logger = OTelLogger().createModuleLogger("Git");
let config: Config;
let projectParentFolder = "";

export async function GitInit(context: Span, configIn: Config): Promise<void> {
  const span = OTelTracer().startSpan("GitInit", context);
  config = configIn;
  projectParentFolder = path.join(config.DATA_DIR, "/projects/");
  ensureDir(projectParentFolder);
  if (config.GIT_USERNAME && config.GIT_EMAIL) {
    await GitConfigUser(span, config.GIT_USERNAME, config.GIT_EMAIL);
  } else {
    logger.warn("Git username or email is not set", span);
  }
  span.end();
}

export async function GitClone(context: Span, project: Project): Promise<void> {
  const span = OTelTracer().startSpan("GitClone", context);
  try {
    logger.info(`Cloning project: ${project.projectId} ${project.name}`, span);
    await remove(path.join(projectParentFolder, project.projectId));
    await SystemCommandExecute(
      span,
      `${await GitEnv(span)} && git clone ${
        project.info.url
      } ${projectParentFolder}/${project.projectId}`,
    );
  } catch (err) {
    logger.error(`Failed to clone project`, err, span);
    throw err;
  } finally {
    span.end();
  }
}

export async function GitCheckout(
  context: Span,
  project: Project,
  branch: string,
): Promise<void> {
  const span = OTelTracer().startSpan("GitCheckout", context);
  try {
    logger.info(
      `Checkout project branch: ${project.projectId} ${project.name} ${branch}`,
      span,
    );
    await SystemCommandExecute(
      span,
      `${await GitEnv(span)} && cd ${projectParentFolder}/${
        project.projectId
      } && git checkout ${branch}`,
    );
  } catch (err) {
    logger.error(`Failed to checking out project`, err, span);
    throw err;
  } finally {
    span.end();
  }
}

export async function GitPull(context: Span, project: Project): Promise<void> {
  const span = OTelTracer().startSpan("GitPull", context);
  try {
    logger.info(`Pulling: ${project.projectId} ${project.name}`, span);
    await SystemCommandExecute(
      span,
      `${await GitEnv(span)} && cd ${projectParentFolder}/${
        project.projectId
      } && git pull`,
    );
  } catch (err) {
    logger.error(`Failed to pull`, err, span);
    throw err;
  } finally {
    span.end();
  }
}

export async function GitListBranches(
  context: Span,
  project: Project,
): Promise<string[]> {
  const span = OTelTracer().startSpan("GitListBranches", context);
  try {
    const gitCommandOutput = await SystemCommandExecute(
      span,
      `${await GitEnv(span)} && cd ${projectParentFolder}/${
        project.projectId
      } && git branch -r`,
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
    logger.error(`Failed to list branches`, err, span);
    span.end();
    throw err;
  }
}

export async function GitListModifiedFiles(
  context: Span,
  project: Project,
): Promise<FileUpdateStatus[]> {
  const span = OTelTracer().startSpan("GitListModifiedFiles", context);
  try {
    const gitCommandOutput = await SystemCommandExecute(
      span,
      `${await GitEnv(span)} && cd ${projectParentFolder}/${
        project.projectId
      } && git status --porcelain`,
    );
    const files = gitCommandOutput
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        const status = line.slice(0, 2);
        const filePath = line.slice(3).trim();
        let state: "modified" | "deleted" | "new";
        if (status.includes("D")) {
          state = "deleted";
        } else if (status.includes("A") || status.includes("??")) {
          state = "new";
        } else {
          state = "modified";
        }
        return { path: filePath, state };
      });
    span.end();
    return files;
  } catch (err) {
    logger.error(`Failed to get modified files`, err, span);
    span.end();
    throw err;
  }
}

export async function GitGetBranchCurrent(
  context: Span,
  project: Project,
): Promise<string> {
  const span = OTelTracer().startSpan("GitGetBranchCurrent", context);
  try {
    const gitCommandOutput = await SystemCommandExecute(
      span,
      `${await GitEnv(span)} && cd ${projectParentFolder}/${
        project.projectId
      } && git branch`,
    );
    const current = gitCommandOutput
      .split("\n")
      .find((branch) => branch.includes("*"))
      ?.split("*")[1]
      .trim();
    span.end();
    return current;
  } catch (err) {
    logger.error(`Failed to get branch`, err, span);
    span.end();
    throw err;
  }
}

export async function GitCommit(
  context: Span,
  project: Project,
  files: string[],
  message: string,
): Promise<void> {
  const span = OTelTracer().startSpan("GitCommit", context);
  try {
    logger.info(
      `Committing files: ${files.join(", ")} with message: "${message}"`,
      span,
    );
    if (files.length > 0) {
      const filesArg = files.map((f) => `"${f}"`).join(" ");
      // Use `git add -A -- <files>` so that deletions are also staged.
      // Plain `git add <file>` fails when the file no longer exists on disk.
      await SystemCommandExecute(
        span,
        `${await GitEnv(span)} && cd ${projectParentFolder}/${
          project.projectId
        } && git add -A -- ${filesArg}`,
      );
    }
    await SystemCommandExecute(
      span,
      `${await GitEnv(span)} && cd ${projectParentFolder}/${
        project.projectId
      } && git commit -m "${message.replace(/"/g, '\\"')}"`,
    );
    span.end();
  } catch (err) {
    logger.error(`Failed to commit`, err, span);
    span.end();
    throw err;
  }
}

export async function GitPush(context: Span, project: Project): Promise<void> {
  const span = OTelTracer().startSpan("GitPush", context);
  try {
    logger.info(`Pushing project: ${project.projectId} ${project.name}`, span);
    await SystemCommandExecute(
      span,
      `${await GitEnv(span)} && cd ${projectParentFolder}/${
        project.projectId
      } && git push`,
    );
    span.end();
  } catch (err) {
    logger.error(`Failed to push`, err, span);
    span.end();
    throw err;
  }
}

export async function GitReset(context: Span, project: Project): Promise<void> {
  const span = OTelTracer().startSpan("GitReset", context);
  try {
    logger.info(
      `Resetting project: ${project.projectId} ${project.name}`,
      span,
    );
    await SystemCommandExecute(
      span,
      `${await GitEnv(span)} && cd ${projectParentFolder}/${
        project.projectId
      } && git reset --hard`,
    );
    span.end();
  } catch (err) {
    logger.error(`Failed to reset`, err, span);
    span.end();
    throw err;
  }
}

export async function GitCreateBranch(
  context: Span,
  project: Project,
  branch: string,
): Promise<void> {
  const span = OTelTracer().startSpan("GitCreateBranch", context);
  try {
    logger.info(
      `Creating branch: ${branch} in project: ${project.projectId} ${project.name}`,
      span,
    );
    await SystemCommandExecute(
      span,
      `${await GitEnv(span)} && cd ${projectParentFolder}/${
        project.projectId
      } && git checkout -b ${branch} &&  git push --set-upstream origin ${branch} `,
    );
    span.end();
  } catch (err) {
    logger.error(`Failed to create branch`, err, span);
    span.end();
    throw err;
  }
}

export async function GitDeleteBranch(
  context: Span,
  project: Project,
  branch: string,
): Promise<void> {
  const span = OTelTracer().startSpan("GitDeleteBranch", context);
  try {
    logger.info(
      `Deleting branch: ${branch} in project: ${project.projectId} ${project.name}`,
      span,
    );
    // Determine default branch (main or master)
    const gitEnv = await GitEnv(span);
    const projectPath = `${projectParentFolder}/${project.projectId}`;
    const branchList = await SystemCommandExecute(
      span,
      `${gitEnv} && cd ${projectPath} && git branch -a`,
    );
    let defaultBranch = "main";
    if (!branchList.split("\n").some((b) => b.includes("main"))) {
      defaultBranch = "master";
    }
    await SystemCommandExecute(
      span,
      `${gitEnv} && cd ${projectPath} && git checkout ${defaultBranch}`,
    );
    await SystemCommandExecute(
      span,
      `${gitEnv} && cd ${projectPath} && git branch -D ${branch} && git push origin --delete ${branch}`,
    );
    span.end();
  } catch (err) {
    logger.error(`Failed to delete branch`, err, span);
    span.end();
    throw err;
  }
}

export async function GitGetFileFromHead(
  context: Span,
  project: Project,
  filePath: string,
): Promise<string> {
  const span = OTelTracer().startSpan("GitGetFileFromHead", context);
  try {
    const projectPath = `${projectParentFolder}/${project.projectId}`;
    const safePath = filePath.replace(/"/g, '\\"');
    const content = await SystemCommandExecute(
      span,
      `${await GitEnv(span)} && cd ${projectPath} && git show HEAD:"${safePath}"`,
    );
    span.end();
    return content;
  } catch {
    // File may not exist in HEAD (new file). Return empty string.
    logger.warn(`File not in HEAD or read failed: ${filePath}`, span);
    span.end();
    return "";
  }
}

export async function GitDiscardFile(
  context: Span,
  project: Project,
  filePath: string,
): Promise<void> {
  const span = OTelTracer().startSpan("GitDiscardFile", context);
  try {
    logger.info(
      `Discarding changes for file: ${filePath} in project: ${project.projectId}`,
      span,
    );
    const projectPath = `${projectParentFolder}/${project.projectId}`;
    const safePath = filePath.replace(/"/g, '\\"');
    // Reset any staged changes for the file, then checkout from HEAD.
    // For untracked (new) files, remove the working tree file.
    await SystemCommandExecute(
      span,
      `${await GitEnv(span)} && cd ${projectPath} && git reset -- "${safePath}" || true`,
    );
    // Check if file is tracked.
    let isTracked = true;
    try {
      await SystemCommandExecute(
        span,
        `${await GitEnv(span)} && cd ${projectPath} && git ls-files --error-unmatch "${safePath}"`,
      );
    } catch {
      isTracked = false;
    }
    if (isTracked) {
      await SystemCommandExecute(
        span,
        `${await GitEnv(span)} && cd ${projectPath} && git checkout HEAD -- "${safePath}"`,
      );
    } else {
      await SystemCommandExecute(
        span,
        `cd ${projectPath} && rm -rf "${safePath}"`,
      );
    }
    span.end();
  } catch (err) {
    logger.error(`Failed to discard file: ${filePath}`, err, span);
    span.end();
    throw err;
  }
}

export async function GitGetBranchStatus(
  context: Span,
  project: Project,
): Promise<{ behind: number; ahead: number }> {
  const span = OTelTracer().startSpan("GitGetBranchStatus", context);
  try {
    const gitEnv = await GitEnv(span);
    const projectPath = `${projectParentFolder}/${project.projectId}`;
    const currentBranch = await GitGetBranchCurrent(span, project);
    await SystemCommandExecute(
      span,
      `${gitEnv} && cd ${projectPath} && git fetch origin`,
    );
    try {
      await SystemCommandExecute(
        span,
        `${gitEnv} && cd ${projectPath} && git rev-parse --verify origin/${currentBranch}`,
      );
    } catch {
      span.end();
      return { behind: 0, ahead: 0 };
    }
    const behindOutput = await SystemCommandExecute(
      span,
      `${gitEnv} && cd ${projectPath} && git rev-list --count HEAD..origin/${currentBranch}`,
    );
    const behind = parseInt(behindOutput.trim()) || 0;
    const aheadOutput = await SystemCommandExecute(
      span,
      `${gitEnv} && cd ${projectPath} && git rev-list --count origin/${currentBranch}..HEAD`,
    );
    const ahead = parseInt(aheadOutput.trim()) || 0;

    span.end();
    return { behind, ahead };
  } catch (err) {
    logger.error(`Failed to get branch status`, err, span);
    span.end();
    throw err;
  }
}

// Private Function

async function GitConfigUser(
  context: Span,
  userName: string,
  userEmail: string,
): Promise<void> {
  const span = OTelTracer().startSpan("GitConfigUser", context);
  try {
    logger.info(
      `Setting global git user: ${userName}, email: ${userEmail}`,
      span,
    );
    await SystemCommandExecute(
      span,
      `git config --global user.name "${userName}"`,
    );
    await SystemCommandExecute(
      span,
      `git config --global user.email "${userEmail}"`,
    );
    span.end();
  } catch (err) {
    logger.error(`Failed to set git user config`, err, span);
    span.end();
    throw err;
  }
}

async function GitEnv(context: Span): Promise<string> {
  const span = OTelTracer().startSpan("GitEnv", context);
  const privateKeyPath = await SSHGetPrivateKeyPath(span);
  span.end();
  return `export GIT_SSH_COMMAND='ssh -i ${privateKeyPath} -o StrictHostKeyChecking=no'`;
}
