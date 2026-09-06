"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { CliLogo } from "./cli-logos";
import {
  EXECUTOR_CATALOG,
  addModelToSelection,
  learnedExecutorDefs,
  removeModelFromSelection,
  type ExecutorSelection,
} from "../lib/executors";

export type { ExecutorSelection };

/**
 * Executors grid (onboarding-v5 / settings mockup): 10 CLIs with logos,
 * model chips that expand on check, and the dashed "+ Customize" card
 * (generic MCP). Controlled by the parent via value/onChange.
 *
 * onChange is a React setState: updates are always functional, otherwise
 * two clicks in the same tick (checking the CLI and a model, for example)
 * read the same `value` and the second wipes the first.
 */
export function ExecutorsGrid({
  value,
  onChange,
}: {
  value: ExecutorSelection;
  onChange: Dispatch<SetStateAction<ExecutorSelection>>;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const commitDraft = (id: string) => {
    const draft = drafts[id] ?? "";
    if (!draft.trim()) return;
    onChange((prev) => addModelToSelection(prev, id, draft));
    setDrafts((prev) => ({ ...prev, [id]: "" }));
  };
  const toggleExec = (id: string, models: readonly string[]) => {
    onChange((prev) => {
      const enabled = { ...prev.enabled };
      if (enabled[id]) {
        delete enabled[id];
      } else {
        enabled[id] = [models[0] ?? "auto"];
      }
      return { ...prev, enabled };
    });
  };
  const toggleModel = (id: string, model: string) => {
    onChange((prev) => {
      const current = prev.enabled[id] ?? [];
      const next = current.includes(model)
        ? current.filter((m) => m !== model)
        : [...current, model];
      return { ...prev, enabled: { ...prev.enabled, [id]: next } };
    });
  };

  return (
    <div className="exec-grid">
      {[...EXECUTOR_CATALOG, ...learnedExecutorDefs(value)].map((def) => {
        const on = def.id in value.enabled;
        const selected = value.enabled[def.id] ?? [];
        const models = value.models[def.id] ?? def.models;
        return (
          <div
            key={def.id}
            className={`exec${on ? " on" : ""}`}
            onClick={() => toggleExec(def.id, models)}
          >
            <div className="row">
              <div className="logo">
                <CliLogo id={def.id} />
              </div>
              <div className="name">{def.label}</div>
              <div className="check">✓</div>
            </div>
            <div className="models">
              {models.map((m) => (
                <span
                  key={m}
                  className={`mchip${selected.includes(m) ? " on" : ""} oc-tappable`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleModel(def.id, m);
                  }}
                >
                  {m}
                  <span
                    className="x"
                    title="Remove model"
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange((prev) => removeModelFromSelection(prev, def.id, m));
                    }}
                  >
                    ×
                  </span>
                </span>
              ))}
              <input
                className="mchip-add"
                placeholder="+ model"
                value={drafts[def.id] ?? ""}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  const draft = e.target.value;
                  setDrafts((prev) => ({ ...prev, [def.id]: draft }));
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitDraft(def.id);
                  }
                }}
                onBlur={() => commitDraft(def.id)}
              />
            </div>
          </div>
        );
      })}
      <div
        className={`exec exec-add${value.customEnabled ? " on" : ""}`}
        onClick={() =>
          onChange((prev) => ({ ...prev, customEnabled: !prev.customEnabled }))
        }
      >
        <div className="row">
          <div className="logo">+</div>
          <div className="name">Customize</div>
          <div className="check">✓</div>
        </div>
        <div className="models">
          <input
            className="input mono"
            placeholder="CLI / agent name"
            value={value.customName}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              const customName = e.target.value;
              onChange((prev) => ({ ...prev, customName }));
            }}
          />
          <span className="note">
            connects via generic MCP and may not report cost and time (&ldquo;telemetry
            incomplete&rdquo;)
          </span>
        </div>
      </div>
    </div>
  );
}
