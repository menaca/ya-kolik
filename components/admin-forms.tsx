"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  login,
  saveCompetition,
  saveManualResult,
  saveMatch,
  savePlayer,
  saveTeam,
  type FormState,
} from "@/lib/actions";
import { COUNTRIES } from "@/lib/countries";

function Submit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn-accent" disabled={pending}>
      {pending ? "Kaydediliyor" : children}
    </button>
  );
}

function ErrorLine({ state }: { state: FormState }) {
  if (!state?.message) return null;
  return <p className="form-error">{state.message}</p>;
}

export function LoginForm() {
  const [state, action] = useActionState(login, null);
  return (
    <form action={action} className="stack">
      <label className="field">
        E-posta
        <input name="email" type="email" autoComplete="username" required />
      </label>
      <label className="field">
        Şifre
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      <ErrorLine state={state} />
      <Submit>Giriş</Submit>
    </form>
  );
}

export function CompetitionForm() {
  const [state, action] = useActionState(saveCompetition, null);
  return (
    <form action={action} className="stack">
      <label className="field">
        Lig
        <input name="name" required />
      </label>
      <label className="field">
        Sezon
        <input name="season" placeholder="2026" required />
      </label>
      <label className="check">
        <input name="is_primary" type="checkbox" defaultChecked />
        Birincil lig
      </label>
      <ErrorLine state={state} />
      <Submit>Ligi kaydet</Submit>
    </form>
  );
}

export function TeamForm({
  competitions,
}: {
  competitions: { id: string; name: string; season: string }[];
}) {
  const [state, action] = useActionState(saveTeam, null);
  return (
    <form action={action} className="stack">
      <label className="field">
        Ad
        <input name="name" required />
      </label>
      <label className="field">
        Kısa ad
        <input name="short_name" required maxLength={12} />
      </label>
      <label className="field">
        Şehir
        <input name="city" />
      </label>
      {competitions.length > 0 ? (
        <label className="field">
          Lig
          <select name="competition_id" defaultValue={competitions[0]?.id}>
            <option value="">Lig yok</option>
            {competitions.map((competition) => (
              <option key={competition.id} value={competition.id}>
                {competition.name} {competition.season}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label className="check">
        <input name="featured" type="checkbox" />
        Sitenin kulübü
      </label>
      <ErrorLine state={state} />
      <Submit>Takımı kaydet</Submit>
    </form>
  );
}

export function PlayerForm({
  teams,
  player,
}: {
  teams: { id: string; name: string }[];
  player?: {
    id: string;
    team_id: string | null;
    first_name: string;
    last_name: string;
    birth_date: string | null;
    nationality_code: string | null;
    position: string | null;
    shirt_number: number | null;
    height_cm: number | null;
    preferred_foot: string | null;
    active: boolean;
  };
}) {
  const [state, action] = useActionState(savePlayer, null);
  return (
    <form action={action} className="stack">
      {player ? <input type="hidden" name="id" value={player.id} /> : null}
      <label className="field">
        Ad
        <input name="first_name" defaultValue={player?.first_name} required />
      </label>
      <label className="field">
        Soyad
        <input name="last_name" defaultValue={player?.last_name} required />
      </label>
      <label className="field">
        Takım
        <select name="team_id" defaultValue={player?.team_id ?? teams[0]?.id} required>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Doğum tarihi
        <input name="birth_date" type="date" defaultValue={player?.birth_date ?? ""} />
      </label>
      <label className="field">
        Uyruk
        <select name="nationality_code" defaultValue={player?.nationality_code ?? "TR"}>
          <option value="">—</option>
          {COUNTRIES.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Mevki
        <select name="position" defaultValue={player?.position ?? "OS"}>
          <option value="KL">Kaleci</option>
          <option value="DEF">Defans</option>
          <option value="OS">Orta saha</option>
          <option value="FOR">Forvet</option>
        </select>
      </label>
      <label className="field">
        Forma no
        <input name="shirt_number" inputMode="numeric" defaultValue={player?.shirt_number ?? ""} />
      </label>
      <label className="field">
        Boy (cm)
        <input name="height_cm" inputMode="numeric" defaultValue={player?.height_cm ?? ""} />
      </label>
      <label className="field">
        Ayak
        <select name="preferred_foot" defaultValue={player?.preferred_foot ?? ""}>
          <option value="">—</option>
          <option value="sol">Sol</option>
          <option value="sag">Sağ</option>
          <option value="cift">Çift</option>
        </select>
      </label>
      <label className="check">
        <input name="active" type="checkbox" defaultChecked={player?.active ?? true} />
        Aktif
      </label>
      <ErrorLine state={state} />
      <Submit>Oyuncuyu kaydet</Submit>
    </form>
  );
}

export function MatchForm({
  teams,
  competitions,
}: {
  teams: { id: string; name: string }[];
  competitions: { id: string; name: string; season: string }[];
}) {
  const [state, action] = useActionState(saveMatch, null);
  return (
    <form action={action} className="stack">
      <label className="field">
        Lig
        <select name="competition_id" defaultValue={competitions[0]?.id ?? ""}>
          <option value="">Lig yok</option>
          {competitions.map((competition) => (
            <option key={competition.id} value={competition.id}>
              {competition.name} {competition.season}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Hafta
        <input name="matchweek" inputMode="numeric" />
      </label>
      <label className="field">
        Ev sahibi
        <select name="home_team_id" defaultValue={teams[0]?.id} required>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Deplasman
        <select name="away_team_id" defaultValue={teams[1]?.id ?? teams[0]?.id} required>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Başlama (İstanbul)
        <input name="kickoff_at" type="datetime-local" required />
      </label>
      <label className="field">
        Saha
        <input name="venue" />
      </label>
      <label className="field">
        Kişi
        <input name="players_per_side" type="number" min={5} max={11} defaultValue={11} />
      </label>
      <label className="field">
        Devre dakikası
        <input name="half_minutes" type="number" min={5} max={60} defaultValue={45} />
      </label>
      <label className="check">
        <input name="auto_start" type="checkbox" defaultChecked />
        Saat gelince otomatik başlasın
      </label>
      <ErrorLine state={state} />
      <Submit>Maçı kur</Submit>
    </form>
  );
}

export function ManualScoreForm({ matchId }: { matchId: string }) {
  const [state, action] = useActionState(saveManualResult, null);
  return (
    <form action={action} className="stack">
      <input type="hidden" name="match_id" value={matchId} />
      <p className="kicker">Olaysız sonuç</p>
      <label className="field">
        Ev sahibi
        <input name="home_score" inputMode="numeric" required />
      </label>
      <label className="field">
        Deplasman
        <input name="away_score" inputMode="numeric" required />
      </label>
      <ErrorLine state={state} />
      <Submit>Sonucu yaz ve bitir</Submit>
    </form>
  );
}
