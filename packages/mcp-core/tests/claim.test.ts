import { describe, expect, it } from "vitest";
import {
  createMemoryClaimStore,
  evaluateClaim,
  type CardState,
} from "../src/index.js";

function openCard(overrides: Partial<CardState> = {}): CardState {
  return {
    id: "OC-1",
    status: "aberto",
    revisado: false,
    reopen_comment: null,
    claimed_by: null,
    attempt_id: null,
    ...overrides,
  };
}

const actorA = {
  token_id: "tok_a",
  token_revoked: false,
  executor: { cli: "claude-code", session_id: "sess_a" },
};

const actorB = {
  token_id: "tok_b",
  token_revoked: false,
  executor: { cli: "codex", session_id: "sess_b" },
};

describe("claim atomicity contract", () => {
  it("claims an open card and returns a CAS predicate on status aberto", () => {
    const result = evaluateClaim(openCard(), {
      task_id: "OC-1",
      actor: actorA,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.card.status).toBe("em_execucao");
    expect(result.value.card.claimed_by).toBe("tok_a");
    expect(result.value.cas).toEqual({
      task_id: "OC-1",
      expected_status: "aberto",
    });
    expect(result.value.attempt.task_id).toBe("OC-1");
    expect(result.value.attempt.executor.token_id).toBe("tok_a");
    expect(result.value.attempt.finished_at).toBeNull();
  });

  it("does not mutate the input card", () => {
    const card = openCard();
    evaluateClaim(card, { task_id: "OC-1", actor: actorA });
    expect(card.status).toBe("aberto");
    expect(card.claimed_by).toBeNull();
  });

  it("returns NOT_FOUND when the card is missing", () => {
    const result = evaluateClaim(null, { task_id: "OC-404", actor: actorA });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NOT_FOUND");
    }
  });

  it("returns TOKEN_REVOKED before proposing any mutation", () => {
    const result = evaluateClaim(openCard(), {
      task_id: "OC-1",
      actor: { ...actorA, token_revoked: true },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("TOKEN_REVOKED");
    }
  });

  it("second claim against the updated card is ALREADY_CLAIMED", () => {
    const first = evaluateClaim(openCard(), {
      task_id: "OC-1",
      actor: actorA,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const second = evaluateClaim(first.value.card, {
      task_id: "OC-1",
      actor: actorB,
    });
    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.error.code).toBe("ALREADY_CLAIMED");
    }
  });

  it("non-force claim on em execução is ALREADY_CLAIMED", () => {
    const result = evaluateClaim(openCard({ status: "em_execucao" }), {
      task_id: "OC-1",
      actor: actorA,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("ALREADY_CLAIMED");
    }
  });

  it("force claim on em execução succeeds and records a new attempt", () => {
    const result = evaluateClaim(
      openCard({
        status: "em_execucao",
        claimed_by: "tok_a",
        attempt_id: "att_old",
      }),
      { task_id: "OC-1", actor: actorB, force: true },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.card.status).toBe("em_execucao");
    expect(result.value.card.claimed_by).toBe("tok_b");
    expect(result.value.card.attempt_id).not.toBe("att_old");
    expect(result.value.cas.expected_status).toBe("em_execucao");
  });

  it("claim on feito is INVALID_TRANSITION", () => {
    const result = evaluateClaim(openCard({ status: "feito" }), {
      task_id: "OC-1",
      actor: actorA,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_TRANSITION");
    }
  });

  it("applies only the first of two claims against the same snapshot (CAS)", () => {
    const store = createMemoryClaimStore([openCard()]);

    const first = store.claim({ task_id: "OC-1", actor: actorA });
    const second = store.claim({ task_id: "OC-1", actor: actorB });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.error.code).toBe("ALREADY_CLAIMED");
    }
    expect(store.get("OC-1")?.claimed_by).toBe("tok_a");
  });

  it("rejects a stale CAS when the stored status no longer matches", () => {
    const store = createMemoryClaimStore([openCard()]);
    const proposed = evaluateClaim(openCard(), {
      task_id: "OC-1",
      actor: actorA,
    });
    expect(proposed.ok).toBe(true);
    if (!proposed.ok) return;

    const winner = store.claim({ task_id: "OC-1", actor: actorB });
    expect(winner.ok).toBe(true);

    const stale = store.applyCas(proposed.value);
    expect(stale.ok).toBe(false);
    if (!stale.ok) {
      expect(stale.error.code).toBe("ALREADY_CLAIMED");
    }
    expect(store.get("OC-1")?.claimed_by).toBe("tok_b");
  });
});
