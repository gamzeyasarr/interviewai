# InterviewAI — Geliştirme Görev Listesi (PRD’ye göre)

Bu liste `docs/prd.md` ile hizalıdır. Görevler MVP v1.0 için sırayla ilerlemeyi önerir; paralel yapılabilecekleri not ettik.

---

## Faz 0 — Proje iskeleti

- [x] Next.js (App Router) projesini oluştur; TypeScript ve Tailwind CSS etkin.
- [x] `eslint` / `prettier` (veya mevcut şablondaki lint) ile tutarlı format.
- [x] `.env.local` örneği: `OPENAI_API_KEY` veya `ANTHROPIC_API_KEY` (hangi sağlayıcı seçildiyse); anahtarları repoya koyma.
- [x] `README.md`: kurulum, ortam değişkenleri ve `npm run dev` ile çalıştırma (kısa).

---

## Faz 1 — Tasarım ve tek sayfa yapısı

- [x] Global font: PRD’deki gibi Inter veya Geist (ör. `next/font`).
- [x] Renk ve boşluklar için sade bir tema (Tailwind); tek ana layout: merkezi içerik, temiz input’lar.
- [x] Ana route (ör. `app/page.tsx`): tek sayfada tüm akış — şirket/pozisyon → soru → cevap → analiz → özet; ek sayfa gerekmez (SPA hissi).

---

## Faz 2 — Kullanıcı akışı (UI durumları)

Aşağıdaki adımlar **client state** (ör. `useState` / `useReducer`) ile yönetilsin:

1. [x] **Giriş:** Şirket adı ve pozisyon alanları; Türkçe etiketler ve doğrulama (boş gönderimi engelle).
2. [x] **Soru:** AI’dan gelen tek soruyu göster; yüklenirken akıcı loading UI (PRD: animasyon/feedback).
3. [x] **Cevap:** Çok satırlı metin alanı; gönder butonu.
4. [x] **Analiz:** Güçlü yönler, eksikler, ideal cevap ve 0–100 skorunu PRD JSON şemasına uygun göster.
5. [x] **Rapor / özet:** Oturum sonu kısa performans özeti (mevcut turdaki skor + madde madde özet veya birikimli metrik — MVP’de en azından son turun özeti).

---

## Faz 3 — AI API ve prompt

- [x] Route Handler (ör. `app/api/interview/route.ts`): server-only, istemcide API anahtarı yok.
- [x] **Soru üretimi:** İstek gövdesinde şirket + pozisyon; sistem prompt’u: kıdemli İK + ilgili alan teknik müdür rolü; çıktı **JSON** (en azından `question` alanı; soru-cevap ayrı endpoint’ler de olabilir).
- [x] **Cevap değerlendirmesi:** Kullanıcı cevabı + bağlam (şirket, pozisyon, soru); çıktı yapısı:

```json
{
  "feedback": {
    "strengths": ["string"],
    "weaknesses": ["string"],
    "ideal_answer": "string",
    "score": 0
  }
}
```

- [x] Model: GPT-4o veya Claude 3.5 Sonnet; mümkünse **JSON mode** / şema uyumu; parse hatalarında kullanıcıya Türkçe anlamlı hata.
- [x] Türkçe: hem UI hem model çıktıları Türkçe olacak şekilde prompt talimatı.

---

## Faz 4 — Dayanıklılık ve deneyim

- [x] Yükleme sırasında buton disable / skeleton veya spinner; çift tıklama koruması.
- [x] API hataları (timeout, rate limit, geçersiz anahtar): Türkçe mesaj; gerekiyorsa yeniden dene.
- [ ] İsteğe bağlı: basit rate limiting veya hata loglama (MVP’de minimal tutulabilir).

---

## Faz 5 — Dağıtım ve kalite

- [ ] Vercel’e deploy; production ortam değişkenlerini tanımla.
- [ ] KPI’lara yönelik smoke test: uçtan uca akış, yanıt süresi hedefi (~3 sn — ağ/model bağımlı; gerekirse kullanıcıya “birkaç saniye sürebilir” mesajı).
- [ ] Mobil ve dar ekranda temel kullanılabilirlik kontrolü.

---

## Paralel / isteğe bağlı (MVP sonrası)

- [ ] Oturum geçmişi (localStorage veya veritabanı).
- [ ] Çok turlu mülakat (aynı oturumda birden fazla soru).
- [ ] Birim testi: JSON parse ve API handler kenar durumları.

---

## Özet sıra

`Faz 0 → Faz 1 → Faz 2 (UI akışı) → Faz 3 (API + prompt) → Faz 4 → Faz 5`

Faz 3, Faz 2 ile kısmen paralel yürütülebilir (mock veri ile UI’ı bitirip sonra gerçek API’ye bağlamak).
