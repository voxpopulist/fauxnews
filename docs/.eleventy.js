import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "public": "." });
  // Remove old styles.css passthrough since we're using Tailwind now

  eleventyConfig.setServerOptions({
    port: 4321,
    domDiff: false
  });

  return {
    dir: {
      input: ".",
      includes: "_includes",
      data: "_data",
      output: "_site"
    },
    pathPrefix: "/clipservatives/",
    htmlTemplateEngine: "njk",
    dataTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
}
