import { Span } from "@opentelemetry/sdk-trace";
import * as jwt from "jsonwebtoken";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import { Config } from "../Config";
import { User } from "../model/User";
import { UserSession } from "../model/UserSession";
import { SqlDbUtilsQuerySQL } from "../utils-std-ts/SqlDbUtils";
import { OTelLogger, OTelTracer } from "../OTelContext";

const logger = OTelLogger().createModuleLogger(path.basename(__filename));
let config: Config;

export async function AuthInit(context: Span, configIn: Config) {
  config = configIn;
  const span = OTelTracer().startSpan("AuthInit", context);
  const authKeyRaw = SqlDbUtilsQuerySQL(
    span,
    "SELECT * FROM metadata WHERE type=?",
    ["auth_token"],
  );
  if (authKeyRaw.length == 0) {
    configIn.JWT_KEY = uuidv4();
    SqlDbUtilsQuerySQL(
      span,
      "INSERT INTO metadata (type, value, dateCreated) VALUES (?, ?, ?)",
      ["auth_token", configIn.JWT_KEY, new Date().toISOString()],
    );
  } else {
    configIn.JWT_KEY = authKeyRaw[0].value;
  }
  span.end();
}

export async function AuthGenerateJWT(
  user: User,
  sessionStartedAt?: number,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const startedAt = sessionStartedAt ?? now;
  const sessionMaxDuration = AuthGetSessionMaxDuration();
  const expiresAt =
    sessionMaxDuration > 0
      ? Math.min(now + AuthGetValidityDuration(), startedAt + sessionMaxDuration)
      : now + AuthGetValidityDuration();
  return jwt.sign(
    {
      exp: expiresAt,
      sessionStartedAt: startedAt,
      userId: user.id,
      userName: user.name,
    },
    config.JWT_KEY,
  );
}

// Fallbacks used when AuthInit receives a partial configuration (tests) or a
// deployment omits the values: the adopted 30-day / 90-day session policy.
const DEFAULT_JWT_VALIDITY_DURATION = 2592000;
const DEFAULT_JWT_SESSION_MAX_DURATION = 7776000;

export function AuthGetValidityDuration(): number {
  const value = Number(config?.JWT_VALIDITY_DURATION);
  return Number.isFinite(value) && value > 0
    ? value
    : DEFAULT_JWT_VALIDITY_DURATION;
}

/** Absolute session lifetime in seconds; `<= 0` disables the cap. */
export function AuthGetSessionMaxDuration(): number {
  const value = Number(config?.JWT_SESSION_MAX_DURATION);
  return Number.isFinite(value) ? value : DEFAULT_JWT_SESSION_MAX_DURATION;
}

/**
 * Start of the absolute session: the explicit `sessionStartedAt` claim, with
 * `iat` as fallback for tokens issued before this claim existed.
 */
export function AuthGetSessionStart(
  info: jwt.JwtPayload,
): number | undefined {
  if (typeof info.sessionStartedAt === "number") {
    return info.sessionStartedAt;
  }
  return typeof info.iat === "number" ? info.iat : undefined;
}

/**
 * A session exceeds JWT_SESSION_MAX_DURATION since the first login: every
 * token of it is rejected so the user has to sign in again. An unknown start
 * is not considered expired.
 */
export function AuthIsSessionExpired(
  info: jwt.JwtPayload,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  const sessionMaxDuration = AuthGetSessionMaxDuration();
  if (sessionMaxDuration <= 0) {
    return false;
  }
  const startedAt = AuthGetSessionStart(info);
  if (startedAt === undefined) {
    return false;
  }
  return nowSeconds >= startedAt + sessionMaxDuration;
}

/**
 * Session start of the caller's token, for re-issuing it without extending
 * the absolute session cap. Undefined when the request has no valid token.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function AuthGetSessionStartedAt(req: any): number | undefined {
  if (!req.headers.authorization) {
    return undefined;
  }
  const parts = req.headers.authorization.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return undefined;
  }
  try {
    const info = jwt.verify(parts[1], config.JWT_KEY) as jwt.JwtPayload;
    return AuthGetSessionStart(info);
  } catch {
    return undefined;
  }
}

export async function AuthMustBeAuthenticated(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  req: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  res: any,
): Promise<void> {
  let authenticated = false;
  if (req.headers.authorization) {
    try {
      jwt.verify(req.headers.authorization.split(" ")[1], config.JWT_KEY);
      authenticated = true;
    } catch {
      authenticated = false;
    }
  }
  if (!authenticated) {
    res.status(403).send({ error: "Access Denied" });
    throw new Error("Access Denied");
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function AuthGetUserSession(req: any): Promise<UserSession> {
  const userSession: UserSession = { isAuthenticated: false };
  if (req.headers.authorization) {
    try {
      const info = jwt.verify(
        req.headers.authorization.split(" ")[1],
        config.JWT_KEY,
      ) as jwt.JwtPayload;
      if (AuthIsSessionExpired(info)) {
        logger.warn(
          `Session exceeded its absolute lifetime for user: ${info.userName}`,
        );
        return userSession;
      }
      userSession.userId = info.userId;
      userSession.isAuthenticated = true;
    } catch (err) {
      logger.error("Error Getting Session", err);
    }
  }
  return userSession;
}
