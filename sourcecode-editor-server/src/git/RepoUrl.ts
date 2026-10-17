// Format-only repository URL validation. The URL is interpolated into
// `git clone` command strings, so the accepted character set is
// deliberately conservative: no whitespace or shell metacharacters.
const GIT_URL_HTTPS_PATTERN =
  /^https?:\/\/[A-Za-z0-9._~-]+(:\d+)?(\/[A-Za-z0-9._~:%@+-]*)*\/?$/i;
const GIT_URL_SSH_PATTERN =
  /^ssh:\/\/([A-Za-z0-9._~-]+@)?[A-Za-z0-9._~-]+(:\d+)?(\/[A-Za-z0-9._~:%+-]*)+\/?$/i;
const GIT_URL_SCP_PATTERN =
  /^[A-Za-z0-9._~-]+@[A-Za-z0-9._~-]+:[A-Za-z0-9._~:%@+/-]+$/;

export function RepoUrlIsValid(url: unknown): boolean {
  if (typeof url !== "string") {
    return false;
  }
  const trimmed = url.trim();
  if (trimmed.length === 0) {
    return false;
  }
  return (
    GIT_URL_HTTPS_PATTERN.test(trimmed) ||
    GIT_URL_SSH_PATTERN.test(trimmed) ||
    GIT_URL_SCP_PATTERN.test(trimmed)
  );
}

export function RepoUrlNameFromUrl(url: unknown): string {
  if (typeof url !== "string") {
    return "";
  }
  const trimmed = url.trim().replace(/\/+$/, "");
  const lastSegment = trimmed.split("/").pop() || "";
  return lastSegment.replace(/\.git$/i, "");
}
