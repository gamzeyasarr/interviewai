# InterviewAI

Hedef şirket ve pozisyona özel yapay zeka destekli mülakat simülasyonu (Next.js, App Router, Tailwind).

## Gereksinimler

- Node.js 20+
- npm veya uyumlu paket yöneticisi
- [Google AI Studio](https://aistudio.google.com/apikey) Gemini API anahtarı

## Kurulum

Önce Node sürümünü kontrol edin (20.9 veya üzeri önerilir):

```bash
node -v
```

```bash
npm install
```

Kurulum tamamlanana kadar TypeScript bazı paketleri göremeyebilir; repo kökünde `types/modules-shim.d.ts` geçici tip bildirimleri içerir. **`npm install` mutlaka `interviewai` klasöründe çalıştırılmalıdır** (üst klasör `Gamze` açıksa `node_modules` oluşmaz).

**Windows:** Cursor/IDE terminali `npm`i bozuyorsa Dosya Gezgini’nden proje klasöründe `install.bat` dosyasına çift tıklayın veya **cmd.exe** açıp `install.bat` çalıştırın.

### `npm install` hata verirse

1. **Peer dependency / ERESOLVE**  
   Proje kökünde `.npmrc` dosyası `legacy-peer-deps=true` içerir; yine de hata alırsanız:
   ```bash
   npm install --legacy-peer-deps
   ```

2. **Eski veya bozuk önbellek**  
   ```bash
   rd /s /q node_modules
   del package-lock.json
   npm cache clean --force
   npm install
   ```

3. **`sharp` / `node-gyp` / derleme hatası (Windows)**  
   Bu projede `next/image` kullanılmıyor; yine de Next isteğe bağlı `sharp` indirebilir. Kurulum `sharp` yüzünden kırılıyorsa:
   ```bash
   npm install --no-optional
   ```
   Ardından `npm run dev` ile deneyin.

4. **Terminal**  
   Bazı ortamlarda `pwsh`/PowerShell profili `npm`i bozabilir. **cmd.exe** veya **Windows Terminal + varsayılan PowerShell** ile aynı komutları deneyin.

5. **`package.json` okunamıyor**  
   Dosyanın UTF-8 (BOM’suz) kaydedildiğinden ve geçerli JSON olduğundan emin olun.

Kök dizinde `.env.local` oluşturun (`.env.example` dosyasına bakın):

```bash
copy .env.example .env.local
```

`GOOGLE_GENERATIVE_AI_API_KEY` değerini doldurun.

## Geliştirme

```bash
npm run dev
```

Tarayıcıda [http://localhost:3000](http://localhost:3000) adresini açın.

## Diğer komutlar

| Komut | Açıklama |
| --- | --- |
| `npm run build` | Üretim derlemesi |
| `npm run start` | Üretim sunucusu |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

## Dağıtım

[Vercel](https://vercel.com) üzerinde projeyi bağlayıp `GOOGLE_GENERATIVE_AI_API_KEY` ortam değişkenini production için tanımlayın.

Ürün gereksinimleri: `docs/prd.md`. Görev listesi: `tasks.md`.
