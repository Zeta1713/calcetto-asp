/* Arena Secondiano Cosimi · prenotazione campo di calcio a 5
   Modulo comune alle due app (clienti e gestore): regole delle fasce orarie e archivio online. */

/* ---------- 1. Configurazione Firebase ----------
   Incolla qui i valori del tuo progetto (Console Firebase → Impostazioni progetto → Le tue app → Configurazione SDK).
   Finché projectId è vuoto le app funzionano in MODALITÀ PROVA: i dati restano solo su questo dispositivo. */
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBQ3lqb660hJnH_wE4_ElajSSfsrKwWR0U",
  authDomain: "calcetto-asp.firebaseapp.com",
  projectId: "calcetto-asp",
  appId: "1:657905256131:web:d09cf37b118abb5045c476"
};
export const DEMO = !FIREBASE_CONFIG.projectId;

/* ---------- 2. Impianto e regole ---------- */
export const IMPIANTO = {
  nome: "Arena Secondiano Cosimi",
  sigla: "ASP",
  campo: "Campo di calcio a 5",
  indirizzo: "Via Martiri delle Fosse Ardeatine, Civitavecchia"
};
export const REGOLE = {
  ore: [15, 16, 17, 18, 19, 20, 21, 22],          // inizio delle fasce da 1 ora: apertura 15:00, chiusura 23:00
  esclusi: { 2: [19, 20], 3: [19, 20], 4: [19, 20], 5: [19, 20] }, // mar-ven 19:00-21:00 non prenotabili (0 = domenica)
  sabatoConConferma: true,                         // il sabato la prenotazione resta in attesa finché il gestore non conferma
  anticipoOre: 6,                                  // si prenota con almeno 6 ore di anticipo
  disdettaOre: 6,                                  // si disdice fino a 6 ore prima
  giorniMax: 90                                    // fino a quanti giorni avanti si può prenotare
};

/* ---------- 3. Date e fasce ---------- */
export const pad = n => String(n).padStart(2, "0");
export const chiaveGiorno = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const slotId = (d, h) => `${chiaveGiorno(d)}_${pad(h)}`;
export const inizioSlot = (d, h) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, 0, 0, 0).getTime();
export const fascia = h => `${pad(h)}:00 – ${pad(h + 1)}:00`;
export const riservata = (d, h) => (REGOLE.esclusi[d.getDay()] || []).includes(h);
export const conConferma = d => REGOLE.sabatoConConferma && d.getDay() === 6;
export const disdicibile = ms => ms - Date.now() >= REGOLE.disdettaOre * 3600e3;
export function statoTempo(ms, ora = Date.now()) {
  if (ms - ora < REGOLE.anticipoOre * 3600e3) return "troppo_presto";
  if (ms - ora > REGOLE.giorniMax * 864e5) return "troppo_lontano";
  return "ok";
}
export const GIORNI = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
export const fmtGiorno = (ms, lungo = true) => new Date(ms).toLocaleDateString("it-IT",
  lungo ? { weekday: "long", day: "numeric", month: "long" } : { weekday: "short", day: "2-digit", month: "2-digit" });
export const fmtMese = d => d.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
export const STATI = {
  confermata: { testo: "Confermata", cls: "ok" },
  in_attesa: { testo: "In attesa di conferma", cls: "warn" },
  rifiutata: { testo: "Non confermata", cls: "bad" },
  annullata: { testo: "Annullata dal gestore", cls: "bad" },
  bloccato: { testo: "Bloccata dal gestore", cls: "mut" }
};
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const pulisciCell = s => String(s || "").replace(/[^\d+]/g, "");

/* ---------- 4. Archivio: Firebase o modalità prova ---------- */
export async function creaBackend(ruolo) { return DEMO ? demo(ruolo) : firebase(ruolo); }

const FB = "https://www.gstatic.com/firebasejs/10.12.2/";
async function firebase(ruolo) {
  const [{ initializeApp }, A, F] = await Promise.all([
    import(FB + "firebase-app.js"), import(FB + "firebase-auth.js"), import(FB + "firebase-firestore.js")]);
  const app = initializeApp(FIREBASE_CONFIG, ruolo);   // nome diverso per ruolo: la sessione del gestore non si mescola con quella dei clienti
  const auth = A.getAuth(app), db = F.getFirestore(app);
  const ts = ms => F.Timestamp.fromMillis(ms), ms = t => (t && t.toMillis ? t.toMillis() : t ?? null);
  const conv = s => s.docs.map(d => { const v = d.data(); return { id: d.id, ...v, inizio: ms(v.inizio), creata: ms(v.creata) }; });
  const range = (col, da, a) => F.query(F.collection(db, col), F.where("inizio", ">=", ts(da)), F.where("inizio", "<", ts(a)));
  const api = {
    demo: false,
    onUtente: cb => A.onAuthStateChanged(auth, cb),
    entraAnonimo: () => A.signInAnonymously(auth),
    login: (e, p) => A.signInWithEmailAndPassword(auth, e, p),
    logout: () => A.signOut(auth),
    osservaOccupati: (da, a, cb, err) => F.onSnapshot(range("occupati", da, a), s => cb(conv(s)), err),
    osservaPrenotazioni: (da, a, cb, err) => F.onSnapshot(range("prenotazioni", da, a), s => cb(conv(s)), err),
    osservaMie: (cb, err) => F.onSnapshot(F.query(F.collection(db, "prenotazioni"), F.where("uid", "==", auth.currentUser.uid)), s => cb(conv(s)), err),
    async prenota({ slot, inizio, nome, cell, stato }) {
      const pr = F.doc(F.collection(db, "prenotazioni")), oc = F.doc(db, "occupati", slot);
      await F.runTransaction(db, async tx => {
        if ((await tx.get(oc)).exists()) throw new Error("occupata");
        tx.set(oc, { inizio: ts(inizio), stato, pren: pr.id });
        tx.set(pr, { uid: auth.currentUser.uid, nome, cell, inizio: ts(inizio), stato, slot, creata: F.serverTimestamp(), ...(ruolo === "gestore" ? { daGestore: true } : {}) });
      });
      return pr.id;
    },
    async disdici(p) {
      const b = F.writeBatch(db);
      b.delete(F.doc(db, "prenotazioni", p.id));
      if (p.stato === "confermata" || p.stato === "in_attesa") b.delete(F.doc(db, "occupati", p.slot));
      await b.commit();
    },
    async cambiaStato(p, stato) { // solo gestore: confermata | rifiutata | annullata
      const b = F.writeBatch(db);
      b.update(F.doc(db, "prenotazioni", p.id), { stato });
      if (stato === "confermata") b.update(F.doc(db, "occupati", p.slot), { stato });
      else b.delete(F.doc(db, "occupati", p.slot));   // rifiutata o annullata: la fascia torna libera
      await b.commit();
    },
    blocca: (slot, inizio, nota) => F.runTransaction(db, async tx => {
      const oc = F.doc(db, "occupati", slot);
      if ((await tx.get(oc)).exists()) throw new Error("occupata");
      tx.set(oc, { inizio: ts(inizio), stato: "bloccato", pren: null, nota: nota || "" });
    }),
    sblocca: slot => F.deleteDoc(F.doc(db, "occupati", slot))
  };
  return api;
}

function demo(ruolo) {
  const K = "asp.demo.v1", vuoto = () => ({ occupati: {}, prenotazioni: {} });
  const leggi = () => { try { return JSON.parse(localStorage.getItem(K)) || vuoto(); } catch { return vuoto(); } };
  const ascolti = new Set(), notifica = () => ascolti.forEach(f => f());
  const scrivi = d => { try { localStorage.setItem(K, JSON.stringify(d)); } catch {} notifica(); };
  addEventListener("storage", e => { if (e.key === K) notifica(); });
  const ascolta = f => { ascolti.add(f); setTimeout(f, 0); return () => ascolti.delete(f); };
  const lista = o => Object.entries(o).map(([id, v]) => ({ id, ...v }));
  let uid; try { uid = localStorage.getItem("asp.demo.uid"); if (!uid) { uid = "u" + Math.random().toString(36).slice(2, 10); localStorage.setItem("asp.demo.uid", uid); } } catch { uid = "u-prova"; }
  const KG = "asp.demo.gestore"; let cbUtente = null;
  const utente = () => ruolo === "gestore" ? (localStorage.getItem(KG) ? { uid: "gestore", email: localStorage.getItem(KG) } : null) : { uid, isAnonymous: true };
  return {
    demo: true,
    onUtente(cb) { cbUtente = cb; setTimeout(() => cb(utente()), 0); return () => {}; },
    async entraAnonimo() {},
    async login(e) { localStorage.setItem(KG, e || "gestore@prova"); cbUtente && cbUtente(utente()); },
    async logout() { localStorage.removeItem(KG); cbUtente && cbUtente(null); },
    osservaOccupati: (da, a, cb) => ascolta(() => cb(lista(leggi().occupati).filter(x => x.inizio >= da && x.inizio < a))),
    osservaPrenotazioni: (da, a, cb) => ascolta(() => cb(lista(leggi().prenotazioni).filter(x => x.inizio >= da && x.inizio < a))),
    osservaMie: cb => ascolta(() => cb(lista(leggi().prenotazioni).filter(x => x.uid === uid))),
    async prenota({ slot, inizio, nome, cell, stato }) {
      const d = leggi(); if (d.occupati[slot]) throw new Error("occupata");
      const id = Math.random().toString(36).slice(2, 12);
      d.occupati[slot] = { inizio, stato, pren: id };
      d.prenotazioni[id] = { uid: ruolo === "gestore" ? "gestore" : uid, nome, cell, inizio, stato, slot, creata: Date.now() };
      scrivi(d); return id;
    },
    async disdici(p) { const d = leggi(); delete d.prenotazioni[p.id]; if (d.occupati[p.slot]?.pren === p.id) delete d.occupati[p.slot]; scrivi(d); },
    async cambiaStato(p, stato) {
      const d = leggi(); if (!d.prenotazioni[p.id]) return; d.prenotazioni[p.id].stato = stato;
      if (stato === "confermata") { if (d.occupati[p.slot]) d.occupati[p.slot].stato = stato; } else if (d.occupati[p.slot]?.pren === p.id) delete d.occupati[p.slot];
      scrivi(d);
    },
    async blocca(slot, inizio, nota) { const d = leggi(); if (d.occupati[slot]) throw new Error("occupata"); d.occupati[slot] = { inizio, stato: "bloccato", pren: null, nota: nota || "" }; scrivi(d); },
    async sblocca(slot) { const d = leggi(); delete d.occupati[slot]; scrivi(d); }
  };
}
