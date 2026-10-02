import { bbc } from './bbc.js';
import { gdacs } from './gdacs.js';
import type { Source } from './types.js';
import { unNews } from './un-news.js';
import { usgs } from './usgs.js';

// The source registry. Adding a source is one module plus one line here.
export const sources: Source[] = [usgs, gdacs, bbc, unNews];
