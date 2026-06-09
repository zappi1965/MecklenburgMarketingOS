import { describe, it, expect } from "vitest";
import { SOCIAL_CHANNELS, SOCIAL_CHANNEL_KEYS, channelLabel } from "./social";

describe("social channels", () => {
  it("keys mirror the channel definitions", () => {
    expect(SOCIAL_CHANNEL_KEYS).toHaveLength(SOCIAL_CHANNELS.length);
  });

  it("channelLabel resolves known keys and echoes unknown ones", () => {
    expect(channelLabel("instagram")).toBe("Instagram");
    expect(channelLabel("unknown")).toBe("unknown");
  });
});
