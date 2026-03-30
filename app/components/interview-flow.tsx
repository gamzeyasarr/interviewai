"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Feedback {
  strengths: string[];
  weaknesses: string[];
  ideal_answer: string;
  score: number;
}

interface CvResult {
  strengths: string[];
  weaknesses: string[];
  missing: string[];
  score: number;
  summary: string;
}

interface SessionEntry {
  question: string;
  answer: string;
  feedback: Feedback;
}

type Step =
  | "input"
  | "cv"
  | "loading_cv"
  | "cv_result"
  | "loading_question"
  | "interview"
  | "loading_feedback"
  | "result";

// ─── Web Speech API types ─────────────────────────────────────────────────────

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: Event & { error?: string; message?: string }) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function postInterview(body: object): Promise<Response> {
  return fetch("/api/interview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function getSpeechRecognition(): SpeechRecognitionInstance | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = "tr-TR";
  rec.continuous = false;
  rec.interimResults = false;
  return rec;
}

function speak(text: string): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = "tr-TR";
  utt.rate = 0.95;
  const voices = window.speechSynthesis.getVoices();
  const trVoice = voices.find((v) => v.lang.startsWith("tr"));
  if (trVoice) utt.voice = trVoice;
  window.speechSynthesis.speak(utt);
}

function stopSpeaking(): void {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

function safeString(val: unknown): string {
  if (typeof val === "string") return val;
  if (val === null || val === undefined) return "";
  return String(val);
}

// ─── CV file → plain text ─────────────────────────────────────────────────────

async function extractTextFromFile(file: File): Promise<string> {
  if (file.type === "text/plain" || file.name.endsWith(".txt") || file.name.endsWith(".md")) {
    return file.text();
  }

  if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    const res = await fetch("/api/interview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "parse-pdf", base64 }),
    });
    const data = (await res.json()) as { text?: string; error?: string };
    if (!res.ok || !data.text) throw new Error(data.error ?? "PDF okunamadı.");
    return safeString(data.text);
  }

  if (
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.name.endsWith(".docx")
  ) {
    const mammoth = await import("mammoth");
    const buffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    return safeString(result.value);
  }

  throw new Error(`Desteklenmeyen dosya türü: ${file.name}. PDF, DOCX veya TXT yükleyin.`);
}

// ─── Score ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score, size = 96 }: { score: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={6} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={score >= 70 ? "#0d9488" : score >= 40 ? "#f59e0b" : "#ef4444"}
        strokeWidth={6}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.8s ease" }}
      />
      {/* ✅ DÜZELTME 4: hardcoded renk yerine currentColor kullan */}
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        style={{
          transform: `rotate(90deg) translate(0px, -${size}px)`,
          fontSize: size * 0.22,
          fontWeight: 700,
          fill: "currentColor",
        }}
      >
        {Math.round(score)}
      </text>
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function InterviewFlow() {
  const [step, setStep] = useState<Step>("input");
  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");
  const [difficulty, setDifficulty] = useState<"kolay" | "orta" | "zor">("orta");
  const [category, setCategory] = useState<"teknik" | "davranışsal" | "stres">("davranışsal");
  const [questionText, setQuestionText] = useState("");
  const [userAnswer, setUserAnswer] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [cvText, setCvText] = useState<string>("");
  const [cvResult, setCvResult] = useState<CvResult | null>(null);
  const [session, setSession] = useState<SessionEntry[]>([]);
  const [showReport, setShowReport] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Speech state ──
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // ── CV file upload state ──
  const [cvFileName, setCvFileName] = useState<string | null>(null);
  const [cvFileLoading, setCvFileLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSpeechSupported(!!getSpeechRecognition());
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  useEffect(() => {
    stopListening();
    stopSpeaking();
    setIsSpeaking(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ✅ DÜZELTME 5: Modal açıkken body scroll'u engelle
  useEffect(() => {
    if (showReport) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showReport]);

  const reset = useCallback(() => {
    stopListening();
    stopSpeaking();
    setStep("input");
    setCompany("");
    setPosition("");
    setQuestionText("");
    setUserAnswer("");
    setFeedback(null);
    setCvText("");
    setCvResult(null);
    setCvFileName(null);
    setSession([]);
    setShowReport(false);
    setError(null);
    setIsListening(false);
    setIsSpeaking(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isBusy =
    step === "loading_question" ||
    step === "loading_feedback" ||
    step === "loading_cv";

  // ── Speech recognition ──────────────────────────────────────────────────────

  // ✅ DÜZELTME 6: useCallback ile sarıldı — dependency array uyarıları önlenir
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  function toggleListening() {
    if (isListening) { stopListening(); return; }
    const rec = getSpeechRecognition();
    if (!rec) {
      setError("Bu tarayıcı sesli yazmayı desteklemiyor. Chrome/Edge deneyin.");
      return;
    }
    recognitionRef.current = rec;
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = Array.from(e.results).map((r) => r[0].transcript).join(" ");
      setUserAnswer((prev) => (prev ? prev + " " + transcript : transcript));
    };
    rec.onerror = (e) => {
      const err = typeof e?.error === "string" ? e.error : "";
      if (err === "not-allowed") setError("Mikrofon izni reddedildi. Tarayıcı izinlerini kontrol edin.");
      else if (err === "service-not-allowed") setError("Tarayıcı ses tanıma servisini engelledi.");
      else if (err === "no-speech") setError("Ses algılanmadı. Tekrar deneyin.");
      else if (err) setError(`Sesli yazma hatası: ${err}`);
      stopListening();
    };
    rec.onend = () => { recognitionRef.current = null; setIsListening(false); };
    try {
      rec.start();
      setIsListening(true);
    } catch {
      setError("Sesli yazma başlatılamadı. Sayfayı yenileyip tekrar deneyin.");
      stopListening();
    }
  }

  // ── Text-to-speech ──────────────────────────────────────────────────────────

  function handleSpeak(text: string) {
    if (isSpeaking) { stopSpeaking(); setIsSpeaking(false); return; }
    speak(text);
    setIsSpeaking(true);
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const check = setInterval(() => {
        if (!window.speechSynthesis.speaking) { setIsSpeaking(false); clearInterval(check); }
      }, 200);
    }
  }

  // ── CV file upload ──────────────────────────────────────────────────────────

  // ✅ DÜZELTME 7: Tekrar eden dosya işleme mantığı tek fonksiyona çıkarıldı
  const processFile = useCallback(async (file: File) => {
    setError(null);
    setCvFileLoading(true);
    try {
      const text = await extractTextFromFile(file);
      setCvText(safeString(text));
      setCvFileName(file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dosya okunamadı.");
    } finally {
      setCvFileLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, []);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) await processFile(file);
  }

  async function handleFileDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) await processFile(file);
  }

  // ── API calls ───────────────────────────────────────────────────────────────

  async function fetchNextQuestion(currentSession: SessionEntry[]) {
    setError(null);
    setStep("loading_question");
    try {
      const res = await postInterview({
        action: "question",
        company: company.trim(),
        position: position.trim(),
        difficulty,
        category,
        history: currentSession.flatMap((s) => [
          { role: "assistant", content: s.question },
          { role: "user", content: s.answer },
        ]),
      });
      const data = (await res.json()) as { question?: string; error?: string };
      if (!res.ok) { setError(data.error ?? "Soru alınamadı."); setStep("result"); return; }
      if (!data.question) { setError("Soru alınamadı."); setStep("result"); return; }
      setQuestionText(data.question);
      setUserAnswer("");
      setFeedback(null);
      setStep("interview");
    } catch {
      setError("Bağlantı hatası."); setStep("result");
    }
  }

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    if (isBusy) return;
    setError(null);
    const c = company.trim();
    const p = position.trim();
    if (!c || !p) { setError("Lütfen şirket adı ve pozisyonu doldurun."); return; }
    await fetchNextQuestion([]);
  }

  async function handleEvaluate(e: React.FormEvent) {
    e.preventDefault();
    if (isBusy) return;
    setError(null);
    stopListening();
    stopSpeaking();
    const ans = userAnswer.trim();
    if (!ans) { setError("Lütfen cevabınızı yazın."); return; }
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
      if (!res.ok) { setError(data.error ?? "Değerlendirme alınamadı."); setStep("interview"); return; }
      if (!data.feedback) { setError("Değerlendirme alınamadı."); setStep("interview"); return; }
      const newEntry: SessionEntry = { question: questionText, answer: ans, feedback: data.feedback };
      setSession((prev) => [...prev, newEntry]);
      setFeedback(data.feedback);
      setStep("result");
    } catch {
      setError("Bağlantı hatası."); setStep("interview");
    }
  }

  async function handleCvAnalyze() {
    const cv = safeString(cvText).trim();
    if (!cv) { setError("CV metni boş olamaz."); return; }
    setError(null);
    setStep("loading_cv");
    try {
      const res = await postInterview({ action: "analyze-cv", cv });
      const data = (await res.json()) as { result?: CvResult; error?: string };
      if (!res.ok) { setError(data.error ?? "CV analiz edilemedi."); setStep("cv"); return; }
      setCvResult(data.result ?? null);
      setStep("cv_result");
    } catch {
      setError("Bağlantı hatası."); setStep("cv");
    }
  }

  // ── Mic button ────────────────────────────────────────────────────────────

  const MicButton = () => (
    <button
      type="button"
      onClick={toggleListening}
      title={isListening ? "Dinlemeyi durdur" : "Sesli cevap ver"}
      className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition
        ${isListening
          ? "animate-pulse border-red-300 bg-red-50 text-red-700"
          : "border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100"}`}
    >
      {isListening ? (
        <>
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
          </span>
          Durdur
        </>
      ) : (
        <>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1a4 4 0 0 1 4 4v7a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm-1 19.93V23h2v-2.07A8 8 0 0 0 20 13h-2a6 6 0 0 1-12 0H4a8 8 0 0 0 7 7.93z" />
          </svg>
          Sesle yaz
        </>
      )}
    </button>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-10 sm:py-14">
      <header className="mb-10 text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-teal-700">InterviewAI</p>
        <h1 className="mt-2 text-2xl font-semibold text-stone-900 sm:text-3xl">Mülakat simülasyonu</h1>
        <p className="mt-2 text-sm text-stone-600">
          Hedef şirket ve pozisyona göre tek soru, anlık analiz ve özet rapor.
        </p>
      </header>

      {error && (
        <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {error}
        </div>
      )}

      {/* ── GİRİŞ EKRANI ── */}
      {step === "input" && (
        <form onSubmit={handleStart} className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="space-y-5">
            <div>
              <label htmlFor="company" className="block text-sm font-medium text-stone-800">Şirket adı</label>
              <input id="company" type="text" autoComplete="organization" value={company}
                onChange={(e) => setCompany(e.target.value)} disabled={isBusy} placeholder="Örn: Trendyol"
                className="mt-1.5 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-600/20 disabled:opacity-60"
              />
            </div>
            <div>
              <label htmlFor="position" className="block text-sm font-medium text-stone-800">Pozisyon</label>
              <input id="position" type="text" autoComplete="organization-title" value={position}
                onChange={(e) => setPosition(e.target.value)} disabled={isBusy} placeholder="Örn: Yazılım stajyeri"
                className="mt-1.5 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-600/20 disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-800">Zorluk Seviyesi</label>
              <div className="mt-1.5 flex gap-2">
                {(["kolay", "orta", "zor"] as const).map((d) => (
                  <button key={d} type="button" onClick={() => setDifficulty(d)}
                    className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold capitalize transition
                      ${difficulty === d ? "border-teal-500 bg-teal-600 text-white" : "border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100"}`}>
                    {d === "kolay" ? "🟢 Kolay" : d === "orta" ? "🟡 Orta" : "🔴 Zor"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-800">Soru Kategorisi</label>
              <div className="mt-1.5 flex gap-2">
                {(["teknik", "davranışsal", "stres"] as const).map((c) => (
                  <button key={c} type="button" onClick={() => setCategory(c)}
                    className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold capitalize transition
                      ${category === c ? "border-teal-500 bg-teal-600 text-white" : "border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100"}`}>
                    {c === "teknik" ? "💻 Teknik" : c === "davranışsal" ? "🤝 Davranışsal" : "🔥 Stres"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button type="submit" disabled={isBusy}
            className="mt-8 w-full rounded-xl bg-teal-600 px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-70">
            Mülakatı başlat
          </button>
          <button type="button" onClick={() => setStep("cv")}
            className="mt-3 w-full rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-800 transition hover:bg-teal-100">
            📄 Önce CV&apos;mi analiz et
          </button>
          <p className="mt-3 text-center text-xs text-stone-500">Yapay zeka yanıtları birkaç saniye sürebilir.</p>
        </form>
      )}

      {/* ── CV GİRİŞ EKRANI ── */}
      {step === "cv" && (
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-semibold text-stone-900">CV Analizi</h2>
          <p className="mt-1 text-sm text-stone-600">CV&apos;nizi yapıştırın veya dosya yükleyin.</p>

          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            className="mt-4 flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-stone-200 bg-stone-50 px-6 py-6 text-center transition hover:border-teal-400 hover:bg-teal-50/40"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,.md"
              className="hidden"
              onChange={handleFileChange}
            />
            {cvFileLoading ? (
              <span className="text-sm text-stone-500">Dosya okunuyor…</span>
            ) : cvFileName ? (
              <>
                <span className="text-2xl">📎</span>
                <span className="text-sm font-medium text-teal-800">{cvFileName}</span>
                <span className="text-xs text-stone-500">Başka dosya için tıklayın</span>
              </>
            ) : (
              <>
                <span className="text-3xl">📂</span>
                <span className="text-sm font-medium text-stone-700">PDF, DOCX veya TXT yükleyin</span>
                <span className="text-xs text-stone-400">veya dosyayı sürükleyip bırakın</span>
              </>
            )}
          </div>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-stone-200" />
            <span className="text-xs text-stone-400">ya da</span>
            <div className="h-px flex-1 bg-stone-200" />
          </div>

          <textarea
            rows={8}
            value={safeString(cvText)}
            onChange={(e) => { setCvText(e.target.value); setCvFileName(null); }}
            placeholder="CV metninizi buraya yapıştırın…"
            className="w-full resize-y rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-600/20"
          />
          <div className="mt-4 flex gap-3">
            <button type="button" onClick={() => setStep("input")}
              className="flex-1 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-100">
              ← Geri
            </button>
            <button type="button" onClick={handleCvAnalyze} disabled={cvFileLoading}
              className="flex-1 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60">
              CV&apos;mi Analiz Et
            </button>
          </div>
        </div>
      )}

      {/* ── CV YÜKLENİYOR ── */}
      {step === "loading_cv" && (
        <div className="rounded-2xl border border-stone-200 bg-white p-10 shadow-sm text-center">
          <div className="animate-pulse h-4 w-3/4 mx-auto rounded-md bg-stone-200" />
          <div className="mt-4 animate-pulse h-4 w-full rounded-md bg-stone-200" />
          <div className="mt-3 animate-pulse h-4 w-5/6 mx-auto rounded-md bg-stone-200" />
          <p className="mt-8 text-sm font-medium text-stone-600">CV analiz ediliyor…</p>
        </div>
      )}

      {/* ── CV SONUÇ EKRANI ── */}
      {step === "cv_result" && cvResult && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-stone-900">CV Analiz Sonucu</h2>
                <p className="mt-1 text-sm text-stone-600">Türk iş piyasası standartlarına göre.</p>
              </div>
              <ScoreRing score={cvResult.score} size={80} />
            </div>
            <p className="mt-4 text-sm leading-relaxed text-stone-700">{cvResult.summary}</p>
            <div className="mt-6 grid gap-6 sm:grid-cols-3">
              <div>
                <h3 className="text-sm font-semibold text-emerald-800">✅ Güçlü yönler</h3>
                <ul className="mt-2 list-disc pl-5 text-sm text-stone-700 space-y-1">
                  {cvResult.strengths.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-amber-800">⚠️ Zayıf yönler</h3>
                <ul className="mt-2 list-disc pl-5 text-sm text-stone-700 space-y-1">
                  {cvResult.weaknesses.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-red-800">❌ Eksikler</h3>
                <ul className="mt-2 list-disc pl-5 text-sm text-stone-700 space-y-1">
                  {cvResult.missing.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setStep("cv")}
              className="flex-1 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50">
              ← Tekrar analiz et
            </button>
            <button type="button" onClick={() => setStep("input")}
              className="flex-1 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-700">
              Mülakata geç →
            </button>
          </div>
        </div>
      )}

      {/* ── SORU YÜKLENİYOR ── */}
      {step === "loading_question" && (
        <div className="rounded-2xl border border-stone-200 bg-white p-10 shadow-sm" aria-busy="true" aria-live="polite">
          <div className="animate-pulse h-4 w-3/4 max-w-md rounded-md bg-stone-200" />
          <div className="mt-4 animate-pulse h-4 w-full rounded-md bg-stone-200" />
          <div className="mt-3 animate-pulse h-4 w-5/6 rounded-md bg-stone-200" />
          <p className="mt-8 text-center text-sm font-medium text-stone-600">Soru hazırlanıyor…</p>
        </div>
      )}

      {/* ── MÜLAKAT EKRANI ── */}
      {(step === "interview" || step === "loading_feedback") && (
        <form onSubmit={handleEvaluate} className="space-y-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          {session.length > 0 && (
            <p className="text-xs text-stone-500 text-right">Soru {session.length + 1}</p>
          )}
          <section>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-teal-800">Mülakat sorusu</h2>
              {typeof window !== "undefined" && window.speechSynthesis && (
                <button
                  type="button"
                  onClick={() => handleSpeak(questionText)}
                  title={isSpeaking ? "Sesi durdur" : "Soruyu sesli oku"}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition
                    ${isSpeaking ? "border-teal-300 bg-teal-50 text-teal-700" : "border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100"}`}
                >
                  {isSpeaking ? (
                    <>
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
                      </svg>
                      Durdur
                    </>
                  ) : (
                    <>
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                      </svg>
                      Sesli oku
                    </>
                  )}
                </button>
              )}
            </div>
            <p className="mt-3 text-base leading-relaxed text-stone-800">{questionText}</p>
          </section>
          <section>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="answer" className="block text-sm font-medium text-stone-800">Cevabınız</label>
              {speechSupported && <MicButton />}
            </div>
            <textarea
              id="answer"
              rows={8}
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              disabled={step === "loading_feedback"}
              placeholder={isListening ? "🎤 Dinleniyor… konuşmaya başlayın" : "Cevabınızı buraya yazın veya mikrofonu kullanın…"}
              className={`w-full resize-y rounded-xl border bg-stone-50 px-4 py-3 text-stone-900 outline-none transition placeholder:text-stone-400 focus:bg-white focus:ring-2 focus:ring-teal-600/20 disabled:opacity-60
                ${isListening ? "border-red-300 focus:border-red-400" : "border-stone-200 focus:border-teal-500"}`}
            />
            {isListening && (
              <p className="mt-1.5 text-xs text-red-600 font-medium animate-pulse">
                🔴 Mikrofon aktif — cevabınızı söyleyin, bitince &quot;Durdur&quot;a basın
              </p>
            )}
          </section>
          <button type="submit" disabled={step === "loading_feedback"}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-70">
            {step === "loading_feedback" ? (
              <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden /> Değerlendiriliyor…</>
            ) : "Cevabı gönder"}
          </button>
        </form>
      )}

      {/* ── SONUÇ EKRANI ── */}
      {step === "result" && feedback && (
        <div className="space-y-6">
          <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-stone-900">Analiz</h2>
                <p className="mt-1 text-sm text-stone-600">Güçlü yönler, gelişim alanları ve örnek ideal cevap.</p>
              </div>
              <ScoreRing score={feedback.score} size={96} />
            </div>
            <div className="mt-8 grid gap-8 sm:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold text-emerald-800">Güçlü yönler</h3>
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-stone-700">
                  {feedback.strengths.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-amber-800">Eksik noktalar</h3>
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-stone-700">
                  {feedback.weaknesses.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            </div>
            <div className="mt-8">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-stone-800">İdeal cevap örneği</h3>
                {typeof window !== "undefined" && window.speechSynthesis && (
                  <button type="button" onClick={() => handleSpeak(feedback.ideal_answer)}
                    className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:bg-stone-100">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                    </svg>
                    {isSpeaking ? "Durdur" : "Sesli oku"}
                  </button>
                )}
              </div>
              <p className="whitespace-pre-wrap rounded-xl bg-stone-50 px-4 py-3 text-sm leading-relaxed text-stone-800">
                {feedback.ideal_answer}
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-teal-100 bg-teal-50/80 p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-teal-900">Performans özeti</h2>
            <p className="mt-3 text-sm leading-relaxed text-teal-950/90">
              Bu turda aldığınız puan <strong>{Math.round(feedback.score)} / 100</strong>.{" "}
              {feedback.strengths.length > 0 ? "Güçlü ifade ettiğiniz noktaları koruyun; " : ""}
              {feedback.weaknesses.length > 0
                ? "gelişim alanlarında kısa örnek cevaplar yazarak pratik yapmaya devam edin."
                : "İyi iş çıkardınız — benzer sorularla pratik yapmaya devam edebilirsiniz."}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => fetchNextQuestion(session)}
                className="flex-1 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700">
                Sonraki soru →
              </button>
              <button type="button" onClick={() => setShowReport(true)}
                className="flex-1 rounded-xl border border-teal-200 bg-white px-4 py-3 text-sm font-semibold text-teal-900 shadow-sm transition hover:bg-teal-50">
                📊 Oturum raporunu gör
              </button>
              <button type="button" onClick={reset}
                className="flex-1 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-semibold text-stone-700 shadow-sm transition hover:bg-stone-100">
                Yeni simülasyon
              </button>
            </div>
          </section>
        </div>
      )}

      {/* ── OTURUM RAPORU MODAL ── */}
      {showReport && session.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-stone-900">📊 Oturum Raporu</h2>
              <button onClick={() => setShowReport(false)} className="text-stone-400 hover:text-stone-600 text-xl font-bold">✕</button>
            </div>
            <div className="mb-6 flex items-center justify-center gap-6 rounded-xl bg-teal-50 px-4 py-4">
              <ScoreRing score={Math.round(session.reduce((a, s) => a + s.feedback.score, 0) / session.length)} size={72} />
              <div>
                <p className="text-sm text-teal-700 font-medium">Ortalama Puan</p>
                <p className="text-xs text-teal-600 mt-0.5">{session.length} soru cevaplandı</p>
              </div>
            </div>
            <div className="space-y-4">
              {session.map((s, i) => (
                <div key={i} className="rounded-xl border border-stone-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-stone-800">Soru {i + 1}</p>
                    <span className="text-sm font-bold text-teal-700">{Math.round(s.feedback.score)} / 100</span>
                  </div>
                  <p className="text-sm text-stone-600 mb-2">{s.question}</p>
                  <p className="text-xs text-stone-500 italic">
                    &ldquo;{s.answer.slice(0, 100)}{s.answer.length > 100 ? "…" : ""}&rdquo;
                  </p>
                </div>
              ))}
            </div>
            <button onClick={reset}
              className="mt-6 w-full rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-700">
              Yeni simülasyon başlat
            </button>
          </div>
        </div>
      )}
    </main>
  );
}