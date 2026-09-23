import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

describe("next.config redirects", () => {
  it("sends the old trade-history page to reports on the server, permanently, in every language", async () => {
    const redirects = await nextConfig.redirects?.();
    expect(redirects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "/:locale(en|es|fr|de)/trade-history",
          destination: "/:locale/reports",
          permanent: true,
        }),
        expect.objectContaining({
          source: "/trade-history",
          destination: "/reports",
          permanent: true,
        }),
      ]),
    );
  });
});
