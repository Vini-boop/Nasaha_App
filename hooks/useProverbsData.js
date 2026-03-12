import { useCallback, useEffect, useRef, useState } from "react";

let cachedProverbs = null;

const sampleProverbs = [
  {
    text: "Kuna Mungu Eeeh, anaabudiwa.",
    meaning: "Tumweke mungu mbele kwa kila jambo tunalofanya, na tutashinda kupitia yeye.",
    source: "Dibaji za kwanngu",
    enText: "There is God, He is worshiped.",
    enMeaning: "Put God first in everything we do, and we will prevail through Him.",
  },
  {
    text: "Wanetu eeh tuwe na subira.",
    meaning: "Subira na uvumilivu huleta matokeo mazuri; usikate tamaa mapema.",
    source: "Dibaji za kwanngu",
    enText: "Let us be patient.",
    enMeaning: "Patience and perseverance bring good results; don't give up early.",
  },
  {
    text: "Wanetu eeh tuwe na tuwe na Ukiasi.",
    meaning: "Wanetu tujifunze kurithika na kile kidogo, tule kwa urefu wa kamba zetu.",
    source: "Dibaji za kwanngu",
    enText: "Let us be content and moderate.",
    enMeaning: "Let us learn to be satisfied with the little we have; live within our means.",
  },
  {
    text: "Haba na haba hujaza kibaba.",
    meaning: "Ukiweka kidogo kidogo kila siku, mwishowe utafanikiwa na kufikia malengo.",
    source: "Methali",
    enText: "Little by little fills the measure.",
    enMeaning: "Small consistent efforts accumulate into big results over time.",
  },
  {
    text: "Haraka haraka haina baraka.",
    meaning: "Kufanya mambo kwa pupa kunaweza kuleta makosa na hasara.",
    source: "Methali",
    enText: "Haste has no blessing.",
    enMeaning: "Rushing often leads to mistakes and losses.",
  },
  {
    text: "Bandu bandu humaliza gogo.",
    meaning: "Kazi kubwa hukamilika kwa hatua ndogo ndogo zinazofuata.",
    source: "Methali",
    enText: "Little by little finishes the log.",
    enMeaning: "Big work gets done through small steady steps.",
  },
];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchProverbs = async () => {
  await delay(450);
  return sampleProverbs;
};

export function useProverbsData() {
  const [proverbs, setProverbs] = useState(cachedProverbs || []);
  const [loading, setLoading] = useState(!cachedProverbs);
  const [error, setError] = useState(null);
  const runIdRef = useRef(0);

  const load = useCallback(async () => {
    runIdRef.current += 1;
    const runId = runIdRef.current;

    setError(null);

    if (cachedProverbs) {
      setProverbs(cachedProverbs);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await fetchProverbs();
      if (runIdRef.current !== runId) return;

      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("No proverbs returned");
      }

      cachedProverbs = data;
      setProverbs(data);
      setLoading(false);
    } catch (_) {
      if (runIdRef.current !== runId) return;
      setError("Failed to load proverbs.");
      setLoading(false);
    }
  }, []);

  const reload = useCallback(async () => {
    cachedProverbs = null;
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
