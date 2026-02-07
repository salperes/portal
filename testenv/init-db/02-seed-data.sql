-- Seed Data for Development/Testing
-- Version: 1.0

-- Test Users (şifre AD'den doğrulanacak, burada sadece profil bilgileri)
INSERT INTO users (id, ad_username, email, display_name, department, title, is_admin) VALUES
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'admin', 'admin@sirket.local', 'Portal Admin', 'IT', 'Sistem Yöneticisi', true),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'test.user', 'test.user@sirket.local', 'Test Kullanıcı', 'HR', 'İK Uzmanı', false),
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'ahmet.yilmaz', 'ahmet.yilmaz@sirket.local', 'Ahmet Yılmaz', 'Yazılım', 'Kıdemli Geliştirici', false);

-- Document Categories
INSERT INTO document_categories (id, name, parent_id, sort_order) VALUES
    ('d1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'Genel', NULL, 1),
    ('d2eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 'İnsan Kaynakları', NULL, 2),
    ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 'IT Politikaları', NULL, 3),
    ('d4eebc99-9c0b-4ef8-bb6d-6bb9bd380a04', 'Oryantasyon', 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 1),
    ('d5eebc99-9c0b-4ef8-bb6d-6bb9bd380a05', 'İzin Prosedürleri', 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 2),
    ('d6eebc99-9c0b-4ef8-bb6d-6bb9bd380a06', 'Güvenlik', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 1);

-- Sample Announcements
INSERT INTO announcements (title, content, category, priority, created_by, publish_date) VALUES
    ('Sistem Bakımı Duyurusu',
     'Değerli çalışanlarımız,

02 Şubat 2026 Cumartesi günü saat 22:00 - 02:00 arasında planlı sistem bakımı yapılacaktır.

Bu süre zarfında:
- ERP sistemi
- E-posta servisleri
- Portal

geçici olarak erişime kapalı olacaktır.

Anlayışınız için teşekkür ederiz.

IT Departmanı',
     'it', 'critical', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW()),

    ('Yeni İzin Politikası Yürürlükte',
     'Sayın çalışanlarımız,

2026 yılı itibariyle yeni izin politikamız yürürlüğe girmiştir.

Önemli değişiklikler:
- Yıllık izin süreleri güncellendi
- Uzaktan çalışma izni eklendi
- Mazeret izni prosedürü sadeleştirildi

Detaylı bilgi için İK Dökümanları bölümünü inceleyiniz.

İnsan Kaynakları Departmanı',
     'hr', 'important', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '2 days'),

    ('Şubat Ayı Doğum Günleri',
     'Bu ay doğum günü olan çalışma arkadaşlarımızı kutlarız:

- Ayşe Kaya - 5 Şubat
- Mehmet Demir - 12 Şubat
- Zeynep Yıldız - 18 Şubat
- Can Özkan - 25 Şubat

Nice mutlu yıllara! 🎂',
     'general', 'info', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '1 day'),

    ('Yeni Çalışanlarımıza Hoş Geldiniz',
     'Ocak ayında aramıza katılan yeni çalışma arkadaşlarımızı tanıtmaktan mutluluk duyarız:

**Yazılım Departmanı:**
- Ali Veli - Backend Developer

**Pazarlama Departmanı:**
- Selin Ak - Dijital Pazarlama Uzmanı

Yeni arkadaşlarımıza başarılar dileriz!',
     'general', 'info', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '5 days');

-- Sample Applications
INSERT INTO applications (name, description, url, icon_name, category, sort_order) VALUES
    ('ERP Sistemi', 'Kurumsal kaynak planlama sistemi', 'https://erp.sirket.local', 'database', 'is-surecleri', 1),
    ('Helpdesk', 'IT destek talep sistemi', 'https://helpdesk.sirket.local', 'headset', 'it', 2),
    ('HR Portal', 'İnsan kaynakları self servis', 'https://hr.sirket.local', 'users', 'ik', 3),
    ('Change Management', 'Değişiklik yönetim sistemi', 'https://change.sirket.local', 'git-branch', 'it', 4),
    ('Requirement Management', 'Gereksinim yönetimi', 'https://req.sirket.local', 'clipboard-list', 'is-surecleri', 5),
    ('Webmail', 'Kurumsal e-posta', 'https://mail.sirket.local', 'mail', 'iletisim', 6),
    ('Wiki', 'Şirket içi bilgi bankası', 'https://wiki.sirket.local', 'book-open', 'genel', 7),
    ('Takvim', 'Paylaşımlı takvim', 'https://calendar.sirket.local', 'calendar', 'iletisim', 8);

-- Sample Documents (dosya yolları MinIO'ya yüklenecek)
INSERT INTO documents (title, description, file_path, file_name, file_size, mime_type, category_id, created_by) VALUES
    ('Yeni Çalışan Oryantasyon Rehberi',
     'Şirkete yeni katılan çalışanlar için kapsamlı oryantasyon dokümanı',
     'documents/hr/oryantasyon-rehberi-2026.pdf',
     'oryantasyon-rehberi-2026.pdf',
     2548000,
     'application/pdf',
     'd4eebc99-9c0b-4ef8-bb6d-6bb9bd380a04',
     'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),

    ('2026 Yıllık İzin Prosedürü',
     'Yıllık izin talep ve onay süreçleri',
     'documents/hr/izin-proseduru-2026.pdf',
     'izin-proseduru-2026.pdf',
     856000,
     'application/pdf',
     'd5eebc99-9c0b-4ef8-bb6d-6bb9bd380a05',
     'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),

    ('Bilgi Güvenliği Politikası',
     'Şirket bilgi güvenliği kuralları ve prosedürleri',
     'documents/it/bilgi-guvenligi-politikasi.pdf',
     'bilgi-guvenligi-politikasi.pdf',
     1245000,
     'application/pdf',
     'd6eebc99-9c0b-4ef8-bb6d-6bb9bd380a06',
     'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),

    ('Şirket Organizasyon Şeması',
     'Güncel organizasyon yapısı',
     'documents/genel/organizasyon-semasi.pdf',
     'organizasyon-semasi.pdf',
     524000,
     'application/pdf',
     'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
     'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

-- Mark some announcements as read for test user
INSERT INTO announcement_reads (user_id, announcement_id)
SELECT 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', id
FROM announcements
WHERE priority = 'info'
LIMIT 1;

-- Add favorite apps for test user
INSERT INTO user_favorite_apps (user_id, app_id, sort_order)
SELECT 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', id,
       ROW_NUMBER() OVER (ORDER BY sort_order)
FROM applications
WHERE name IN ('ERP Sistemi', 'Helpdesk', 'HR Portal');

-- Add recent apps for test user
INSERT INTO user_recent_apps (user_id, app_id, access_count, last_accessed)
SELECT 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', id,
       (RANDOM() * 10 + 1)::int,
       NOW() - (RANDOM() * INTERVAL '7 days')
FROM applications
LIMIT 5;
