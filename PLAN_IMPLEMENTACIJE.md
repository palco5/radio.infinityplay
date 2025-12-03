# Plan Implementacije - Realtime Sinhronizacija i Analitika

## ✅ Urađeno

### 1. Event Bus Sistem
- ✅ Kreiran `/src/lib/eventBus.ts`
- ✅ Event-based komunikacija između komponenti
- ✅ Cross-tab sinhronizacija preko CustomEvents

### 2. localStorage sa Events
- ✅ Ažuriran `/src/lib/localStorage.ts`
- ✅ Emituje events pri svakoj izmeni podataka:
  - `STATION_CREATED` - Nova stanica
  - `STATION_UPDATED` - Izmena stanice
  - `STATION_DELETED` - Brisanje stanice
  - `USER_PROFILE_UPDATED` - Izmena profila

### 3. Chart Komponente
- ✅ `/src/components/charts/LineChart.tsx` - Line grafikon
- ✅ `/src/components/charts/BarChart.tsx` - Bar grafikon
- ✅ `/src/components/charts/PieChart.tsx` - Pie/Donut grafikon

## 🔄 U Toku

### 4. AdminDashboard Refaktorisanje
Potrebno je ažurirati AdminDashboard da:
- Koristi `localStations` i `localAuth` umesto Supabase
- Sluša events za realtime updates
- Prikazuje grafikone u Analytics sekciji

### 5. UserDashboard Realtime Updates
Potrebno je dodati event listeners u UserDashboard:
- Osvežavanje liste stanica kada admin doda/izmeni/obriše
- Osvežavanje profila kada se izmeni

## 📋 Sledeći Koraci

### Prioritet 1: Realtime Sinhronizacija

1. **UserDashboard** - Dodati event listeners:
```typescript
useEventBus(EVENTS.STATION_UPDATED, (station) => {
  // Osveži listu stanica
  fetchStations();
});

useEventBus(EVENTS.USER_PROFILE_UPDATED, ({ userId, profile }) => {
  if (userId === user?.id) {
    // Osveži profil
    refreshProfile();
  }
});
```

2. **AdminDashboard** - Dodati event listeners:
```typescript
useEventBus(EVENTS.STATION_CREATED, () => {
  fetchDashboardData();
});

useEventBus(EVENTS.STATION_UPDATED, () => {
  fetchDashboardData();
});
```

### Prioritet 2: Poboljšana Analitika

1. **Dodati nove metrike**:
   - Broj slušalaca po žanru
   - Trend slušanja (dnevno/nedeljno)
   - Top 10 korisnika po vremenu slušanja
   - Distribucija korisnika po kategorijama

2. **Grafikoni u Analytics sekciji**:
   - Line Chart - Trend slušanja kroz vreme
   - Bar Chart - Slušanost po žanrovima
   - Pie Chart - Distribucija korisnika
   - Donut Chart - Status pretplata

3. **localStorage Analytics Data**:
```typescript
// Dodati u localStorage.ts
export const localAnalytics = {
  trackListening: (userId, stationId, minutes) => {
    // Čuvaj podatke o slušanju
  },
  
  getListeningTrend: (days = 7) => {
    // Vrati trend za poslednjih N dana
  },
  
  getTopStations: (limit = 10) => {
    // Vrati top stanice
  },
  
  getUsersByCategory: () => {
    // Vrati distribuciju korisnika
  }
};
```

### Prioritet 3: Dodatne Funkcionalnosti

1. **Real-time Listener Count**:
   - Prati ko trenutno sluša
   - Prikaži broj aktivnih slušalaca
   - Update svakih 5 sekundi

2. **Notifikacije**:
   - Toast notifikacije kada admin izmeni nešto
   - Prikaži u UserDashboard-u

3. **Export/Import Podataka**:
   - Dugme za export svih podataka (JSON)
   - Import podataka iz backup-a

## 🎯 Trenutni Status

**Fajlovi koji čekaju izmene:**
- `/src/pages/AdminDashboard.tsx` - Refaktorisanje (1080 linija)
- `/src/pages/UserDashboard.tsx` - Dodati event listeners
- `/src/components/admin/AddStationModal.tsx` - Već koristi localStorage
- `/src/components/admin/EditStationModal.tsx` - Već koristi localStorage

**Što radi:**
- ✅ Event Bus sistem
- ✅ localStorage sa events
- ✅ Chart komponente
- ✅ Osnovne CRUD operacije

**Što treba dodati:**
- ⏳ Realtime sinhronizacija u dashboards
- ⏳ Grafikoni u Analytics
- ⏳ Poboljšane metrike
- ⏳ Listener tracking

## 💡 Napomene

- AdminDashboard je prevelik (1080 linija) - treba ga podeliti na manje komponente
- Sve izmene treba da budu non-breaking - postojeće funkcionalnosti moraju raditi
- Event Bus omogućava cross-tab komunikaciju (otvoreni tabovi se sinhronizuju)
- Chart komponente su lightweight i ne zahtevaju eksterne biblioteke

---

**Status:** 🔄 U Toku  
**Prioritet:** Visok  
**ETA:** ~1-2 sata za kompletnu implementaciju
