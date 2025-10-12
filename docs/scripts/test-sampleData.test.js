import assert from 'assert';
import { parseTranscriptVtt } from '../_data/_lib/sampleData.mjs';
import { test } from 'uvu';

test('parseTranscriptVtt parses a simple VTT', () => {
  const vtt = `WEBVTT\n\n00:00:01.000 --> 00:00:04.000\nHello world!\n\n00:00:05.000 --> 00:00:07.000\nTest line.`;
  const result = parseTranscriptVtt(vtt);
  assert(Array.isArray(result));
  assert(result.length === 2);
  assert(result[0].text.includes('Hello world'));
});

test.run();
