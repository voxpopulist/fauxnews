export default function(eleventyConfig) {
  // Ensure audio/transcript assets are included in the built site
  eleventyConfig.addPassthroughCopy({ samples: 'samples' });
  // Passthrough for built assets from /public (css/js)
  eleventyConfig.addPassthroughCopy({ public: '.' });

  eleventyConfig.setServerOptions({
    port: 4321,
    domDiff: false
  });

  return {
    dir: {
      input: '.',
      includes: '_includes',
      data: '_data',
      output: '_site'
    },
    pathPrefix: '/',
    htmlTemplateEngine: 'njk',
    dataTemplateEngine: 'njk',
    markdownTemplateEngine: 'njk'
  };
}
