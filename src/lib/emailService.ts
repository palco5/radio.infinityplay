import { emails } from './api';

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
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; margin-top: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #10b981; margin: 0;">InfinityPlay Radio</h1>
        </div>
        <div style="padding: 20px; background-color: #ffffff;">
            <p style="font-size: 16px; color: #374151;">Pozdrav ${userName},</p>
            <p style="font-size: 16px; color: #374151; line-height: 1.5;">Primili smo zahtev za resetovanje lozinke. Kliknite na dugme ispod da biste postavili novu lozinku:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Resetuj Lozinku</a>
            </div>
            <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">Ako dugme ne radi, kopirajte ovaj link u pretraživač:</p>
            <p style="font-size: 14px; color: #10b981; word-break: break-all;">${resetUrl}</p>
            <p style="font-size: 14px; color: #9ca3af; margin-top: 30px; text-align: center;">Ovaj link važi 24 sata.</p>
        </div>
    </div>
</body>
</html>
    `;

  try {
    const data = await emails.send(toEmail, '🔒 Resetovanje Lozinke - InfinityPlay Radio', emailHtml);
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
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; margin-top: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 20px;">
            <div style="font-size: 40px;">🎉</div>
            <h1 style="color: #10b981; margin: 0;">Dobrodošli!</h1>
        </div>
        <div style="padding: 20px; background-color: #ffffff;">
            <p style="font-size: 16px; color: #374151;">Zdravo ${userName},</p>
            <p style="font-size: 16px; color: #374151; line-height: 1.5;">Hvala što ste se pridružili InfinityPlay Radio porodici! Vaš nalog je uspešno kreiran i spremni ste za korišćenje naše platforme.</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="https://radio.infinityplay.rs" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Počni slušanje 🎵</a>
            </div>
            <p style="font-size: 14px; color: #6b7280; margin-top: 30px; text-align: center;">InfinityPlay Radio tim</p>
        </div>
    </div>
</body>
</html>
    `;

  try {
    const data = await emails.send(toEmail, '🎉 Dobrodošli u InfinityPlay Radio!', emailHtml);
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
