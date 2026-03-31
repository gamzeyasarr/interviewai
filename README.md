# 🧪 InterviewAI: Mülakat Simülatörü

**InterviewAI**, hedef şirket ve pozisyona özel, yapay zeka destekli profesyonel bir mülakat simülasyon uygulamasıdır. Özellikle kimya sektörü ve teknik mülakat süreçleri için optimize edilmiştir.

🚀 **Canlı Demo:** [interviewai-gamze.vercel.app](https://interviewai-gamze.vercel.app)

---

## ✨ Özellikler
* **Gerçekçi Simülasyon:** Hedeflenen pozisyona uygun teknik ve yetkinlik bazlı sorular.
* **Anlık Geri Bildirim:** AI destekli cevap analizi ve iyileştirme önerileri.
* **Modern Arayüz:** Next.js App Router ve Tailwind CSS ile hızlı, duyarlı tasarım.
* **Yüksek Hız:** Groq Cloud üzerinden LPU™ teknolojisi

## 🛠️ Kullanılan Teknolojiler
* **Framework:** Next.js 16 (App Router)
* **Styling:** Tailwind CSS
* **AI Engine:** Groq Cloud API (Llama / Mixtral modelleri)
* **Deployment:** Vercel
* **IDE:** Cursor

## ⚙️ Gereksinimler & Kurulum

### 1. Ön Hazırlık
* **Node.js:** v20.9 veya üzeri (`node -v` ile kontrol edebilirsiniz).
* **API Key:** [Groq Console](https://console.groq.com/) üzerinden alınmış bir API anahtarı.

### 2. Yükleme
Bash
npm install

### 3. Ortam Değişkenleri
Kök dizinde .env.local dosyası oluşturun ve anahtarınızı ekleyin:

### Kod snippet'i
GROQ_API_KEY=your_groq_api_key_here

###  4. Geliştirme Modunda Çalıştırma
Bash
npm run dev
Ardından tarayıcıda http://localhost:3000 adresini açın.

### 🚀 Dağıtım (Deployment)
Proje Vercel üzerinde yayındadır. Kendi Vercel hesabınızda dağıtım yapmak isterseniz:

GitHub deponuzu Vercel'e bağlayın.

Environment Variables kısmına GROQ_API_KEY değişkenini ekleyin.

npm run build komutu ile yayına alın.

### 📄 Dokümantasyon & Geliştirici

Ürün Gereksinimleri: docs/prd.md
Görev Listesi: tasks.md
