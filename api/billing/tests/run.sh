#!/usr/bin/env bash
# Pokreće SVE billing testove (čiste + DB). DB testovi se sami preskoče ako
# lokalna baza nije dostupna.
#
#   ./api/billing/tests/run.sh
#
# Override konekcije po potrebi:
#   DB_NAME=infinityplay_local DB_USER=$(whoami) ./api/billing/tests/run.sh
set -uo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

fail=0
for t in test_state_machine test_pib test_invoice_units test_polar_mapper test_repo_db test_billing_service_db test_cron_db test_reconciliation_db; do
  echo "▶ ${t}"
  # -d error_reporting: sakrij E_DEPRECATED iz vendorovanog QR koda u izlazu
  php "$DIR/${t}.php" || fail=1
  echo
done

exit $fail
