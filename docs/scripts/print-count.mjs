import { loadSampleData } from '../_data/_lib/sampleData.mjs';
const { samples, tagCloud } = loadSampleData();
console.log(JSON.stringify({ samplesCount: samples.length, tagCloudCount: tagCloud.length }, null, 2));
