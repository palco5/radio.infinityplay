import { paddle as paddleApi } from './api';

declare global {
  interface Window {
    Paddle?: {
      Environment: { set: (env: string) => void };
      Initialize: (opts: { token: string; eventCallback?: (event: any) => void }) => void;
      Checkout: {
        open: (opts: {
          items: { priceId: string; quantity: number }[];
          customer?: { email?: string };
          customData?: Record<string, unknown>;
        }) => void;
      };
    };
  }
}

let initPromise: Promise<{ prices: Record<string, string> }> | null = null;

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Paddle) return resolve();
    const script = document.createElement('script');
    script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Neuspešno učitavanje Paddle.js'));
    document.head.appendChild(script);
  });
}

// Loads Paddle.js and initializes it with our client token, exactly once.
// Returns the price ID map so callers can look up the right price per plan.
export function ensurePaddleReady(): Promise<{ prices: Record<string, string> }> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const config = await paddleApi.getConfig();
    if (!config.clientToken) {
      throw new Error('Paddle još nije podešen na serveru (nedostaje client token)');
    }

    await loadScript();

    if (config.environment === 'sandbox') {
      window.Paddle!.Environment.set('sandbox');
    }
    window.Paddle!.Initialize({ token: config.clientToken });

    return { prices: config.prices };
  })();

  return initPromise;
}

// Opens the Paddle checkout overlay for a given internal plan key
// ('basic' | 'branded' | 'host'), tagging the checkout with our own user ID
// so the webhook can match the resulting subscription back to this account.
export async function openPaddleCheckout(planKey: string, userId: string, email?: string) {
  const { prices } = await ensurePaddleReady();
  const priceId = prices[planKey];

  if (!priceId) {
    throw new Error(`Nema podešenog Paddle price ID-a za plan "${planKey}"`);
  }

  window.Paddle!.Checkout.open({
    items: [{ priceId, quantity: 1 }],
    customer: email ? { email } : undefined,
    customData: { user_id: userId },
  });
}
