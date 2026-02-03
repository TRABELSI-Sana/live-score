import "./App.css";
import {useEffect, useState} from "react";
import {useLiveBoard} from "./hooks/useLiveBoard";

const UPCOMING_STATUSES = new Set(["NOT STARTED", "SCHEDULED"]);

function statusLabel(status?: string, time?: string, scheduled?: string) {
    if (!status) return scheduled ?? "--:--";
    if (status === "IN PLAY" || status === "ADDED TIME") return time ? `${time}'` : "EN COURS";
    if (status === "HALF TIME BREAK") return "MT";
    if (status === "FINISHED") return "TERMINÉ";
    if (UPCOMING_STATUSES.has(status)) return scheduled ?? "À VENIR";
    return status;
}

function icon(ev?: string) {
    if (ev?.includes("GOAL")) return "⚽";
    if (ev?.includes("YELLOW")) return "🟨";
    if (ev?.includes("RED")) return "🟥";
    if (ev?.includes("MISSED_PENALTY")) return "MISSED PENALTY 🥅❌";
    return "•";
}

function uniqBy<T>(items: T[], keyFn: (t: T) => string): T[] {
    const seen = new Set<string>();
    const out: T[] = [];
    for (const it of items) {
        const k = keyFn(it);
        if (seen.has(k)) continue;
        seen.add(k);
        out.push(it);
    }
    return out;
}

function norm(v: unknown): string {
    return String(v ?? "").trim().toLowerCase();
}

function normEvent(ev: unknown): string {
    return String(ev ?? "").trim().toUpperCase();
}

function normPlayer(p: unknown): string {
    return String(p ?? "")
        .toLowerCase()
        .replace(/\./g, "")
        .replace(/[^\p{L}\p{N} ]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function parseMinute(t: unknown): number {
    const s = String(t ?? "").replace("'", "");
    const m = s.match(/\d+/g);
    if (!m || m.length === 0) return 999;
    const base = Number(m[0]);
    const added = m.length > 1 ? Number(m[1]) : 0;
    return Number.isFinite(base) ? base + added / 10 : 999;
}

function sideFromEvent(side?: unknown) {
    const normalized = norm(side);
    if (["home", "h", "local", "team1"].includes(normalized)) return "home";
    if (["away", "a", "visitor", "team2"].includes(normalized)) return "away";
    return "unknown";
}

type TableRow = {
    rank?: number | string;
    position?: number | string;
    rg?: number | string;
    place?: number | string;
    team?: { name?: string };
    club?: { name?: string };
    teamName?: string;
    name?: string;
    points?: number | string;
    pts?: number | string;
    all?: { played?: number | string; goals?: { for?: number | string; against?: number | string } };
    played?: number | string;
    matchesPlayed?: number | string;
    playedGames?: number | string;
    diff?: number | string;
    goalDiff?: number | string;
    goalsDiff?: number | string;
    goals?: { for?: number | string; against?: number | string };
};

type TableDisplayRow = {
    rank: string;
    team: string;
    points: string;
    played: string;
    diff: string;
};

function toNumber(value: unknown): number | undefined {
    const parsed = typeof value === "string" && value.trim() === "" ? NaN : Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function extractTableRows(data: unknown): TableRow[] {
    if (Array.isArray(data)) {
        return data as TableRow[];
    }
    const candidate = data as {
        table?: unknown;
        response?: unknown;
        standings?: unknown;
        data?: unknown;
    };
    if (Array.isArray(candidate?.table)) {
        return candidate.table as TableRow[];
    }
    if (Array.isArray(candidate?.response)) {
        const response = candidate.response as Array<Record<string, unknown>>;
        const fromResponseTable = response.find((entry) => Array.isArray(entry?.table))?.table;
        if (Array.isArray(fromResponseTable)) {
            return fromResponseTable as TableRow[];
        }
        const fromLeagueStandings = response
            .map((entry) => (entry.league as { standings?: unknown })?.standings)
            .find((standings) => Array.isArray(standings) && Array.isArray(standings[0]));
        if (Array.isArray(fromLeagueStandings) && Array.isArray(fromLeagueStandings[0])) {
            return fromLeagueStandings[0] as TableRow[];
        }
    }
    if (Array.isArray(candidate?.standings) && Array.isArray(candidate.standings[0])) {
        return candidate.standings[0] as TableRow[];
    }
    if (candidate?.data && Array.isArray((candidate.data as { table?: unknown })?.table)) {
        return (candidate.data as { table?: TableRow[] }).table ?? [];
    }
    return [];
}

function tableRowsFromData(data: unknown): TableDisplayRow[] {
    const list = extractTableRows(data);

    return list.map((row, idx) => {
        const rankRaw = row.rank ?? row.position ?? row.rg ?? row.place;
        const rankNum = toNumber(rankRaw);
        const rank = rankNum !== undefined ? String(rankNum) : String(rankRaw ?? idx + 1);
        const team =
            row.team?.name ??
            row.club?.name ??
            row.teamName ??
            row.name ??
            "Équipe";
        const pointsRaw = row.points ?? row.pts;
        const pointsNum = toNumber(pointsRaw);
        const points = pointsNum !== undefined ? `${pointsNum}pts` : String(pointsRaw ?? "--");
        const playedRaw = row.played ?? row.matchesPlayed ?? row.playedGames ?? row.all?.played;
        const playedNum = toNumber(playedRaw);
        const played = playedNum !== undefined ? String(playedNum) : String(playedRaw ?? "--");
        const diffRaw =
            row.diff ??
            row.goalDiff ??
            row.goalsDiff ??
            (toNumber(row.goals?.for) !== undefined && toNumber(row.goals?.against) !== undefined
                ? toNumber(row.goals?.for)! - toNumber(row.goals?.against)!
                : undefined) ??
            (toNumber(row.all?.goals?.for) !== undefined && toNumber(row.all?.goals?.against) !== undefined
                ? toNumber(row.all?.goals?.for)! - toNumber(row.all?.goals?.against)!
                : undefined);
        const diffNum = toNumber(diffRaw);
        const diff = diffNum !== undefined ? `${diffNum > 0 ? "+" : ""}${diffNum}` : String(diffRaw ?? "--");

        return { rank, team, points, played, diff };
    });
}

export default function App() {
    const {grouped} = useLiveBoard();
    const [rankingCompetition, setRankingCompetition] = useState<{id?: string; name?: string} | null>(null);
    const [rankingRows, setRankingRows] = useState<TableDisplayRow[]>([]);
    const [rankingStatus, setRankingStatus] = useState<"idle" | "loading" | "error">("idle");

    useEffect(() => {
        if (!rankingCompetition) {
            setRankingRows([]);
            setRankingStatus("idle");
            return;
        }

        if (!rankingCompetition.id) {
            setRankingRows([]);
            setRankingStatus("error");
            return;
        }

        let cancelled = false;
        let retryTimer: ReturnType<typeof setTimeout> | null = null;
        setRankingStatus("loading");

        const loadTable = (attempt = 0) => {
            fetch(`/api/stream/competitions/${rankingCompetition.id}/table`)
                .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
                .then((data) => {
                    if (cancelled) return;
                    const rows = tableRowsFromData(data);
                    if (rows.length === 0 && attempt < 2) {
                        retryTimer = setTimeout(() => loadTable(attempt + 1), 1000);
                        return;
                    }
                    setRankingRows(rows);
                    setRankingStatus("idle");
                })
                .catch(() => {
                    if (cancelled) return;
                    setRankingRows([]);
                    setRankingStatus("error");
                });
        };

        loadTable();

        return () => {
            cancelled = true;
            if (retryTimer) {
                clearTimeout(retryTimer);
            }
        };
    }, [rankingCompetition]);

    return (
        <div className="page">
            <header className="hero">
                <div className="logoRow">
                    <div className="logoBall" aria-hidden="true"/>
                    <div className="logoText">
                        <span className="logoStrong">LiveFoot</span>
                        <span className="logoLight">scores</span>
                    </div>
                </div>
                <p className="heroSubtitle">
                    Suivez les matchs en temps réel : scores, buteurs et événements clés des rencontres en
                    cours.
                </p>
            </header>

            <main className="content">
                <section className="board">
                    {grouped.length === 0 ? (
                        <div className="empty">
                            <h2>Aucun match disponible</h2>
                            <p>Revenez plus tard pour suivre les prochaines rencontres en direct.</p>
                        </div>
                    ) : (
                        grouped.map(({comp, list}) => (
                            <div key={comp?.id ?? comp?.name ?? String(comp)} className="competition">
                                <div className="competitionHeader">
                                    <h2>{comp?.name ?? String(comp)}</h2>
                                    <button
                                        type="button"
                                        className="rankingButton"
                                        onClick={() => setRankingCompetition({id: comp?.id, name: comp?.name})}
                                    >
                                        CLASSEMENT
                                    </button>
                                </div>

                                <div className="matches">
                                    {list.map((m, idx) => {
                                        const events = uniqBy(
                                            (m.lastEvents ?? []).filter((e) => {
                                                const ev = normEvent(e.event);
                                                return (
                                                    !ev.includes("SUB") &&
                                                    !ev.includes("YELLOW") &&
                                                    Boolean(normPlayer(e.player))
                                                );
                                            }),
                                            (e) =>
                                                [
                                                    norm(e.home_away),
                                                    String(parseMinute(e.time)),
                                                    normEvent(e.event),
                                                    normPlayer(e.player),
                                                ].join("|")
                                        )
                                            .slice()
                                            .sort((a, b) => parseMinute(b.time) - parseMinute(a.time));
                                        const homeEvents = events.filter((e) => sideFromEvent(e.home_away) === "home");
                                        const awayEvents = events.filter((e) => sideFromEvent(e.home_away) === "away");
                                        const unknownEvents = events.filter(
                                            (e) => sideFromEvent(e.home_away) === "unknown"
                                        );

                                        const status = m.status ?? "";
                                        const isUpcoming = UPCOMING_STATUSES.has(status);
                                        const scoreText = isUpcoming
                                            ? m.scheduled ?? "--:--"
                                            : m.scores?.score ?? "0 : 0";

                                        return (
                                            <div key={m.id ?? idx} className="match">
                                                <div className="matchRow">
                                                    <div className="team teamHome">
                                                        {m.home?.logo ? (
                                                            <img
                                                                className="teamLogo"
                                                                src={m.home.logo}
                                                                alt={m.home?.name ?? "Home"}
                                                                loading="lazy"
                                                                onError={(e) => {
                                                                    (e.currentTarget as HTMLImageElement).style.display =
                                                                        "none";
                                                                }}
                                                            />
                                                        ) : (
                                                            <span className="teamLogoPlaceholder"/>
                                                        )}
                                                        <span>{m.home?.name ?? "Home"}</span>
                                                    </div>
                                                    <div className={`scoreBox ${isUpcoming ? "scoreBoxUpcoming" : ""}`}>
                                                        {scoreText}
                                                    </div>
                                                    <div className="team teamAway">
                                                        <span>{m.away?.name ?? "Away"}</span>
                                                        {m.away?.logo ? (
                                                            <img
                                                                className="teamLogo"
                                                                src={m.away.logo}
                                                                alt={m.away?.name ?? "Away"}
                                                                loading="lazy"
                                                                onError={(e) => {
                                                                    (e.currentTarget as HTMLImageElement).style.display =
                                                                        "none";
                                                                }}
                                                            />
                                                        ) : (
                                                            <span className="teamLogoPlaceholder"/>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="matchMeta">
                                                    {statusLabel(m.status, m.time, m.scheduled)}
                                                </div>
                                                {!isUpcoming &&
                                                (homeEvents.length > 0 ||
                                                    awayEvents.length > 0 ||
                                                    unknownEvents.length > 0) ? (
                                                    <div className="eventsGrid">
                                                        <div className="eventsColumn eventsHome">
                                                            {homeEvents.map((e, eventIdx) => (
                                                                <div
                                                                    key={String(e.id ?? eventIdx)}
                                                                    className="eventRow eventRowHome"
                                                                >
                                                                    <span className="eventMinute">
                                                                        {e.time ? `${e.time}'` : ""}
                                                                    </span>
                                                                    <span className="eventIcon">{icon(e.event)}</span>
                                                                    <span className="eventPlayer">{e.player ?? ""}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className="eventsColumn eventsCenter">
                                                            {unknownEvents.map((e, eventIdx) => (
                                                                <div
                                                                    key={String(e.id ?? eventIdx)}
                                                                    className="eventRow eventRowCenter"
                                                                >
                                                                    <span className="eventMinute">
                                                                        {e.time ? `${e.time}'` : ""}
                                                                    </span>
                                                                    <span className="eventIcon">{icon(e.event)}</span>
                                                                    <span className="eventPlayer">{e.player ?? ""}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className="eventsColumn eventsAway">
                                                            {awayEvents.map((e, eventIdx) => (
                                                                <div
                                                                    key={String(e.id ?? eventIdx)}
                                                                    className="eventRow eventRowAway"
                                                                >
                                                                    <span className="eventMinute">
                                                                        {e.time ? `${e.time}'` : ""}
                                                                    </span>
                                                                    <span className="eventIcon">{icon(e.event)}</span>
                                                                    <span className="eventPlayer">{e.player ?? ""}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : null}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </section>
            </main>
            {rankingCompetition ? (
                <div
                    className="modalBackdrop"
                    onClick={() => setRankingCompetition(null)}
                    role="dialog"
                    aria-modal="true"
                >
                    <div className="rankingModal" onClick={(e) => e.stopPropagation()}>
                        <button
                            type="button"
                            className="modalClose"
                            aria-label="Fermer le classement"
                            onClick={() => setRankingCompetition(null)}
                        >
                            ×
                        </button>
                        <div className="rankingTitle">
                            {rankingCompetition.name ? `Classement - ${rankingCompetition.name}` : "Classement"}
                        </div>
                        {rankingStatus === "loading" ? (
                            <div className="rankingStatus">Chargement...</div>
                        ) : null}
                        {rankingStatus === "error" ? (
                            <div className="rankingStatus rankingError">
                                Classement indisponible pour le moment.
                            </div>
                        ) : null}
                        {rankingStatus === "idle" && rankingRows.length > 0 ? (
                            <table className="rankingTable">
                                <thead>
                                    <tr>
                                        <th>Rg</th>
                                        <th>Equipe</th>
                                        <th>Pts</th>
                                        <th>J.</th>
                                        <th>Diff</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rankingRows.map((row, idx) => (
                                        <tr key={`${row.rank}-${idx}`}>
                                            <td>{row.rank}</td>
                                            <td>{row.team}</td>
                                            <td>{row.points}</td>
                                            <td>{row.played}</td>
                                            <td>{row.diff}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : null}
                        {rankingStatus === "idle" && rankingRows.length === 0 ? (
                            <div className="rankingStatus">Aucune donnée de classement.</div>
                        ) : null}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
