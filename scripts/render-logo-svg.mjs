import { readFileSync, writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";

const [, , inputName, outputName] = process.argv;
if (!inputName || !outputName) {
  throw new Error("usage: node render-logo-svg.mjs INPUT.svg OUTPUT.png");
}

const renderer = new Resvg(readFileSync(inputName), {
  fitTo: { mode: "original" },
});
writeFileSync(outputName, renderer.render().asPng());
