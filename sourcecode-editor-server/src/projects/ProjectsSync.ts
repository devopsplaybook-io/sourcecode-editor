import { SpanStatusCode } from "@opentelemetry/api";
import { Span } from "@opentelemetry/sdk-trace-base";
import { Config } from "../Config";
import {
  GitGetBranchCurrent,
  GitGetBranchStatus,
  GitListBranches,
  GitListModifiedFiles,
} from "../git/Git";
import { Project } from "../model/Project";
import { ProjectStatus } from "../model/ProjectStatus";
import { OTelLogger, OTelTracer } from "../OTelContext";
import { ProjectsDataList } from "./ProjectsData";

const logger = OTelLogger().createModuleLogger("ProjectsSync");
let config: Config;
const projectStatuses: ProjectStatus[] = [];

export async function ProjectsSyncInit(
  context: Span,
  configIn: Config
): Promise<void> {
  const span = OTelTracer().startSpan("ProjectsSyncInit", context);
  config = configIn;
  setInterval(() => {
    ProjectsSyncStart(span);
  }, config.PROJECTS_SYNC_FREQUENCY);
  ProjectsSyncStart(span);
  span.end();
}

export async function ProjectsSyncStart(context: Span): Promise<void> {
  const span = OTelTracer().startSpan("ProjectsSyncStart", context);

  const projects = await ProjectsDataList(span);

  const projectIds = new Set(projects.map((p) => p.projectId));
  for (let i = projectStatuses.length - 1; i >= 0; i--) {
    if (!projectIds.has(projectStatuses[i].projectId)) {
      projectStatuses.splice(i, 1);
    }
  }

  for (const project of projects) {
    await ProjectsSyncStartProject(span, project);
  }

  span.end();
}

export async function ProjectsSyncStartProject(
  context: Span,
  project: Project
): Promise<void> {
  const span = OTelTracer().startSpan("ProjectsSyncStartProject", context);
  logger.info(
    `Starting sync for project: ${project.projectId} ${project.name}`,
    span
  );
  try {
    const projectStatus = new ProjectStatus({ projectId: project.projectId });

    projectStatus.branches = await GitListBranches(span, project);

    projectStatus.currentBranch = await GitGetBranchCurrent(span, project);
    const idx = projectStatuses.findIndex(
      (ps) => ps.projectId === projectStatus.projectId
    );
    if (idx !== -1) {
      projectStatuses[idx] = projectStatus;
    } else {
      projectStatuses.push(projectStatus);
    }

    projectStatus.filesUpdateStatus = await GitListModifiedFiles(span, project);

    projectStatus.branchStatus = await GitGetBranchStatus(span, project);
  } catch (err) {
    logger.error(
      `Project sync failed for project: ${project.projectId}`,
      err,
      span
    );
    span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
  }
  span.end();
}

export async function ProjectsSyncGetStatusProject(
  context: Span,
  projectId: string
): Promise<ProjectStatus | null> {
  const span = OTelTracer().startSpan("ProjectsSyncGetStatus", context);
  const projectStatus =
    projectStatuses.find((ps) => ps.projectId === projectId) || null;
  span.end();
  return projectStatus;
}
