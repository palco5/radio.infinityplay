import { emails } from './api';

// NOTE: Password reset and email verification now use server-generated PIN
// codes (see api/auth.php: request-reset / reset-password / verify-email).
// The old link + localStorage token flow was removed because it only worked
// within a single browser and never touched the real database.

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
