import "./App.css";
import {useLiveBoard} from "./hooks/useLiveBoard";

function badge(status?: string, time?: string) {
    if (!status) return "";
    if (status === "IN PLAY" || status === "ADDED TIME") return `${time ?? ""}'`;
    if (status === "HALF TIME BREAK") return "HT";
    if (status === "FINISHED") return "FT";
    return status;
}

function icon(ev?: string) {
    if (ev?.includes("GOAL")) return "⚽";
    if (ev?.includes("YELLOW")) return "🟨";
    if (ev?.includes("RED")) return "🟥";
    if (ev?.includes("SUB")) return "🔁";
    return ev;
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
    // Lowercase, trim, remove dots, collapse spaces, keep letters/numbers and spaces.
    return String(p ?? "")
        .toLowerCase()
        .replace(/\./g, "")
        .replace(/[^\p{L}\p{N} ]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function parseMinute(t: unknown): number {
    // Handles: 20, "20'", "45+2", "45+2'". Fallback pushes unknown to the end.
    const s = String(t ?? "").replace("'", "");
    const m = s.match(/\d+/g);
    if (!m || m.length === 0) return 999;
    const base = Number(m[0]);
    const added = m.length > 1 ? Number(m[1]) : 0;
    return Number.isFinite(base) ? base + added / 10 : 999;
}

export default function App() {
    const {connected, grouped} = useLiveBoard();

    return (
        <div className="app">
            <header className="appHeader">
                <div className="brand">
                    <div className="brandTitle">LiveFoot</div>
                    <div className="brandSubtitle">Scores et événements en direct</div>
                </div>

                <div className={`pill ${connected ? "pillOk" : "pillKo"}`}>
                    <span className="pillDot"/>
                    <span>{connected ? "Flux connecté" : "Flux en attente"}</span>
                </div>
            </header>

            <section className="infoSection">
                <div className="infoHeader">
                    <h1>Suivi des scores en direct</h1>
                    <p>
                        LiveFoot propose un tableau clair pour suivre les rencontres en cours, les scores
                        actualisés et les principaux événements du match (buts, cartons, temps additionnel).
                    </p>
                </div>
                <div className="infoGrid">
                    <div className="infoCard">
                        <h2>Ce que vous voyez</h2>
                        <ul>
                            <li>Scores mis à jour automatiquement pendant le match.</li>
                            <li>Résumé rapide des événements importants par équipe.</li>
                            <li>Liste des compétitions avec le nombre de rencontres actives.</li>
                        </ul>
                    </div>
                    <div className="infoCard">
                        <h2>Comment ça marche</h2>
                        <p>
                            Les données proviennent de flux sportifs tiers et sont rafraîchies en continu pour
                            afficher l'état du match, le minuteur et les derniers faits marquants.
                        </p>
                    </div>
                    <div className="infoCard">
                        <h2>À retenir</h2>
                        <p>
                            Les horaires et événements peuvent évoluer rapidement. Si un match n'apparaît pas,
                            rafraîchissez la page ou revenez un peu plus tard.
                        </p>
                    </div>
                </div>
            </section>

            {grouped.length === 0 ? (
                <div className="empty">
                    <div className="emptyTitle">Aucun match pour le moment</div>
                    <div className="emptyHint">
                        Revenez plus tard pour découvrir les prochaines rencontres en direct et leurs
                        statistiques essentielles.
                    </div>
                    <div className="emptyHint">
                        En attendant, consultez nos sections d'explications et nos conseils pour suivre les
                        championnats majeurs en temps réel.
                    </div>
                </div>
            ) : (
                grouped.map(({comp, list}) => (
                    <section key={comp?.id ?? comp?.name ?? String(comp)} className="section">
                        <div className="sectionHeader">
                            <div className="sectionTitle">
                                {comp?.name ?? String(comp)}
                                {comp?.country ? (
                                    <span className="sectionCountry">{comp.country}</span>
                                ) : null}
                            </div>
                            <div className="sectionCount">
                                {list.length} match{list.length > 1 ? "s" : ""}
                            </div>
                        </div>

                        <div className="cards">
                            {list.map((m) => (
                                <article key={m.id} className="card">
                                    <div className="meta">
                                        <div className="kickoff">{m.scheduled ?? "--:--"}</div>
                                        <div className="status">{badge(m.status, m.time)}</div>
                                    </div>

                                    <div className="main">
                                        <div className="teams">
                                            <div className="teamRow">
                                                {m.home?.logo ? (
                                                    <img
                                                        className="logo"
                                                        src={m.home.logo}
                                                        alt={m.home?.name ?? "Home"}
                                                        loading="lazy"
                                                        onError={(e) => {
                                                            (e.currentTarget as HTMLImageElement).style.display =
                                                                "none";
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="logoPlaceholder"/>
                                                )}
                                                <div className="teamName">{m.home?.name ?? "Home"}</div>
                                            </div>

                                            <div className="teamRow">
                                                {m.away?.logo ? (
                                                    <img
                                                        className="logo"
                                                        src={m.away.logo}
                                                        alt={m.away?.name ?? "Away"}
                                                        loading="lazy"
                                                        onError={(e) => {
                                                            (e.currentTarget as HTMLImageElement).style.display =
                                                                "none";
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="logoPlaceholder"/>
                                                )}
                                                <div className="teamName">{m.away?.name ?? "Away"}</div>
                                            </div>
                                        </div>

                                        <div className="score">
                                            <div className="scoreValue">{m.scores?.score ?? "0 - 0"}</div>
                                            <div className="scoreHint">{m.status ?? ""}</div>
                                        </div>
                                    </div>

                                    <div className="events">
                                        {uniqBy(
                                            (m.lastEvents ?? []).filter((e) => {
                                                const ev = (e.event ?? "").toUpperCase();
                                                return !ev.includes("SUB") && ev !== "YELLOW_CARD";
                                            }),
                                            (e) => {
                                                const ha = norm(e.home_away);
                                                const minute = String(parseMinute(e.time));
                                                const ev = normEvent(e.event);
                                                const player = normPlayer(e.player);

                                                // If player is present, keep it in the key so we don't collapse distinct events
                                                // happening in the same minute for the same team (ex: two scorers).
                                                return player ? `${ha}|${minute}|${ev}|${player}` : `${ha}|${minute}|${ev}`;
                                            }
                                        )
                                            .slice()
                                            .sort((a, b) => parseMinute(b.time) - parseMinute(a.time))
                                            .map((e, idx) => {
                                                const p = normPlayer(e.player);
                                                if (!p) return null;
                                                return (
                                                    <div key={String(e.id ?? idx)} className="eventRow">
                                                        <span className="eventMinute">{e.time ? `${e.time}'` : ""}</span>

                                                        <span
                                                            className={`eventTeam ${e.home_away === "h" ? "eventTeam--home" : "eventTeam--away"}`}
                                                            title={
                                                                e.home_away === "h"
                                                                    ? m.home?.name
                                                                    : e.home_away === "a"
                                                                        ? m.away?.name
                                                                        : ""
                                                            }
                                                        >
                                                            {e.home_away === "h"
                                                                ? m.home?.name
                                                                : e.home_away === "a"
                                                                    ? m.away?.name
                                                                    : ""}
                                                        </span>

                                                        <span className="eventIcon">{icon(e.event)}</span>
                                                        <span className="eventPlayer">{e.player ?? ""}</span>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>
                ))
            )}

            <section className="editorialSection" aria-labelledby="editorial-title">
                <div className="editorialHeader">
                    <h2 id="editorial-title">Analyse, calendrier et suivi des compétitions</h2>
                    <p>
                        LiveFoot complète les scores en direct avec des repères simples : calendrier du jour,
                        suivi des grandes compétitions et explications sur les statuts des matchs. Cette
                        section éditoriale est toujours visible pour vous permettre de retrouver les infos
                        essentielles, même lorsque les matchs ne sont pas encore lancés.
                    </p>
                </div>

                <div className="editorialGrid">
                    <article className="editorialCard">
                        <h3>Calendrier du jour</h3>
                        <p>
                            Retrouvez les horaires des rencontres à venir et gardez un œil sur les débuts de
                            match. Les horaires affichés sont ajustés selon la compétition et les fuseaux
                            horaires disponibles.
                        </p>
                    </article>
                    <article className="editorialCard">
                        <h3>Événements clés</h3>
                        <p>
                            Buts, cartons, temps additionnel : nous mettons en avant les actions majeures pour
                            comprendre l'évolution du score en un coup d'œil.
                        </p>
                    </article>
                    <article className="editorialCard">
                        <h3>Compétitions suivies</h3>
                        <ul>
                            <li>Ligue 1, Premier League, La Liga, Serie A</li>
                            <li>Ligue des Champions, Ligue Europa, compétitions nationales</li>
                            <li>Suivi des rencontres locales en fonction de la disponibilité des données</li>
                        </ul>
                    </article>
                </div>

                <div className="editorialFooter">
                    <div className="editorialHighlight">
                        <h3>Conseils de suivi</h3>
                        <p>
                            Pour une expérience optimale, gardez la page ouverte et laissez le tableau se
                            mettre à jour automatiquement. En cas de surcharge, un simple rafraîchissement
                            suffit pour reprendre le direct.
                        </p>
                    </div>
                    <div className="editorialHighlight">
                        <h3>FAQ rapide</h3>
                        <ul>
                            <li>Un match absent ? Les données peuvent arriver avec quelques minutes de délai.</li>
                            <li>Un score incohérent ? Vérifiez la minute et les statuts du match.</li>
                            <li>Besoin d'aide ? Consultez la page Contact pour nous écrire.</li>
                        </ul>
                    </div>
                </div>
            </section>
        </div>
    );
}
