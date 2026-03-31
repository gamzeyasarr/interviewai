# 🧬 InterviewAI: Yapay Zeka Destekli Mülakat Simülatörü

**InterviewAI**, teknik disiplinlerdeki adayların iş bulmak için gereken tecrübeyi mülakat aşamasında kaybetmelerine neden olan 'tecrübe paradoksunu' yapay zeka ile kırıyor. Platformumuz, adayların performans kaygısını gerçekçi simülasyonlarla ortadan kaldırarak teknik bilgilerini özgüvenli bir sunuma dönüştürmelerini sağlıyor. Bu sayede fırsat eşitliği yaratarak, her adayın hedefindeki şirkete en hazır haliyle ulaşmasını mümkün kılıyor.

## 📺 Proje Tanıtımı & Demo
Uygulamanın nasıl çalıştığını ve teknik detaylarını anlattığım demo videosuna aşağıdan ulaşabilirsiniz:

🎥 **Demo Videosu:** [Loom Üzerinden İzle](https://www.loom.com/share/22958d057e204fa58d7f44a923e1cf82)

🚀 **Canlı Dağıtım (Production):** [interviewai-gamze.vercel.app](https://interviewai-gamze.vercel.app)

## 📋 Platform Yetenekleri
* 🏢 **Kurumsal Odak:** Şirket ve pozisyona özel simülasyon kurgusu.
* ⚖️ **Zorluk Seviyesi:** 🟢 Kolay | 🟡 Orta | 🔴 Zor
* 🧬 **Soru Kategorileri:** 💻 Teknik  | 🤝 Davranışsal | 🔥 Stres Yönetimi
* 🧠 **Akıllı Analiz:** 📄 CV analizi
  
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

#### Kod snippet'i
GROQ_API_KEY=your_groq_api_key_here

###  4. Geliştirme Modunda Çalıştırma
Bash
npm run dev
Ardından tarayıcıda http://localhost:3000 adresini açın.

## 🚀 Dağıtım (Deployment)
Proje Vercel üzerinde yayındadır. Kendi Vercel hesabınızda dağıtım yapmak isterseniz:

GitHub deponuzu Vercel'e bağlayın.

Environment Variables kısmına GROQ_API_KEY değişkenini ekleyin.

npm run build komutu ile yayına alın.

##  📄 Dokümantasyon & Geliştirici

* **Ürün Gereksinimleri:** docs/prd.md
* **Görev Listesi:** tasks.md
