# VetOps Twin

VetOps Twin, küçük ve orta ölçekli veteriner klinikleri için geliştirilmiş; muayene odası yoğunluğunu, acil triyaj vakalarını, aşı takvimini ve kritik ilaç stoklarını tek bir dijital ikiz modeli üzerinde koordine eden sistemdir.

## Çözdüğü Problem

Veteriner kliniklerinde randevu takibi, acil vaka girişleri ve ilaç/aşı stok yönetimi çoğu zaman birbirinden kopuk yürütülür. Bu durum, acil bir vaka geldiğinde uygun muayene odasının veya hekimin anlık görülememesine, tedavi için gereken kritik ilacın stokta tükendiğinin geç fark edilmesine ve periyodik aşı hatırlatmalarının aksamasına yol açar. VetOps Twin, klinik kaynaklarını canlı durumlarıyla modelleyerek bu operasyonel kör noktaları azaltır.

## Hedef Kitle

- **Veteriner Hekimler:** Günlük hasta sırasını ve acil triyaj önceliklerini anlık görmek için.
- **Klinik Yöneticileri ve Teknikerler:** Muayene odası doluluğunu yönetmek, kritik ilaç stoklarını izlemek ve aşı hatırlatmalarını planlamak için.

## İş Takip Panosu (Board)

- **Pano Bağlantısı:** https://github.com/users/gizemkozak36/projects/1/views/1

## Projeyi Çalıştırma Adımları

1. Depoyu klonlayın ve proje dizinine girin:
   git clone https://github.com/gizemkozak36/vetops-twin.git
   cd vetops-twin

2. Sanal ortamı oluşturun, aktifleştirin ve bağımlılıkları kurun:
   python -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt

3. Backend API sunucusunu başlatın (`http://127.0.0.1:8000`):
   uvicorn app.main:app --reload

4. Yeni bir terminalde frontend bağımlılıklarını kurun ve Next.js arayüzünü başlatın (`http://localhost:3000`):
   cd frontend
   npm install
   npm run dev

5. İsteğe bağlı olarak otomatik testleri çalıştırın:
   pytest

## Geliştirilen İki Özelliği Deneme Adımları

### 1. Yeni Triyaj Kaydı ve Oda Atama / Bekleme Kuyruğu
1. Tarayıcıda `http://localhost:3000` adresini açın.
2. **Yeni Triyaj** formunda **Hasta Adı**, **Tür** (ör. `Kedi`), **Aciliyet** (`Acil`, `Orta`, `Dusuk`) ve **Şikayet** alanlarını doldurup **Kaydet** butonuna basın.
3. Boş muayene odası varsa (`OD-1` veya `OD-2`) hastanın odaya `Dolu` olarak atandığını; odalar doluysa hastanın aciliyet önceliğine göre **Bekleme Kuyruğu** listesinde yer aldığını doğrulayın.

### 2. Tedavi Tamamlama ve Stok Düşümü / Kritik Uyarı
1. **Tedavi Tamamla** panelinden aktif hastası bulunan odayı (`OD-1` veya `OD-2`), kullanılan stok kalemini (`STK-1`, `STK-2` vb.) ve miktarı seçin.
2. **Tamamla** butonuna basın.
3. Odanın yeniden `Bos` duruma geçtiğini, seçilen stok kaleminin **Stok Envanteri** bölümünde azaldığını ve kritik eşik (`<= critical_threshold`) altına inildiğinde kritik stok uyarısının göründüğünü doğrulayın.