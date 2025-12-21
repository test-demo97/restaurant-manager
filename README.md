# Restaurant Manager System

Sistema completo di gestione ristorante sviluppato da Andrea Fabbri.

---

## Contesto per Sviluppatori / IA

Questa sezione contiene tutto il contesto necessario per continuare lo sviluppo del progetto.

### Informazioni Progetto

| Campo | Valore |
|-------|--------|
| **Nome** | Restaurant Manager System |
| **Versione** | 3.0 |
| **Proprietario** | Andrea Fabbri |
| **Repository** | https://github.com/andreafabbri97/restaurant-manager |
| **Deploy** | https://andreafabbri97.github.io/restaurant-manager/ |
| **Licenza** | Proprietaria (tutti i diritti riservati) |

### Stack Tecnologico

| Tecnologia | Versione | Uso |
|------------|----------|-----|
| React | 19.x | Frontend framework |
| TypeScript | 5.9.x | Type safety |
| Vite | 7.x | Build tool |
| Tailwind CSS | 3.4.x | Styling |
| Supabase | 2.88.x | Database PostgreSQL + Realtime |
| React Router | 7.x | Routing (HashRouter per GitHub Pages) |
| React Query | 5.x | Data fetching |
| Lucide React | 0.561.x | Icone |
| Recharts | 3.6.x | Grafici |
| jsPDF | 3.x | Export PDF menu |
| date-fns | 4.x | Date utilities |

### Struttura Directory

```
kebab-restaurant-app/
├── src/
│   ├── components/
│   │   ├── layout/          # Sidebar, Layout principale
│   │   ├── order/           # CartContent, componenti ordini
│   │   └── ui/              # Modal, Toast, componenti riutilizzabili
│   ├── context/
│   │   ├── AuthContext.tsx      # Autenticazione utenti
│   │   ├── LanguageContext.tsx  # i18n (IT/EN)
│   │   ├── LicenseContext.tsx   # Verifica licenza software
│   │   ├── ThemeContext.tsx     # Tema chiaro/scuro
│   │   └── NotificationContext.tsx
│   ├── hooks/
│   │   ├── useCurrency.ts       # Formattazione prezzi
│   │   └── usePlanFeatures.ts   # Funzionalità per piano licenza
│   ├── lib/
│   │   ├── database.ts      # Tutte le funzioni CRUD (Supabase + localStorage fallback)
│   │   └── supabase.ts      # Client Supabase
│   ├── locales/             # File traduzioni JSON (IT/EN)
│   ├── pages/               # Tutte le pagine dell'app
│   └── types/
│       └── index.ts         # Tipi TypeScript + ROLE_PERMISSIONS
├── public/
│   └── icon.svg             # Icona app (forchetta + coltello)
├── supabase-complete-setup.sql  # Schema database completo per clienti
├── CLIENT_SETUP.md          # Guida setup nuovi clienti
└── vite.config.ts           # Configurazione Vite + PWA
```

### Database Schema

Le tabelle principali in Supabase sono:

| Tabella | Descrizione |
|---------|-------------|
| `categories` | Categorie menu (Kebab, Bevande, ecc.) |
| `ingredients` | Ingredienti con costo unitario e parametri EOQ |
| `menu_items` | Piatti del menu con prezzo |
| `menu_item_ingredients` | Ricette: collegamento piatti-ingredienti |
| `inventory` | Scorte magazzino con soglie (manuali o EOQ) |
| `ingredient_consumptions` | Storico consumi per calcolo EOQ |
| `tables` | Tavoli del ristorante |
| `orders` | Ordini (asporto, domicilio, tavolo) con tracciamento utente |
| `order_items` | Prodotti di ogni ordine |
| `table_sessions` | Sessioni "conto aperto" per tavoli |
| `session_payments` | Pagamenti parziali (split bill) con tracking items |
| `employees` | Dipendenti |
| `work_shifts` | Turni di lavoro (lavorato, malattia, ferie) |
| `reservations` | Prenotazioni tavoli (anche multi-tavolo) |
| `expenses` | Spese generali |
| `supplies` | Forniture ricevute |
| `supply_items` | Dettaglio forniture |
| `invoices` | Fatture fornitori |
| `users` | Utenti sistema (login) con collegamento dipendente |
| `cash_closures` | Chiusure cassa giornaliere |
| `settings` | Configurazione negozio (IVA, SMAC, lingua) |
| `smac_cards` | Tessere fedeltà SMAC |

### Sistema di Autenticazione

- **Tre ruoli**: `superadmin`, `admin`, `staff`
- Permessi definiti in `src/types/index.ts` → `ROLE_PERMISSIONS`
- Login custom (non Supabase Auth) - password in chiaro nel DB (da migliorare)
- Credenziali default: `admin` / `admin123`
- Sessione salvata in localStorage (`kebab_auth_user`)
- Tracciamento audit: ogni ordine registra chi l'ha creato/modificato

### Sistema Multilingua

- Context: `src/context/LanguageContext.tsx`
- Traduzioni: `src/locales/it.json` e `en.json`
- Hook: `useLanguage()` → `{ language, setLanguage, t }`
- Persistenza: localStorage (`kebab_language`)

### Sistema Licenze

Il software include un sistema di verifica licenze:

- **LicenseContext**: verifica la validità della licenza all'avvio
- **Piani disponibili**: demo, standard, premium
- **Funzionalità per piano**:
  - DEMO: solo visualizzazione, watermark, nessuna scrittura DB
  - STANDARD: dashboard, ordini, tavoli, menu, impostazioni
  - PREMIUM: tutto incluso (report, inventario, staff, SMAC, ecc.)
- Il server licenze è un Supabase separato gestito dall'admin

### Modello di Business Multi-Cliente

Il software è pensato per essere venduto a più ristoranti. Strategia di deployment:

1. **Ogni cliente ha il proprio account Supabase** (free tier)
2. L'admin gestisce le licenze da un pannello separato (`restaurant-manager-admin`)
3. Per nuovo cliente: crea licenza → setup Supabase cliente → configura `.env` → deploy
4. Vedere `CLIENT_SETUP.md` per istruzioni complete

**File SQL**:
- `supabase-complete-setup.sql` - Da dare ai clienti per setup del loro Supabase
- `ADMIN-ONLY-licenses-setup.sql` - PRIVATO, solo per il Supabase licenze dell'admin

### Funzionalità Principali

#### Gestione Ordini
- Ordini asporto, domicilio e al tavolo
- Stati: in attesa, in preparazione, pronto, consegnato, annullato
- Tab "Lista Ordini" per storico completo (rinominato da "Storico")
- Filtro rapido "Oggi" per visualizzare ordini del giorno corrente
- Filtri per data, tipo, stato
- Modifica totale per applicare sconti
- Tracking utente che ha creato/modificato l'ordine
- Animazione smooth all'espansione dei dettagli ordine
- Nome cliente visibile nei titoli degli ordini
- ID ordine visibile in Chiusura Cassa e sezione Ordini

#### Gestione Tavoli
- Mappa tavoli con stati (disponibile, occupato, prenotato)
- Sessioni "conto aperto" con comande multiple
- Split bill con 3 modalità: manuale, alla romana, per consumazione
- Tracking prodotti pagati nello split
- Trasferimento tavolo
- Prenotazioni multi-tavolo per gruppi

#### Inventario e EOQ
- Gestione scorte con soglie alert
- **Modalità soglia per ingrediente**: Manuale o EOQ automatico
- Calcolo EOQ (Economic Order Quantity):
  - Punto di riordino automatico
  - Scorta di sicurezza
  - Quantità ottimale da ordinare
  - Giorni prima del riordino
- Forniture con aggiornamento automatico costi
- Metodi calcolo costo: fisso, ultimo, media ponderata, media mobile

#### Ricette e Costo Piatti
- Collegamento piatti-ingredienti con quantità
- Calcolo automatico costo ingredienti per piatto
- Margine di profitto per piatto
- Scarico automatico ingredienti da ordini

#### Gestione Personale
- Anagrafica dipendenti con tariffa oraria
- Turni di lavoro con tipi: lavorato, malattia, ferie, altro
- Collegamento utente-dipendente per audit
- Calcolo costo del lavoro

#### Chiusura Cassa
- Riconciliazione giornaliera
- Separazione incassi: contanti, carta, online
- Tracking SMAC vs non-SMAC
- Calcolo differenza cassa

#### SMAC (San Marino)
- Tracking tessere fedeltà per ordine e pagamento parziale
- Gestione anagrafica carte SMAC
- Report separati SMAC/non-SMAC
- Calcolo corretto SMAC per pagamenti split
- Toggle SMAC con aggiornamento silenzioso (senza loader)
- Layout mobile ottimizzato per testi lunghi nella sezione SMAC

### Convenzioni Codice

- **Stile**: Tailwind CSS con classi custom in `index.css`
- **Componenti**: Functional components con hooks
- **State management**: React Context (no Redux)
- **Data fetching**: Funzioni async in `database.ts`, chiamate con useEffect
- **Lazy loading**: Pagine caricate con `React.lazy()` in App.tsx
- **Tema scuro**: Default, con opzione chiaro

### Comandi Utili

```bash
# Sviluppo
npm run dev

# Build produzione
npm run build

# Deploy su GitHub Pages
npm run deploy

# Lint
npm run lint
```

### TODO / Miglioramenti Futuri

1. **Hashing password**: Implementare bcrypt per le password utente
2. **Traduzioni**: Completare i file JSON per tutte le pagine
3. **Notifiche push**: Aggiungere notifiche browser per ordini
4. **Report avanzati**: Export Excel, grafici comparativi

---

# Guida Operativa per Staff

Questa sezione è per chi lavora in sala.

---

## Come fare un ordine veloce (asporto/domicilio)

1. Vai su **Nuovo Ordine** dal menu laterale
2. In alto, scegli **Asporto** o **Domicilio**
3. Inserisci nome e telefono del cliente
4. Clicca sui prodotti per aggiungerli al carrello
5. Usa **+** e **-** per modificare le quantità
6. Scegli il metodo di pagamento (Contanti, Carta, Online)
7. Se il cliente ha la SMAC, spunta la casella
8. Clicca **Invia Ordine**

L'ordine appare nella lista Ordini e in Cucina.

---

## Come aprire un conto al tavolo

1. Vai su **Tavoli**
2. Clicca sul tavolo verde (disponibile)
3. Si apre "Apri Conto": inserisci numero coperti
4. Opzionale: inserisci nome e telefono cliente
5. Clicca **Apri Conto**
6. Il tavolo diventa rosso (occupato)

Se il cliente ha prenotato, i dati si compilano automaticamente.

---

## Come aggiungere una comanda a un tavolo già aperto

1. Vai su **Tavoli**
2. Clicca sul tavolo rosso (occupato)
3. Si apre il riepilogo del conto
4. Clicca **Aggiungi Comanda**
5. Aggiungi i prodotti come per un ordine normale
6. Clicca **Invia Ordine**

Ogni comanda ha un numero (Comanda #1, #2, ecc.).

---

## Come chiudere un conto (pagamento completo)

1. Clicca sul tavolo rosso
2. Nel riepilogo conto, clicca **Chiudi Conto**
3. Scegli metodo pagamento: Contanti, Carta, Online
4. Se contanti: usa il **Calcolatore Resto**
   - Clicca sul taglio (5, 10, 20, 50, 100) o inserisci importo
   - Leggi il resto da dare al cliente
5. Spunta SMAC se passata
6. Clicca **Conferma Pagamento**

Il tavolo torna verde (disponibile).

---

## Come dividere il conto (split bill)

1. Clicca sul tavolo rosso
2. Clicca **Dividi Conto**
3. Scegli una delle 3 modalità:

### Manuale
- Inserisci l'importo che la persona paga
- Usa i pulsanti rapidi: Tutto, Metà, 1/N
- Scegli Contanti o Carta
- **IMPORTANTE: Spunta "SMAC passato" se il cliente passa la tessera per questo pagamento**
- Se contanti: usa il calcolatore resto
- Clicca **Aggiungi Pagamento**

### Alla Romana
- Inserisci quante persone totali al tavolo
- Inserisci quante persone pagano ora
- Il sistema calcola la quota
- Clicca **Applica Calcolo**
- Poi conferma con **Aggiungi Pagamento**

### Per Consumazione
- Usa i pulsanti **+** e **-** per scegliere quanti pezzi di ogni prodotto pagare
- Esempio: se ci sono 4 kebab, puoi pagarne solo 1 o 2
- Il pulsante **Tutti** seleziona l'intera quantità di quel prodotto
- Il sistema somma automaticamente
- Clicca **Applica Selezione**
- Poi conferma con **Aggiungi Pagamento**

**IMPORTANTE - Tracking Prodotti Pagati**: Quando paghi "Per Consumazione", i prodotti pagati vengono tracciati. Se torni a dividere il conto, vedrai solo i prodotti ancora da pagare.

**NOTA SMAC**: Ogni pagamento parziale può avere la sua SMAC. Spunta la casella per chi passa la tessera, lasciala vuota per chi non la passa.

Ripeti per ogni persona. Quando il rimanente arriva a zero, il conto si chiude automaticamente.

---

## Significato dei colori tavoli

- **Verde** = Disponibile, puoi aprire un conto
- **Rosso** = Occupato, clienti stanno mangiando
- **Arancione** = Prenotato per dopo

---

## Come trasferire un tavolo

1. Clicca sul tavolo rosso attuale
2. Clicca **Trasferisci**
3. Clicca sul nuovo tavolo (deve essere verde)
4. Il conto si sposta, i clienti continuano a ordinare

---

## Come gestire le prenotazioni

### Nuova prenotazione
1. Vai su **Tavoli**
2. Clicca **Nuova Prenotazione** in alto
3. Scegli data e ora
4. Inserisci nome cliente e telefono
5. Inserisci numero ospiti
6. Seleziona uno o più tavoli (per gruppi grandi)
7. Clicca **Crea Prenotazione**

### Quando arriva il cliente prenotato
1. Clicca sul tavolo arancione
2. I dati della prenotazione sono già inseriti
3. Clicca **Apri Conto**

---

## Come applicare sconti a un ordine

1. Vai su **Ordini** → **Lista Ordini**
2. Clicca sull'icona **matita** dell'ordine da modificare
3. Nel popup "Modifica Ordine", trovi la sezione **Totale Ordine**
4. Modifica l'importo (es. da €30.30 a €30.00)
5. Il sistema mostra lo sconto applicato
6. Clicca **Salva Modifiche**

---

## Scorciatoie utili

| Azione | Come fare |
|--------|-----------|
| Ordine veloce | Nuovo Ordine > Asporto > prodotti > Invia |
| Apri tavolo | Tavoli > tavolo verde > Apri Conto |
| Aggiungi comanda | Tavoli > tavolo rosso > Aggiungi Comanda |
| Rimuovi dal carrello | Clicca il pulsante **-** rosso sulla card prodotto |
| Chiudi conto | Tavoli > tavolo rosso > Chiudi Conto |
| Dividi conto | Tavoli > tavolo rosso > Dividi Conto |
| Resto contanti | Nel pagamento, usa Calcolatore Resto |
| Sconto ordine | Ordini > Lista Ordini > Modifica > Cambia totale |
| Filtro oggi | Ordini > Lista Ordini > pulsante "Oggi" |

---

## Problemi Tecnici

| Problema | Soluzione |
|----------|-----------|
| L'app non risponde | Ricarica pagina (F5) |
| Ordini non si aggiornano | Icona sidebar: verde = ok, arancione = ricarica |
| Su telefono non vedo bene | Ruota in orizzontale o usa tablet/PC |

---

## Per Amministratori

### Funzionalità del sistema

| Modulo | Descrizione |
|--------|-------------|
| Dashboard | Statistiche in tempo reale, ordini pendenti, incasso giornaliero |
| Ordini | Gestione ordini con stati, filtri, "Lista Ordini" con filtro rapido "Oggi" |
| Tavoli | Mappa tavoli, prenotazioni, sessioni, split bill |
| Menu | CRUD prodotti, categorie, disponibilità, export PDF |
| Inventario | Scorte, soglie (manuali/EOQ), forniture, calcolo costi |
| Ricette | Collegamento piatti-ingredienti per costo e scarico automatico |
| Costo Piatti | Margini di profitto, analisi per piatto |
| Personale | Turni, presenze, ore lavorate, tipi assenza |
| Chiusura Cassa | Riconciliazione giornaliera contanti/carte |
| SMAC | Tracking tessere fedeltà per ordine |
| Report | Analisi vendite, spese, profitto per periodo |
| Utenti | Gestione account e ruoli (Staff/Admin/Superadmin) |
| Impostazioni | Configurazione negozio, lingua, tema, backup dati |
| Guida FAQ | Documentazione e FAQ integrate |

### Caratteristiche Tecniche

- **Multilingua**: Italiano e Inglese
- **Tema**: Chiaro o Scuro
- **Realtime**: Ordini si aggiornano automaticamente
- **Multi-dispositivo**: PC, tablet e smartphone
- **Offline**: Fallback localStorage quando Supabase non disponibile
- **PWA**: Installabile come app
- **Sistema licenze**: Verifica validità e piano (demo/standard/premium)

### Sicurezza

- RLS (Row Level Security) abilitato su Supabase
- Tre livelli di accesso: Staff, Admin, Superadmin
- Backup JSON esportabile da Impostazioni
- Tracciamento audit su ordini (chi ha creato/modificato)

---

*Versione 3.0 - Restaurant Manager System*
*Copyright (c) 2025 Andrea Fabbri. Tutti i diritti riservati.*
