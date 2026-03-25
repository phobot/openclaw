import { afterEach, describe, expect, it, vi } from "vitest";
import { chunkCampfireText, sendCampfireReply, sendCampfireText } from "./send.js";

describe("sendCampfireReply", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends a plain text POST request with bot authorization", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await sendCampfireReply(
      "https://campfire.example.com/rooms/7/key/messages",
      "Hello world",
      "42-AbCdEf",
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://campfire.example.com/rooms/7/key/messages",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer 42-AbCdEf",
          "Content-Type": "text/plain; charset=utf-8",
        },
        body: "Hello world",
      }),
    );
  });

  it("omits Authorization header when botKey is empty", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await sendCampfireReply("https://campfire.example.com/rooms/7/key/messages", "Hello world");

    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
    expect(headers["Content-Type"]).toBe("text/plain; charset=utf-8");
  });

  it("throws when Campfire rejects the message", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("no", {
        status: 403,
        statusText: "Forbidden",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      sendCampfireReply("https://campfire.example.com/rooms/7/key/messages", "Hello world"),
    ).rejects.toThrow("Campfire reply failed: 403 Forbidden");
  });
});

describe("chunkCampfireText", () => {
  it("returns a single chunk for text within the limit", () => {
    expect(chunkCampfireText("hello", 10)).toEqual(["hello"]);
  });

  it("returns an empty-string chunk for empty input", () => {
    expect(chunkCampfireText("")).toEqual([""]);
  });

  it("falls back to chunk size 1 for non-positive limits", () => {
    expect(chunkCampfireText("abc", 0)).toEqual(["a", "b", "c"]);
    expect(chunkCampfireText("ab", -5)).toEqual(["a", "b"]);
  });

  it("falls back to chunk size 1 for non-finite limits", () => {
    expect(chunkCampfireText("ab", Number.NaN)).toEqual(["a", "b"]);
    expect(chunkCampfireText("ab", Number.POSITIVE_INFINITY)).toEqual(["a", "b"]);
  });

  it("floors fractional chunk limits", () => {
    expect(chunkCampfireText("abcde", 2.9)).toEqual(["ab", "cd", "e"]);
  });
});

describe("sendCampfireText", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends long replies in deterministic chunks", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await sendCampfireText(
      "https://campfire.example.com/rooms/7/key/messages",
      "abcdefghij",
      "42-AbCdEf",
      4,
    );

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        body: "abcd",
      }),
    );
    expect(fetchMock.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({
        body: "efgh",
      }),
    );
    expect(fetchMock.mock.calls[2]?.[1]).toEqual(
      expect.objectContaining({
        body: "ij",
      }),
    );
  });
});
