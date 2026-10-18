// Mirror of sourcecode-editor-server/src/git/RepoUrl.ts — keep the
// validation rules in sync (the two packages do not share TS modules).

const GIT_URL_HTTPS_PATTERN =
  /^https?:\/\/[A-Za-z0-9._~-]+(:\d+)?(\/[A-Za-z0-9._~:%@+-]*)*\/?$/i;
const GIT_URL_SSH_PATTERN =
  /^ssh:\/\/([A-Za-z0-9._~-]+@)?[A-Za-z0-9._~-]+(:\d+)?(\/[A-Za-z0-9._~:%+-]*)+\/?$/i;
const GIT_URL_SCP_PATTERN =
  /^[A-Za-z0-9._~-]+@[A-Za-z0-9._~-]+:[A-Za-z0-9._~:%@+/-]+$/;

export function RepoUrlIsValid(url: string): boolean {
  const trimmed = (url || "").trim();
  if (trimmed.length === 0) {
    return false;
  }
  return (
    GIT_URL_HTTPS_PATTERN.test(trimmed) ||
    GIT_URL_SSH_PATTERN.test(trimmed) ||
    GIT_URL_SCP_PATTERN.test(trimmed)
  );
}

export function RepoUrlNameFromUrl(url: string): string {
  const trimmed = (url || "").trim().replace(/\/+$/, "");
  const lastSegment = trimmed.split("/").pop() || "";
  return lastSegment.replace(/\.git$/i, "");
}

export function RepoUrlOwnerRepoFromUrl(
  url: string,
): { owner: string; repo: string } | null {
  const trimmed = (url || "").trim().replace(/\/+$/, "");
  if (trimmed.length === 0) {
    return null;
  }

  // https://github.com/owner/repo or ssh://git@github.com[:port]/owner/repo
  const protocolMatch = trimmed.match(/^https?:\/\/github\.com\/(.+)$/i);
  const sshMatch = trimmed.match(
    /^ssh:\/\/(?:[^@/]+@)?github\.com(?::\d+)?\/(.+)$/i,
  );
  const pathMatch = protocolMatch
    ? protocolMatch[1]
    : sshMatch
      ? sshMatch[1]
      : null;

  let segments: string[];
  if (pathMatch) {
    segments = pathMatch.split("/").filter((s) => s.length > 0);
  } else {
    // git@github.com:owner/repo (scp-like)
    const scpMatch = trimmed.match(/^[^@/]+@github\.com:(.+)$/);
    if (!scpMatch) {
      return null;
    }
    segments = scpMatch[1].split("/").filter((s) => s.length > 0);
  }

  if (segments.length < 2) {
    return null;
  }
  const owner = segments[0];
  const repo = segments[1].replace(/\.git$/i, "");
  if (owner.length === 0 || repo.length === 0) {
    return null;
  }
  return { owner, repo };
}
