import { err, ok, type Result } from "../errors.js";
import {
  applyTransition,
  type CardSnapshot,
  type CardStatus,
} from "./machine.js";

export type ClaimActor = {
  token_id: string;
  token_revoked: boolean;
  executor?: {
    cli?: string;
    model?: string;
    effort?: string;
    agent?: string;
    session_id?: string;
  };
};

export type ClaimInput = {
  task_id: string;
  actor: ClaimActor;
  force?: boolean;
};

export type CardState = CardSnapshot & {
  id: string;
  claimed_by: string | null;
  attempt_id: string | null;
};

export type ExecutionAttemptDraft = {
  id: string;
  task_id: string;
  executor: {
    token_id: string;
    cli?: string;
    model?: string;
    effort?: string;
    agent?: string;
    session_id?: string;
  };
  started_at: string;
  finished_at: null;
  usage: null;
  result: null;
};

/**
 * Compare-and-swap predicate. Persistence adapters MUST apply the claim in a
 * single transaction:
 *
 *   UPDATE tasks SET status = 'em_execucao', ...
 *   WHERE id = :task_id AND status = :expected_status
 *
 * plus INSERT of the ExecutionAttempt. rowCount = 0 → ALREADY_CLAIMED
 * (or NOT_FOUND if the row does not exist at all).
 */
export type ClaimCas = {
  task_id: string;
  expected_status: CardStatus;
};

export type ClaimSuccess = {
  card: CardState;
  attempt: ExecutionAttemptDraft;
  cas: ClaimCas;
};

function newAttemptId(): string {
  return `att_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function evaluateClaim(
  card: CardState | null,
  input: ClaimInput,
): Result<ClaimSuccess> {
  if (input.actor.token_revoked) {
    return err(
      "TOKEN_REVOKED",
      "MCP token was revoked. Generate a new token in the board Settings and reconnect.",
    );
  }
  if (!card) {
    return err(
      "NOT_FOUND",
      `Task ${input.task_id} not found in this workspace. Call task_list to see the available cards.`,
    );
  }

  const event =
    card.status === "em_execucao"
      ? ({ type: "force_claim" } as const)
      : ({ type: "claim" } as const);

  if (event.type === "force_claim" && !input.force) {
    const denied = applyTransition(card, { type: "claim" });
    if (!denied.ok) {
      return denied;
    }
    return err(
      "ALREADY_CLAIMED",
      "Card is already in execution. Call task_claim with force: true to take over the attempt.",
    );
  }

  const next = applyTransition(card, event);
  if (!next.ok) {
    return next;
  }

  const attemptId = newAttemptId();
  const nextCard: CardState = {
    ...card,
    ...next.value,
    claimed_by: input.actor.token_id,
    attempt_id: attemptId,
  };

  return ok({
    card: nextCard,
    attempt: {
      id: attemptId,
      task_id: input.task_id,
      executor: {
        token_id: input.actor.token_id,
        ...input.actor.executor,
      },
      started_at: new Date().toISOString(),
      finished_at: null,
      usage: null,
      result: null,
    },
    cas: {
      task_id: input.task_id,
      expected_status: card.status,
    },
  });
}

export type MemoryClaimStore = {
  get(taskId: string): CardState | undefined;
  claim(input: ClaimInput): Result<ClaimSuccess>;
  applyCas(proposed: ClaimSuccess): Result<ClaimSuccess>;
};

/**
 * In-memory CAS store that encodes the atomicity contract other adapters
 * (Postgres UPDATE … WHERE status = expected) must honour.
 */
export function createMemoryClaimStore(
  cards: readonly CardState[],
): MemoryClaimStore {
  const map = new Map(cards.map((card) => [card.id, cloneCard(card)]));

  function get(taskId: string): CardState | undefined {
    const card = map.get(taskId);
    return card ? cloneCard(card) : undefined;
  }

  function applyCas(proposed: ClaimSuccess): Result<ClaimSuccess> {
    const current = map.get(proposed.cas.task_id);
    if (!current || current.status !== proposed.cas.expected_status) {
      return err(
        "ALREADY_CLAIMED",
        "Another executor took the card first. Call task_get to see its current status.",
        {
          expected_status: proposed.cas.expected_status,
          actual_status: current?.status ?? null,
        },
      );
    }
    map.set(proposed.cas.task_id, cloneCard(proposed.card));
    return ok(proposed);
  }

  function claim(input: ClaimInput): Result<ClaimSuccess> {
    const evaluated = evaluateClaim(map.get(input.task_id) ?? null, input);
    if (!evaluated.ok) {
      return evaluated;
    }
    return applyCas(evaluated.value);
  }

  return { get, claim, applyCas };
}

function cloneCard(card: CardState): CardState {
  return { ...card };
}
