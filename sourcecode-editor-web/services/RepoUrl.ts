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
