import { useEffect, useMemo, useState } from "react";

export type MatchEvent = {
    id?: string;
    event?: string;
    time?: string;
    player?: string;
    home_away?: string;
    match_id?: string;
    ts?: string;
};

export type MatchState = {
    id?: number;
    scheduled?: string;
    status?: string;
    time?: string;
    competition?: { id?: number; name?: string, country?: string };
    home?: { id?: number; name?: string; logo?: string };
    away?: { id?: number; name?: string; logo?: string };

    scores?: { score?: string };
    lastEvents?: MatchEvent[];
};

export function useLiveBoard() {
    const [matches, setMatches] = useState<MatchState[]>([]);
    const [connected, setConnected] = useState(false);

    // Initial snapshot: show something immediately even before the first SSE push
    useEffect(() => {
        let cancelled = false;

        fetch("/api/stream/board")
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
            .then((data: MatchState[]) => {
                if (!cancelled) setMatches(Array.isArray(data) ? data : []);
            })
            .catch(() => {
                // ignore snapshot errors (SSE may still work)
            });

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        const es = new EventSource("/api/stream/live");

        es.addEventListener("connected", () => setConnected(true));

        es.addEventListener("live", (evt) => {
            setConnected(true);
            try {
                const data = JSON.parse((evt as MessageEvent).data) as MatchState[];
                setMatches(data);
            } catch {
                // ignore parsing errors
            }
        });

        es.onerror = () => setConnected(false);

        return () => es.close();
    }, []);

    const grouped = useMemo(() => {
        const map = new Map<
            string,
            { comp: { id?: string; name: string; country?: string }; list: MatchState[] }
        >();

        for (const m of matches) {
            const c = m.competition;
            const key = String(c?.id ?? c?.name ?? "Other");

            if (!map.has(key)) {
                map.set(key, {
                    comp: {
                        id: c?.id ? String(c.id) : undefined,
                        name: c?.name ?? "Other",
                        country: c?.country ?? undefined,
                    },
                    list: [],
                });
            }

            map.get(key)!.list.push(m);
        }

        return Array.from(map.values()).map(({ comp, list }) => ({
            comp,
            list: list.sort((a, b) => (a.scheduled ?? "").localeCompare(b.scheduled ?? "")),
        }));
    }, [matches]);
    return { connected, matches, grouped };

}