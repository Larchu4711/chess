/**
 * Web Worker für die Zugsuche. Ohne ihn würde die Oberfläche während des
 * Nachdenkens einfrieren.
 */

import { parseFen } from '../engine/fen';
import { LEVELS, searchBestMove } from './search';

export interface SearchRequest {
  id: number;
  fen: string;
  level: keyof typeof LEVELS | string;
}

export interface SearchResponse {
  id: number;
  from: number;
  to: number;
  promotion: number;
  score: number;
  depth: number;
  nodes: number;
}

self.onmessage = (event: MessageEvent<SearchRequest>) => {
  const { id, fen, level } = event.data;
  const options = LEVELS[level] ?? LEVELS.mittel;
  const result = searchBestMove(parseFen(fen), options);

  const response: SearchResponse = {
    id,
    from: result.move ? result.move.from : -1,
    to: result.move ? result.move.to : -1,
    promotion: result.move ? result.move.promotion : 0,
    score: result.score,
    depth: result.depth,
    nodes: result.nodes,
  };
  (self as unknown as Worker).postMessage(response);
};
