import { Resend } from 'resend';

// Resend API key - besplatno do 3000 emailova mesečno
const resend = new Resend(import.meta.env.VITE_RESEND_API_KEY || 're_demo_key');

// Email template za password reset
export const sendPasswordResetEmail = async (
    toEmail: string,
    resetToken: string,
    userName: string
) => {
    const resetUrl = `${window.location.origin}/reset-password?token=${resetToken}`;

    const emailHtml = `
<!DOCTYPE html>
<html lang="sr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resetovanje Lozinke - InfinityPlay Radio</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }
    .header {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      padding: 40px 20px;
      text-align: center;
    }
    .logo {
      width: 60px;
      height: 60px;
      background: white;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
    }
    .logo-text {
      font-size: 24px;
      color: #10b981;
      font-weight: bold;
    }
    h1 {
      color: white;
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .subtitle {
      color: rgba(255, 255, 255, 0.9);
      margin: 8px 0 0 0;
      font-size: 14px;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 18px;
      color: #1f2937;
      margin-bottom: 20px;
    }
    .message {
      color: #4b5563;
      line-height: 1.6;
      margin-bottom: 30px;
    }
    .button-container {
      text-align: center;
      margin: 40px 0;
    }
    .reset-button {
      display: inline-block;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      text-decoration: none;
      padding: 16px 40px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 16px;
      box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
      transition: transform 0.2s;
    }
    .reset-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(16, 185, 129, 0.5);
    }
    .info-box {
      background: #f3f4f6;
      border-left: 4px solid #10b981;
      padding: 16px;
      margin: 30px 0;
      border-radius: 8px;
    }
    .info-box p {
      margin: 0;
      color: #4b5563;
      font-size: 14px;
    }
    .warning {
      background: #fef3c7;
      border-left-color: #f59e0b;
      margin-top: 20px;
    }
    .warning p {
      color: #92400e;
    }
    .footer {
      background: #f9fafb;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
    .footer p {
      color: #6b7280;
      font-size: 14px;
      margin: 8px 0;
    }
    .social-links {
      margin: 20px 0;
    }
    .social-link {
      display: inline-block;
      margin: 0 10px;
      color: #10b981;
      text-decoration: none;
      font-size: 14px;
    }
    .divider {
      height: 1px;
      background: #e5e7eb;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">
        <span class="logo-text">🎵</span>
      </div>
      <h1>InfinityPlay Radio</h1>
      <p class="subtitle">Tvoj zvuk. Tvoj radio.</p>
    </div>
    
    <div class="content">
      <p class="greeting">Pozdrav ${userName},</p>
      
      <p class="message">
        Primili smo zahtev za resetovanje lozinke za vaš InfinityPlay Radio nalog. 
        Ako ste vi poslali ovaj zahtev, kliknite na dugme ispod da biste kreirali novu lozinku.
      </p>
      
      <div class="button-container">
        <a href="${resetUrl}" class="reset-button">
          🔒 Resetuj Lozinku
        </a>
      </div>
      
      <div class="info-box">
        <p>
          <strong>📌 Napomena:</strong> Ovaj link je validan samo 24 sata. 
          Nakon toga ćete morati da zatražite novi link za resetovanje.
        </p>
      </div>
      
      <div class="info-box warning">
        <p>
          <strong>⚠️ Upozorenje:</strong> Ako niste vi zatražili resetovanje lozinke, 
          molimo vas da ignorišete ovaj email. Vaša lozinka neće biti promenjena.
        </p>
      </div>
      
      <div class="divider"></div>
      
      <p class="message" style="font-size: 14px; color: #6b7280;">
        Ako dugme ne radi, kopirajte i nalepite sledeći link u vaš browser:
        <br><br>
        <a href="${resetUrl}" style="color: #10b981; word-break: break-all;">${resetUrl}</a>
      </p>
    </div>
    
    <div class="footer">
      <p><strong>InfinityPlay Radio</strong></p>
      <p>Profesionalna online radio platforma</p>
      
      <div class="social-links">
        <a href="https://infinityplay.rs" class="social-link">🌐 infinityplay.rs</a>
        <a href="mailto:radio@infinityplay.rs" class="social-link">📧 radio@infinityplay.rs</a>
      </div>
      
      <div class="divider"></div>
      
      <p style="font-size: 12px; color: #9ca3af;">
        © ${new Date().getFullYear()} InfinityPlay Radio. Sva prava zadržana.
      </p>
      <p style="font-size: 12px; color: #9ca3af;">
        Ovaj email je automatski generisan. Molimo vas da ne odgovarate na njega.
      </p>
    </div>
  </div>
</body>
</html>
  `;

    try {
        const data = await resend.emails.send({
            from: 'InfinityPlay Radio <onboarding@resend.dev>', // Besplatni Resend email
            to: [toEmail],
            subject: '🔒 Resetovanje Lozinke - InfinityPlay Radio',
            html: emailHtml,
        });

        console.log('✅ Email poslat uspešno:', data);
        return { success: true, data };
    } catch (error) {
        console.error('❌ Greška pri slanju emaila:', error);
        return { success: false, error };
    }
};

// Email template za dobrodošlicu
export const sendWelcomeEmail = async (
    toEmail: string,
    userName: string
) => {
    const emailHtml = `
<!DOCTYPE html>
<html lang="sr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dobrodošli - InfinityPlay Radio</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }
    .header {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      padding: 40px 20px;
      text-align: center;
    }
    .logo {
      width: 80px;
      height: 80px;
      background: white;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
      font-size: 40px;
    }
    h1 {
      color: white;
      margin: 0;
      font-size: 32px;
      font-weight: 600;
    }
    .subtitle {
      color: rgba(255, 255, 255, 0.9);
      margin: 8px 0 0 0;
      font-size: 16px;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 24px;
      color: #1f2937;
      margin-bottom: 20px;
      text-align: center;
    }
    .message {
      color: #4b5563;
      line-height: 1.8;
      margin-bottom: 30px;
      text-align: center;
    }
    .features {
      margin: 40px 0;
    }
    .feature {
      display: flex;
      align-items: start;
      margin: 20px 0;
      padding: 20px;
      background: #f9fafb;
      border-radius: 12px;
      border-left: 4px solid #10b981;
    }
    .feature-icon {
      font-size: 32px;
      margin-right: 16px;
    }
    .feature-content h3 {
      margin: 0 0 8px 0;
      color: #1f2937;
      font-size: 18px;
    }
    .feature-content p {
      margin: 0;
      color: #6b7280;
      font-size: 14px;
    }
    .button-container {
      text-align: center;
      margin: 40px 0;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      text-decoration: none;
      padding: 16px 40px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 16px;
      box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
    }
    .footer {
      background: #f9fafb;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
    .footer p {
      color: #6b7280;
      font-size: 14px;
      margin: 8px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🎉</div>
      <h1>Dobrodošli u InfinityPlay!</h1>
      <p class="subtitle">Spremni ste za najbolje radio iskustvo</p>
    </div>
    
    <div class="content">
      <p class="greeting">Zdravo ${userName}! 👋</p>
      
      <p class="message">
        Hvala što ste se pridružili InfinityPlay Radio porodici! 
        Vaš nalog je uspešno kreiran i spremni ste da uživate u 
        neograničenoj muzici i profesionalnom radio iskustvu.
      </p>
      
      <div class="features">
        <div class="feature">
          <div class="feature-icon">🎵</div>
          <div class="feature-content">
            <h3>Neograničena Muzika</h3>
            <p>Pristup svim našim radio stanicama u HD kvalitetu</p>
          </div>
        </div>
        
        <div class="feature">
          <div class="feature-icon">🎧</div>
          <div class="feature-content">
            <h3>Personalizovane Preporuke</h3>
            <p>Stanice prilagođene vašem tipu biznisa</p>
          </div>
        </div>
        
        <div class="feature">
          <div class="feature-icon">⚡</div>
          <div class="feature-content">
            <h3>Glatke Tranzicije</h3>
            <p>Profesionalni crossfade između stanica</p>
          </div>
        </div>
      </div>
      
      <div class="button-container">
        <a href="https://infinityplay.rs" class="cta-button">
          🚀 Počni Slušanje
        </a>
      </div>
    </div>
    
    <div class="footer">
      <p><strong>InfinityPlay Radio</strong></p>
      <p>🌐 infinityplay.rs | 📧 radio@infinityplay.rs</p>
      <p style="font-size: 12px; color: #9ca3af; margin-top: 20px;">
        © ${new Date().getFullYear()} InfinityPlay Radio. Sva prava zadržana.
      </p>
    </div>
  </div>
</body>
</html>
  `;

    try {
        const data = await resend.emails.send({
            from: 'InfinityPlay Radio <onboarding@resend.dev>',
            to: [toEmail],
            subject: '🎉 Dobrodošli u InfinityPlay Radio!',
            html: emailHtml,
        });

        console.log('✅ Welcome email poslat uspešno:', data);
        return { success: true, data };
    } catch (error) {
        console.error('❌ Greška pri slanju welcome emaila:', error);
        return { success: false, error };
    }
};

// Funkcija za generisanje reset tokena
export const generateResetToken = (): string => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

// Funkcija za čuvanje reset tokena
export const saveResetToken = (email: string, token: string) => {
    const tokens = JSON.parse(localStorage.getItem('password_reset_tokens') || '{}');
    tokens[email] = {
        token,
        expires: Date.now() + 24 * 60 * 60 * 1000, // 24 sata
        createdAt: Date.now(),
    };
    localStorage.setItem('password_reset_tokens', JSON.stringify(tokens));
};

// Funkcija za validaciju reset tokena
export const validateResetToken = (token: string): { valid: boolean; email?: string } => {
    const tokens = JSON.parse(localStorage.getItem('password_reset_tokens') || '{}');

    for (const [email, data] of Object.entries(tokens)) {
        const tokenData = data as { token: string; expires: number };
        if (tokenData.token === token) {
            if (Date.now() < tokenData.expires) {
                return { valid: true, email };
            } else {
                // Token je istekao
                delete tokens[email];
                localStorage.setItem('password_reset_tokens', JSON.stringify(tokens));
                return { valid: false };
            }
        }
    }

    return { valid: false };
};

// Funkcija za brisanje reset tokena nakon korišćenja
export const deleteResetToken = (email: string) => {
    const tokens = JSON.parse(localStorage.getItem('password_reset_tokens') || '{}');
    delete tokens[email];
    localStorage.setItem('password_reset_tokens', JSON.stringify(tokens));
};
