# 🚀 InterviewAI - Product Requirement Document (PRD)

**Project Status:** `Ready for Development`  
**Target:** `MVP v1.0`  
**Stack:** `Next.js` | `Tailwind CSS` | `OpenAI/Claude API` | `Node.js`

---

## 1. Ürün Vizyonu
Kullanıcıların hedefledikleri şirket ve pozisyonlara özel, yapay zeka destekli mülakat simülasyonları yaparak kendilerini geliştirmelerini sağlayan minimalist bir web uygulaması.

## 2. Kullanıcı Akışı (User Journey)
1. **Giriş:** Şirket adı ve pozisyonu girilir (Örn: Trendyol - Yazılım Stajyeri).
2. **Soru:** AI, girişe özel 1 adet mülakat sorusu üretir.
3. **Cevap:** Kullanıcı cevabını metin olarak girer.
4. **Analiz:** AI cevabı değerlendirir ve sonuçları döner.
5. **Rapor:** Oturum sonunda genel performans özeti sunulur.

---

## 3. Teknik Gereksinimler & Fonksiyonel Özellikler

### 🛠 Teknik Stack
* **Frontend:** Next.js (App Router tercih edilir), Tailwind CSS.
* **Backend:** Next.js API Routes veya Node.js/FastAPI.
* **AI Engine:** GPT-4o veya Claude 3.5 Sonnet (JSON Mode kullanımı tavsiye edilir).
* **Deployment:** Vercel (Hızlı canlıya alım için).

### ✨ Temel Fonksiyonlar
| Özellik | Açıklama |
| :--- | :--- |
| **Şirket Analizi** | Şirketin kültürü ve tech-stack tahminine göre soru üretimi. |
| **Dinamik Soru** | Pozisyona göre teknik veya davranışsal (behavioral) sorular. |
| **Anlık Analiz** | **Güçlü Yönler**, **Eksik Noktalar**, **İdeal Cevap** yapılandırması. |
| **Puanlama** | 0-100 arası başarı skoru. |

---

## 4. UI/UX Prensipleri
- **Single Page Application (SPA):** Karmaşıklıktan uzak, tek bir sayfa üzerinde state yönetimi.
- **Dil:** %100 Türkçe arayüz ve çıktı.
- **Tasarım:** Sade, minimalist, "Inter" veya "Geist" fontları, temiz input alanları.
- **Feedback:** AI cevabını beklerken kullanıcıya gösterilecek akıcı yükleme animasyonları.

---

## 5. Başarı Metrikleri (KPIs)
- **Hız:** AI yanıt süresi < 3 saniye.
- **Doğruluk:** AI'nın pozisyonla %90+ alakalı soru üretmesi.
- **Tamamlama:** Kullanıcıların simülasyonu rapor ekranına kadar bitirme oranı.

---

## 6. Geliştirme Notları (Developer Notes)
> **Sistem Promptu Stratejisi:** AI'ya verilecek komut; kıdemli bir İK uzmanı ve ilgili alanın teknik müdürü rolünde olmalıdır. Çıktı formatı, frontend tarafında kolay parse edilebilmesi için **JSON** yapısında istenmelidir.

```json
{
  "question": "string",
  "feedback": {
    "strengths": ["string"],
    "weaknesses": ["string"],
    "ideal_answer": "string",
    "score": number
  }
}