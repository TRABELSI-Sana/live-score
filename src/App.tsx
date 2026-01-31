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

export default function App() {
    const {grouped} = useLiveBoard();

    return (
        <div className="page">
            <header className="hero">
                <div className="logoRow">
                    <div className="logoBall" aria-hidden="true"/>
                    <div className="logoText">
                        <span className="logoStrong">Kawarji</span>
                        <span className="logoLight">live</span>
                    </div>
                </div>
                <p className="heroSubtitle">
                    Kawarji Live vous permet de suivre en temps réel l'évolution du score et les résultats
                    des rencontres de football de la Ligue 1 &amp; 2 en Tunisie.
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
                                    {list.map((m, idx) => (
                                        <div key={m.id ?? idx} className="match">
                                            <div className="matchRow">
                                                <div className="team teamHome">{m.home?.name ?? "Home"}</div>
                                                <div className="scoreBox">{m.scores?.score ?? "0 : 0"}</div>
                                                <div className="team teamAway">{m.away?.name ?? "Away"}</div>
                                            </div>
                                            <div className="matchMeta">
                                                {statusLabel(m.status, m.time, m.scheduled)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </section>

                <aside className="sidebar">
                    <div className="sidebarCard">
                        <div className="sidebarHeader">
                            <div className="sidebarLogo"/>
                            <div>
                                <div className="sidebarTitle">Kawarji</div>
                                <div className="sidebarSubtitle">402,818 followers</div>
                            </div>
                        </div>
                        <button className="sidebarButton" type="button">
                            Suivre la Page
                        </button>
                    </div>
                </aside>
            </main>
        </div>
    );
}
