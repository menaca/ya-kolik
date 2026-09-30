import { MatchList } from "@/components/match-list";
import { getTeam } from "@/lib/data";
import { countryName } from "@/lib/countries";
import { flagEmoji, positionLabel, resultFor } from "@/lib/format";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getTeam(slug);
  return { title: data?.team.name ?? "Takım" };
}

export default function TeamPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<div className="sheet" />}>
      <TeamBody params={params} />
    </Suspense>
  );
}

async function TeamBody({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getTeam(slug);
  if (!data) notFound();
  const form = [...data.recent].reverse();

  return (
    <>
      <p className="kicker">{data.team.city || "Takım"}</p>
      <div className="profile">
        <h1>{data.team.name}</h1>
      </div>
      {form.length > 0 ? (
        <div className="form-pips" aria-label="Form">
          {form.map((match) => {
            const mark = resultFor(match, data.team.id);
            return (
              <span key={match.id} className={`pip ${mark}`}>
                {mark}
              </span>
            );
          })}
        </div>
      ) : null}

      {data.next ? (
        <section className="section">
          <h2>Sıradaki maç</h2>
          <MatchList matches={[data.next]} serverNow={data.server_now} />
        </section>
      ) : null}

      <section className="section">
        <h2>Kadro</h2>
        {data.players.length === 0 ? (
          <p className="empty">
            <strong>Kadro boş.</strong>
          </p>
        ) : (
          <div className="table-wrap">
            <table className="grid">
              <thead>
                <tr>
                  <th className="team">Oyuncu</th>
                  <th>No</th>
                  <th>Mevki</th>
                  <th>Yaş</th>
                  <th>Uyruk</th>
                </tr>
              </thead>
              <tbody>
                {data.players.map((player) => (
                  <tr key={player.id}>
                    <td className="team">
                      <Link href={`/oyuncu/${player.id}`}>
                        {player.first_name} {player.last_name}
                      </Link>
                    </td>
                    <td className="num">{player.shirt_number ?? "—"}</td>
                    <td>{positionLabel(player.position)}</td>
                    <td className="num">{player.age ?? "—"}</td>
                    <td>
                      {flagEmoji(player.nationality_code)} {countryName(player.nationality_code)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {data.recent.length > 0 ? (
        <section className="section">
          <h2>Son maçlar</h2>
          <MatchList matches={data.recent} serverNow={data.server_now} />
        </section>
      ) : null}
    </>
  );
}
