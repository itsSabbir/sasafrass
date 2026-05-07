import { render } from "./render";
import { segment } from "./segmenter";
import type { CleanResult } from "./types";

export type { CleanResult, CleanStats, RemovedCategory, RemovedSegment } from "./types";

export function cleanSasCode(input: string): CleanResult {
  const segments = segment(input);
  return render(input, segments);
}
