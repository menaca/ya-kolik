import { revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Yetkisiz", { status: 401 });
  }
  const admin = createAdminClient();
  if (!admin) return Response.json({ ok: false }, { status: 500 });
  const { error } = await admin.rpc("sync_match_clocks");
  revalidateTag("home", "max");
  revalidateTag("fixtures", "max");
  revalidateTag("live", "max");
  revalidateTag("standings", "max");
  return Response.json({ ok: !error });
}
