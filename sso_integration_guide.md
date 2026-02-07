# RMS SSO Entegrasyon Rehberi

Bu dokümantasyon, portal uygulamasının RMS'e (Requirements Management System) SSO (Single Sign-On) ile nasıl entegre edileceğini açıklar.

---

## Genel Bakış

```
┌─────────────────┐                      ┌─────────────────┐
│     PORTAL      │                      │       RMS       │
│   (AD Login)    │                      │   (React App)   │
└────────┬────────┘                      └────────┬────────┘
         │                                        │
         │ 1. Kullanıcı AD ile giriş yapar        │
         │                                        │
         │ 2. Portal JWT token oluşturur          │
         │                                        │
         │ 3. RMS'e redirect ─────────────────────▶
         │    ?sso_token=<jwt_token>              │
         │                                        │
         │                               4. Token doğrulanır
         │                               5. Session oluşturulur
         │                               6. Ana sayfa gösterilir
```

---

## Ön Koşullar

1. **Kullanıcı Eşleşmesi:** Portal'daki AD kullanıcı adı (sAMAccountName) ile RMS'deki `username` alanı aynı olmalıdır.
   - Örnek: AD'de `alper.es` → RMS'de `alper.es`

2. **Secret Key:** Portal ve RMS aynı secret key'i kullanmalıdır.

3. **RMS'de SSO Aktif:** RMS sunucusunda `SSO_ENABLED=true` olmalıdır.

---

## Konfigürasyon

### RMS Tarafı (Zaten Yapılandırılmış)

RMS sunucusunda aşağıdaki environment variable'lar tanımlı:

```env
SSO_ENABLED=true
SSO_SECRET_KEY=<secret_key>
```

### Portal Tarafı

Portal uygulamanızda aynı secret key'i kullanmanız gerekiyor:

```env
RMS_SSO_SECRET_KEY=<secret_key>
RMS_URL=http://rms.domain.com
```

> **Önemli:** Secret key en az 32 karakter olmalı ve güvenli bir şekilde saklanmalıdır.

---

## JWT Token Formatı

### Header
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

### Payload
```json
{
  "username": "ad.soyad",
  "email": "ad.soyad@domain.com",
  "iat": 1706700000,
  "exp": 1706700300
}
```

| Alan | Zorunlu | Tip | Açıklama |
|------|---------|-----|----------|
| `username` | ✅ Evet | string | RMS'deki kullanıcı adı ile eşleşmeli |
| `email` | Hayır | string | Opsiyonel, loglama için kullanılabilir |
| `iat` | Otomatik | number | Token oluşturulma zamanı (Unix timestamp) |
| `exp` | Otomatik | number | Token son geçerlilik zamanı (Unix timestamp) |

### Token Süresi

Token süresi maksimum **5 dakika** olmalıdır. Bu süre, redirect işlemi için yeterlidir ve güvenlik açısından kısa tutulmalıdır.

---

## Implementasyon Örnekleri

### Node.js / Express

```javascript
const jwt = require('jsonwebtoken');

// Environment variables
const SSO_SECRET_KEY = process.env.RMS_SSO_SECRET_KEY;
const RMS_URL = process.env.RMS_URL || 'http://rms.domain.com';

// AD login başarılı olduktan sonra çağrılır
function redirectToRMS(req, res, adUser) {
  // JWT token oluştur
  const token = jwt.sign(
    {
      username: adUser.sAMAccountName,  // veya adUser.userPrincipalName'den parse edilebilir
      email: adUser.mail
    },
    SSO_SECRET_KEY,
    { expiresIn: '5m' }  // 5 dakika geçerli
  );

  // RMS'e yönlendir
  res.redirect(`${RMS_URL}?sso_token=${token}`);
}

// Express route örneği
app.get('/launch/rms', ensureAuthenticated, (req, res) => {
  redirectToRMS(req, res, req.user);
});
```

### C# / ASP.NET Core

```csharp
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

public class RMSIntegrationService
{
    private readonly string _secretKey;
    private readonly string _rmsUrl;

    public RMSIntegrationService(IConfiguration config)
    {
        _secretKey = config["RMS:SSOSecretKey"];
        _rmsUrl = config["RMS:Url"];
    }

    public string GenerateRMSToken(string username, string email = null)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_secretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new Claim("username", username)
        };

        if (!string.IsNullOrEmpty(email))
        {
            claims.Add(new Claim("email", email));
        }

        var token = new JwtSecurityToken(
            expires: DateTime.UtcNow.AddMinutes(5),
            claims: claims,
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string GetRMSRedirectUrl(string username, string email = null)
    {
        var token = GenerateRMSToken(username, email);
        return $"{_rmsUrl}?sso_token={token}";
    }
}

// Controller'da kullanım
[Authorize]
[HttpGet("launch/rms")]
public IActionResult LaunchRMS()
{
    var username = User.Identity.Name; // veya AD claim'den
    var email = User.FindFirst(ClaimTypes.Email)?.Value;

    var redirectUrl = _rmsService.GetRMSRedirectUrl(username, email);
    return Redirect(redirectUrl);
}
```

### Python / Flask

```python
import jwt
import datetime
import os

SSO_SECRET_KEY = os.environ.get('RMS_SSO_SECRET_KEY')
RMS_URL = os.environ.get('RMS_URL', 'http://rms.domain.com')

def generate_rms_token(username, email=None):
    """RMS SSO için JWT token oluşturur"""
    now = datetime.datetime.utcnow()
    payload = {
        'username': username,
        'iat': now,
        'exp': now + datetime.timedelta(minutes=5)
    }

    if email:
        payload['email'] = email

    return jwt.encode(payload, SSO_SECRET_KEY, algorithm='HS256')

def get_rms_redirect_url(username, email=None):
    """RMS'e yönlendirme URL'i oluşturur"""
    token = generate_rms_token(username, email)
    return f"{RMS_URL}?sso_token={token}"

# Flask route örneği
@app.route('/launch/rms')
@login_required
def launch_rms():
    redirect_url = get_rms_redirect_url(
        current_user.username,
        current_user.email
    )
    return redirect(redirect_url)
```

### PHP / Laravel

```php
<?php

use Firebase\JWT\JWT;

class RMSIntegrationService
{
    private $secretKey;
    private $rmsUrl;

    public function __construct()
    {
        $this->secretKey = config('services.rms.sso_secret_key');
        $this->rmsUrl = config('services.rms.url');
    }

    public function generateToken(string $username, ?string $email = null): string
    {
        $now = time();
        $payload = [
            'username' => $username,
            'iat' => $now,
            'exp' => $now + 300, // 5 dakika
        ];

        if ($email) {
            $payload['email'] = $email;
        }

        return JWT::encode($payload, $this->secretKey, 'HS256');
    }

    public function getRedirectUrl(string $username, ?string $email = null): string
    {
        $token = $this->generateToken($username, $email);
        return "{$this->rmsUrl}?sso_token={$token}";
    }
}

// Controller'da kullanım
public function launchRMS(Request $request)
{
    $user = $request->user();
    $rmsService = new RMSIntegrationService();

    $redirectUrl = $rmsService->getRedirectUrl(
        $user->ad_username,
        $user->email
    );

    return redirect($redirectUrl);
}
```

---

## Portal'da Link/Buton Ekleme

### HTML Link Örneği

```html
<!-- Statik link (önerilmez - token her seferinde oluşturulmalı) -->
<a href="/launch/rms" class="nav-link">
  <i class="fas fa-clipboard-list"></i>
  Requirements Management
</a>
```

### React Örneği

```jsx
function RMSLaunchButton() {
  const handleLaunch = async () => {
    // Backend'den SSO URL al
    const response = await fetch('/api/integrations/rms/launch-url');
    const { url } = await response.json();

    // Yeni sekmede aç veya yönlendir
    window.open(url, '_blank');
    // veya: window.location.href = url;
  };

  return (
    <button onClick={handleLaunch} className="btn btn-primary">
      RMS'e Git
    </button>
  );
}
```

---

## Hata Durumları

RMS, SSO işlemi başarısız olursa kullanıcıyı normal login sayfasına yönlendirir. Olası hata durumları:

| Hata | HTTP Kodu | Açıklama |
|------|-----------|----------|
| Token required | 400 | Token gönderilmemiş |
| Token must contain username | 400 | Token'da username yok |
| SSO is not enabled | 403 | RMS'de SSO devre dışı |
| Token expired | 401 | Token süresi dolmuş |
| Invalid token | 401 | Token imzası geçersiz |
| User not found in RMS | 404 | Kullanıcı RMS'de kayıtlı değil |
| SSO is not configured properly | 500 | Secret key tanımlı değil |

---

## Güvenlik Önerileri

1. **HTTPS Kullanın:** Production ortamında mutlaka HTTPS kullanın.

2. **Secret Key Güvenliği:**
   - En az 32 karakter
   - Rastgele oluşturulmuş
   - Environment variable olarak saklanmalı
   - Kod içinde hardcoded olmamalı

3. **Token Süresi:** 5 dakikayı geçmemeli.

4. **Kullanıcı Doğrulama:** Portal'da kullanıcının authenticate olduğundan emin olun.

5. **Loglama:** SSO işlemlerini loglamak hata ayıklamada yardımcı olur.

---

## Test

### Test Token Oluşturma (Sadece Geliştirme)

Test ortamında token oluşturmak için:

```bash
cd testenv
node generate-sso-token.js <kullanıcı_adı>
```

Çıktı:
```
=== SSO Token Generator ===

Username: alper.es
Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Test URL:
http://localhost:8080?sso_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Manuel Test

1. Token oluşturun
2. Tarayıcıda URL'i açın
3. RMS ana sayfasının login olmadan açıldığını doğrulayın

---

## SSO Devre Dışı Bırakma

SSO'yu devre dışı bırakmak için RMS sunucusunda:

```env
SSO_ENABLED=false
```

Bu durumda `?sso_token` parametresi görmezden gelinir ve kullanıcı normal login sayfasına yönlendirilir.

---

## Destek

Entegrasyon ile ilgili sorularınız için RMS ekibiyle iletişime geçin.

| Ortam | RMS URL | SSO Durumu |
|-------|---------|------------|
| Test | http://localhost:8080 | Aktif |
| Production | http://192.168.88.111:8080 | Yapılandırılacak |
