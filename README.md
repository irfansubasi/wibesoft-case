# E-Commerce API

NestJS ile geliştirilmiş, JWT tabanlı kimlik doğrulama ve rol yönetimi içeren basit bir e-ticaret backend API’sidir.

## İçindekiler

- [Projenin Çalıştırılması](#projenin-çalıştırılması)
  - [Gereksinimler](#gereksinimler)
  - [Yerel ortam](#yerel-ortam)
  - [Docker ile](#docker-ile)
  - [Testler](#testler)
- [Kullanılan Teknolojiler](#kullanılan-teknolojiler)
- [Ortam Değişkenleri](#ortam-değişkenleri)
- [Varsayımlar](#varsayımlar)
- [Zorunlu Özellikler (Case Gereksinimleri)](#zorunlu-özellikler-case-gereksinimleri)
- [Bonus Özellikler](#bonus-özellikler)
- [Bonus Dışında Eklenen Ekstralar](#bonus-dışında-eklenen-ekstralar)
- [API Endpoint'leri](#api-endpointleri)

---

## Projenin Çalıştırılması

### Gereksinimler

- Node.js 20+
- PostgreSQL 16+ (yerel kurulum veya Docker)
- npm

### Yerel ortam

1. Bağımlılıkları yükleyin:

   ```bash
   npm install
   ```

2. `.env` dosyası oluşturun (`.env.example` dosyasını kopyalayıp gerekli değerleri doldurun):

   ```bash
   cp .env.example .env
   ```

3. PostgreSQL’in çalıştığından ve `.env` içindeki `DATABASE_*` bilgilerinin doğru olduğundan emin olun.

4. Uygulamayı başlatın:

   ```bash
   npm run start:dev
   ```

   API: `http://localhost:3000`  
   Swagger dokümantasyonu: `http://localhost:3000/api-docs`

### Docker ile

1. Proje kökünde `.env` dosyası olmalı (`.env.example`’dan kopyalayabilirsiniz).  
   **Not:** Docker ile çalıştırırken `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME` değerleri `docker-compose.yml` içindeki Postgres ayarlarıyla aynı olmalıdır (varsayılan: postgres / postgres / ecommerce). `DATABASE_HOST` ve `PORT` compose tarafından otomatik override edilir.

2. Build ve çalıştırma:

   ```bash
   docker-compose up --build
   ```

   API: `http://localhost:3000`  
   Swagger: `http://localhost:3000/api-docs`

### Testler

```bash
npm run test          # unit testler
```

---

## Kullanılan Teknolojiler

| Alan               | Teknoloji                                                                         |
| ------------------ | --------------------------------------------------------------------------------- |
| Çatı               | NestJS 11 (TypeScript)                                                            |
| Veritabanı         | PostgreSQL 16, TypeORM                                                            |
| Kimlik doğrulama   | JWT (Passport), bcrypt                                                            |
| API dokümantasyonu | Swagger (OpenAPI)                                                                 |
| Doğrulama          | class-validator, class-transformer                                                |
| Konfigürasyon      | @nestjs/config (.env)                                                             |
| Güvenlik / limit   | Helmet, @nestjs/throttler                                                         |
| Diğer              | CORS (env’den), global ValidationPipe, özel exception filter, logging interceptor |

---

## Ortam Değişkenleri

`.env.example` dosyasındaki anahtarlar:

- **PORT** – Uygulama portu (varsayılan 3000).
- **DATABASE_HOST / DATABASE_PORT / DATABASE_USER / DATABASE_PASSWORD / DATABASE_NAME** – PostgreSQL bağlantı bilgileri. Docker’da `DATABASE_HOST` compose ile `postgres` yapılır; diğerleri postgres container ayarlarıyla uyumlu olmalı.
- **JWT_SECRET / JWT_EXPIRES_IN** – JWT imza ve süre.
- **ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME** – İlk açılışta oluşturulacak admin kullanıcı (zorunlu).
- **CORS_ORIGIN** – İzin verilen origin’ler (virgülle ayrılmış); boş bırakılırsa tüm origin’lere izin verilir.

---

## Varsayımlar

- Kullanıcı rolleri: `USER` ve `ADMIN`. Ürün CRUD sadece ADMIN’e açıktır; sepete ekleme, sipariş oluşturma ve kendi siparişlerini görme/güncelleme kullanıcıya aittir.
- Sipariş oluşturulunca sepet temizlenir; stok sipariş anında düşülür.
- Sipariş durumu kullanıcı tarafından güncellenebilir (örn. iptal için `CANCELLED`). Geçerli durumlar: `PENDING`, `COMPLETED`, `CANCELLED`.
- Admin kullanıcı uygulama ilk ayağa kalkarken `.env`’deki `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` ile seed edilir; bu alanlar zorunludur.
- Ürün listesi ve detay herkese açıktır; ürün ekleme/güncelleme/silme sadece ADMIN içindir.
- TypeORM **synchronize: true** kullanılmaktadır: şema entity’lere göre uygulama başlarken otomatik güncellenir; migration yoktur. Geliştirme / case ortamı için uygundur; production’da migration kullanılması önerilir.

---

## Zorunlu Özellikler (Case Gereksinimleri)

- Ürün listeleme, detay; ADMIN için ürün ekleme, güncelleme, silme.
- Sepet: ekleme, miktar güncelleme, ürün çıkarma, sepeti getirme (giriş yapmış kullanıcı).
- Stok kontrolü: sepete eklerken ve sipariş oluştururken yetersiz stokta hata.
- API dokümantasyonu (Swagger).
- Validasyon (DTO’lar ve global ValidationPipe).
- Global exception filter: Hata cevapları tutarlı formatta (statusCode, message, error).
- Logging interceptor: İstek/cevap loglama.

---

## Bonus Özellikler

- Kimlik Doğrulama && Kullanıcı kayıt ve giriş (JWT).
- Sipariş: sepettekilerden sipariş oluşturma, sipariş toplam tutar hesaplanması ,kullanıcının kendi siparişlerini listeleme ve detay, sipariş durumu güncelleme.

---

## Bonus Dışında Eklenen Ekstralar

- **Docker:** Dockerfile (multi-stage) ve docker-compose ile tek komutla uygulama + PostgreSQL çalıştırma.
- **CORS:** İzin verilen origin’ler `.env`’deki `CORS_ORIGIN` (virgülle ayrılmış) ile yapılandırılır; boş bırakılırsa tüm origin’lere izin verilir.
- **Helmet:** HTTP güvenlik başlıkları.
- **Rate limiting (Throttler):** Genel istek limiti (örn. 100/dk); login ve register için daha sıkı limit (örn. 5/dk). 429 Too Many Requests dönülür.
- **Admin seed:** Uygulama başlarken `.env`’deki `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` ile tek bir ADMIN kullanıcı oluşturulur veya mevcut kullanıcı ADMIN yapılır.
- **Unit testler:** Auth, Users, Products, Cart, Orders servisleri için spec dosyaları.

---

## API Endpoint’leri

Tüm route’lar `/api` prefix’i altındadır. Bearer token gerektiren endpoint’lerde `Authorization: Bearer <token>` gönderilmelidir.

| Method       | Endpoint                  | Auth       | Açıklama                                              |
| ------------ | ------------------------- | ---------- | ----------------------------------------------------- |
| GET          | `/api`                    | —          | Uygulama bilgisi                                      |
| **Auth**     |                           |            |                                                       |
| POST         | `/api/auth/register`      | —          | Kayıt (email, password, name)                         |
| POST         | `/api/auth/login`         | —          | Giriş (email, password)                               |
| GET          | `/api/auth/me`            | JWT        | Giriş yapmış kullanıcı bilgisi                        |
| **Products** |                           |            |                                                       |
| GET          | `/api/products`           | —          | Ürün listesi                                          |
| GET          | `/api/products/:id`       | —          | Ürün detayı                                           |
| POST         | `/api/products`           | JWT, ADMIN | Ürün oluşturma                                        |
| PATCH        | `/api/products/:id`       | JWT, ADMIN | Ürün güncelleme                                       |
| DELETE       | `/api/products/:id`       | JWT, ADMIN | Ürün silme                                            |
| **Cart**     |                           |            |                                                       |
| GET          | `/api/cart`               | JWT        | Sepeti getir                                          |
| POST         | `/api/cart/items`         | JWT        | Sepete ürün ekle (productId, quantity)                |
| PATCH        | `/api/cart/items/:itemId` | JWT        | Sepet kalemi miktar güncelle                          |
| DELETE       | `/api/cart/items/:itemId` | JWT        | Sepetten kalem kaldır                                 |
| **Orders**   |                           |            |                                                       |
| POST         | `/api/orders`             | JWT        | Sepetten sipariş oluştur                              |
| GET          | `/api/orders`             | JWT        | Kullanıcının sipariş listesi                          |
| GET          | `/api/orders/:id`         | JWT        | Sipariş detayı                                        |
| PATCH        | `/api/orders/:id/status`  | JWT        | Sipariş durumu güncelle (body: `{ "status": "..." }`) |

Swagger’da tüm DTO’lar ve response örnekleri mevcuttur: `http://localhost:3000/api-docs`.
