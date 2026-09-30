import type { MatchCard } from "@/lib/types";

const kickoffFormat = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "Europe/Istanbul",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const timeFormat = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "Europe/Istanbul",
  hour: "2-digit",
  minute: "2-digit",
});

const dayFormat = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "Europe/Istanbul",
  day: "numeric",
  month: "long",
});

export function formatKickoff(iso: string) {
  return kickoffFormat.format(new Date(iso));
}

export function formatTime(iso: string) {
  return timeFormat.format(new Date(iso));
}

export function formatDay(iso: string) {
  return dayFormat.format(new Date(iso));
}

export function slugify(value: string) {
  const map: Record<string, string> = {
    ç: "c",
    ğ: "g",
    ı: "i",
    ö: "o",
    ş: "s",
    ü: "u",
    Ç: "c",
    Ğ: "g",
    İ: "i",
    I: "i",
    Ö: "o",
    Ş: "s",
    Ü: "u",
  };
  const mapped = value
    .split("")
    .map((char) => map[char] ?? char)
    .join("");
  const slug = mapped
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "takim";
}

export function istanbulToIso(local: string) {
  return new Date(`${local}:00+03:00`).toISOString();
}

export function isoToIstanbulInput(iso: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export function positionLabel(code: string | null) {
  if (code === "KL") return "Kaleci";
  if (code === "DEF") return "Defans";
  if (code === "OS") return "Orta saha";
  if (code === "FOR") return "Forvet";
  return "—";
}

export function footLabel(code: string | null) {
  if (code === "sol") return "Sol";
  if (code === "sag") return "Sağ";
  if (code === "cift") return "Çift";
  return "—";
}

export function flagEmoji(code: string | null) {
  if (!code || !/^[A-Z]{2}$/.test(code)) return "";
  return String.fromCodePoint(...[...code].map((char) => 127397 + char.charCodeAt(0)));
}

export function eventMinute(minute: number, extra: number | null) {
  if (extra && extra > 0) return `${minute}+${extra}'`;
  return `${minute}'`;
}

export function eventText(type: string, player: string | null, related: string | null) {
  const name = player || "Oyuncu";
  if (type === "goal") return related ? `${name} · asist ${related}` : name;
  if (type === "own_goal") return `${name} · kendi kalesine`;
  if (type === "yellow") return `${name} · sarı kart`;
  if (type === "red") return `${name} · kırmızı kart`;
  if (type === "sub") return related ? `${name} girdi, ${related} çıktı` : `${name} girdi`;
  return name;
}

type Clock = Pick<
  MatchCard,
  | "status"
  | "kickoff_at"
  | "auto_start"
  | "clock_running"
  | "clock_started_at"
  | "clock_accumulated_seconds"
  | "current_half"
  | "half_minutes"
  | "half_count"
>;

export function isOnClock(match: Clock, now: number) {
  if (match.status === "live" || match.status === "ht") return true;
  if (match.status !== "scheduled" || !match.auto_start || !now) return false;
  const kick = Date.parse(match.kickoff_at);
  const end = kick + (match.half_count * match.half_minutes + 20) * 60_000;
  return kick <= now && now < end;
}

export function presentMatch(match: Clock, now: number | null) {
  if (match.status === "ft") return { label: "MS", live: false, status: "ft" as const };
  if (match.status === "ht") return { label: "DA", live: false, status: "ht" as const };

  const kick = Date.parse(match.kickoff_at);
  if (now == null || (match.status === "scheduled" && kick > now)) {
    return { label: formatTime(match.kickoff_at), live: false, status: "scheduled" as const };
  }

  const elapsed = elapsedSeconds(match, now);
  const raw = Math.max(1, Math.floor(elapsed / 60) + 1);
  if (match.clock_running) {
    const cap = match.current_half * match.half_minutes;
    if (raw > cap) return { label: `${cap}+${raw - cap}`, live: true, status: "live" as const };
  }
  return { label: `${raw}'`, live: true, status: "live" as const };
}

export function resultFor(match: MatchCard, teamId: string) {
  const home = match.home.id === teamId;
  const gf = home ? match.home_score : match.away_score;
  const ga = home ? match.away_score : match.home_score;
  if (gf > ga) return "G";
  if (gf === ga) return "B";
  return "M";
}

export function elapsedSeconds(match: Clock, now = Date.now()) {
  if (match.clock_running && match.clock_started_at) {
    return (
      match.clock_accumulated_seconds +
      Math.max(0, Math.floor((now - Date.parse(match.clock_started_at)) / 1000))
    );
  }
  if (match.auto_start && match.status !== "ft" && match.status !== "ht") {
    const kick = Date.parse(match.kickoff_at);
    if (kick <= now) return Math.max(0, Math.floor((now - kick) / 1000));
  }
  return match.clock_accumulated_seconds;
}

export function minuteParts(match: Clock, now = Date.now()) {
  const elapsed = elapsedSeconds(match, now);
  const raw = Math.max(1, Math.floor(elapsed / 60) + 1);
  if (!match.clock_running && match.auto_start) {
    return {
      minute: raw,
      extra: null as number | null,
      half: raw > match.half_minutes ? Math.min(match.half_count, 2) : 1,
    };
  }
  const cap = match.current_half * match.half_minutes;
  if (raw > cap) return { minute: cap, extra: raw - cap, half: match.current_half };
  return { minute: raw, extra: null as number | null, half: match.current_half };
}
