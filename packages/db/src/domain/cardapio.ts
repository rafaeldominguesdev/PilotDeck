import { FACTORY_CARDAPIO_POLICY } from "@pilotdeck/mcp-core";
import type { CardapioPolicyEntry } from "../types";

export function factoryCardapioPolicy(): CardapioPolicyEntry[] {
  return FACTORY_CARDAPIO_POLICY.map((row) => ({
    type: row.type,
    cli: row.cli,
    model: row.model,
    chain: row.chain ? [...row.chain] : null,
    effort: row.effort,
  }));
}
