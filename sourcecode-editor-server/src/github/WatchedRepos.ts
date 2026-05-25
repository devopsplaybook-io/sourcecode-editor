import * as fse from "fs-extra";
import * as path from "path";
import { Config } from "../Config";
import { OTelLogger } from "../OTelContext";

const logger = OTelLogger().createModuleLogger("WatchedRepos");

export interface WatchedRepoEntry {
  org: string;
  repo: string;
}

export interface WatchedRepoData {
  watched: WatchedRepoEntry[];
}

let config: Config;

export function WatchedReposInit(configIn: Config): void {
  config = configIn;
}

function getFilePath(): string {
  return path.join(config.DATA_DIR, "github", "watched-repos.json");
}

export async function getWatchedRepos(): Promise<WatchedRepoEntry[]> {
  try {
    const filePath = getFilePath();
    if (!(await fse.pathExists(filePath))) {
      return [];
    }
    const data: WatchedRepoData = await fse.readJson(filePath);
    return data.watched || [];
  } catch (err) {
    logger.error("Failed to read watched repos", err);
    return [];
  }
}

export async function addWatchedRepo(org: string, repo: string): Promise<void> {
  const filePath = getFilePath();
  await fse.ensureDir(path.dirname(filePath));

  let data: WatchedRepoData = { watched: [] };
  if (await fse.pathExists(filePath)) {
    try {
      data = await fse.readJson(filePath);
    } catch {
      data = { watched: [] };
    }
  }

  // Deduplicate
  const exists = data.watched.some((w) => w.org === org && w.repo === repo);
  if (!exists) {
    data.watched.push({ org, repo });
    await fse.writeJson(filePath, data, { spaces: 2 });
    logger.info(`Added watched repo: ${org}/${repo}`);
  }
}

export async function removeWatchedRepo(
  org: string,
  repo: string,
): Promise<void> {
  const filePath = getFilePath();
  if (!(await fse.pathExists(filePath))) {
    return;
  }

  try {
    const data: WatchedRepoData = await fse.readJson(filePath);
    data.watched = data.watched.filter(
      (w) => !(w.org === org && w.repo === repo),
    );
    await fse.writeJson(filePath, data, { spaces: 2 });
    logger.info(`Removed watched repo: ${org}/${repo}`);
  } catch (err) {
    logger.error(`Failed to remove watched repo ${org}/${repo}`, err);
  }
}

export async function isRepoWatched(
  org: string,
  repo: string,
): Promise<boolean> {
  const repos = await getWatchedRepos();
  return repos.some((w) => w.org === org && w.repo === repo);
}
