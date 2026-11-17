import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Page from "../app/page";

describe("home page", () => {
  it("renders the heading and the locked promise", () => {
    const html = renderToStaticMarkup(createElement(Page));
    expect(html).toContain("<h1");
    expect(html).toContain("Outpost");
    expect(html).toContain("cheapest safe fix");
    expect(html).toContain("including the days it lost");
  });
});
