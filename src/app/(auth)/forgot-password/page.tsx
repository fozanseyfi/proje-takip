import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

export default function ForgotPasswordPage() {
  return (
    <div className="w-full max-w-md rounded-xl bg-bg3/95 border border-border2 p-7">
      <h1 className="font-display text-xl font-bold mb-1">Şifremi Unuttum</h1>
      <p className="text-xs text-text3 mb-5">E-posta adresine sıfırlama linki gönderelim.</p>
      <Alert variant="info" className="mb-4 text-xs">
        Lokal sürümde e-posta gönderimi yok. Supabase entegrasyonu sonrası aktif olur.
      </Alert>
      <Field label="E-posta">
        <Input type="email" placeholder="ornek@firma.com" />
      </Field>
      <Button variant="accent" className="w-full mt-4">
        Sıfırlama Linki Gönder
      </Button>
      <p className="text-xs text-text3 mt-4 text-center">
        <Link href="/login" className="text-accent hover:underline">
          ← Girişe dön
        </Link>
      </p>
    </div>
  );
}
