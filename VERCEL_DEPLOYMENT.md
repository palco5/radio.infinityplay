# 🚀 Kako Deploy-ovati na Vercel (Preporučeno)

Vercel je mnogo bolja opcija od GitHub Pages za React aplikacije jer:
1.  **Nema `#` u URL-u** (lepši linkovi).
2.  **Brži je** (globalni CDN).
3.  **Lakši za podešavanje**.

## Korak 1: Kreiraj nalog na Vercel-u
1.  Idi na [vercel.com](https://vercel.com).
2.  Klikni **Sign Up**.
3.  Izaberi **Continue with GitHub**.
4.  Poveži svoj GitHub nalog.

## Korak 2: Importuj Projekat
1.  Na Vercel Dashboard-u klikni **"Add New..."** -> **"Project"**.
2.  Pronađi `radio.infinityplay` u listi svojih repozitorijuma i klikni **Import**.

## Korak 3: Konfiguracija
1.  **Framework Preset:** Vercel će automatski prepoznati `Vite`. Ako ne, izaberi `Vite`.
2.  **Root Directory:** Ostavi `./`.
3.  **Environment Variables:** (Ovo je važno!)
    *   Otvori sekciju "Environment Variables".
    *   Dodaj iste one varijable kao na GitHub-u:
        *   `VITE_SUPABASE_URL` = `https://huyiaierkscuhxlvvtit.supabase.co`
        *   `VITE_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1eWlhaWVya3NjdWh4bHZ2dGl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMTU3MzUsImV4cCI6MjA3ODc5MTczNX0.4oVlCI8aiLRoM8tLGldVl9vRoYr_Mb4-Kk7SIPhJuPA`

## Korak 4: Deploy
1.  Klikni **Deploy**.
2.  Sačekaj minut-dva.
3.  Kada završi, dobićeš link (npr. `radio-infinityplay.vercel.app`).

## Korak 5: Poveži Custom Domain (radio.infinityplay.rs)
1.  Na Vercel-u, idi na **Settings** -> **Domains**.
2.  Upiši `radio.infinityplay.rs`.
3.  Vercel će ti dati instrukcije šta da promeniš u DNS-u (obično je CNAME na `cname.vercel-dns.com`).
    *   **Napomena:** Moraćeš da obrišeš stari CNAME koji pokazuje na GitHub Pages pre nego što dodaš novi za Vercel.

---

## ⚠️ Važno za Router
Ako pređeš na Vercel, možemo vratiti "lepši" router (bez `#`).
Javi mi kad pređeš, pa ću ti poslati kod da vratimo `BrowserRouter`.
