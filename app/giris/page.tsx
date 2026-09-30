import { LoginForm } from "@/components/admin-forms";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Giriş",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <main className="panel-page">
      <p className="kicker">Ya-Kolik</p>
      <div className="profile">
        <h1>Yönetim girişi</h1>
      </div>
      <LoginForm />
      <p className="meta" style={{ marginTop: 16 }}>
        <Link href="/">Siteye dön</Link>
      </p>
    </main>
  );
}
