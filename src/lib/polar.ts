import { PolarEmbedCheckout } from '@polar-sh/checkout/embed';
import { polar as polarApi } from './api';

// Da li je Polar podešen na serveru (access token + product ID-evi). Checkout
// stranica na osnovu ovoga pokazuje pravu formu ili maketu.
export async function isPolarConfigured(): Promise<boolean> {
  try {
    return (await polarApi.getConfig()).configured;
  } catch {
    return false;
  }
}

// Otvara Polar checkout (embed modal) za dati paket/ciklus. Server pravi sesiju
// (bira product ID, veže user_id kroz metadata), a Polar posle uspešne uplate
// preusmerava na success_url (/dashboard). Webhook sinhronizuje pretplatu.
export async function openPolarCheckout(opts: {
  plan: string;
  ciklus: 'mesecno' | 'godisnje';
  theme?: 'light' | 'dark';
}): Promise<void> {
  const { url } = await polarApi.createCheckout({ plan: opts.plan, ciklus: opts.ciklus });
  await PolarEmbedCheckout.create(url, { theme: opts.theme ?? 'light' });
}

// Vraća URL za INLINE ugrađivanje Polar checkout-a u naš <iframe> (bez modala).
// Isti query parametri koje Polar embed dodaje (embed=true, embed_origin, theme),
// samo iframe renderujemo u našem rasporedu umesto kao overlay preko stranice.
export async function createPolarCheckoutUrl(opts: {
  plan: string;
  ciklus: 'mesecno' | 'godisnje';
  theme?: 'light' | 'dark';
}): Promise<{ url: string; id?: string }> {
  const { url, id } = await polarApi.createCheckout({ plan: opts.plan, ciklus: opts.ciklus });
  const u = new URL(url);
  u.searchParams.set('embed', 'true');
  u.searchParams.set('embed_origin', window.location.origin);
  if (opts.theme) u.searchParams.set('theme', opts.theme);
  return { url: u.toString(), id };
}
