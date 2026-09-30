"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ManualScoreForm } from "@/components/admin-forms";
import { addMatchEvent, deleteEvent, endMatch, pauseHalf, saveRatings, startMatch } from "@/lib/actions";
import { eventMinute, eventText } from "@/lib/format";
import type { MatchCard, MatchEvent, PlayerOption } from "@/lib/types";

const TacticsBoard = dynamic(() => import("@/components/tactics-board").then((mod) => mod.TacticsBoard), {
  loading: () => <div className="sheet" />,
});

type SquadState = {
  rows: number[];
  starters: { slot: number; playerId: string }[];
  bench: string[];
};

export function MatchDesk({
  match,
  homePlayers,
  awayPlayers,
  events,
  squads,
  ratings,
}: {
  match: MatchCard;
  homePlayers: PlayerOption[];
  awayPlayers: PlayerOption[];
  events: MatchEvent[];
  squads: { home: SquadState; away: SquadState };
  ratings: { playerId: string; rating: number; motm: boolean }[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState(match.status === "ft" ? "reyting" : match.status === "scheduled" ? "kadro" : "gol");
  const [mode, setMode] = useState<"goal" | "own_goal" | "yellow" | "red" | "sub">("goal");
  const [assistFor, setAssistFor] = useState<{ teamId: string; playerId: string } | null>(null);
  const [subOff, setSubOff] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [score, setScore] = useState({ home: match.home_score, away: match.away_score });
  const ratedPlayers = [...homePlayers, ...awayPlayers];
  const [marks, setMarks] = useState<Record<string, number>>(() => {
    const next: Record<string, number> = {};
    for (const player of ratedPlayers) next[player.id] = 6;
    for (const row of ratings) next[row.playerId] = row.rating;
    return next;
  });
  const [motm, setMotm] = useState(ratings.find((row) => row.motm)?.playerId ?? "");

  useEffect(() => {
    setScore({ home: match.home_score, away: match.away_score });
  }, [match.home_score, match.away_score, match.status]);

  async function refresh() {
    router.refresh();
  }

  async function onPlayer(player: PlayerOption) {
    if (!player.team_id) return;
    if (mode === "own_goal") {
      const teamId = player.team_id === match.home.id ? match.away.id : match.home.id;
      const result = await addMatchEvent({
        matchId: match.id,
        type: "own_goal",
        teamId,
        playerId: player.id,
      });
      if (result.ok) {
        setScore((current) =>
          teamId === match.home.id
            ? { ...current, home: current.home + 1 }
            : { ...current, away: current.away + 1 },
        );
      }
      setNote(result.ok ? "Gol yazıldı." : result.message);
      if (result.ok) refresh();
      return;
    }
    if (mode === "goal") {
      setAssistFor({ teamId: player.team_id, playerId: player.id });
      return;
    }
    if (mode === "sub") {
      if (!subOff) {
        setSubOff(player.id);
        return;
      }
      if (subOff === player.id) return;
      const result = await addMatchEvent({
        matchId: match.id,
        type: "sub",
        teamId: player.team_id,
        playerId: player.id,
        relatedId: subOff,
      });
      setSubOff(null);
      setNote(result.ok ? "Değişiklik yazıldı." : result.message);
      if (result.ok) refresh();
      return;
    }
    const result = await addMatchEvent({
      matchId: match.id,
      type: mode,
      teamId: player.team_id,
      playerId: player.id,
    });
    setNote(result.ok ? "Kart yazıldı." : result.message);
    if (result.ok) refresh();
  }

  async function confirmAssist(relatedId: string | null) {
    if (!assistFor) return;
    const result = await addMatchEvent({
      matchId: match.id,
      type: mode === "own_goal" ? "own_goal" : "goal",
      teamId: assistFor.teamId,
      playerId: assistFor.playerId,
      relatedId,
    });
    if (result.ok) {
      setScore((current) =>
        assistFor.teamId === match.home.id
          ? { ...current, home: current.home + 1 }
          : { ...current, away: current.away + 1 },
      );
    }
    setAssistFor(null);
    setNote(result.ok ? "Gol yazıldı." : result.message);
    if (result.ok) refresh();
  }

  const assistPool = assistFor
    ? [...homePlayers, ...awayPlayers].filter(
        (player) => player.team_id === assistFor.teamId && player.id !== assistFor.playerId,
      )
    : [];

  return (
    <div>
      <div className="ops-score">
        <div>
          <p className="kicker">{match.home.short_name}</p>
          <p className="num">{score.home}</p>
        </div>
        <div>
          <p className="kicker">{match.away.short_name}</p>
          <p className="num">{score.away}</p>
        </div>
      </div>
      <div className="tabs">
        {match.status === "scheduled" || match.status === "ht" ? (
          <button type="button" className="btn-accent" onClick={() => startMatch(match.id).then(refresh)}>
            {match.status === "ht" ? "İkinci devre" : "Maçı başlat"}
          </button>
        ) : null}
        {match.status === "live" ? (
          <button type="button" className="btn-ghost" onClick={() => pauseHalf(match.id).then(refresh)}>
            Devre arası
          </button>
        ) : null}
        {match.status !== "ft" ? (
          <button type="button" className="btn-ghost" onClick={() => endMatch(match.id).then(refresh)}>
            Bitir
          </button>
        ) : null}
      </div>
      <div className="tabs">
        <button type="button" className="btn-ghost" data-on={tab === "gol"} onClick={() => setTab("gol")}>
          Gol
        </button>
        <button type="button" className="btn-ghost" data-on={tab === "kadro"} onClick={() => setTab("kadro")}>
          Kadro
        </button>
        <button type="button" className="btn-ghost" data-on={tab === "reyting"} onClick={() => setTab("reyting")}>
          Reyting
        </button>
      </div>

      {tab === "gol" ? (
        <section>
          <div className="tabs">
            {(
              [
                ["goal", "Gol"],
                ["own_goal", "Kendi kalesi"],
                ["yellow", "Sarı"],
                ["red", "Kırmızı"],
                ["sub", "Değişiklik"],
              ] as const
            ).map(([id, label]) => (
              <button key={id} type="button" className="btn-ghost" data-on={mode === id} onClick={() => setMode(id)}>
                {label}
              </button>
            ))}
          </div>
          {subOff ? <p className="meta">Çıkan seçildi. Giren oyuncuya dokun.</p> : null}
          <div className="player-grid">
            <div>
              <p className="kicker">{match.home.short_name}</p>
              {homePlayers.map((player) => (
                <button key={player.id} type="button" onClick={() => onPlayer(player)}>
                  {player.shirt_number ?? "·"} {player.first_name} {player.last_name}
                </button>
              ))}
            </div>
            <div>
              <p className="kicker">{match.away.short_name}</p>
              {awayPlayers.map((player) => (
                <button key={player.id} type="button" onClick={() => onPlayer(player)}>
                  {player.shirt_number ?? "·"} {player.first_name} {player.last_name}
                </button>
              ))}
            </div>
          </div>
          {assistFor ? (
            <div className="section">
              <p className="kicker">Asist</p>
              <div className="row-actions">
                <button type="button" className="btn-accent" onClick={() => confirmAssist(null)}>
                  Asist yok
                </button>
                {assistPool.map((player) => (
                  <button key={player.id} type="button" className="btn-ghost" onClick={() => confirmAssist(player.id)}>
                    {player.last_name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <div className="event-list">
            {events.map((event) => (
              <button
                key={event.id}
                type="button"
                onClick={() => deleteEvent(match.id, event.id).then(refresh)}
              >
                {eventMinute(event.minute, event.extra_minute)} {eventText(event.type, event.player_name, event.related_name)} · sil
              </button>
            ))}
          </div>
          {note ? <p className="meta">{note}</p> : null}
          <div className="section">
            <ManualScoreForm matchId={match.id} />
          </div>
        </section>
      ) : null}

      {tab === "kadro" ? (
        <div className="split">
          <TacticsBoard
            matchId={match.id}
            teamId={match.home.id}
            teamName={match.home.name}
            side={match.players_per_side}
            players={homePlayers}
            initialRows={squads.home.rows}
            initialStarters={squads.home.starters}
            initialBench={squads.home.bench}
          />
          <TacticsBoard
            matchId={match.id}
            teamId={match.away.id}
            teamName={match.away.name}
            side={match.players_per_side}
            players={awayPlayers}
            initialRows={squads.away.rows}
            initialStarters={squads.away.starters}
            initialBench={squads.away.bench}
          />
        </div>
      ) : null}

      {tab === "reyting" ? (
        <section className="stack">
          {ratedPlayers.map((player) => (
            <div key={player.id} className="side">
              <span>
                {player.first_name} {player.last_name}
              </span>
              <span className="row-actions">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() =>
                    setMarks((current) => ({
                      ...current,
                      [player.id]: Math.max(1, (current[player.id] ?? 6) - 0.5),
                    }))
                  }
                >
                  −
                </button>
                <span className="num">{(marks[player.id] ?? 6).toFixed(1)}</span>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() =>
                    setMarks((current) => ({
                      ...current,
                      [player.id]: Math.min(10, (current[player.id] ?? 6) + 0.5),
                    }))
                  }
                >
                  +
                </button>
                <button type="button" className="btn-ghost" data-on={motm === player.id} onClick={() => setMotm(player.id)}>
                  Adam
                </button>
              </span>
            </div>
          ))}
          <button
            type="button"
            className="btn-accent"
            onClick={async () => {
              const result = await saveRatings({
                matchId: match.id,
                rows: ratedPlayers.map((player) => ({
                  playerId: player.id,
                  rating: marks[player.id] ?? 6,
                  motm: player.id === motm,
                })),
              });
              setNote(result.ok ? "Reytingler kaydedildi." : result.message);
              if (result.ok) refresh();
            }}
          >
            Reytingleri kaydet
          </button>
          {note ? <p className="meta">{note}</p> : null}
        </section>
      ) : null}
    </div>
  );
}
