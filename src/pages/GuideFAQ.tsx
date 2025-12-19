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
  Search
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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
}

export function GuideFAQ() {
  const { isSuperAdmin, isAdmin } = useAuth();
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'guide' | 'faq'>('guide');

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
        'Funziona anche dallo Storico Ordini',
      ],
      tips: [
        'Usa "Stato Conto" per rispondere ai clienti che chiedono chi ha già pagato',
        'Stampa scontrino separato se ogni persona vuole la sua ricevuta',
        'Da Storico Ordini puoi gestire conti aperti anche senza sapere il tavolo',
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
        'Puoi caricare un\'immagine per il prodotto',
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
    },
    {
      title: 'Inventario',
      icon: <Package className="w-5 h-5" />,
      content: [
        'Vai su "Inventario" dalla sidebar',
        'Vedi tutti gli ingredienti con quantità e unità',
        'Gli ingredienti sotto scorta sono evidenziati in rosso',
        'Clicca "Aggiungi Ingrediente" per crearne uno nuovo',
        'Usa "Carico" per registrare nuovi arrivi',
        'Usa "Scarico" per registrare utilizzi manuali',
      ],
      tips: [
        'Controlla gli ingredienti rossi (sotto scorta) PRIMA del servizio',
        'Fai il carico appena arriva la merce, non rimandare',
        'Se l\'inventario non torna, fai uno scarico manuale per allineare i dati',
      ],
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
      category: 'Pagamenti',
      question: 'Come gestisco un pagamento misto (parte contanti, parte carta)?',
      answer: 'Usa la funzione "Dividi Conto" con la modalità manuale. Aggiungi prima il pagamento in contanti, poi quello con carta.',
    },
    {
      category: 'Pagamenti',
      question: 'Come registro la SMAC quando divido il conto?',
      answer: 'Ogni pagamento ha la sua checkbox "SMAC passato". Spuntala per chi passa la tessera, lasciala vuota per chi non ce l\'ha. Così a fine giornata sai esattamente quanto è stato smaccato.',
    },
    {
      category: 'Pagamenti',
      question: 'Come pago solo alcuni pezzi di un prodotto?',
      answer: 'In "Dividi Conto", scegli "Per Consumazione". Usa i pulsanti +/- per scegliere quanti pezzi pagare. Es: se ci sono 4 kebab puoi pagarne 1, 2 o 3.',
    },
    {
      category: 'Pagamenti',
      question: 'Dove sono finiti i prodotti già pagati nel dividi conto?',
      answer: 'I prodotti già pagati vengono automaticamente "scalati". Se qualcuno ha pagato 1 kebab su 2, nel prossimo split vedrai solo 1 kebab disponibile. Questo evita di far pagare due volte lo stesso prodotto.',
    },
    {
      category: 'Pagamenti',
      question: 'Come vedo chi ha già pagato e cosa?',
      answer: 'Clicca "Stato Conto" sul tavolo (o dall\'ordine nello Storico). Vedrai ogni pagamento con importo, metodo, SMAC e i prodotti pagati se è stato usato "Per Consumazione".',
    },
    {
      category: 'Pagamenti',
      question: 'Il cliente vuole uno scontrino separato per il suo pagamento',
      answer: 'Vai su "Stato Conto", trova il pagamento del cliente e clicca "Stampa Scontrino". Ogni pagamento può avere il suo scontrino.',
    },
    {
      category: 'Pagamenti',
      question: 'Posso dividere un conto dallo Storico Ordini?',
      answer: 'Sì! Vai su Ordini, trova l\'ordine con "Conto Aperto", cliccalo e usa "Dividi Conto" o "Stato Conto". Utile se non ricordi il tavolo.',
    },
    {
      category: 'Pagamenti',
      question: 'Il POS non funziona, come registro il pagamento?',
      answer: 'Puoi registrare il pagamento come "Contanti" temporaneamente. Avvisa un admin per la correzione successiva.',
    },
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
      category: 'Interfaccia',
      question: 'Come cambio il tema chiaro/scuro?',
      answer: 'Clicca sul pulsante sole/luna in fondo alla sidebar. La preferenza viene salvata e mantenuta anche dopo il logout.',
    },
    {
      category: 'Interfaccia',
      question: 'Come riduco la sidebar per avere più spazio?',
      answer: 'Su desktop, clicca "Riduci Menu" in fondo alla sidebar. La sidebar mostrerà solo le icone. Clicca di nuovo per espanderla.',
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
      <div className="flex gap-2 border-b border-dark-700 pb-2">
        <button
          onClick={() => setActiveTab('guide')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
            activeTab === 'guide'
              ? 'bg-primary-500 text-dark-900'
              : 'text-dark-400 hover:text-white hover:bg-dark-800'
          }`}
        >
          Guida Operativa
        </button>
        <button
          onClick={() => setActiveTab('faq')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
            activeTab === 'faq'
              ? 'bg-primary-500 text-dark-900'
              : 'text-dark-400 hover:text-white hover:bg-dark-800'
          }`}
        >
          FAQ - Domande Frequenti
        </button>
      </div>

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
