import type { ChannelSetupInput } from "openclaw/plugin-sdk/channel-setup";
import { createPatchedAccountSetupAdapter } from "openclaw/plugin-sdk/setup";

const channel = "campfire" as const;

function trimOptionalString(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeCampfireBaseUrl(value: string | undefined): string {
  return (trimOptionalString(value) ?? "").replace(/\/+$/u, "");
}

function resolveCampfireBaseUrl(input: ChannelSetupInput): string {
  return normalizeCampfireBaseUrl(input.httpUrl ?? input.url);
}

function resolveCampfireBotKey(input: ChannelSetupInput): string {
  return trimOptionalString(input.botToken ?? input.token) ?? "";
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export const campfireSetupAdapter = createPatchedAccountSetupAdapter({
  channelKey: channel,
  validateInput: ({ input }) => {
    const baseUrl = resolveCampfireBaseUrl(input);
    const botKey = resolveCampfireBotKey(input);
    if (!baseUrl || !botKey) {
      return "Campfire requires --http-url (or --url) and --bot-token (or --token).";
    }
    if (!isHttpUrl(baseUrl)) {
      return "Campfire --http-url/--url must be a valid http(s) URL.";
    }
    return null;
  },
  buildPatch: (input) => {
    const baseUrl = resolveCampfireBaseUrl(input);
    const botKey = resolveCampfireBotKey(input);
    const webhookPath = trimOptionalString(input.webhookPath);
    return {
      ...(baseUrl ? { baseUrl } : {}),
      ...(botKey ? { botKey } : {}),
      ...(webhookPath ? { webhookPath } : {}),
    };
  },
});
