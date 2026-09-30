"use client";

import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { useMemo, useState } from "react";
import { saveLineup } from "@/lib/actions";
import { FORMATIONS, formationLabel, parseFormation, slotPoints } from "@/lib/formations";
import type { PlayerOption } from "@/lib/types";

function nameOf(player: PlayerOption) {
  return `${player.first_name} ${player.last_name}`;
}

export function TacticsBoard({
  matchId,
  teamId,
  teamName,
  side,
  players,
  initialRows,
  initialStarters,
  initialBench,
}: {
  matchId: string;
  teamId: string;
  teamName: string;
  side: number;
  players: PlayerOption[];
  initialRows: number[];
  initialStarters: { slot: number; playerId: string }[];
  initialBench: string[];
}) {
  const presets = FORMATIONS[side] ?? [];
  const [rows, setRows] = useState(initialRows);
  const [slots, setSlots] = useState<Record<number, string>>(() => {
    const next: Record<number, string> = {};
    for (const starter of initialStarters) next[starter.slot] = starter.playerId;
    return next;
  });
  const [bench, setBench] = useState<string[]>(initialBench);
  const [selected, setSelected] = useState<string | null>(null);
  const [custom, setCustom] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const points = useMemo(() => slotPoints(rows), [rows]);
  const used = new Set([...Object.values(slots), ...bench]);
  const pool = players.filter((player) => !used.has(player.id));

  function place(playerId: string, slot: number) {
    setSlots((current) => {
      const next = { ...current };
      for (const key of Object.keys(next)) {
        if (next[Number(key)] === playerId) delete next[Number(key)];
      }
      next[slot] = playerId;
      return next;
    });
    setBench((current) => current.filter((id) => id !== playerId));
    setSelected(null);
  }

  function toBench(playerId: string) {
    setSlots((current) => {
      const next = { ...current };
      for (const key of Object.keys(next)) {
        if (next[Number(key)] === playerId) delete next[Number(key)];
      }
      return next;
    });
    setBench((current) => (current.includes(playerId) ? current : [...current, playerId]));
    setSelected(null);
  }

  function onDragEnd(event: DragEndEvent) {
    const playerId = String(event.active.id).replace("player:", "");
    const over = event.over?.id ? String(event.over.id) : "";
    if (over.startsWith("slot:")) place(playerId, Number(over.slice(5)));
    if (over === "bench") toBench(playerId);
  }

  async function persist(publish: boolean) {
    setPending(true);
    const starters = Object.entries(slots)
      .filter(([, playerId]) => playerId)
      .map(([slot, playerId]) => ({ slot: Number(slot), playerId }));
    const result = await saveLineup({
      matchId,
      teamId,
      rows,
      starters,
      bench,
      publish,
    });
    setPending(false);
    setMessage(result.ok ? (publish ? "Kadro yayınlandı." : "Taslak kaydedildi.") : result.message);
  }

  return (
    <section className="section">
      <h2>{teamName}</h2>
      <div className="row-actions">
        {presets.map((preset) => (
          <button key={preset.id} type="button" className="btn-ghost" onClick={() => setRows(preset.rows)}>
            {preset.id}
          </button>
        ))}
      </div>
      <form
        className="row-actions"
        onSubmit={(event) => {
          event.preventDefault();
          const parsed = parseFormation(custom, side);
          if (!parsed) {
            setMessage("Diziliş kişi sayısıyla tutmuyor.");
            return;
          }
          setRows(parsed);
        }}
      >
        <input value={custom} onChange={(event) => setCustom(event.target.value)} placeholder="4-3-3" aria-label="Özel diziliş" />
        <button className="btn-ghost" type="submit">
          Uygula
        </button>
        <span className="meta">{formationLabel(rows)}</span>
      </form>
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="pitch-wrap">
          <svg viewBox="0 0 68 92" aria-hidden="true">
            <rect x="2" y="2" width="64" height="88" fill="none" stroke="var(--pitch-line)" strokeWidth="0.6" />
            <line x1="2" y1="46" x2="66" y2="46" stroke="var(--pitch-line)" strokeWidth="0.6" />
            <circle cx="34" cy="46" r="7" fill="none" stroke="var(--pitch-line)" strokeWidth="0.6" />
            <rect x="16" y="2" width="36" height="14" fill="none" stroke="var(--pitch-line)" strokeWidth="0.6" />
            <rect x="16" y="76" width="36" height="14" fill="none" stroke="var(--pitch-line)" strokeWidth="0.6" />
          </svg>
          {points.map((point) => (
            <Slot
              key={point.index}
              index={point.index}
              x={point.x}
              y={point.y}
              player={players.find((player) => player.id === slots[point.index])}
              selected={selected}
              onTap={() => {
                const current = slots[point.index];
                if (selected) place(selected, point.index);
                else if (current) setSelected(current);
              }}
            />
          ))}
        </div>
        <Bench onDrop={() => selected && toBench(selected)}>
          {bench.map((id) => {
            const player = players.find((item) => item.id === id);
            if (!player) return null;
            return <PlayerChip key={id} player={player} selected={selected === id} onTap={() => setSelected(id)} />;
          })}
        </Bench>
        <div className="bench">
          {pool.map((player) => (
            <PlayerChip
              key={player.id}
              player={player}
              selected={selected === player.id}
              onTap={() => setSelected(player.id)}
            />
          ))}
        </div>
      </DndContext>
      <div className="row-actions">
        <button type="button" className="btn-ghost" disabled={pending} onClick={() => persist(false)}>
          Taslak
        </button>
        <button type="button" className="btn-accent" disabled={pending} onClick={() => persist(true)}>
          Kadroyu yayınla
        </button>
      </div>
      {message ? <p className="meta">{message}</p> : null}
      <p className="meta">Oyuncuya dokun, sonra slota dokun. Sürüklemek de olur.</p>
    </section>
  );
}

function PlayerChip({
  player,
  selected,
  onTap,
}: {
  player: PlayerOption;
  selected: boolean;
  onTap: () => void;
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: `player:${player.id}` });
  return (
    <button
      type="button"
      ref={setNodeRef}
      className="chip"
      data-on={selected}
      {...listeners}
      {...attributes}
      onClick={onTap}
    >
      {player.shirt_number ?? "·"} {nameOf(player)}
    </button>
  );
}

function Slot({
  index,
  x,
  y,
  player,
  selected,
  onTap,
}: {
  index: number;
  x: number;
  y: number;
  player?: PlayerOption;
  selected: string | null;
  onTap: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot:${index}` });
  return (
    <button
      type="button"
      ref={setNodeRef}
      className={player ? "slot" : "slot empty-slot"}
      data-on={isOver || (!!player && selected === player.id)}
      style={{ left: `${x}%`, top: `${y}%` }}
      onClick={onTap}
    >
      {player ? (
        <>
          <b className="num">{player.shirt_number ?? "·"}</b>
          <small>{player.last_name}</small>
        </>
      ) : (
        <small>{index + 1}</small>
      )}
    </button>
  );
}

function Bench({ children, onDrop }: { children: React.ReactNode; onDrop: () => void }) {
  const { setNodeRef } = useDroppable({ id: "bench" });
  return (
    <div ref={setNodeRef} className="bench" onClick={onDrop}>
      <span className="meta">Yedek</span>
      {children}
    </div>
  );
}
