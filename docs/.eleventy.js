export default function(eleventyConfig) {
  // Determine pathPrefix dynamically to support GitHub Pages project sites
  // Defaults to '/' for local dev and root-hosted sites.
  let dynamicPathPrefix = '/';
  try {
    const repo = process.env.GITHUB_REPOSITORY || '';
    const isActions = process.env.GITHUB_ACTIONS === 'true';
    // If running in GitHub Actions and not a user/org site (i.e., not *.github.io),
    // use '/<repo>/' so all Eleventy url filters output correct absolute paths
    if (isActions && repo) {
      const [, repoName] = repo.split('/');
      if (repoName && !repoName.endsWith('.github.io')) {
        dynamicPathPrefix = `/${repoName}/`;
      }
    }
    // Allow overriding via env var PATH_PREFIX if explicitly set
    if (process.env.PATH_PREFIX) {
      dynamicPathPrefix = process.env.PATH_PREFIX;
    }
  } catch {}
  // Ensure audio/transcript assets are included in the built site
  eleventyConfig.addPassthroughCopy({ samples: 'samples' });
  // Passthrough for built assets from /public (css/js)
  eleventyConfig.addPassthroughCopy({ public: '.' });
  // Passthrough root-level favicon so it lives at /favicon.ico in the output
  eleventyConfig.addPassthroughCopy('favicon.ico');
  // Passthrough Open Graph image for social media previews
  eleventyConfig.addPassthroughCopy('og-image.png');

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
    pathPrefix: dynamicPathPrefix,
    htmlTemplateEngine: 'njk',
    dataTemplateEngine: 'njk',
    markdownTemplateEngine: 'njk'
  };
}
