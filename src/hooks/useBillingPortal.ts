import { useCallback, useEffect, useState } from 'react';
import { billing, type BillingPortalState } from '../lib/api';

/**
 * Učitava billing stanje (pretplata + podaci za uplatu + istorija) iz portala.
 * `enabled=false` preskače poziv (npr. admin nalog). refresh() za ručno osvežavanje.
 */
export function useBillingPortal(enabled: boolean = true) {
  const [portal, setPortal] = useState<BillingPortalState | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      setError(null);
      const data = await billing.getPortal();
      setPortal(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Greška pri učitavanju pretplate');
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { portal, loading, error, refresh };
}
