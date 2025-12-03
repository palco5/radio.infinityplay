# 📋 PODACI KOJE TREBA DA MI DAŠ

Da bi sistem plaćanja bio **100% identičan** kao na kaferadio.net, trebam sledeće podatke:

---

## 🇷🇸 Za plaćanje iz Srbije (Bankovski Transfer)

### Potrebni podaci:

1. **Naziv firme:**
   - Primer: `Cybermedia d.o.o. Beograd`
   - Tvoj podatak: `_______Bitrejt d.o.o. Beograd________________________`

2. **Broj računa:**
   - Primer: `325-9500500002546-27`
   - Tvoj podatak: `_______205-0000000357135-48________________________`

3. **Banka (opciono):**
   - Primer: `Erste Bank`
   - Tvoj podatak: `_______NLB Komercijalna banka________________________`

---

## 🇲🇪🇭🇷🇧🇦 Za Crnu Goru, Hrvatsku, BiH

### Trenutno podešeno:
- ✅ PostKeš usluga (kao na kaferadio.net)
- ✅ Uputstva za plaćanje u pošti
- ✅ Automatski generisan referentni broj

### Da li želiš nešto da promeniš?
- [ ] Da, želim drugi servis umesto PostKeš
- [ ] Ne, PostKeš je ok

Ako DA, koji servis: `_______________________________`

---

## 🌍 Za ostale zemlje

### Trenutno podešeno:
- ✅ PayPal
- ✅ Kreditne kartice (preko PayPal-a)

### PayPal podaci (opciono):

1. **PayPal Business Email:**
   - Tvoj podatak: `_______________________________`

2. **PayPal Client ID (za integraciju):**
   - Tvoj podatak: `_______________________________`

3. **PayPal Secret Key:**
   - Tvoj podatak: `_______________________________`

---

## 💰 Cene Paketa

### Trenutno podešeno (kao kaferadio.net):

| Paket | Cena | Period |
|-------|------|--------|
| WEB RADIO | 15€ | mesečno |
| BOX RADIO | 50€ | mesečno |
| MOJ RADIO | 240€ | godišnje |

### Da li želiš da promeniš cene?
- [ ] Da
- [ ] Ne, ove cene su ok

Ako DA, nove cene:
- WEB RADIO: `_____ €`
- BOX RADIO: `_____ €`
- MOJ RADIO: `_____ €`

---

## 🎁 Popusti

### Trenutno podešeno:
- ✅ 5 meseci unapred: 10% popusta
- ✅ 10 meseci unapred: 20% popusta

### Da li želiš da promeniš popuste?
- [ ] Da
- [ ] Ne, ovi popusti su ok

Ako DA:
- ___ meseci unapred: ___% popusta
- ___ meseci unapred: ___% popusta

---

## 🌐 Domain

### Za GitHub Pages:

1. **GitHub Username:**
   - Tvoj podatak: `__________palco5_____________________`

2. **Repository Name:**
   - Predlog: `radio-website` ili `infinityplay-radio`
   - Tvoj podatak: `_____radio.infinityplay__________________________`

### Custom Domain (opciono):

1. **Da li imaš custom domain?**
   - [imam] Da
   - [ ] Ne

2. **Ako DA, koji domain:**
   - Primer: `radio.infinityplay.rs`
   - Tvoj podatak: `__________radio.infinityplay.rs_____________________`

---

## 📧 Kontakt Informacije

### Za korisnike koji imaju pitanja o plaćanju:

1. **Email za podršku:**
   - Tvoj podatak: `_______info@infinityplay.rs________________________`

2. **Telefon (opciono):**
   - Tvoj podatak: `_______+38169602902________________________`

---

## ✅ Šta Dalje?

Kada mi daš ove podatke, ja ću:

1. ✅ Ažurirati `PaymentPage.tsx` sa tvojim podacima
2. ✅ Podesiti PayPal integraciju (ako daš podatke)
3. ✅ Ažurirati sve reference u kodu
4. ✅ Testirati payment flow
5. ✅ Dati ti finalne instrukcije za deployment

---

## 🚀 Ili Možeš Odmah Pokrenuti

Ako ne želiš da čekaš, možeš:

1. **Pokrenuti sajt sa placeholder podacima:**
   ```bash
   ./deploy-to-github.sh
   ```

2. **Kasnije ažurirati podatke:**
   - Promeni u `src/pages/PaymentPage.tsx`
   - Push izmene na GitHub
   - Sajt će se automatski ažurirati za 2-3 minuta

---

## 📝 Napomena

**Trenutno stanje:**
- ✅ Greške u `deploy.yml` su ispravljene
- ✅ Payment sistem je kreiran (identičan kaferadio.net)
- ✅ Real-time deployment je podešen
- ⚠️ Trebaju tvoji podaci za plaćanje (firma, račun)

**Sajt je spreman za deployment, ali preporučujem da prvo dodaš svoje podatke!**

---

*Popuni ovaj formular i pošalji mi, ili mi reci podatke u chatu!*
