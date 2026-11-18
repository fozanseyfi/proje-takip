# Platform tanıtımı — ekran çekimi

Tanıtım sayfası (`/tanitim`, `/platform-tanitimi`) `public/tanitim/*.webp` görüntülerini ve
`src/lib/tanitim/manifest.json` dosyasını kullanır. İkisi de `scripts/tour/capture.mjs` ile üretilir.

1. Demo verisi (geçici, repoya girmez):
   ```bash
   git show cc8ba3b^:src/lib/data/sample-loader.ts > src/lib/data/sample-loader.ts
   git show cc8ba3b^:src/lib/data/sample-pools.ts | sed 's/Kontrolmatik Teknoloji A\.Ş\./Demo Enerji Yapı A.Ş./g' > src/lib/data/sample-pools.ts
   ```
   ve `src/app/(app)/tour-seed/page.tsx` (örnek projeyi yükleyip kullanıcıyı demo adla yeniden adlandırır).
   Bu üç yol `.git/info/exclude` içindedir; çekimden sonra silinebilir.
2. `npx next dev -p 4200`
3. `node scripts/tour/capture.mjs [bölüm-id ...]`

Görüntüler 1440×900, 2× (2880×1800) kayıpsız WebP olarak kaydedilir.
