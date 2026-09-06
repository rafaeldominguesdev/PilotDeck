"use client";

import { useEffect, useState } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset?: () => void;
}) {
  const missingDb = /DATABASE_URL/.test(error.message);
  const [canReload, setCanReload] = useState(false);

  useEffect(() => {
    setCanReload(true);
  }, []);

  const handleRetry = () => {
    if (reset) reset();
    else if (typeof window !== "undefined") window.location.reload();
  };

  return (
    <div className="shell">
      <p className="brand">pilotdeck</p>
      <h1>{missingDb ? "The database is missing." : "The board is unreachable."}</h1>
      <p className="sub">
        {missingDb
          ? "Set DATABASE_URL pointing to this instance's Postgres. Nothing is sent anywhere."
          : "The server returned an error. Wait a moment and try again, or check the instance logs if the problem persists."}
      </p>
      <button
        type="button"
        className="primary"
        onClick={handleRetry}
        disabled={!canReload}
      >
        Try again
      </button>
      {error.digest ? (
        <p className="meta" style={{ marginTop: 24 }}>
          Error digest: <span className="error">{error.digest}</span>
        </p>
      ) : null}
    </div>
  );
}
