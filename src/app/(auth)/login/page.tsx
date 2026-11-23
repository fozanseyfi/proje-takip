"use client";

import { useRouter } from "next/navigation";
import { LoginKitPage } from "@/components/auth/login-kit";
import { LOGIN_PLATFORM } from "@/lib/login-platform";
import { useStore } from "@/lib/store";

/*
 * Giriş sayfası. Görünüm bütün platformlarda ortak (components/auth/login-kit.tsx);
 * bu platforma özgü tanıtım ve ekranlar lib/login-platform.tsx'te.
 * Demo girişi: şifre kontrolü yok, e-posta ile oturum açılır.
 */
export default function LoginPage() {
  const router = useRouter();
  const login = useStore((s) => s.login);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = new FormData(e.currentTarget).get("email");
    login(typeof email === "string" ? email : undefined);
    router.push("/portfolio");
  }

  return (
    <LoginKitPage
      platform={LOGIN_PLATFORM}
      form={{ onSubmit, defaultEmail: "ozan.seyfi@kontrolmatik.com", defaultPassword: "demo" }}
    />
  );
}
