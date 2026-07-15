import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, ENDPOINTS } from "../config/api";

export function useProverbsData() {
  const [proverbs, setProverbs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const runIdRef = useRef(0);

  const load = useCallback(async () => {
    runIdRef.current += 1;
    const runId = runIdRef.current;

    setError(null);
    setLoading(true);
    try {
      const data = await apiFetch(ENDPOINTS.dibaji, {
        onUpdate: (freshData) => {
          if (runIdRef.current !== runId) return;
          setProverbs(freshData);
        }
      });
      if (runIdRef.current !== runId) return;

      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("No proverbs returned");
      }

      setProverbs(data);
      setLoading(false);
    } catch (_) {
      if (runIdRef.current !== runId) return;
      setError("Failed to load proverbs.");
      setLoading(false);
    }
  }, []);

  const reload = useCallback(async () => {
    setProverbs([]);
    await load();
  }, [load]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    proverbs,
    loading,
    error,
    reload,
  };
}
