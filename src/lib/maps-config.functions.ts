import { createServerFn } from "@tanstack/react-start";
import { publicBrowserMapsKey, publicMapsTrackingId } from "./maps-config.server";

export interface MapsBrowserConfig {
  key: string;
  channel: string;
}

export const getMapsBrowserConfig = createServerFn({ method: "GET" }).handler(
  async (): Promise<MapsBrowserConfig> => ({
    key: publicBrowserMapsKey(),
    channel: publicMapsTrackingId(),
  }),
);
