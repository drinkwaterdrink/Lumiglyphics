import { expect, test } from "bun:test";
import { html, raw } from "./html.js";

test("interpolated values are escaped by default", () => {
  const name = `<img src=x onerror="alert(1)">`;
  expect(html`<b>${name}</b>`.value).toBe(`<b>&lt;img src=x onerror=&quot;alert(1)&quot;&gt;</b>`);
  expect(html`<a title='${"x' y"}'>`.value).toBe(`<a title='x&#39; y'>`);
});

test("nested html values and raw() are not escaped again; arrays join without separators", () => {
  const item = (text: string) => html`<li>${text}</li>`;
  expect(html`<ul>${["a", "<b>"].map(item)}</ul>`.value).toBe("<ul><li>a</li><li>&lt;b&gt;</li></ul>");
  expect(html`${raw("<i>trusted</i>")}`.value).toBe("<i>trusted</i>");
});

test("null, undefined and false render as nothing; numbers render as text", () => {
  expect(html`[${null}${undefined}${false}${3}]`.value).toBe("[3]");
});
