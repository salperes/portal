Proje Talimatı: Dahili Kullanıcı Yönetim Paneli
1. Genel Görünüm ve Stil
Platform: Masaüstü Web Uygulaması (Desktop).
Tema: Açık Tema (Light Mode) ana içerik alanı, Koyu Lacivert (Dark Navy) yan menü.
Renk Paleti:
Kenar Çubuğu: #001529 (Koyu Lacivert).
Arka Plan: #F0F2F5 (Açık Gri).
Vurgu Rengi: #1890FF (Mavi).
Durum Etiketleri: Pastel tonlarda yeşil (Underwriter), pembe (Claims), mavi (DA).
Yazı Tipi: Modern sans-serif (Inter veya Roboto).
2. Sayfa Yapısı (Layout)
Uygulama iki ana bölümden oluşmalıdır:

Sol Kenar Çubuğu (Sidebar): Sabit genişlik, dikey menü.
Sağ İçerik Alanı: Üstte başlık ve arama barı, ortada sekmeli filtreleme sistemi, altta ise veri tablosu.
3. Bileşen Detayları
A. Kenar Çubuğu (Sidebar)
Üst Kısım: Kullanıcı profil özeti (Super Admin, e-posta adresi ve profil ikonu).
Menü Öğeleri: "Internal Users", "Question Sets", "Contracts" (İkon + Metin). Aktif öğe mavi bir arka plan ile vurgulanmalı.
Alt Kısım: "Back to portal", "My Profile", "Permissions" ve belirgin bir "Logout" butonu.
B. Üst Başlık ve Aksiyonlar
Başlık: Sol üstte "Internal Users" başlığı.
Arama Çubuğu: Sağ üstte, içinde büyüteç ikonu olan oval kenarlı bir input alanı.
Ekleme Butonu: Arama çubuğunun sağında "+" ikonlu yuvarlak mavi buton.
C. Filtreleme ve Sekmeler
Üst Sekmeler: LSM, Coverholder, TPA, Unlisted (Seçili olanın altında mavi çizgi).
Alt Filtreler: All Divisions, My Division, Managed, Unmanaged (Daha küçük, buton benzeri yapı).
Filtre Butonu: En sağda "Filters" butonu ve açılır menü ikonu.
D. Veri Tablosu (DataTable)
Kolonlar: Name, Email, Role(s), Division(s), Access Level, Date Added, Last Login.
Satır Özellikleri:
Kullanıcı isimleri kalın (bold) metin.
Roller (Role(s)) renkli kapsüller (chip/tag) içinde gösterilmeli.
"Last Login" sütununda bazı satırlarda "Resend Invite" linki (gri renkte) bulunmalı.
Her satırın sonunda ayarlar (dişli çark) ikonu.
Sayfalama: Listenin sonunda yer almalı (Görselde görünmese de standart UX kuralı olarak eklenmeli).
4. Teknik Gereksinimler
Framework: React.js veya Vue.js.
UI Library: Tailwind CSS veya Ant Design (Görsel Ant Design stiline çok yakın).
Responsive: Geniş ekranlar için optimize edilmeli, tablo yatay kaydırmaya (horizontal scroll) uygun olmalı.