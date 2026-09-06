"use client";

/**
 * Settings loading placeholder.
 *
 * Mirrors the chrome (topbar, heading, tab strip) and renders a generic stack
 * of form cards and a table that fits most tabs without reaching for tab data.
 */
export function SettingsSkeleton() {
  return (
    <div className="page" aria-busy="true" aria-label="Loading settings">
      <div className="topbar nebula-glass">
        <span className="logo sk sk-shimmer" style={{ width: 120, height: 18 }} />
        <span className="sk sk-line sk-shimmer" style={{ width: 180, height: 12 }} />
        <div className="spacer" />
        <span className="sk sk-line sk-shimmer" style={{ width: 110, height: 13 }} />
      </div>

      <div className="sk-settings-head">
        <span className="sk sk-line sk-shimmer" />
        <span className="sk sk-line sk-shimmer" />
      </div>

      <div className="sk-settabs" role="tablist">
        {Array.from({ length: 9 }).map((_, i) => (
          <span
            key={i}
            className={`sk sk-tab sk-shimmer${i === 0 ? " on" : ""}`}
          />
        ))}
      </div>

      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="sk-set-card sk-shimmer">
          <span className="sk sk-line" />
          <span className="sk sk-line" />
          <span className="sk sk-line" />
        </div>
      ))}

      <table className="sk-set-table">
        <thead>
          <tr>
            {Array.from({ length: 5 }).map((_, i) => (
              <th key={i}>
                <span className="sk sk-line sk-shimmer" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 4 }).map((_, row) => (
            <tr key={row}>
              {Array.from({ length: 5 }).map((__, col) => (
                <td key={col}>
                  <span className="sk sk-line sk-shimmer" style={{ width: col === 0 ? "70%" : "60%" }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
