const mockWarn = jest.fn();
jest.mock("jsonwebtoken", () => ({
  sign: jest.fn(),
  verify: jest.fn(),
}));
jest.mock("../utils-std-ts/SqlDbUtils", () => ({
  SqlDbUtilsQuerySQL: jest.fn(() => []),
}));
jest.mock("../OTelContext", () => ({
  OTelTracer: () => ({ startSpan: () => ({ end: jest.fn() }) }),
  OTelLogger: () => ({
    createModuleLogger: () => ({
      info: jest.fn(),
      warn: (...args: unknown[]) => mockWarn(...args),
      error: jest.fn(),
    }),
  }),
}));

import * as jwt from "jsonwebtoken";
import { Config } from "../Config";
import {
  AuthGenerateJWT,
  AuthGetSessionMaxDuration,
  AuthGetSessionStartedAt,
  AuthGetSessionStart,
  AuthGetUserSession,
  AuthGetValidityDuration,
  AuthInit,
  AuthIsSessionExpired,
} from "./Auth";

const JWT_KEY = "strong-signing-key-123456789012345";

function policyConfig(): Config {
  const config = new Config();
  config.JWT_KEY = JWT_KEY;
  config.JWT_VALIDITY_DURATION = 2592000;
  config.JWT_SESSION_MAX_DURATION = 7776000;
  return config;
}

describe("session policy", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AuthInit(undefined as never, policyConfig());
  });

  test("exposes the configured validity and cap", () => {
    expect(AuthGetValidityDuration()).toBe(2592000);
    expect(AuthGetSessionMaxDuration()).toBe(7776000);
  });

  test("caps a renewed token at the absolute session lifetime", async () => {
    const now = Math.floor(Date.now() / 1000);
    const sessionStartedAt = now - 80 * 24 * 60 * 60;
    (jwt.sign as jest.Mock).mockReturnValueOnce("capped-token");

    await AuthGenerateJWT({ id: "user-1", name: "admin" } as never, sessionStartedAt);

    const payload = (jwt.sign as jest.Mock).mock.calls[0][0];
    expect(payload.sessionStartedAt).toBe(sessionStartedAt);
    expect(payload.exp).toBe(sessionStartedAt + 7776000);
    expect(payload.exp).toBeLessThan(now + 2592000);
  });

  test("issues a 30-day token on a fresh login", async () => {
    const now = Math.floor(Date.now() / 1000);
    (jwt.sign as jest.Mock).mockReturnValueOnce("fresh-token");

    await AuthGenerateJWT({ id: "user-1", name: "admin" } as never);

    const payload = (jwt.sign as jest.Mock).mock.calls[0][0];
    expect(payload.sessionStartedAt).toBeGreaterThanOrEqual(now);
    expect(payload.exp - payload.sessionStartedAt).toBe(2592000);
  });

  test("falls back to iat for tokens without a session start claim", () => {
    expect(AuthGetSessionStart({ iat: 1000 })).toBe(1000);
    expect(AuthGetSessionStart({ iat: 1000, sessionStartedAt: 500 })).toBe(500);
    expect(AuthGetSessionStart({})).toBeUndefined();
  });

  test("rejects sessions past the absolute session lifetime", async () => {
    const sessionStartedAt = Math.floor(Date.now() / 1000) - 91 * 24 * 60 * 60;
    (jwt.verify as jest.Mock).mockReturnValueOnce({
      iat: sessionStartedAt,
      sessionStartedAt,
      userId: "user-1",
      userName: "admin",
    });

    const session = await AuthGetUserSession({
      headers: { authorization: "Bearer aaa.bbb.ccc" },
    });

    expect(session.isAuthenticated).toBe(false);
    expect(mockWarn).toHaveBeenCalledWith(
      "Session exceeded its absolute lifetime for user: admin",
    );
  });

  test("accepts sessions within the absolute lifetime", async () => {
    const sessionStartedAt = Math.floor(Date.now() / 1000) - 10 * 24 * 60 * 60;
    (jwt.verify as jest.Mock).mockReturnValueOnce({
      iat: sessionStartedAt,
      sessionStartedAt,
      userId: "user-1",
      userName: "admin",
    });

    const session = await AuthGetUserSession({
      headers: { authorization: "Bearer aaa.bbb.ccc" },
    });

    expect(session).toEqual({ isAuthenticated: true, userId: "user-1" });
  });

  test("preserves the session start when re-issuing a token", () => {
    const sessionStartedAt = Math.floor(Date.now() / 1000) - 5 * 24 * 60 * 60;
    (jwt.verify as jest.Mock).mockReturnValueOnce({ sessionStartedAt });

    expect(
      AuthGetSessionStartedAt({
        headers: { authorization: "Bearer aaa.bbb.ccc" },
      }),
    ).toBe(sessionStartedAt);
  });

  test("treats expiration as a function of the known session start", () => {
    const now = Math.floor(Date.now() / 1000);
    expect(AuthIsSessionExpired({ sessionStartedAt: now - 89 * 86400 }, now)).toBe(
      false,
    );
    expect(AuthIsSessionExpired({ sessionStartedAt: now - 91 * 86400 }, now)).toBe(
      true,
    );
    expect(AuthIsSessionExpired({}, now)).toBe(false);
  });
});
