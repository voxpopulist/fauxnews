import mod from './_data/samples.js';
const data = typeof mod === 'function' ? await mod() : mod;
console.log(JSON.stringify({ keys: Object.keys(data || {}), samplesCount: (data.samples || []).length, hasTagCloud: Array.isArray(data.tagCloud), cwd: process.cwd() }, null, 2));
