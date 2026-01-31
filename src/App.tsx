import "./App.css";
import {useLiveBoard} from "./hooks/useLiveBoard";

function statusLabel(status?: string, time?: string, scheduled?: string) {
    if (!status) return scheduled ?? "--:--";
    if (status === "IN PLAY" || status === "ADDED TIME") return time ? `${time}'` : "EN COURS";
    if (status === "HALF TIME BREAK") return "MT";
    if (status === "FINISHED") return "TERMINÉ";
    if (status === "NOT STARTED" || status === "SCHEDULED") return scheduled ?? "À VENIR";
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
                                                return !ev.includes("SUB");
                                            }),
                                            (e) => {
                                                const ha = norm(e.home_away);
                                                const minute = String(parseMinute(e.time));
                                                const ev = normEvent(e.event);
                                                const player = normPlayer(e.player);
                                                return player ? `${ha}|${minute}|${ev}|${player}` : `${ha}|${minute}|${ev}`;
                                            }
                                        )
                                            .slice()
                                            .sort((a, b) => parseMinute(b.time) - parseMinute(a.time))
                                            .slice(0, 4);

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
                                                    <div className="scoreBox">{m.scores?.score ?? "0 : 0"}</div>
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
                                                {events.length > 0 ? (
                                                    <div className="events">
                                                        {events.map((e, eventIdx) => (
                                                            <div key={String(e.id ?? eventIdx)} className="eventRow">
                                                                <span className="eventMinute">
                                                                    {e.time ? `${e.time}'` : ""}
                                                                </span>
                                                                <span className="eventIcon">{icon(e.event)}</span>
                                                                <span className="eventPlayer">{e.player ?? ""}</span>
                                                            </div>
                                                        ))}
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
