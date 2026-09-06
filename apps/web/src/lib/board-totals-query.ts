import type { ModelPrice } from "@pilotdeck/db";
import { filterBoardCards, type BoardFilter } from "./board-filter";
import { toBoardTotals, type BoardTotals } from "./board-totals";
import {
  computeInsights,
  filterMissionAttempts,
  loadInsightAttemptRows,
  loadMissionAttemptRows,
  type InsightsDb,
} from "./insights";

/**
 * The totals for one board filter. It reads the same attempt rows the Insights
 * page reads, narrows them with the same filter the board applies to its
 * cards, and runs the same aggregation, so the topbar total and Insights
 * cannot report different numbers for the same selection.
 */
export async function loadBoardTotals(
  db: InsightsDb,
  workspaceId: string,
  pricingEnabled: boolean,
  prices: readonly ModelPrice[],
  filter: BoardFilter,
): Promise<BoardTotals> {
  const [rows, missionAttemptRows] = await Promise.all([
    loadInsightAttemptRows(db, workspaceId),
    loadMissionAttemptRows(db, workspaceId),
  ]);
  // Attempt rows carry the project and mission of their card, which is what
  // the board filters on, so the board's own filter narrows them unchanged.
  const insights = computeInsights(
    filterBoardCards(rows, filter),
    [],
    prices,
    filterMissionAttempts(missionAttemptRows, filter),
  );
  return toBoardTotals(insights.totals, pricingEnabled);
}
