# Calcetto ASP – come mettere online le due app

Cartella da caricare su GitHub (tutto il contenuto, così com'è):

- `index.html` → app per chi prenota (link da distribuire)
- `gestore/` → app del gestore (link da dare solo ai gestori)
- `comune.js`, `stile.css`, icone e `manifest.json` → servono a entrambe
- `firestore.rules` → regole di sicurezza da incollare in Firebase (non serve su GitHub, ma non fa danni)

Finché non colleghi Firebase le app funzionano in **modalità prova**: i dati restano solo sul telefono che le usa.

## 1. Crea il progetto Firebase (una volta sola)

1. Vai su https://console.firebase.google.com e accedi con il tuo account Google.
2. **Aggiungi progetto** → nome `calcetto-asp` → Google Analytics non serve → **Crea progetto**.
3. Menu a sinistra **Build → Authentication → Inizia**. In **Metodo di accesso** attiva:
   - **Anonimo** (serve a chi prenota, senza registrazione);
   - **Email/password** (serve al gestore).
4. Sempre in Authentication, scheda **Utenti → Aggiungi utente**: crea l'account di ogni gestore (email e password scelte dal gestore). Massimo 3.
5. Menu **Build → Firestore Database → Crea database** → posizione **eur3 (europe-west)** → modalità **produzione**.
6. Nella scheda **Regole** di Firestore cancella tutto, incolla il contenuto di `firestore.rules`, sostituisci le tre email di esempio con quelle dei gestori (togli le righe in più) e premi **Pubblica**.
7. Ingranaggio in alto a sinistra → **Impostazioni progetto** → in basso **Le tue app** → icona **</>** (Web) → nome `calcetto` → **Registra app**. Copia i valori `apiKey`, `authDomain`, `projectId`, `appId`.

## 2. Collega le app

Apri `comune.js` e incolla i quattro valori in `FIREBASE_CONFIG` (in alto nel file). Questi valori non sono segreti: la protezione la fanno le regole del punto 6.

## 3. Pubblica su GitHub

1. Crea **un solo** repository, ad esempio `calcetto-asp`, e carica tutto il contenuto della cartella (anche la cartella `gestore`).
2. **Settings → Pages → Branch: main, / (root) → Save**.
3. Dopo un paio di minuti:
   - app clienti: `https://<tuo-utente>.github.io/calcetto-asp/`
   - app gestore: `https://<tuo-utente>.github.io/calcetto-asp/gestore/`
4. In Firebase → **Authentication → Impostazioni → Domini autorizzati** aggiungi `<tuo-utente>.github.io`.

Per gli aggiornamenti carica i file modificati **nello stesso repository**: i link non cambiano e le app si aggiornano da sole.

## 4. Sul telefono

Apri il link in Safari (iPhone) o Chrome (Android) → Condividi / menu → **Aggiungi alla schermata Home**.

## Regole già impostate

- Fasce da 1 ora dalle 15:00 alle 23:00.
- Martedì, mercoledì, giovedì e venerdì 19:00–21:00 non prenotabili.
- Si prenota con almeno 6 ore di anticipo, fino a 90 giorni avanti; si disdice fino a 6 ore prima.
- Lun–ven e domenica la prenotazione è subito confermata; il sabato resta in attesa finché il gestore non conferma o rifiuta.
- Una fascia prenotata sparisce per tutti; se viene disdetta, rifiutata o annullata torna libera.
- Il gestore può bloccare una fascia (es. partita di campionato) e prenotare per conto di un cliente.
- Nome e cellulare li vede solo il gestore; gli altri vedono solo che la fascia è occupata.

Per cambiare orari o regole si modifica la sezione `REGOLE` in `comune.js` (e, per anticipo e giorni massimi, le righe corrispondenti in `firestore.rules`).
