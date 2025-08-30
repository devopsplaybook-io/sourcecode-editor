import { Span } from "@opentelemetry/sdk-trace-base";
import { Project } from "../model/Project";
import {
  SqlDbUtilsExecSQL,
  SqlDbUtilsQuerySQL,
} from "../utils-std-ts/SqlDbUtils";
import { OTelTracer } from "../OTelContext";

export async function ProjectsDataGet(
  context: Span,
  projectId: string
): Promise<Project> {
  const span = OTelTracer().startSpan("ProjectsDataGet", context);
  const projectsRaw = await SqlDbUtilsQuerySQL(
    span,
    "SELECT * FROM projects WHERE projectId=?",
    [projectId]
  );
  let project: Project = null;
  if (projectsRaw.length > 0) {
    project = new Project(projectsRaw[0]);
  }
  span.end();
  return project;
}

export async function ProjectsDataList(context: Span): Promise<Project[]> {
  const span = OTelTracer().startSpan("ProjectsDataList", context);
  const projectsRaw = await SqlDbUtilsQuerySQL(span, "SELECT * FROM projects");
  const projects = [];
  for (const projectRaw of projectsRaw) {
    projects.push(new Project(projectRaw));
  }
  span.end();
  return projects;
}

export async function ProjectsDataAdd(
  context: Span,
  project: Project
): Promise<void> {
  const span = OTelTracer().startSpan("ProjectsDataAdd", context);
  await SqlDbUtilsExecSQL(
    span,
    "INSERT INTO projects (projectId,name,info) VALUES (?, ?, ?)",
    [project.projectId, project.name, JSON.stringify(project.info)]
  );
  span.end();
}

export async function ProjectsDataUpdate(
  context: Span,
  project: Project
): Promise<void> {
  const span = OTelTracer().startSpan("ProjectsDataUpdate", context);
  await SqlDbUtilsExecSQL(
    span,
    "UPDATE projects SET name = ?, info = ? WHERE projectId = ? ",
    [project.name, JSON.stringify(project.info), project.projectId]
  );
  span.end();
}
