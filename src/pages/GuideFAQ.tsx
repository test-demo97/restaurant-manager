import { useState } from 'react';
import {
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ShoppingCart,
  UtensilsCrossed,
  CalendarDays,
  Users,
  Package,
  BarChart3,
  Settings,
  CreditCard,
  Receipt,
  Calculator,
  BookOpen,
  Search,
  Sparkles,
  LayoutDashboard,
  ChefHat,
  ClipboardList,
  Wallet,
  UserCog,
  Shield,
  Languages,
  Moon,
  Monitor,
  Wifi,
  Database
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useSmac } from '../context/SmacContext';
import { usePlanFeatures } from '../hooks/usePlanFeatures';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

interface GuideSection {
  title: string;
  icon: React.ReactNode;
  content: string[];
  tips?: string[];
  premium?: boolean;
}

export function GuideFAQ() {
  useLanguage(); // Ready for translations
  const { isSuperAdmin, isAdmin } = useAuth();
  const { smacEnabled } = useSmac();
  const { isPremium } = usePlanFeatures();
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'welcome' | 'guide' | 'faq'>('welcome');

  // ============================================
  // SEZIONI GUIDA PER STAFF (BASE)
  // ============================================
  const staffGuideSections: GuideSection[] = [
    {
      title: 'Nuovo Ordine',
      icon: <ShoppingCart className="w-5 h-5" />,
      content: [
        'Dalla sidebar clicca su "Nuovo Ordine"',
        'Scegli il tipo: Asporto, Domicilio o Tavolo',
        'Per Asporto/Domicilio: inserisci nome e telefono cliente',
        'Tocca/clicca su una card prodotto per aggiungerlo al carrello',
        'Il badge arancione sulla card mostra la quantità nel carrello',
        'Usa il pulsante "-" sulla card per rimuovere unità velocemente',
        'Nel carrello puoi usare + e - per modificare le quantità',
        'Se necessario, aggiungi note cliccando sull\'icona nota',
        'Scegli il metodo di pagamento (Contanti, Carta, Online)',
        'Spunta "SMAC" se il cliente ha la tessera',
        'Clicca "Invia Ordine" per confermare',
      ],
      tips: [
        'Per ordini veloci: cerca il prodotto per nome invece di scorrere le categorie',
        'Se il cliente cambia idea: usa il "-" sulla card invece di andare nel carrello',
        'Controlla sempre il totale prima di inviare, specialmente per ordini a domicilio',
        'Per ordini SMAC: spunta la casella PRIMA di inviare, non si può aggiungere dopo',
      ],
    },
    {
      title: 'Gestione Tavoli',
      icon: <CalendarDays className="w-5 h-5" />,
      content: [
        'Verde = Tavolo disponibile',
        'Rosso = Tavolo occupato',
        'Arancione = Tavolo prenotato',
        'Per aprire un conto: clicca su un tavolo verde',
        'Inserisci il numero di coperti e conferma',
        'Per aggiungere una comanda: clicca sul tavolo rosso → "Aggiungi Comanda"',
        'Per chiudere il conto: clicca sul tavolo rosso → "Chiudi Conto"',
      ],
      tips: [
        'Se un cliente vuole cambiare tavolo: usa "Trasferisci" invece di chiudere e riaprire',
        'Prima di chiudere un tavolo rosso verifica che tutte le comande siano state aggiunte',
        'Se un tavolo prenotato non si presenta, liberalo manualmente dopo 15-20 minuti',
      ],
    },
    {
      title: 'Ordini in Cucina',
      icon: <UtensilsCrossed className="w-5 h-5" />,
      content: [
        'Vai su "Ordini" dalla sidebar',
        'Gli ordini sono divisi per stato: Nuovo, In Preparazione, Pronto, Consegnato',
        'Clicca su un ordine per vedere i dettagli',
        'Usa i pulsanti per cambiare lo stato dell\'ordine',
        'Puoi filtrare per tipo (Asporto, Domicilio, Tavolo)',
      ],
      tips: [
        'Se l\'icona è arancione/gialla invece che verde, ricarica la pagina per riconnettere',
        'Gli ordini a domicilio hanno priorità: preparali per tempo considerando la consegna',
        'Segna "Pronto" solo quando l\'ordine è effettivamente pronto per essere ritirato',
      ],
    },
    {
      title: 'Pagamento e Resto',
      icon: <Receipt className="w-5 h-5" />,
      content: [
        'Quando chiudi un conto, scegli il metodo di pagamento',
        'Per pagamenti in contanti appare il "Calcolatore Resto"',
        'Clicca sui tagli (€5, €10, €20, €50, €100) o inserisci l\'importo',
        'Il sistema calcola automaticamente il resto da dare',
        'Se l\'importo è insufficiente, vedrai un avviso arancione',
      ],
      tips: [
        'Per evitare errori: clicca sui tagli (€20, €50) invece di digitare a mano',
        'Conta sempre il resto ad alta voce mentre lo consegni al cliente',
      ],
    },
    {
      title: 'Dividere il Conto',
      icon: <Calculator className="w-5 h-5" />,
      content: [
        'Dal tavolo occupato clicca "Dividi Conto"',
        'Scegli una delle 3 modalità:',
        '• Manuale: inserisci l\'importo che paga ogni persona',
        '• Alla Romana: dividi equamente tra N persone',
        '• Per Consumazione: usa +/- per scegliere quanti pezzi di ogni prodotto pagare',
        'Per ogni pagamento: spunta "SMAC passato" se il cliente passa la tessera',
        'I prodotti già pagati vengono "scalati" automaticamente',
        'Aggiungi ogni pagamento separatamente',
        'Quando il totale residuo arriva a zero, il conto si chiude',
      ],
      tips: [
        '"Alla Romana" è la più veloce: basta inserire il numero di persone',
        '"Per Consumazione": se ci sono 4 kebab puoi pagarne 1, 2 o 3 usando i pulsanti +/-',
        'SMAC: spunta per chi passa la tessera, così a fine giornata sai esattamente quanto dichiarare',
        'Chiedi PRIMA come vogliono dividere per evitare confusione',
        'Dopo un pagamento parziale, riaprendo lo split vedrai solo i prodotti rimanenti',
      ],
    },
    {
      title: 'Stato Conto e Scontrini',
      icon: <Receipt className="w-5 h-5" />,
      content: [
        'Dal tavolo occupato clicca "Stato Conto"',
        'Vedi tutti i pagamenti già effettuati',
        'Per ogni pagamento: importo, metodo, SMAC sì/no',
        'Se pagato "Per Consumazione": vedi quali prodotti',
        'Puoi stampare uno scontrino separato per ogni pagamento',
        'Vedi importo totale e quanto ancora da pagare',
        'Funziona anche dalla Lista Ordini',
      ],
      tips: [
        'Usa "Stato Conto" per rispondere ai clienti che chiedono chi ha già pagato',
        'Stampa scontrino separato se ogni persona vuole la sua ricevuta',
        'Da Lista Ordini puoi gestire conti aperti anche senza sapere il tavolo',
      ],
    },
  ];

  // ============================================
  // SEZIONI GUIDA AGGIUNTIVE PER ADMIN
  // ============================================
  const adminGuideSections: GuideSection[] = [
    {
      title: 'Gestione Menu',
      icon: <UtensilsCrossed className="w-5 h-5" />,
      content: [
        'Vai su "Menu" dalla sidebar',
        'Clicca "Aggiungi Prodotto" per creare un nuovo piatto',
        'Compila: nome, descrizione, prezzo, categoria',
        'Usa il toggle "Disponibile" per abilitare/disabilitare',
        'Clicca sull\'icona matita per modificare un prodotto',
        'Clicca sull\'icona cestino per eliminare (con conferma)',
      ],
      tips: [
        'Disattiva un prodotto invece di eliminarlo se è solo temporaneamente esaurito',
        'Metti prezzi "puliti" (es. €5.00, €7.50) per velocizzare i pagamenti in contanti',
        'Usa descrizioni brevi ma chiare per aiutare lo staff a spiegare i piatti',
      ],
    },
    {
      title: 'Costo Piatti',
      icon: <Calculator className="w-5 h-5" />,
      content: [
        'Vai su "Costo Piatti" dalla sidebar',
        'Vedi le statistiche: piatti totali, margine medio, alto/basso margine',
        'Ogni piatto mostra: prezzo vendita, costo ingredienti, profitto, margine %',
        'Verde = margine alto (>60%), Giallo = medio (30-60%), Rosso = basso (<30%)',
        'Clicca "Vedi dettaglio" per vedere la lista ingredienti con costi',
        'Usa i filtri per ordinare per nome, margine o costo',
        'L\'avviso giallo indica piatti senza ricetta collegata',
      ],
      tips: [
        'Controlla i piatti rossi (margine basso): valuta se alzare il prezzo o ridurre le porzioni',
        'Se un piatto mostra "0 ingredienti" vai su Ricette per collegarlo',
        'Ordina per "Margine" per vedere subito quali piatti rendono di più',
      ],
      premium: true,
    },
    {
      title: 'Inventario',
      icon: <Package className="w-5 h-5" />,
      content: [
        'Vai su "Inventario" dalla sidebar',
        'Vedi tutti gli ingredienti con quantità e unità',
        'Gli ingredienti sotto scorta sono evidenziati in rosso',
        'Clicca "Aggiungi Ingrediente" per crearne uno nuovo',
        'Usa "Carico" per registrare nuovi arrivi (con fattura automatica opzionale)',
        'Usa "Scarico" per registrare utilizzi manuali',
        'Clicca la campanella per impostare la soglia scorta (Manuale o EOQ)',
        'Clicca il dollaro per modificare il costo unitario',
      ],
      tips: [
        'Controlla gli ingredienti rossi (sotto scorta) PRIMA del servizio',
        'Fai il carico appena arriva la merce, non rimandare',
        'Se l\'inventario non torna, fai uno scarico manuale per allineare i dati',
        'Usa la modalità EOQ per far calcolare automaticamente la soglia ottimale',
        'Configura il metodo di calcolo costo (fisso, ultimo, media) nelle impostazioni inventario',
      ],
      premium: true,
    },
    {
      title: 'Ricette',
      icon: <BookOpen className="w-5 h-5" />,
      content: [
        'Vai su "Ricette" dalla sidebar',
        'Collega ogni piatto del menu ai suoi ingredienti',
        'Specifica la quantità di ogni ingrediente per porzione',
        'Questo permette lo scarico automatico dall\'inventario',
        'Permette anche il calcolo del food cost',
      ],
      tips: [
        'Senza ricetta collegata, l\'inventario non scala automaticamente',
        'Inserisci le quantità esatte per porzione, non approssimative',
        'Aggiorna le ricette se cambi le porzioni dei piatti',
      ],
      premium: true,
    },
    {
      title: 'Personale',
      icon: <Users className="w-5 h-5" />,
      content: [
        'Vai su "Personale" dalla sidebar',
        'Gestisci turni e presenze del personale',
        'Registra entrate e uscite di ogni dipendente',
        'Visualizza il riepilogo ore lavorate',
      ],
      tips: [
        'Fai timbrare entrata/uscita subito, non a fine giornata',
        'Se qualcuno dimentica di timbrare, correggi manualmente lo stesso giorno',
      ],
      premium: true,
    },
    {
      title: 'Chiusura Cassa',
      icon: <Receipt className="w-5 h-5" />,
      content: [
        'Vai su "Chiusura Cassa" dalla sidebar',
        'A fine giornata, registra il totale contanti in cassa',
        'Il sistema confronta con il totale previsto',
        'Registra eventuali differenze (ammanchi o eccedenze)',
        'Genera il report di chiusura giornaliera',
      ],
      tips: [
        'Conta i contanti DUE volte prima di registrare per evitare errori',
        'Se c\'è un ammanco, annotalo subito con una nota esplicativa',
        'Fai la chiusura cassa ogni sera, non accumulare giorni',
      ],
      premium: true,
    },
    {
      title: 'Stampa Automatica Comande',
      icon: <Receipt className="w-5 h-5" />,
      content: [
        'Vai su "Impostazioni" dalla sidebar',
        'Nella sezione "Impostazioni Finanziarie", attiva "Stampa Automatica Comande"',
        'Scegli il tipo di stampante: Termica (per scontrini) o Tradizionale (normale)',
        'Inserisci il modello della tua stampante per riferimento',
        'Scegli uno dei 3 metodi di stampa disponibili:',
        '• Con Print Agent: Server locale che trova automaticamente le stampanti in rete',
        '• Senza Print Agent: Usa la stampa del browser (ogni dispositivo deve avere la stampante configurata)',
        '• IP Diretto: Connessione diretta alla stampante tramite IP di rete (richiede Print Agent)',
      ],
      tips: [
        'Print Agent è la soluzione migliore: installa su un Raspberry Pi o PC locale',
        'Con Print Agent non devi configurare la stampante su ogni tablet/smartphone',
        'Se usi il browser (senza Agent), ogni dispositivo va configurato manualmente',
        'L\'IP diretto funziona solo con stampanti di rete e richiede Print Agent',
        'Consulta il README del Print Agent per istruzioni installazione',
      ],
    },
  ];

  // ============================================
  // SEZIONI GUIDA AGGIUNTIVE PER SUPERADMIN
  // ============================================
  const superadminGuideSections: GuideSection[] = [
    {
      title: 'Dashboard',
      icon: <BarChart3 className="w-5 h-5" />,
      content: [
        'La Dashboard mostra le statistiche in tempo reale',
        'Vedi: ordini oggi, incasso giornaliero, tavoli occupati',
        'Grafici di vendita per periodo',
        'Top prodotti venduti',
        'Confronto con periodi precedenti',
      ],
      tips: [
        'Controlla la dashboard a inizio e fine servizio per avere il polso della situazione',
        'I "Top prodotti" ti dicono cosa spingere e cosa tenere sempre disponibile',
      ],
    },
    {
      title: 'Report & Admin',
      icon: <BarChart3 className="w-5 h-5" />,
      content: [
        'Vai su "Report & Admin" dalla sidebar',
        'Genera report dettagliati per periodo',
        'Analizza vendite per categoria, prodotto, operatore',
        'Esporta report in PDF o Excel',
        'Visualizza trend e statistiche avanzate',
      ],
      tips: [
        'Genera il report settimanale ogni lunedì per analizzare la settimana precedente',
        'Confronta i report mese su mese per identificare trend stagionali',
      ],
      premium: true,
    },
    {
      title: 'Gestione SMAC',
      icon: <CreditCard className="w-5 h-5" />,
      content: [
        'Vai su "SMAC" dalla sidebar',
        'Gestisci le tessere fedeltà SMAC',
        'Vedi storico utilizzi per cliente',
        'Aggiungi nuove tessere manualmente',
        'Monitora le statistiche di utilizzo',
      ],
      tips: [
        'Controlla i clienti più frequenti per fidelizzarli ulteriormente',
        'Verifica che lo staff registri sempre le tessere SMAC agli ordini',
      ],
      premium: true,
    },
    {
      title: 'Impostazioni',
      icon: <Settings className="w-5 h-5" />,
      content: [
        'Vai su "Impostazioni" dalla sidebar',
        'Configura nome e dati del ristorante',
        'Imposta orari di apertura',
        'Configura opzioni di stampa scontrini',
        'Gestisci categorie del menu',
        'Personalizza messaggi e notifiche',
      ],
      tips: [
        'Il nome ristorante appare nella sidebar: impostalo prima di iniziare',
        'Configura le categorie menu in modo logico per velocizzare gli ordini',
      ],
    },
    {
      title: 'Gestione Utenti',
      icon: <Users className="w-5 h-5" />,
      content: [
        'Vai su "Utenti" dalla sidebar',
        'Crea nuovi utenti per il sistema',
        'Assegna ruoli: Staff, Admin o Superadmin',
        'Staff: può solo fare ordini e gestire tavoli',
        'Admin: può gestire menu, inventario, personale',
        'Superadmin: accesso completo a tutte le funzioni',
        'Disattiva utenti senza eliminarli',
        'Reimposta password se necessario',
      ],
      tips: [
        'Crea un account Staff per ogni dipendente, non condividere le credenziali',
        'Disattiva gli account invece di eliminarli per mantenere lo storico',
        'Dai ruolo Admin solo a chi deve gestire menu e inventario',
      ],
    },
  ];

  // ============================================
  // FAQ PER STAFF
  // ============================================
  const staffFAQs: FAQItem[] = [
    // === ORDINI ===
    {
      category: 'Ordini',
      question: 'Come annullo un prodotto già ordinato?',
      answer: 'Vai su "Ordini", trova l\'ordine, clicca per aprire i dettagli. Da lì puoi modificare lo stato del singolo prodotto o dell\'intero ordine.',
    },
    {
      category: 'Ordini',
      question: 'Il cliente vuole modificare un ordine già inviato',
      answer: 'Se l\'ordine non è ancora in preparazione, puoi annullarlo e crearne uno nuovo. Se è già in cucina, comunica direttamente con il personale di cucina.',
    },
    {
      category: 'Ordini',
      question: 'Come rimuovo velocemente un prodotto dalla card?',
      answer: 'Quando un prodotto è nel carrello, appare un pulsante "-" sulla card. Cliccalo per rimuovere una unità. Puoi anche usare i pulsanti +/- nel carrello laterale.',
    },
    {
      category: 'Ordini',
      question: 'Cosa indica il numero arancione sulla card?',
      answer: 'Il badge arancione in alto a destra della card indica quante unità di quel prodotto hai nel carrello. Appare solo se il prodotto è stato aggiunto.',
    },
    {
      category: 'Ordini',
      question: 'Il cliente ordina, poi aggiunge altri prodotti dopo',
      answer: 'Nessun problema! Clicca sul tavolo rosso → "Aggiungi Comanda". La nuova comanda si aggiunge allo stesso conto. Alla fine paga tutto insieme o divide.',
    },
    {
      category: 'Ordini',
      question: 'Cliente ordina da asporto ma poi decide di sedersi',
      answer: 'Purtroppo l\'ordine già inviato come asporto non può essere convertito a tavolo. Completa l\'ordine asporto normalmente, oppure annullalo e rifallo come ordine a tavolo.',
    },
    // === TAVOLI ===
    {
      category: 'Tavoli',
      question: 'Ho sbagliato tavolo, come faccio?',
      answer: 'Clicca sul tavolo rosso (occupato), poi su "Trasferisci". Seleziona il tavolo corretto (deve essere verde/disponibile) per spostare il conto.',
    },
    {
      category: 'Tavoli',
      question: 'Il cliente dice che il totale è sbagliato',
      answer: 'Controlla il riepilogo del conto cliccando sul tavolo. Verifica che non ci siano ordini annullati non marcati. Il totale si aggiorna automaticamente.',
    },
    {
      category: 'Tavoli',
      question: 'Due tavoli vogliono unirsi a metà cena',
      answer: 'Trasferisci il conto di un tavolo su un altro più grande (che deve essere libero), oppure gestisci i due tavoli separati ma con attenzione ai pagamenti.',
    },
    {
      category: 'Tavoli',
      question: 'Un cliente del gruppo se ne va prima degli altri',
      answer: 'Usa "Dividi Conto" → "Per Consumazione" per far pagare solo quello che ha mangiato lui. Gli altri pagheranno dopo.',
    },
    {
      category: 'Tavoli',
      question: 'La prenotazione non si è presentata',
      answer: 'Dopo 15-20 minuti, clicca sul tavolo arancione (prenotato) e cancella o elimina la prenotazione. Il tavolo tornerà verde.',
    },
    {
      category: 'Tavoli',
      question: 'Cliente prenota per 4 ma arrivano in 6',
      answer: 'Se il tavolo basta, modifica i coperti quando apri il conto. Altrimenti aggiungi un altro tavolo alla prenotazione o trova un tavolo più grande.',
    },
    // === PAGAMENTI BASE ===
    {
      category: 'Pagamenti',
      question: 'Come gestisco un pagamento misto (parte contanti, parte carta)?',
      answer: 'Usa la funzione "Dividi Conto" con la modalità manuale. Aggiungi prima il pagamento in contanti (es. €30), poi quello con carta per il resto.',
    },
    {
      category: 'Pagamenti',
      question: 'Come registro la SMAC quando divido il conto?',
      answer: 'Ogni pagamento ha la sua checkbox "SMAC passato". Spuntala per chi passa la tessera, lasciala vuota per chi non ce l\'ha.',
    },
    {
      category: 'Pagamenti',
      question: 'Il POS non funziona, come registro il pagamento?',
      answer: 'Puoi registrare il pagamento come "Contanti" temporaneamente. Avvisa un admin per la correzione successiva.',
    },
    {
      category: 'Pagamenti',
      question: 'Cliente paga con buono pasto/voucher',
      answer: 'Registra come pagamento "Carta". Se è un pagamento parziale (buono €8 su conto €15), usa Dividi Conto: prima €8 carta, poi €7 contanti/carta.',
    },
    // === SPLIT BILL AVANZATO ===
    {
      category: 'Pagamenti',
      question: 'Come pago solo alcuni pezzi di un prodotto?',
      answer: 'In "Dividi Conto", scegli "Per Consumazione". Usa i pulsanti +/- per scegliere quanti pezzi pagare. Es: 4 kebab, pagane solo 2.',
    },
    {
      category: 'Pagamenti',
      question: 'Dove sono finiti i prodotti già pagati nel dividi conto?',
      answer: 'I prodotti già pagati vengono automaticamente "scalati". Se qualcuno ha pagato 1 kebab su 2, nel prossimo split vedrai solo 1 kebab disponibile.',
    },
    {
      category: 'Pagamenti',
      question: 'Come vedo chi ha già pagato e cosa?',
      answer: 'Clicca "Stato Conto" sul tavolo (o dall\'ordine nella Lista Ordini). Vedrai ogni pagamento con importo, metodo, SMAC e i prodotti pagati.',
    },
    {
      category: 'Pagamenti',
      question: 'Il cliente vuole uno scontrino separato per il suo pagamento',
      answer: 'Vai su "Stato Conto", trova il pagamento del cliente e clicca "Stampa Scontrino". Ogni pagamento può avere il suo scontrino.',
    },
    {
      category: 'Pagamenti',
      question: 'Posso dividere un conto dalla Lista Ordini?',
      answer: 'Sì! Vai su Ordini, trova l\'ordine con "Conto Aperto", cliccalo e usa "Dividi Conto" o "Stato Conto". Utile se non ricordi il tavolo.',
    },
    // === CASISTICHE COMPLESSE ===
    {
      category: 'Situazioni Complesse',
      question: '4 amici dividono tutto alla romana, ma uno ha ordinato solo una birra',
      answer: 'Usa "Per Consumazione": prima fai pagare chi ha la birra solo la sua birra, poi dividi il resto "Alla Romana" tra gli altri 3.',
    },
    {
      category: 'Situazioni Complesse',
      question: 'Coppia: lui paga il suo, lei paga il suo, ma hanno condiviso le patatine',
      answer: 'Usa "Per Consumazione": lui seleziona i suoi piatti + metà patatine, lei i suoi + l\'altra metà. Il sistema traccia le quantità frazionarie.',
    },
    {
      category: 'Situazioni Complesse',
      question: 'Cliente dice "pago io per tutti" ma poi cambia idea',
      answer: 'Non c\'è problema finché non hai chiuso il conto. Se stavi per chiudere tutto, annulla e usa invece "Dividi Conto".',
    },
    {
      category: 'Situazioni Complesse',
      question: 'Cena aziendale: metà pagano con carta aziendale, metà personale',
      answer: 'Dividi in due gruppi: prima i paganti con carta aziendale (uno alla volta o somma totale), poi gli altri.',
    },
    {
      category: 'Situazioni Complesse',
      question: 'Il conto è €99.50 diviso in 3: come gestisco i centesimi?',
      answer: 'Fai €33.17 + €33.17 + €33.16 oppure arrotonda: €33.20 + €33.20 + €33.10. Il sistema accetta qualsiasi combinazione che arrivi al totale.',
    },
    {
      category: 'Situazioni Complesse',
      question: 'Gruppo di 8 persone, ognuno vuole pagare il suo',
      answer: 'Usa "Per Consumazione" 8 volte di seguito. Ogni persona seleziona cosa ha mangiato e paga. Il sistema scala automaticamente i prodotti pagati.',
    },
    {
      category: 'Situazioni Complesse',
      question: 'Cliente paga in anticipo e se ne va, il resto del tavolo continua a ordinare',
      answer: 'Usa "Dividi Conto" → "Per Consumazione" per far pagare chi se ne va. Poi aggiungi nuove comande normalmente. Gli altri pagheranno alla fine.',
    },
    {
      category: 'Situazioni Complesse',
      question: 'Errore: ho chiuso il conto ma il cliente non ha ancora pagato!',
      answer: 'Contatta un admin. Il conto chiuso non può essere riaperto dall\'app, ma l\'admin può verificare la situazione nei report.',
    },
    {
      category: 'Situazioni Complesse',
      question: 'Due clienti vogliono pagare lo stesso prodotto',
      answer: 'Impossibile: ogni prodotto può essere pagato una sola volta. Decidano tra loro chi paga cosa, oppure dividano alla romana.',
    },
    {
      category: 'Situazioni Complesse',
      question: 'Il cliente vuole lasciare una mancia',
      answer: 'Aggiungi l\'importo della mancia al totale prima di registrare il pagamento, oppure registrala come pagamento separato con nota "mancia".',
    },
    // === SCONTI ===
    {
      category: 'Sconti',
      question: 'Come applico uno sconto a un ordine?',
      answer: 'Vai su Ordini → Lista Ordini, clicca l\'icona matita (Modifica) sull\'ordine. Nella sezione "Totale Ordine" puoi modificare l\'importo. Il sistema mostra lo sconto applicato.',
    },
    {
      category: 'Sconti',
      question: 'Il conto è €30.30, voglio arrotondare a €30',
      answer: 'Dallo storico ordini, clicca Modifica sull\'ordine, cambia il totale da €30.30 a €30.00 e salva. Lo sconto di -€0.30 viene mostrato automaticamente.',
    },
    {
      category: 'Sconti',
      question: 'Posso aumentare il totale di un ordine?',
      answer: 'Sì, dalla modifica ordine puoi aumentare il totale (ad esempio per aggiungere una mancia o un extra). Il sistema mostra la differenza come aggiunta.',
    },
    // === TECNICO ===
    {
      category: 'Tecnico',
      question: 'L\'app non risponde o è lenta',
      answer: 'Prova a ricaricare la pagina (F5 o tasto ricarica). Se il problema persiste, controlla la connessione internet.',
    },
    {
      category: 'Tecnico',
      question: 'Gli ordini non si aggiornano automaticamente',
      answer: 'Controlla l\'icona accanto a "Ordini" nella sidebar. Verde = connesso. Se è arancione/gialla, la connessione in tempo reale è interrotta. Ricarica la pagina.',
    },
    {
      category: 'Tecnico',
      question: 'Ho cliccato un bottone ma non succede niente',
      answer: 'Aspetta qualche secondo: potrebbe star caricando. Se nulla dopo 5 secondi, ricarica la pagina e riprova.',
    },
    // === INTERFACCIA ===
    {
      category: 'Interfaccia',
      question: 'Come cambio il tema chiaro/scuro?',
      answer: 'Clicca sul pulsante sole/luna in fondo alla sidebar. La preferenza viene salvata e mantenuta anche dopo il logout.',
    },
    {
      category: 'Interfaccia',
      question: 'Come riduco la sidebar per avere più spazio?',
      answer: 'Su desktop, clicca "Riduci Menu" in fondo alla sidebar. La sidebar mostrerà solo le icone. Clicca di nuovo per espanderla.',
    },
    {
      category: 'Interfaccia',
      question: 'Su telefono non vedo bene i bottoni',
      answer: 'Prova a ruotare il telefono in orizzontale per avere più spazio. Le schermate principali sono ottimizzate per mobile.',
    },
  ];

  // ============================================
  // FAQ AGGIUNTIVE PER ADMIN
  // ============================================
  const adminFAQs: FAQItem[] = [
    {
      category: 'Menu',
      question: 'Come nascondo un prodotto temporaneamente esaurito?',
      answer: 'Vai su "Menu", trova il prodotto e usa il toggle "Disponibile" per disattivarlo. Il prodotto non apparirà più nel Nuovo Ordine ma rimarrà nel sistema.',
    },
    {
      category: 'Menu',
      question: 'Posso duplicare un prodotto esistente?',
      answer: 'Al momento non c\'è una funzione duplica. Crea un nuovo prodotto e copia manualmente i dati. Suggerimento: apri il prodotto esistente in un\'altra tab per riferimento.',
    },
    {
      category: 'Inventario',
      question: 'Come registro un carico di merce?',
      answer: 'Vai su "Inventario", trova l\'ingrediente, clicca su "Carico". Inserisci la quantità ricevuta e il sistema aggiornerà automaticamente la giacenza.',
    },
    {
      category: 'Inventario',
      question: 'L\'inventario non corrisponde alla realtà',
      answer: 'Puoi fare uno "Scarico" manuale per allineare i dati. Registra la differenza come "Scarico inventario" con una nota esplicativa.',
    },
    {
      category: 'Inventario',
      question: 'Cosa significa la modalità soglia "Manuale" vs "EOQ"?',
      answer: 'Con la modalità Manuale imposti tu la soglia di scorta. Con la modalità EOQ il sistema calcola automaticamente il punto di riordino ottimale basandosi sui consumi storici. Clicca la campanella su un ingrediente per scegliere.',
    },
    {
      category: 'Inventario',
      question: 'Come cambio il metodo di calcolo del costo ingredienti?',
      answer: 'Vai su Inventario → tab "EOQ & Riordini" → clicca su "Calcolo Costo Unitario Ingredienti". Puoi scegliere: Costo Fisso (manuale), Ultimo Acquisto, Media Ponderata o Media Mobile.',
    },
    {
      category: 'Inventario',
      question: 'L\'EOQ dice "dati insufficienti", cosa significa?',
      answer: 'Il sistema EOQ ha bisogno di storico di consumi per calcolare le soglie. Quando avrai più ordini e forniture registrate, i calcoli EOQ diventeranno disponibili automaticamente.',
    },
    {
      category: 'Inventario',
      question: 'Come creo automaticamente una fattura quando registro una fornitura?',
      answer: 'Quando fai un carico, attiva il toggle "Crea fattura automaticamente". Inserisci fornitore e numero fattura: il sistema creerà la fattura con l\'importo basato sul costo dell\'ingrediente.',
    },
    {
      category: 'Inventario',
      question: 'Il toggle fattura automatica non compare',
      answer: 'Il toggle appare solo quando registri un carico (supply_in). Per gli scarichi manuali non è disponibile perché non sono forniture acquistate.',
    },
    {
      category: 'Personale',
      question: 'Un dipendente ha dimenticato di timbrare l\'uscita',
      answer: 'Vai su "Personale", trova il turno del dipendente e modifica manualmente l\'orario di uscita.',
    },
    {
      category: 'Costo Piatti',
      question: 'Perché alcuni piatti mostrano "Nessuna ricetta"?',
      answer: 'Devi collegare il piatto agli ingredienti nella sezione "Ricette". Solo così il sistema può calcolare il costo degli ingredienti e il margine.',
    },
    {
      category: 'Costo Piatti',
      question: 'Come miglioro il margine di un piatto?',
      answer: 'Puoi: aumentare il prezzo di vendita, ridurre le porzioni di ingredienti costosi, sostituire ingredienti con alternative più economiche, o negoziare prezzi migliori con i fornitori.',
    },
    {
      category: 'Costo Piatti',
      question: 'I colori del margine cosa significano?',
      answer: 'Verde = margine alto (oltre 60%), ottimo profitto. Giallo = margine medio (30-60%), accettabile. Rosso = margine basso (sotto 30%), richiede attenzione.',
    },
    {
      category: 'Stampa Automatica',
      question: 'Come attivo la stampa automatica delle comande?',
      answer: 'Vai su Impostazioni → Sezione "Impostazioni Finanziarie" → Attiva il toggle "Stampa Automatica Comande". Poi configura il tipo di stampante, modello e metodo di connessione (Print Agent, browser o IP diretto).',
    },
    {
      category: 'Stampa Automatica',
      question: 'Cos\'è il Print Agent e perché dovrei usarlo?',
      answer: 'Il Print Agent è un server locale (Raspberry Pi o PC) che trova automaticamente le stampanti nella tua rete. Vantaggi: non devi configurare ogni tablet/smartphone, scoperta automatica delle stampanti, supporto ESC/POS per stampanti termiche, stampa più affidabile. Senza Print Agent devi configurare la stampante manualmente su ogni dispositivo.',
    },
    {
      category: 'Stampa Automatica',
      question: 'Come installo il Print Agent?',
      answer: 'Il Print Agent si trova nella cartella "print-agent/" del progetto. Installa Node.js sul dispositivo (Raspberry Pi/PC), esegui "npm install" e poi "npm start". Il server parte sulla porta 3000. Consulta il README.md nella cartella print-agent per istruzioni dettagliate, inclusa configurazione systemd per avvio automatico.',
    },
    {
      category: 'Stampa Automatica',
      question: 'Qual è la differenza tra stampante termica e tradizionale?',
      answer: 'Termica: stampante per scontrini (Epson TM-T20, Star TSP143), stampa veloce su rotoli termici, ideale per comande in cucina. Tradizionale: stampante normale (inkjet/laser), stampa su fogli A4, più lenta ma supporta documenti complessi. Per le comande, la termica è molto più veloce ed efficiente.',
    },
    {
      category: 'Stampa Automatica',
      question: 'Posso stampare senza configurare la stampante su ogni tablet?',
      answer: 'Sì, con il Print Agent. Installa il Print Agent su un dispositivo fisso (Raspberry Pi/PC) collegato alla rete. Il Print Agent trova automaticamente le stampanti. Poi su ogni tablet/smartphone basta inserire l\'URL del Print Agent nelle Impostazioni (es. http://192.168.1.100:3000). Nessuna configurazione stampante necessaria sui dispositivi mobili.',
    },
    {
      category: 'Stampa Automatica',
      question: 'La stampa automatica non funziona, cosa controllo?',
      answer: 'Verifica: 1) Toggle "Stampa Automatica" è attivo nelle Impostazioni, 2) Se usi Print Agent: l\'URL è corretto e il server è acceso (prova http://IP:3000/ping nel browser), 3) La stampante è accesa e in rete, 4) L\'IP stampante è corretto (se usi IP diretto), 5) Controlla la console browser (F12) per eventuali errori. Se fallisce, l\'app prova comunque a usare window.print() come fallback.',
    },
    {
      category: 'Stampa Automatica',
      question: 'Il Print Agent non trova la mia stampante',
      answer: 'Verifica: 1) La stampante supporta protocollo IPP o ha porta di rete 9100, 2) Stampante e Print Agent sono sulla stessa rete locale, 3) Il firewall del dispositivo non blocca le porte 631 (IPP) o 9100, 4) Prova a pingare l\'IP della stampante, 5) Per stampanti USB, potrebbero non essere rilevate automaticamente: usa l\'IP se disponibile o configura manualmente.',
    },
    {
      category: 'Stampa Automatica',
      question: 'Posso stampare direttamente via IP senza Print Agent?',
      answer: 'No, la stampa diretta via IP (porta 9100) richiede il Print Agent perché i browser web non permettono connessioni TCP dirette per sicurezza. Il Print Agent fa da ponte: riceve la richiesta HTTP dall\'app e la inoltra alla stampante via TCP porta 9100.',
    },
    {
      category: 'Stampa Automatica',
      question: 'La stampa via browser funziona ma è scomoda',
      answer: 'Esatto, window.print() del browser richiede configurazione manuale su ogni dispositivo e mostra sempre la finestra di dialogo stampa. Il Print Agent risolve questi problemi: stampa automatica silenziosa, nessuna configurazione per dispositivo, scoperta automatica stampanti. Investi tempo nell\'installare il Print Agent per risparmiarne molto dopo.',
    },
  ];

  // ============================================
  // FAQ AGGIUNTIVE PER SUPERADMIN
  // ============================================
  const superadminFAQs: FAQItem[] = [
    {
      category: 'Utenti',
      question: 'Come creo un nuovo account per un dipendente?',
      answer: 'Vai su "Utenti", clicca "Aggiungi Utente". Inserisci username, password temporanea, nome completo e seleziona il ruolo appropriato (solitamente "Staff").',
    },
    {
      category: 'Utenti',
      question: 'Un dipendente ha lasciato, cosa faccio col suo account?',
      answer: 'Non eliminare l\'account per mantenere lo storico. Vai su "Utenti" e disattiva l\'account. L\'utente non potrà più accedere ma i suoi dati storici restano.',
    },
    {
      category: 'Utenti',
      question: 'Quali sono le differenze tra i ruoli?',
      answer: 'Staff: ordini e tavoli. Admin: tutto tranne report avanzati, SMAC e utenti. Superadmin: accesso completo a tutte le funzioni.',
    },
    {
      category: 'Sistema',
      question: 'Come faccio il backup dei dati?',
      answer: 'I dati sono salvati su Supabase (cloud). Per backup locale, usa la funzione "Esporta" nei Report. Per backup completo del database, accedi a Supabase.',
    },
    {
      category: 'Sistema',
      question: 'Posso usare l\'app su più dispositivi?',
      answer: 'Sì, l\'app funziona su qualsiasi dispositivo con browser. Ogni operatore deve avere il proprio account. Le modifiche si sincronizzano in tempo reale.',
    },
    {
      category: 'Report',
      question: 'Come genero un report fiscale?',
      answer: 'Vai su "Report & Admin", seleziona il periodo, scegli il tipo di report. Puoi filtrare per metodo di pagamento e esportare in PDF per il commercialista.',
    },
  ];

  // Componi le sezioni e FAQ in base al ruolo
  let guideSections: GuideSection[] = [...staffGuideSections];
  let faqs: FAQItem[] = [...staffFAQs];

  if (isAdmin()) {
    guideSections = [...staffGuideSections, ...adminGuideSections];
    faqs = [...staffFAQs, ...adminFAQs];
  }

  if (isSuperAdmin()) {
    guideSections = [...staffGuideSections, ...adminGuideSections, ...superadminGuideSections];
    faqs = [...staffFAQs, ...adminFAQs, ...superadminFAQs];
  }

  // Filtra sezioni SMAC se disabilitato
  if (!smacEnabled) {
    guideSections = guideSections.filter(section => !section.title.toLowerCase().includes('smac'));
    faqs = faqs.filter(faq =>
      !faq.question.toLowerCase().includes('smac') &&
      !faq.answer.toLowerCase().includes('smac')
    );
  }

  // Filtra FAQ per ricerca
  const filteredFAQs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Raggruppa FAQ per categoria
  const faqsByCategory = filteredFAQs.reduce((acc, faq) => {
    if (!acc[faq.category]) {
      acc[faq.category] = [];
    }
    acc[faq.category].push(faq);
    return acc;
  }, {} as Record<string, FAQItem[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <HelpCircle className="w-7 h-7 text-primary-400" />
            Guida e FAQ
          </h1>
          <p className="text-dark-400 mt-1">
            {isSuperAdmin()
              ? 'Guida completa per Superadmin - Tutte le funzionalità'
              : isAdmin()
              ? 'Guida per Admin - Gestione ristorante'
              : 'Guida per Staff - Operazioni base'}
          </p>
        </div>
      </div>

      {/* Tab Selector */}
      <div className="flex gap-2 border-b border-dark-700 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('welcome')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'welcome'
              ? 'bg-primary-500 text-dark-900'
              : 'text-dark-400 hover:text-white hover:bg-dark-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Guida Descrittiva
        </button>
        <button
          onClick={() => setActiveTab('guide')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'guide'
              ? 'bg-primary-500 text-dark-900'
              : 'text-dark-400 hover:text-white hover:bg-dark-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Guida Operativa
        </button>
        <button
          onClick={() => setActiveTab('faq')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'faq'
              ? 'bg-primary-500 text-dark-900'
              : 'text-dark-400 hover:text-white hover:bg-dark-800'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          FAQ
        </button>
      </div>

      {/* GUIDA DESCRITTIVA - Benvenuto */}
      {activeTab === 'welcome' && (
        <div className="space-y-8">
          {/* Hero Section */}
          <div className="card bg-gradient-to-br from-primary-500 to-primary-600 border-primary-500/30">
            <div className="p-6 sm:p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
                <ChefHat className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                Benvenuto in Restaurant Manager
              </h2>
              <p className="text-white/80 max-w-2xl mx-auto">
                Un sistema completo per la gestione del tuo ristorante. Ordini, tavoli, inventario,
                personale e report: tutto in un'unica app moderna e intuitiva.
              </p>
            </div>
          </div>

          {/* Panoramica Moduli */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 text-primary-400" />
              I Moduli del Sistema
            </h3>

            {/* Dashboard - Solo per Admin/Superadmin */}
            {(isAdmin() || isSuperAdmin()) && (
              <div className="card">
                <div className="card-header flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/20">
                    <LayoutDashboard className="w-5 h-5 text-blue-400" />
                  </div>
                  <h4 className="font-semibold text-white">Dashboard</h4>
                </div>
                <div className="card-body">
                  <p className="text-dark-300 mb-3">
                    La Dashboard è la tua pagina principale. Appena accedi, trovi una panoramica completa
                    di cosa sta succedendo nel ristorante: quanti ordini hai fatto oggi, l'incasso totale,
                    gli ordini in attesa e quelli in preparazione.
                  </p>
                  <p className="text-dark-300">
                    Se qualche ingrediente sta finendo, lo vedi subito nella sezione "Scorte Basse".
                    I pulsanti rapidi in basso ti permettono di accedere velocemente alle sezioni più usate.
                  </p>
                </div>
              </div>
            )}

            {/* Nuovo Ordine */}
            <div className="card">
              <div className="card-header flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary-500/20">
                  <ShoppingCart className="w-5 h-5 text-primary-400" />
                </div>
                <h4 className="font-semibold text-white">Nuovo Ordine</h4>
              </div>
              <div className="card-body">
                <p className="text-dark-300 mb-3">
                  Qui crei gli ordini per asporto, domicilio o tavolo. L'interfaccia è pensata per essere
                  veloce: tocchi un prodotto e si aggiunge al carrello, vedi subito il totale aggiornato.
                </p>
                <p className="text-dark-300 mb-3">
                  Puoi cercare i prodotti per nome, filtrarli per categoria, e aggiungere note speciali
                  (come "senza cipolla" o "extra piccante"). Per gli ordini a tavolo, il sistema ti chiede
                  automaticamente di inserire i coperti e il nome del cliente.
                </p>
                <p className="text-dark-300">
                  Alla fine scegli come paga il cliente (contanti, carta o online) e se ha la tessera SMAC
                  per la tracciabilità fiscale.
                </p>
              </div>
            </div>

            {/* Ordini / Cucina */}
            <div className="card">
              <div className="card-header flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20">
                  <ClipboardList className="w-5 h-5 text-amber-400" />
                </div>
                <h4 className="font-semibold text-white">Ordini (Vista Cucina)</h4>
              </div>
              <div className="card-body">
                <p className="text-dark-300 mb-3">
                  La sezione Ordini è progettata per la cucina. Mostra tutti gli ordini del giorno in
                  formato Kanban: quattro colonne per "In Attesa", "In Preparazione", "Pronto" e "Consegnato".
                </p>
                <p className="text-dark-300 mb-3">
                  Il cuoco vede subito cosa deve preparare, può espandere ogni ordine per vedere i singoli
                  prodotti, e cambia lo stato con un click. L'icona verde in alto indica che la connessione
                  è attiva e gli ordini si aggiornano in tempo reale.
                </p>
                <p className="text-dark-300">
                  Nella tab "Lista Ordini" trovi tutti gli ordini con filtri per data. Usa il pulsante
                  "Oggi" per filtrare velocemente gli ordini del giorno corrente. Puoi modificarli,
                  applicare sconti o gestire i conti ancora aperti.
                </p>
              </div>
            </div>

            {/* Tavoli */}
            <div className="card">
              <div className="card-header flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/20">
                  <Users className="w-5 h-5 text-emerald-400" />
                </div>
                <h4 className="font-semibold text-white">Tavoli e Prenotazioni</h4>
              </div>
              <div className="card-body">
                <p className="text-dark-300 mb-3">
                  La mappa dei tavoli ti mostra a colpo d'occhio la situazione della sala. I colori parlano
                  chiaro: verde per i tavoli liberi, rosso per quelli occupati, arancione per le prenotazioni.
                </p>
                <p className="text-dark-300 mb-3">
                  Quando un cliente si siede, apri un "conto" sul tavolo. Durante la cena puoi aggiungere
                  più comande (antipasti, primi, secondi...) che si sommano tutte allo stesso conto.
                </p>
                <p className="text-dark-300 mb-3">
                  Al momento di pagare hai tre opzioni: pagamento completo, divisione "alla romana"
                  (ognuno paga la sua quota), o divisione "per consumazione" (ognuno paga esattamente
                  quello che ha mangiato). Il sistema tiene traccia di chi ha già pagato cosa.
                </p>
                <p className="text-dark-300">
                  Puoi anche trasferire un conto su un altro tavolo se i clienti vogliono spostarsi,
                  senza perdere nessun dato.
                </p>
              </div>
            </div>

            {/* Menu - Solo per Admin/Superadmin */}
            {(isAdmin() || isSuperAdmin()) && (
              <div className="card">
                <div className="card-header flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/20">
                    <UtensilsCrossed className="w-5 h-5 text-purple-400" />
                  </div>
                  <h4 className="font-semibold text-white">Menu</h4>
                </div>
                <div className="card-body">
                  <p className="text-dark-300 mb-3">
                    Gestisci tutti i tuoi prodotti: nome, descrizione, prezzo, categoria e immagine.
                    Puoi creare nuove categorie, riordinare i prodotti e segnare quali sono disponibili
                    o temporaneamente esauriti.
                  </p>
                  <p className="text-dark-300">
                    C'è anche la funzione per esportare il menu in PDF, utile per stamparlo o condividerlo
                    online.
                  </p>
                </div>
              </div>
            )}

            {/* Inventario */}
            {(isAdmin() || isSuperAdmin()) && (
              <div className="card">
                <div className="card-header flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/20">
                    <Package className="w-5 h-5 text-orange-400" />
                  </div>
                  <h4 className="font-semibold text-white">Inventario</h4>
                </div>
                <div className="card-body">
                  <p className="text-dark-300 mb-3">
                    Tieni sotto controllo le scorte di tutti gli ingredienti. Il sistema ti avvisa
                    automaticamente quando qualcosa scende sotto la soglia minima.
                  </p>
                  <p className="text-dark-300 mb-3">
                    Per ogni ingrediente puoi scegliere tra <strong>soglia manuale</strong> (la imposti tu)
                    o <strong>soglia EOQ</strong> (calcolata automaticamente in base ai consumi). Clicca
                    la campanella accanto all'ingrediente per cambiare modalità.
                  </p>
                  <p className="text-dark-300 mb-3">
                    Quando ricevi una fornitura, la registri qui: inserisci quantità e costo, e
                    l'inventario si aggiorna automaticamente. Puoi anche far creare automaticamente
                    la fattura corrispondente.
                  </p>
                  <p className="text-dark-300 mb-3">
                    Nella sezione <strong>EOQ & Riordini</strong> trovi il calcolo automatico della quantità
                    ottimale da ordinare, il punto di riordino e la scorta di sicurezza per ogni ingrediente.
                  </p>
                  <p className="text-dark-300">
                    Puoi anche configurare il <strong>metodo di calcolo costo</strong> degli ingredienti:
                    costo fisso (manuale), ultimo acquisto, media ponderata o media mobile su N mesi.
                  </p>
                </div>
              </div>
            )}

            {/* Ricette e Costo Piatti */}
            {(isAdmin() || isSuperAdmin()) && (
              <div className="card">
                <div className="card-header flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-pink-500/20">
                    <Calculator className="w-5 h-5 text-pink-400" />
                  </div>
                  <h4 className="font-semibold text-white">Ricette e Costo Piatti</h4>
                </div>
                <div className="card-body">
                  <p className="text-dark-300 mb-3">
                    Collega ogni piatto del menu agli ingredienti che lo compongono. Per ogni ingrediente
                    specifichi la quantità usata nella ricetta.
                  </p>
                  <p className="text-dark-300 mb-3">
                    Nella sezione "Costo Piatti" vedi automaticamente: il costo degli ingredienti,
                    il prezzo di vendita, e il margine di profitto. I colori ti indicano subito quali
                    piatti sono redditizi (verde), accettabili (giallo) o da rivedere (rosso).
                  </p>
                  <p className="text-dark-300">
                    Quando il costo di un ingrediente cambia, il sistema ricalcola automaticamente
                    tutti i margini dei piatti che lo usano.
                  </p>
                </div>
              </div>
            )}

            {/* Personale */}
            <div className="card">
              <div className="card-header flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/20">
                  <UserCog className="w-5 h-5 text-cyan-400" />
                </div>
                <h4 className="font-semibold text-white">Personale</h4>
              </div>
              <div className="card-body">
                {(isAdmin() || isSuperAdmin()) ? (
                  <>
                    <p className="text-dark-300 mb-3">
                      Gestisci i turni di lavoro del tuo staff. Ogni dipendente può timbrare l'entrata
                      e l'uscita, e il sistema calcola automaticamente le ore lavorate.
                    </p>
                    <p className="text-dark-300">
                      Puoi vedere il riepilogo settimanale, modificare orari dimenticati e tenere traccia
                      delle presenze per ogni membro del team.
                    </p>
                  </>
                ) : (
                  <p className="text-dark-300">
                    Registra la tua presenza giornaliera. Timbra l'entrata quando inizi il turno
                    e l'uscita quando finisci. Puoi vedere il riepilogo delle tue ore lavorate.
                  </p>
                )}
              </div>
            </div>

            {/* Chiusura Cassa */}
            {(isAdmin() || isSuperAdmin()) && (
              <div className="card">
                <div className="card-header flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/20">
                    <Wallet className="w-5 h-5 text-green-400" />
                  </div>
                  <h4 className="font-semibold text-white">Chiusura Cassa</h4>
                </div>
                <div className="card-body">
                  <p className="text-dark-300 mb-3">
                    A fine giornata, fai la riconciliazione della cassa. Il sistema ti mostra quanto
                    dovresti avere in base agli ordini registrati, diviso tra contanti e carte.
                  </p>
                  <p className="text-dark-300">
                    Tu inserisci quanto c'è effettivamente in cassa, e il sistema calcola eventuali
                    differenze. Puoi aggiungere note per spiegare discrepanze (mance, errori, ecc.).
                  </p>
                </div>
              </div>
            )}

            {/* SMAC */}
            {smacEnabled && isSuperAdmin() && (
              <div className="card">
                <div className="card-header flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/20">
                    <CreditCard className="w-5 h-5 text-indigo-400" />
                  </div>
                  <h4 className="font-semibold text-white">SMAC (Tessera Fedeltà)</h4>
                </div>
                <div className="card-body">
                  <p className="text-dark-300 mb-3">
                    Traccia tutti gli ordini effettuati con tessera SMAC per la dichiarazione fiscale.
                    Puoi vedere i totali giornalieri, settimanali e mensili.
                  </p>
                  <p className="text-dark-300">
                    Quando dividi un conto, ogni pagamento può avere la sua SMAC: così sai esattamente
                    chi l'ha passata e chi no.
                  </p>
                </div>
              </div>
            )}

            {/* Report */}
            {(isAdmin() || isSuperAdmin()) && (
              <div className="card">
                <div className="card-header flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-violet-500/20">
                    <BarChart3 className="w-5 h-5 text-violet-400" />
                  </div>
                  <h4 className="font-semibold text-white">Report e Amministrazione</h4>
                </div>
                <div className="card-body">
                  <p className="text-dark-300 mb-3">
                    La sezione Report ti dà una visione completa del business. Analizza vendite per periodo,
                    confronta incassi, identifica i prodotti più venduti e i giorni più redditizi.
                  </p>
                  <p className="text-dark-300 mb-3">
                    Qui gestisci anche le fatture dei fornitori: registri le spese, tieni traccia dei
                    pagamenti e vedi il bilancio tra entrate e uscite.
                  </p>
                  <p className="text-dark-300">
                    Puoi esportare tutti i dati in formato PDF o CSV per il commercialista.
                  </p>
                </div>
              </div>
            )}

            {/* Utenti */}
            {isSuperAdmin() && (
              <div className="card">
                <div className="card-header flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-500/20">
                    <Shield className="w-5 h-5 text-red-400" />
                  </div>
                  <h4 className="font-semibold text-white">Gestione Utenti</h4>
                </div>
                <div className="card-body">
                  <p className="text-dark-300 mb-3">
                    Crea e gestisci gli account per il tuo staff. Ogni persona deve avere il proprio
                    account con username e password personali.
                  </p>
                  <p className="text-dark-300 mb-3">
                    Ci sono tre livelli di accesso: <strong>Staff</strong> per chi lavora in sala (ordini e tavoli),
                    <strong> Admin</strong> per i responsabili (tutto tranne report avanzati e utenti),
                    <strong> Superadmin</strong> per il proprietario (accesso completo).
                  </p>
                  <p className="text-dark-300">
                    Quando un dipendente se ne va, disattiva il suo account invece di eliminarlo:
                    così mantieni tutto lo storico.
                  </p>
                </div>
              </div>
            )}

            {/* Impostazioni - Solo per Admin/Superadmin */}
            {(isAdmin() || isSuperAdmin()) && (
              <div className="card">
                <div className="card-header flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gray-500/20">
                    <Settings className="w-5 h-5 text-gray-400" />
                  </div>
                  <h4 className="font-semibold text-white">Impostazioni</h4>
                </div>
                <div className="card-body">
                  <p className="text-dark-300 mb-3">
                    Personalizza l'app per le tue esigenze. Puoi cambiare la lingua (italiano o inglese),
                    scegliere il tema chiaro o scuro, configurare i dati del negozio, le soglie di inventario,
                    l'aliquota IVA e altri parametri finanziari.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Caratteristiche Tecniche */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-primary-400" />
              Caratteristiche del Sistema
            </h3>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="card p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Wifi className="w-5 h-5 text-emerald-400" />
                  <span className="font-medium text-white">Tempo Reale</span>
                </div>
                <p className="text-sm text-dark-400">
                  Gli ordini si aggiornano istantaneamente su tutti i dispositivi.
                  Niente refresh manuali.
                </p>
              </div>

              <div className="card p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Monitor className="w-5 h-5 text-blue-400" />
                  <span className="font-medium text-white">Multi-dispositivo</span>
                </div>
                <p className="text-sm text-dark-400">
                  Funziona su PC, tablet e smartphone. Ogni postazione può avere
                  la sua vista ottimizzata.
                </p>
              </div>

              <div className="card p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Database className="w-5 h-5 text-purple-400" />
                  <span className="font-medium text-white">Cloud + Locale</span>
                </div>
                <p className="text-sm text-dark-400">
                  I dati sono salvati sul cloud, ma l'app funziona anche
                  offline grazie al salvataggio locale.
                </p>
              </div>

              <div className="card p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Languages className="w-5 h-5 text-amber-400" />
                  <span className="font-medium text-white">Multilingua</span>
                </div>
                <p className="text-sm text-dark-400">
                  Disponibile in italiano e inglese. Gli amministratori possono
                  cambiare la lingua dalle Impostazioni.
                </p>
              </div>

              <div className="card p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Moon className="w-5 h-5 text-indigo-400" />
                  <span className="font-medium text-white">Tema Scuro/Chiaro</span>
                </div>
                <p className="text-sm text-dark-400">
                  Scegli il tema che preferisci. Il tema scuro è perfetto
                  per ambienti con poca luce.
                </p>
              </div>

              <div className="card p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Shield className="w-5 h-5 text-red-400" />
                  <span className="font-medium text-white">Ruoli e Permessi</span>
                </div>
                <p className="text-sm text-dark-400">
                  Ogni utente vede solo le funzioni del suo ruolo.
                  Staff, Admin e Superadmin.
                </p>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="card bg-gradient-to-r from-primary-500/20 to-emerald-500/20 border-primary-500/30">
            <div className="p-6 text-center">
              <h3 className="text-lg font-semibold text-white mb-2">Pronto per iniziare?</h3>
              <p className="text-dark-300 mb-4">
                Passa alla <strong>Guida Operativa</strong> per istruzioni passo-passo,
                oppure consulta le <strong>FAQ</strong> per risposte rapide.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  onClick={() => setActiveTab('guide')}
                  className="btn-primary"
                >
                  <BookOpen className="w-4 h-4" />
                  Guida Operativa
                </button>
                <button
                  onClick={() => setActiveTab('faq')}
                  className="btn-secondary"
                >
                  <HelpCircle className="w-4 h-4" />
                  FAQ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GUIDA OPERATIVA */}
      {activeTab === 'guide' && (
        <div className="grid gap-6 md:grid-cols-2">
          {guideSections.map((section, index) => (
            <div key={index} className="card">
              <div className="card-header flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary-500/20 text-primary-400">
                  {section.icon}
                </div>
                <h2 className="text-lg font-semibold text-white">{section.title}</h2>
                {section.premium && !isPremium && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/50 rounded-full">
                    Premium
                  </span>
                )}
              </div>
              <div className="card-body space-y-4">
                <ol className="space-y-2">
                  {section.content.map((step, stepIndex) => (
                    <li key={stepIndex} className="flex gap-3 text-sm text-dark-300">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-dark-700 text-dark-400 flex items-center justify-center text-xs">
                        {step.startsWith('•') ? '•' : stepIndex + 1}
                      </span>
                      <span>{step.startsWith('•') ? step.substring(2) : step}</span>
                    </li>
                  ))}
                </ol>
                {section.tips && section.tips.length > 0 && (
                  <div className="mt-4 p-3 rounded-lg bg-primary-500/10 border border-primary-500/20">
                    <p className="text-xs font-semibold text-primary-400 mb-2">Suggerimenti:</p>
                    <ul className="space-y-1">
                      {section.tips.map((tip, tipIndex) => (
                        <li key={tipIndex} className="text-xs text-dark-300 flex gap-2">
                          <span className="text-primary-400">→</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FAQ */}
      {activeTab === 'faq' && (
        <div className="space-y-6">
          {/* Barra di ricerca */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
              placeholder="Cerca nelle FAQ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-12"
            />
          </div>

          {/* FAQ per categoria */}
          {Object.entries(faqsByCategory).map(([category, categoryFaqs]) => (
            <div key={category} className="space-y-3">
              <h3 className="text-lg font-semibold text-white border-b border-dark-700 pb-2">
                {category}
              </h3>
              <div className="space-y-2">
                {categoryFaqs.map((faq, index) => {
                  const globalIndex = faqs.findIndex(
                    (f) => f.question === faq.question && f.category === faq.category
                  );
                  const isOpen = openFAQ === globalIndex;

                  return (
                    <div
                      key={index}
                      className="card overflow-hidden"
                    >
                      <button
                        onClick={() => setOpenFAQ(isOpen ? null : globalIndex)}
                        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-dark-700/50 transition-colors"
                      >
                        <span className="font-medium text-white pr-4">{faq.question}</span>
                        {isOpen ? (
                          <ChevronUp className="w-5 h-5 text-dark-400 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-dark-400 flex-shrink-0" />
                        )}
                      </button>
                      {isOpen && (
                        <div className="px-4 py-3 bg-dark-900/50 border-t border-dark-700">
                          <p className="text-sm text-dark-300">{faq.answer}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {filteredFAQs.length === 0 && (
            <div className="text-center py-12">
              <HelpCircle className="w-12 h-12 text-dark-600 mx-auto mb-4" />
              <p className="text-dark-400">Nessuna FAQ trovata per "{searchTerm}"</p>
              <button
                onClick={() => setSearchTerm('')}
                className="mt-2 text-primary-400 hover:text-primary-300"
              >
                Cancella ricerca
              </button>
            </div>
          )}
        </div>
      )}

      {/* Footer con info contatto */}
      <div className="card p-6 text-center">
        <p className="text-dark-400 text-sm">
          Non hai trovato la risposta che cercavi?
        </p>
        <p className="text-dark-300 text-sm mt-1">
          Contatta l'amministratore del sistema per assistenza tecnica.
        </p>
      </div>
    </div>
  );
}

export default GuideFAQ;
