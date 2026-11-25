import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthService } from "../services/AuthService";
import {
  SESSION_RENEWAL_MAX_DELAY_MS,
  SESSION_RENEWAL_MIN_DELAY_MS,
  SessionRenewalDelayMs,
  SessionRenewalIsDue,
  SessionRenewalRefresh,
} from "../services/SessionRenewal";

const NOW_MS = 1_700_000_000_000;
const NOW_SECONDS = NOW_MS / 1000;
const DAY_SECONDS = 24 * 60 * 60;

function createLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, String(value));
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => store.clear()),
  };
}

describe("session renewal", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal("localStorage", createLocalStorage());
  });

  it("is not due while more than 20% of the lifetime remains", () => {
    const claims = {
      iat: NOW_SECONDS,
      exp: NOW_SECONDS + 30 * DAY_SECONDS,
    };
    expect(SessionRenewalIsDue(claims, NOW_MS)).toBe(false);
    expect(SessionRenewalIsDue(claims, NOW_MS + 24 * DAY_SECONDS * 1000)).toBe(
      true,
    );
  });

  it("ignores tokens without iat or exp", () => {
    expect(SessionRenewalIsDue({ exp: NOW_SECONDS + 100 }, NOW_MS)).toBe(false);
    expect(SessionRenewalIsDue({}, NOW_MS)).toBe(false);
  });

  it("schedules the timer at the 20% remaining threshold", () => {
    const claims = {
      iat: NOW_SECONDS,
      exp: NOW_SECONDS + 10 * 60 * 60,
    };
    expect(SessionRenewalDelayMs(claims, NOW_MS)).toBe(8 * 60 * 60 * 1000);
  });

  it("clamps the delay to sane bounds", () => {
    expect(SessionRenewalDelayMs({}, NOW_MS)).toBe(SESSION_RENEWAL_MAX_DELAY_MS);
    expect(
      SessionRenewalDelayMs(
        { iat: NOW_SECONDS - 100, exp: NOW_SECONDS + 1 },
        NOW_MS,
      ),
    ).toBe(SESSION_RENEWAL_MIN_DELAY_MS);
  });

  it("refreshes through POST /users/session and saves the new token", async () => {
    const token =
      "eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjQxMDI0NDQ4MDB9.c2lnbmF0dXJl";
    await AuthService.saveToken(token);
    const post = vi.spyOn(axios, "post").mockResolvedValueOnce({
      data: {
        token: "eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjQxMDI0NDQ4MDB9.cmVuZXdlZA",
      },
    });

    await expect(SessionRenewalRefresh()).resolves.toBe(
      "eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjQxMDI0NDQ4MDB9.cmVuZXdlZA",
    );

    expect(post).toHaveBeenCalledWith(
      "/api/users/session",
      {},
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(await AuthService.getToken()).toBe(
      "eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjQxMDI0NDQ4MDB9.cmVuZXdlZA",
    );
  });
});
