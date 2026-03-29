"use client";

import { useCallback, useState } from "react";

interface Feedback {
  strengths: string[];
  weaknesses: string[];
  ideal_answer: string;
  score: number;
}

type Step =
  | "input"
  | "loading_question"
  | "interview"
  | "loading_feedback"
  | "result";

async function postInterview(body: object): Promise<Response> {
  return fetch("/api/interview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function InterviewFlow() {
  const [step, setStep] = useState<Step>("input");
  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");
  const [difficulty, setDifficulty] = useState<"kolay" | "orta" | "zor">("orta"); // zorluk derecesi secimi
  const [category, setCategory] = useState<"teknik" | "davranışsal" | "stres">("davranışsal");// soru kategorsi secimi
  const [questionText, setQuestionText] = useState("");
  const [userAnswer, setUserAnswer] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStep("input");
    setCompany("");
    setPosition("");
    setQuestionText("");
    setUserAnswer("");
    setFeedback(null);
    setError(null);
  }, []);

  const isBusy =
    step === "loading_question" || step === "loading_feedback";

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    if (isBusy) return;
    setError(null);
    const c = company.trim();
    const p = position.trim();
    if (!c || !p) {
      setError("Lütfen şirket adı ve pozisyonu doldurun.");
      return;
    }
    setStep("loading_question");
    try {
      const res = await postInterview({
        action: "question",
        company: c,
        position: p,
        difficulty: difficulty,
      });
      const data = (await res.json()) as { question?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Soru alınamadı.");
        setStep("input");
        return;
      }
      if (!data.question) {
        setError("Soru alınamadı.");
        setStep("input");
        return;
      }
      setQuestionText(data.question);
      setUserAnswer("");
      setStep("interview");
    } catch {
      setError("Bağlantı hatası. İnternetinizi kontrol edip tekrar deneyin.");
      setStep("input");
    }
  }

  async function handleEvaluate(e: React.FormEvent) {
    e.preventDefault();
    if (isBusy) return;
    setError(null);
    const ans = userAnswer.trim();
    if (!ans) {
      setError("Lütfen cevabınızı yazın.");
      return;
    }
    setStep("loading_feedback");
    try {
      const res = await postInterview({
        action: "evaluate",
        company: company.trim(),
        position: position.trim(),
        question: questionText,
        answer: ans,
      });
      const data = (await res.json()) as { feedback?: Feedback; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Değerlendirme alınamadı.");
        setStep("interview");
        return;
      }
      if (!data.feedback) {
        setError("Değerlendirme alınamadı.");
        setStep("interview");
        return;
      }
      setFeedback(data.feedback);
      setStep("result");
    } catch {
      setError("Bağlantı hatası. İnternetinizi kontrol edip tekrar deneyin.");
      setStep("interview");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-10 sm:py-14">
      <header className="mb-10 text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-teal-700">
          InterviewAI
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-stone-900 sm:text-3xl">
          Mülakat simülasyonu
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          Hedef şirket ve pozisyona göre tek soru, anlık analiz ve özet rapor.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
        >
          {error}
        </div>
      )}

      {step === "input" && (
        <form
          onSubmit={handleStart}
          className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8"
        >
          <div className="space-y-5">
            <div>
              <label htmlFor="company" className="block text-sm font-medium text-stone-800">
                Şirket adı
              </label>
              <input
                id="company"
                name="company"
                type="text"
                autoComplete="organization"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                disabled={isBusy}
                placeholder="Örn: Trendyol"
                className="mt-1.5 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 outline-none ring-teal-600/0 transition placeholder:text-stone-400 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-600/20 disabled:opacity-60"
              />
            </div>
            <div>
              <label htmlFor="position" className="block text-sm font-medium text-stone-800">
                Pozisyon
              </label>
              <input
                id="position"
                name="position"
                type="text"
                autoComplete="organization-title"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                disabled={isBusy}
                placeholder="Örn: Yazılım stajyeri"
                className="mt-1.5 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 outline-none ring-teal-600/0 transition placeholder:text-stone-400 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-600/20 disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-800">
                Zorluk Seviyesi
              </label>
              <div className="mt-1.5 flex gap-2">
                {(["kolay", "orta", "zor"] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold capitalize transition
                      ${difficulty === d
                        ? "border-teal-500 bg-teal-600 text-white"
                        : "border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100"
                      }`}
                  >
                    {d === "kolay" ? "🟢 Kolay" : d === "orta" ? "🟡 Orta" : "🔴 Zor"}
                  </button>
                ))}
              </div>
              </div>

<div>
  <label className="block text-sm font-medium text-stone-800">
    Soru Kategorisi
  </label>
  <div className="mt-1.5 flex gap-2">
    {(["teknik", "davranışsal", "stres"] as const).map((c) => (
      <button
        key={c}
        type="button"
        onClick={() => setCategory(c)}
        className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold capitalize transition
          ${category === c
            ? "border-teal-500 bg-teal-600 text-white"
            : "border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100"
          }`}
      >
        {c === "teknik" ? "💻 Teknik" : c === "davranışsal" ? "🤝 Davranışsal" : "🔥 Stres"}
      </button>
    ))}
  </div>
</div>

</div>
<button
type="submit"
            disabled={isBusy}
            className="mt-8 w-full rounded-xl bg-teal-600 px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Mülakatı başlat
          </button>
          <p className="mt-3 text-center text-xs text-stone-500">
            Yapay zeka yanıtları birkaç saniye sürebilir.
          </p>
        </form>
      )}

      {step === "loading_question" && (
        <div
          className="rounded-2xl border border-stone-200 bg-white p-10 shadow-sm"
          aria-busy="true"
          aria-live="polite"
        >
          <div className="animate-shimmer h-4 w-3/4 max-w-md rounded-md" />
          <div className="mt-4 animate-shimmer h-4 w-full rounded-md" />
          <div className="mt-3 animate-shimmer h-4 w-5/6 rounded-md" />
          <p className="mt-8 text-center text-sm font-medium text-stone-600">
            Soru hazırlanıyor…
          </p>
        </div>
      )}

      {(step === "interview" || step === "loading_feedback") && (
        <form
          onSubmit={handleEvaluate}
          className="space-y-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8"
        >
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-teal-800">
              Mülakat sorusu
            </h2>
            <p className="mt-3 text-base leading-relaxed text-stone-800">{questionText}</p>
          </section>
          <section>
            <label htmlFor="answer" className="block text-sm font-medium text-stone-800">
              Cevabınız
            </label>
            <textarea
              id="answer"
              name="answer"
              rows={8}
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              disabled={step === "loading_feedback"}
              placeholder="Cevabınızı buraya yazın…"
              className="mt-1.5 w-full resize-y rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 outline-none ring-teal-600/0 transition placeholder:text-stone-400 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-600/20 disabled:opacity-60"
            />
          </section>
          <button
            type="submit"
            disabled={step === "loading_feedback"}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {step === "loading_feedback" ? (
              <>
                <span
                  className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                  aria-hidden
                />
                Değerlendiriliyor…
              </>
            ) : (
              "Cevabı gönder"
            )}
          </button>
        </form>
      )}

      {step === "result" && feedback && (
        <div className="space-y-6">
          <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-stone-900">Analiz</h2>
                <p className="mt-1 text-sm text-stone-600">
                  Güçlü yönler, gelişim alanları ve örnek ideal cevap.
                </p>
              </div>
              <div
                className="flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-full border-4 border-teal-100 bg-teal-50"
                aria-label={`Puan ${Math.round(feedback.score)}`}
              >
                <span className="text-2xl font-bold tabular-nums text-teal-900">
                  {Math.round(feedback.score)}
                </span>
                <span className="text-xs font-medium text-teal-700">/ 100</span>
              </div>
            </div>

            <div className="mt-8 grid gap-8 sm:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold text-emerald-800">Güçlü yönler</h3>
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-stone-700">
                  {feedback.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-amber-800">Eksik noktalar</h3>
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-stone-700">
                  {feedback.weaknesses.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-8">
              <h3 className="text-sm font-semibold text-stone-800">İdeal cevap örneği</h3>
              <p className="mt-2 whitespace-pre-wrap rounded-xl bg-stone-50 px-4 py-3 text-sm leading-relaxed text-stone-800">
                {feedback.ideal_answer}
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-teal-100 bg-teal-50/80 p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-teal-900">Performans özeti</h2>
            <p className="mt-3 text-sm leading-relaxed text-teal-950/90">
              Bu turda aldığınız puan <strong>{Math.round(feedback.score)} / 100</strong>.{" "}
              {feedback.strengths.length > 0
                ? "Güçlü ifade ettiğiniz noktaları koruyun; "
                : ""}
              {feedback.weaknesses.length > 0
                ? "gelişim alanlarında kısa örnek cevaplar yazarak pratik yapmaya devam edin."
                : "İyi iş çıkardınız — benzer sorularla pratik yapmaya devam edebilirsiniz."}
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-6 w-full rounded-xl border border-teal-200 bg-white px-4 py-3 text-sm font-semibold text-teal-900 shadow-sm transition hover:bg-teal-50 sm:w-auto"
            >
              Yeni simülasyon
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
