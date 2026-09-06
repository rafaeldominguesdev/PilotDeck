"use client";

import { useEffect, useState } from "react";
import { Icon } from "./icon";
import type { Dict } from "../lib/i18n";
import {
  formatPairingCountdown,
  pairingSecondsLeft,
  pluginInstallCommand,
  pluginInstallPreview,
} from "../lib/plugin-install";

export type PluginPairing = { id: string; code: string; expiresAt: string };

/**
 * The plugin offer: one command, paste-ready, already authenticated (OCL-102).
 *
 * This is the main way into the board and it renders in the two places a
 * person can be when they need it, onboarding step three and Settings, from
 * the same component so the two cannot drift apart.
 *
 * What is on screen is a pairing code, never a token. Six digits, one use, ten
 * minutes: it survives a screen share, and the installer trades it for the
 * real bearer value on /api/pair without printing it. The countdown is here
 * for the same reason a code has a countdown at all, so nobody pastes a
 * command that is already dead and reads a 404 as "the plugin is broken".
 *
 * The parent owns the pairing, because the parent is what polls for the
 * moment it gets used.
 */
export function PluginInstall({
  origin,
  t,
  label,
  onLabelChange,
  pairing,
  onGenerate,
  pending,
}: {
  origin: string;
  t: Dict;
  label: string;
  onLabelChange: (value: string) => void;
  pairing: PluginPairing | null;
  onGenerate: () => void;
  pending: boolean;
}) {
  const [copied, setCopied] = useState(false);
  // Seconds are state, not a render-time read of the clock: a value derived
  // from Date.now() during render never updates itself, and the whole point of
  // the number is that it moves.
  const [left, setLeft] = useState(() =>
    pairing ? pairingSecondsLeft(pairing.expiresAt, Date.now()) : 0,
  );

  useEffect(() => {
    if (!pairing) {
      setLeft(0);
      return;
    }
    const tick = () => setLeft(pairingSecondsLeft(pairing.expiresAt, Date.now()));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [pairing]);

  const live = pairing !== null && left > 0;
  const command = live
    ? pluginInstallCommand(origin, pairing.code)
    : pluginInstallPreview(origin);

  const copy = async () => {
    if (!live) return;
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable; the text stays selectable */
    }
  };

  return (
    <div className="plug">
      <div className="sec-cap" style={{ marginTop: 0 }}>
        {t.plugin.cap}
      </div>
      <p className="plug-lead">{t.plugin.lead}</p>

      <div className="field plug-name">
        <label htmlFor="plug-label">{t.plugin.nameLabel}</label>
        <input
          id="plug-label"
          className="input"
          value={label}
          placeholder={t.plugin.namePlaceholder}
          onChange={(e) => onLabelChange(e.target.value)}
          disabled={pending}
        />
      </div>

      <div className={`cmd${live ? "" : " ghost"}`}>
        {command}
        {live ? (
          <button
            type="button"
            className={`copy${copied ? " ok" : ""}`}
            onClick={copy}
          >
            <Icon name={copied ? "check" : "copy"} label={null} size={12} />
            {copied ? t.wizard.copied : t.wizard.copy}
          </button>
        ) : null}
      </div>

      <div className="plug-actions">
        <button
          type="button"
          className="btn-new"
          disabled={pending}
          onClick={onGenerate}
        >
          {pending
            ? t.wizard.generating
            : pairing
              ? t.plugin.regenerate
              : t.plugin.generate}
        </button>
        <span className="plug-state">
          {live ? (
            <>
              {t.plugin.codeLive} <b>{formatPairingCountdown(left)}</b>
            </>
          ) : pairing ? (
            t.plugin.codeExpired
          ) : (
            t.plugin.codeWhy
          )}
        </span>
      </div>

      <div className="tok-note">{t.plugin.safety}</div>
    </div>
  );
}
