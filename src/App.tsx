import "./App.css";
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

export default function App() {
    const {grouped} = useLiveBoard();

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
                                    <span className="ranking">CLASSEMENT</span>
                                </div>

                                <div className="matches">
                                    {list.map((m, idx) => {
                                        const events = uniqBy(
                                            (m.lastEvents ?? []).filter((e) => {
                                                const ev = (e.event ?? "").toUpperCase();
                                                return Boolean(e.player) && Boolean(e.time) && !ev.includes("SUB");
                                            }),
                                            (e) =>
                                                String(e.id ?? "") ||
                                                [
                                                    norm(e.home_away),
                                                    String(parseMinute(e.time)),
                                                    normEvent(e.event),
                                                    normPlayer(e.player),
                                                ].join("|")
                                        )
                                            .slice()
                                            .sort((a, b) => parseMinute(b.time) - parseMinute(a.time))
                                            .slice(0, 4);
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
        </div>
    );
}
