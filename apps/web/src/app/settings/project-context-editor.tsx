"use client";

import { PROJECT_CONTEXT_MAX_CHARS } from "@pilotdeck/mcp-core";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveProjectContextAction } from "../../actions/projects";
import { Markdown } from "../../components/markdown";
import { dict } from "../../lib/i18n";
import styles from "./project-context.module.css";

export type ProjectContextRow = {
  id: string;
  name: string;
  idPrefix: string;
  context: string;
  currentVersion: string;
  contextSource: {
    releasesRepo?: string;
    contextFile?: string;
    refresh: "on_release" | "daily" | "manual";
  } | null;
};

export function ProjectContextEditor({
  projects,
  lang,
}: {
  projects: ProjectContextRow[];
  lang: string;
}) {
  const t = dict(lang);
  const router = useRouter();
  const [rows, setRows] = useState(projects);
  const [selectedId, setSelectedId] = useState(projects[0]?.id ?? "");
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selected = rows.find((row) => row.id === selectedId) ?? rows[0];

  if (!selected) return null;

  const patchSelected = (patch: Partial<ProjectContextRow>) => {
    setRows((current) =>
      current.map((row) => (row.id === selected.id ? { ...row, ...patch } : row)),
    );
    setMessage(null);
    setError(null);
  };

  const save = () =>
    start(async () => {
      setMessage(null);
      setError(null);
      const result = await saveProjectContextAction({
        projectId: selected.id,
        context: selected.context,
        currentVersion: selected.currentVersion,
        contextSource:
          selected.contextSource?.releasesRepo?.trim() ||
          selected.contextSource?.contextFile?.trim()
            ? selected.contextSource
            : null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(t.settings.projectSaved);
      router.refresh();
    });

  const overLimit = selected.context.length > PROJECT_CONTEXT_MAX_CHARS;

  return (
    <>
      <p className="page-sub">{t.settings.projectsSub}</p>
      <div className="set-card">
        <label className={styles.fieldLabel} htmlFor="settings-project">
          {t.settings.projectLabel}
        </label>
        <select
          id="settings-project"
          className={`sel ${styles.projectPicker}`}
          value={selected.id}
          onChange={(event) => {
            setSelectedId(event.target.value);
            setMessage(null);
            setError(null);
          }}
        >
          {rows.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name} ({row.idPrefix})
            </option>
          ))}
        </select>

        <label className={styles.fieldLabel} htmlFor="project-current-version">
          {t.settings.projectVersion}
        </label>
        <input
          id="project-current-version"
          className={`input ${styles.version}`}
          maxLength={200}
          value={selected.currentVersion}
          onChange={(event) => patchSelected({ currentVersion: event.target.value })}
          placeholder={t.settings.projectVersionPlaceholder}
        />

        <label className={styles.fieldLabel} htmlFor="project-releases-repo">
          {t.settings.projectReleasesRepo}
        </label>
        <input
          id="project-releases-repo"
          className={`input ${styles.version}`}
          value={selected.contextSource?.releasesRepo ?? ""}
          onChange={(event) =>
            patchSelected({
              contextSource: {
                releasesRepo: event.target.value,
                contextFile: selected.contextSource?.contextFile,
                refresh: selected.contextSource?.refresh ?? "manual",
              },
            })
          }
          placeholder={t.settings.projectReleasesRepoPlaceholder}
        />

        <label className={styles.fieldLabel} htmlFor="project-context-file">
          {t.settings.projectContextFile}
        </label>
        <input
          id="project-context-file"
          className={`input ${styles.version}`}
          value={selected.contextSource?.contextFile ?? ""}
          onChange={(event) =>
            patchSelected({
              contextSource: {
                releasesRepo: selected.contextSource?.releasesRepo,
                contextFile: event.target.value,
                refresh: selected.contextSource?.refresh ?? "manual",
              },
            })
          }
          placeholder={t.settings.projectContextFilePlaceholder}
        />

        <label className={styles.fieldLabel} htmlFor="project-context-refresh">
          {t.settings.projectRefresh}
        </label>
        <select
          id="project-context-refresh"
          className={`sel ${styles.projectPicker}`}
          value={selected.contextSource?.refresh ?? "manual"}
          onChange={(event) =>
            patchSelected({
              contextSource: {
                releasesRepo: selected.contextSource?.releasesRepo,
                contextFile: selected.contextSource?.contextFile,
                refresh: event.target.value as "on_release" | "daily" | "manual",
              },
            })
          }
        >
          <option value="on_release">{t.settings.projectRefreshOnRelease}</option>
          <option value="daily">{t.settings.projectRefreshDaily}</option>
          <option value="manual">{t.settings.projectRefreshManual}</option>
        </select>

        <div className={styles.workspace}>
          <div>
            <label className={styles.fieldLabel} htmlFor="project-context">
              {t.settings.projectContext}
            </label>
            <textarea
              id="project-context"
              className={styles.editor}
              value={selected.context}
              onChange={(event) => patchSelected({ context: event.target.value })}
              placeholder={t.settings.projectContextPlaceholder}
            />
            <span
              className={`${styles.counter}${overLimit ? ` ${styles.counterOver}` : ""}`}
            >
              {t.settings.projectContextCount(
                selected.context.length,
                PROJECT_CONTEXT_MAX_CHARS,
              )}
            </span>
          </div>
          <div>
            <span className={styles.previewLabel}>{t.settings.projectPreview}</span>
            <div className={styles.preview}>
              {selected.context.trim() ? (
                <Markdown text={selected.context} />
              ) : (
                <p className={styles.empty}>{t.settings.projectPreviewEmpty}</p>
              )}
            </div>
          </div>
        </div>

        <div className="policy-note">{t.settings.projectContextHint}</div>
        {error ? <p className={`werr ${styles.feedback}`} role="alert">{error}</p> : null}
        {message ? <p className={`wok ${styles.feedback}`} role="status">{message}</p> : null}
        <div className="save-row">
          <button
            className="btn-new"
            type="button"
            disabled={pending || overLimit}
            onClick={save}
          >
            {pending ? t.settings.saving : t.settings.saveProject}
          </button>
        </div>
      </div>
    </>
  );
}
