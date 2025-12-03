# Deployment i Real-Time Funkcionalnosti - InfinityPlay Radio

## 📋 Pregled

Ovaj dokument objašnjava kako će funkcionisati real-time funkcionalnosti nakon deploy-a aplikacije i šta je potrebno podesiti.

## 🚀 Deployment Checklist

### 1. Backend Setup (Potrebno implementirati)

Za potpunu funkcionalnost, potrebno je postaviti backend server koji će rukovati:

#### A. Email Servisi
- **Password Reset Emails**: Trenutno se reset linkovi prikazuju u konzoli. Nakon deploy-a, potrebno je:
  - Integrisati email servis (npr. SendGrid, AWS SES, ili Mailgun)
  - Kreirati email template za resetovanje lozinke
  - Implementirati API endpoint: `POST /api/auth/send-password-reset`
  
```javascript
// Primer API endpointa
app.post('/api/auth/send-password-reset', async (req, res) => {
  const { email } = req.body;
  
  // Generate reset token
  const resetToken = generateSecureToken();
  
  // Save token to database with expiration
  await db.passwordResets.create({
    email,
    token: resetToken,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
  });
  
  // Send email
  await emailService.send({
    to: email,
    subject: 'Resetovanje lozinke - InfinityPlay Radio',
    template: 'password-reset',
    data: {
      resetLink: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`
    }
  });
  
  res.json({ success: true });
});
```

#### B. Real-Time Listener Count
- **WebSocket Server**: Za praćenje broja slušalaca u realnom vremenu
  - Implementirati WebSocket konekciju
  - Trackovanje kada korisnik počne/zaustavi slušanje
  - Broadcast broja slušalaca svim klijentima

```javascript
// Primer WebSocket implementacije
const io = require('socket.io')(server);

io.on('connection', (socket) => {
  socket.on('start-listening', ({ stationId, userId }) => {
    // Dodaj korisnika u listu slušalaca
    addListener(stationId, userId);
    
    // Broadcast ažurirani broj
    io.emit('listener-count-update', {
      stationId,
      count: getListenerCount(stationId)
    });
  });
  
  socket.on('stop-listening', ({ stationId, userId }) => {
    removeListener(stationId, userId);
    io.emit('listener-count-update', {
      stationId,
      count: getListenerCount(stationId)
    });
  });
});
```

#### C. Subscription Management
- **PayPal Integration**: Implementirati PayPal webhook-ove
  - Webhook za uspešnu uplatu
  - Webhook za otkazivanje pretplate
  - Webhook za neuspelu uplatu

```javascript
// Primer PayPal webhook handlera
app.post('/api/webhooks/paypal', async (req, res) => {
  const event = req.body;
  
  switch(event.event_type) {
    case 'BILLING.SUBSCRIPTION.ACTIVATED':
      await activateSubscription(event.resource.id);
      break;
    case 'BILLING.SUBSCRIPTION.CANCELLED':
      await cancelSubscription(event.resource.id);
      break;
    case 'PAYMENT.SALE.COMPLETED':
      await recordPayment(event.resource);
      break;
  }
  
  res.sendStatus(200);
});
```

### 2. Environment Variables

Kreirati `.env` fajl sa sledećim promenljivama:

```env
# Frontend URL
VITE_APP_URL=https://infinityplay.rs

# Backend API
VITE_API_URL=https://api.infinityplay.rs

# PayPal
VITE_PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_secret

# Email Service (SendGrid example)
SENDGRID_API_KEY=your_sendgrid_api_key
EMAIL_FROM=noreply@infinityplay.rs

# Database
DATABASE_URL=postgresql://user:password@host:5432/infinityplay

# WebSocket
WEBSOCKET_URL=wss://ws.infinityplay.rs
```

### 3. Database Schema

Potrebno je kreirati sledeće tabele:

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User Profiles table
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES users(id),
  display_name VARCHAR(255),
  subscription_tier VARCHAR(50),
  subscription_status VARCHAR(50),
  trial_ends_at TIMESTAMP,
  subscription_ends_at TIMESTAMP,
  jingle_url TEXT,
  jingle_interval_minutes INTEGER DEFAULT 7,
  -- ... ostala polja
);

-- Password Reset Tokens
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Listener Tracking
CREATE TABLE active_listeners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  station_id UUID REFERENCES radio_stations(id),
  started_at TIMESTAMP DEFAULT NOW(),
  last_heartbeat TIMESTAMP DEFAULT NOW()
);

-- Subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  paypal_subscription_id VARCHAR(255),
  tier VARCHAR(50),
  status VARCHAR(50),
  next_billing_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  subscription_id UUID REFERENCES subscriptions(id),
  amount DECIMAL(10, 2),
  currency VARCHAR(3),
  paypal_transaction_id VARCHAR(255),
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🔄 Real-Time Funkcionalnosti

### 1. Listener Count

**Kako radi:**
- Kada korisnik počne da sluša stanicu, šalje se WebSocket poruka serveru
- Server trackuje sve aktivne slušaoce
- Svaki klijent prima ažuriranja broja slušalaca u realnom vremenu
- Heartbeat sistem (ping svakih 30s) da bi se proverilo da li je korisnik još uvek aktivan

**Frontend implementacija:**
```typescript
// U AudioContext.tsx
useEffect(() => {
  if (isPlaying && currentStation) {
    // Connect to WebSocket
    const ws = new WebSocket(import.meta.env.VITE_WEBSOCKET_URL);
    
    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'start-listening',
        stationId: currentStation.id,
        userId: user?.id
      }));
    };
    
    // Heartbeat every 30 seconds
    const heartbeat = setInterval(() => {
      ws.send(JSON.stringify({ type: 'heartbeat' }));
    }, 30000);
    
    return () => {
      clearInterval(heartbeat);
      ws.send(JSON.stringify({
        type: 'stop-listening',
        stationId: currentStation.id
      }));
      ws.close();
    };
  }
}, [isPlaying, currentStation]);
```

### 2. Email Notifikacije

**Trenutno stanje:**
- Reset linkovi se prikazuju u browser konzoli
- Simulacija slanja emaila sa delay-om

**Nakon deploy-a:**
- Automatsko slanje emailova preko SendGrid/AWS SES
- Email template-ovi sa brendiranjem
- Tracking otvaranja emailova (optional)

**Potrebne izmene:**
```typescript
// U SendPasswordResetModal.tsx
const handleSendReset = async () => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/send-password-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email })
    });
    
    if (response.ok) {
      setSent(true);
    }
  } catch (error) {
    setError('Greška prilikom slanja emaila');
  }
};
```

### 3. Subscription Management

**Kako radi:**
- PayPal webhook-ovi automatski ažuriraju status pretplate
- Trial period se automatski konvertuje u plaćenu pretplatu nakon 7 dana
- Otkazane pretplate se automatski deaktiviraju nakon isteka perioda

**Potrebne izmene:**
```typescript
// Dodati u PaymentPage.tsx
const handlePayment = async () => {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/api/subscriptions/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: user.id,
      planId: selectedPlan,
      returnUrl: `${window.location.origin}/dashboard`,
      cancelUrl: `${window.location.origin}/pricing`
    })
  });
  
  const { approvalUrl } = await response.json();
  window.location.href = approvalUrl; // Redirect to PayPal
};
```

## 📊 Analytics & Monitoring

### Preporučeni servisi:
1. **Google Analytics** - Tracking posetilaca
2. **Sentry** - Error monitoring
3. **LogRocket** - Session replay
4. **Mixpanel** - User behavior analytics

## 🔐 Security

### Potrebne mere:
1. **HTTPS** - Obavezno za production
2. **CORS** - Podesiti allowed origins
3. **Rate Limiting** - Zaštita od abuse-a
4. **Input Validation** - Server-side validacija
5. **SQL Injection Protection** - Prepared statements
6. **XSS Protection** - Content Security Policy

## 📝 Deployment Steps

1. **Build aplikacije:**
   ```bash
   npm run build
   ```

2. **Deploy frontend** (Vercel/Netlify):
   ```bash
   vercel --prod
   # ili
   netlify deploy --prod
   ```

3. **Deploy backend** (Railway/Heroku/AWS):
   - Setup database
   - Deploy API server
   - Configure environment variables
   - Setup WebSocket server

4. **Configure DNS:**
   - infinityplay.rs → Frontend
   - api.infinityplay.rs → Backend API
   - ws.infinityplay.rs → WebSocket server

5. **Setup PayPal:**
   - Create production app
   - Configure webhook URLs
   - Test subscription flow

6. **Test sve funkcionalnosti:**
   - User registration/login
   - Password reset
   - Subscription purchase
   - Trial period
   - Real-time listener count
   - Email notifications

## 🎯 Post-Deployment

Nakon deploy-a, sve funkcionalnosti će raditi automatski:
- ✅ Email-ovi će se slati automatski
- ✅ Real-time listener count će biti aktivan
- ✅ PayPal pretplate će se automatski obrađivati
- ✅ Trial periodi će se automatski konvertovati
- ✅ Otkazane pretplate će se automatski deaktivirati

## 📞 Support

Za dodatnu pomoć oko deployment-a:
- Email: darkospira@gmail.com
- Dokumentacija: /docs
