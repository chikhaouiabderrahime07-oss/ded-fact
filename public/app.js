


let dashboardCharts = {
    revenueMonth: null,
    paymentMethods: null,
    topClients: null,
    debtStatus: null,
    forecast: null,
    trajets: null,
    immoClients: null,
    immoMonths: null,
    immoStages: null,
    immoReasons: null,
    immoRates: null,
    immoTrucks: null,
    locClients: null,
    locMonths: null,
    locEquipment: null,
    locDurations: null,
    locRates: null
};

let clients = [];
let invoices = [];
let invoiceCounter = 1;
let proformaCounter = 1;
let currentInvoice = {};
let currentStep = 1;
let selectedInvoices = [];
let reportSort = { key: 'date', dir: -1 }; // Par défaut : tri par date décroissante
let chartMode = 'TTC'; // Default mode
/* ────────────────────────────────────────────────
   Prix par wilaya PAR CLIENT :
   structure : clientWilayaPairPrices[clientId][ "Dep|Dest" ] = 1234
─────────────────────────────────────────────────*/
let clientWilayaPairPrices = {};      //  ❗ new
const KEY_CLIENT_PAIR_PRICES = 'clientWilayaPairPrices';
let settings = {
    name: 'SPA DOUROUB EL DJAZAIR',
    capital: '200 000 000.00 DA',
    nif: '002407024437672',
    rc: '07/00 024437672 B24',
    address: 'Appart N° 8 Bloc A cité Halimi Biskra',
    phone: '+213 560 608 404',
    fax: '+213 560 785 014',
    rib: '', // ✅ New RIB field
    logoLeft: '',
    logoRight: '',
    defaultImmoRate: 2500,
    pricingTypes: 'Transport, Transfert, Immobilisation',
    defaultLocationRate: 150000,
    locationEquipmentTypes: 'Grue 25T, Grue 50T, Grue 75T'
};





function getPairPriceForClient(clientId, dep, dest) {
  const key = dep + '|' + dest;
  return clientWilayaPairPrices[clientId]
         ? (clientWilayaPairPrices[clientId][key] || 0)
         : 0;
}

// GLOBAL VARIABLES
let CURRENT_ACCESS_KEY = null;
const API_URL = ''; 

// --- SMART LOGIN SYSTEM ---

// 1. Function to handle the login process

// 3. Auto-Check on Startup
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();

    // Check if we have a saved key
    const savedKey = localStorage.getItem('facturation_access_key');

    if (savedKey) {
        // If yes, verify it automatically!
        console.log("Found saved key, verifying...");
        attemptLogin(savedKey);
    } else {
        // If no, just ensure the gate is showing
        document.getElementById('loginGate').style.display = 'flex';
    }

    // Allow "Enter" key to login
    const keyInput = document.getElementById('accessKeyInput');
    if(keyInput) {
        keyInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') attemptLogin();
        });
    }
});
// --- NEW DATA FUNCTIONS (Replaces LocalStorage) ---

// Wilayas data (58 Algerian wilayas)
const wilayas = [
    "Adrar", "Chlef", "Laghouat", "Oum El Bouaghi", "Batna", "Béjaïa", "Biskra", "Béchar", "Blida", "Bouira",
    "Tamanrasset", "Tébessa", "Tlemcen", "Tiaret", "Tizi Ouzou", "Alger", "Djelfa", "Jijel", "Sétif", "Saïda",
    "Skikda", "Sidi Bel Abbès", "Annaba", "Guelma", "Constantine", "Médéa", "Mostaganem", "M'Sila", "Mascara", "Ouargla",
    "Oran", "El Bayadh", "Illizi", "Bordj Bou Arréridj", "Boumerdès", "El Tarf", "Tindouf", "Tissemsilt", "El Oued", "Khenchela",
    "Souk Ahras", "Tipaza", "Mila", "Aïn Defla", "Naâma", "Aïn Témouchent", "Ghardaïa", "Relizane", "Timimoun", "Bordj Badji Mokhtar",
    "Ouled Djellal", "Béni Abbès", "In Salah", "In Guezzam", "Touggourt", "Djanet", "El M'Ghair", "El Meniaa"
];


// Prix pour chaque paire (Départ, Destination)
let wilayaPairPrices = {}; // { "Biskra|Alger": 2000, ... }

// Payment methods (10 Algerian payment methods)
const modesPaiement = [
    "Virement bancaire", "Espèces", "Chèque bancaire", 
    
];

/* ═══════════════════════════════════════════════════════════════════
   🏦  LISTE OFFICIELLE DES BANQUES ALGÉRIENNES
   Source : Banque d'Algérie – Journal Officiel – Mise à jour Jan 2026
   21 banques agréées + options spéciales
═══════════════════════════════════════════════════════════════════ */
const ALGERIAN_BANKS = {
    public: [
        { value: "BEA",    label: "BEA – Banque Extérieure d'Algérie" },
        { value: "BNA",    label: "BNA – Banque Nationale d'Algérie" },
        { value: "CPA",    label: "CPA – Crédit Populaire d'Algérie" },
        { value: "BDL",    label: "BDL – Banque de Développement Local" },
        { value: "BADR",   label: "BADR – Banque de l'Agriculture et du Développement Rural" },
        { value: "CNEP",   label: "CNEP-Banque – Caisse Nationale d'Épargne et de Prévoyance" },
        { value: "BNH",    label: "BNH – Banque Nationale de l'Habitat" },
    ],
    private: [
        { value: "Al Baraka",      label: "Banque Al Baraka d'Algérie" },
        { value: "Al Salam",       label: "Al Salam Bank Algeria" },
        { value: "AGB",            label: "AGB – Gulf Bank Algérie" },
        { value: "ABC",            label: "Bank ABC – Arab Banking Corporation Algeria" },
        { value: "Arab Bank",      label: "Arab Bank PLC – Algeria (Succursale)" },
        { value: "BNP Paribas",    label: "BNP Paribas El Djazair" },
        { value: "Citibank",       label: "Citibank N.A. Algeria (Succursale)" },
        { value: "Fransabank",     label: "Fransabank El-Djazair" },
        { value: "HSBC",           label: "HSBC – Algeria (Succursale)" },
        { value: "Housing Bank",   label: "Housing Bank for Trade & Finance – Algeria" },
        { value: "Natixis",        label: "Natixis Algérie" },
        { value: "SGA",            label: "Société Générale Algérie" },
        { value: "Trust Bank",     label: "Trust Bank Algeria" },
        { value: "Ziraat",         label: "T.C. Ziraat Bankasi – Algeria" },
    ],
    other: [
        { value: "CCP",         label: "CCP – Algérie Poste (Compte Courant Postal)" },
        { value: "Espèces",     label: "💵 Espèces / Caisse (sans banque)" },
        { value: "Autre",       label: "Autre établissement" },
    ]
};

/**
 * Remplit un <select> avec la liste complète des banques algériennes.
 * @param {string|HTMLElement} selectorOrEl - Sélecteur CSS ou élément DOM du <select>
 * @param {string} selectedValue - Valeur à pré-sélectionner (optionnel)
 */
function populateBankSelect(selectorOrEl, selectedValue = '') {
    const el = typeof selectorOrEl === 'string'
        ? document.querySelector(selectorOrEl)
        : selectorOrEl;
    if (!el) return;

    const isSelected = v => v === selectedValue ? ' selected' : '';

    el.innerHTML = `<option value="">— Choisir une banque —</option>
        <optgroup label="🏛️ Banques Publiques (État)">
            ${ALGERIAN_BANKS.public.map(b =>
                `<option value="${b.value}"${isSelected(b.value)}>${b.label}</option>`
            ).join('')}
        </optgroup>
        <optgroup label="🌐 Banques Privées &amp; Étrangères">
            ${ALGERIAN_BANKS.private.map(b =>
                `<option value="${b.value}"${isSelected(b.value)}>${b.label}</option>`
            ).join('')}
        </optgroup>
        <optgroup label="💼 Autres / Hors Banque">
            ${ALGERIAN_BANKS.other.map(b =>
                `<option value="${b.value}"${isSelected(b.value)}>${b.label}</option>`
            ).join('')}
        </optgroup>`;
}

document.addEventListener('DOMContentLoaded', function() {
    const modalEl = document.getElementById('modalInvoice');
    if (modalEl) {
        modalEl.addEventListener('hidden.bs.modal', function () {
            // ✅ DOUBLE-CHECK CLEANUP
            setTimeout(() => {
                // Remove any remaining backdrops
                document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
                    backdrop.remove();
                });
                
                // Ensure body classes are removed
                document.body.classList.remove('modal-open');
                document.body.style.overflow = '';
                document.body.style.paddingRight = '';
                
                // Reset state
                currentInvoice = {};
                currentStep = 1;
                showView('invoices');
            }, 100);
        });
    }
});


// --- SMART LOGIN SYSTEM ---

// 1. Function to handle the login process
async function attemptLogin(keyToUse = null) {
    // If no key provided, get it from the input box
    const key = keyToUse || document.getElementById('accessKeyInput').value.trim();
    const btn = document.querySelector('#loginGate button');
    const err = document.getElementById('loginError');

    if(!key) return;

    // UI Feedback
    if(btn) {
        btn.textContent = "Vérification en cours...";
        btn.disabled = true;
    }

    try {
        // Ask the server: "Is this key valid?"
        const response = await fetch(API_URL + '/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: key })
        });

        const result = await response.json();

        if (result.success) {
            // ✅ SUCCESS
            CURRENT_ACCESS_KEY = key;
            
            // 1. Save to LocalStorage so we remember it next time
            localStorage.setItem('facturation_access_key', key);
            
            // 2. Hide the Lock Screen
            document.getElementById('loginGate').style.display = 'none';
            
            // 3. Load the Data
            loadDataFromServer();
        } else {
            // ❌ FAILURE (Key revoked or wrong)
            handleLoginFailure(err, btn);
        }
    } catch (e) {
        console.error(e);
        alert("Impossible de joindre le serveur. Vérifiez votre connexion.");
        if(btn) {
            btn.textContent = "CONNEXION";
            btn.disabled = false;
        }
    }
}

// 2. Helper to handle failure
function handleLoginFailure(errElement, btnElement) {
    // Remove the bad key from memory
    localStorage.removeItem('facturation_access_key');
    CURRENT_ACCESS_KEY = null;

    // Show error message
    if(errElement) {
        errElement.style.display = 'block';
        errElement.textContent = "Clé invalide ou accès révoqué.";
    }
    
    // Reset Button
    if(btnElement) {
        btnElement.textContent = "CONNEXION";
        btnElement.disabled = false;
    }
    
    // Ensure Gate is visible
    document.getElementById('loginGate').style.display = 'flex';
}

async function loadDataFromServer() {
    if (!CURRENT_ACCESS_KEY) return;

    try {
        const response = await fetch(API_URL + `/api/data/${CURRENT_ACCESS_KEY}`);
        
        if (response.status === 403 || response.status === 401) {
            alert("Votre accès a été révoqué.");
            localStorage.removeItem('facturation_access_key');
            location.reload(); 
            return;
        }

        const data = await response.json();
        
        clients = data.clients || [];
        invoices = data.invoices || [];
        settings = { ...settings, ...(data.settings || {}) };
        invoiceCounter = data.invoiceCounter || 1;
        proformaCounter = data.proformaCounter || 1;
        clientWilayaPairPrices = data.clientWilayaPairPrices || {};

        initializeApp();
        showView('dashboard');
        
        if(settings.logoLeft && document.getElementById('logoLeftDisplay')) {
            document.getElementById('logoLeftDisplay').innerHTML = `<img src="${settings.logoLeft}" style="max-height:80px;">`;
        }
        if(settings.logoRight && document.getElementById('logoRightDisplay')) {
            document.getElementById('logoRightDisplay').innerHTML = `<img src="${settings.logoRight}" style="max-height:80px;">`;
        }

    } catch (error) {
        console.error("Error loading data:", error);
    }
}
async function saveDataToLocalStorage() {
    // We keep the name "saveDataToLocalStorage" so we don't break existing calls
    // But now it sends data to MongoDB
    if (!CURRENT_ACCESS_KEY) return;

    const payload = {
        key: CURRENT_ACCESS_KEY,
        clients, invoices, settings, invoiceCounter, proformaCounter, clientWilayaPairPrices
    };

    // Send to server in background
    fetch(API_URL + '/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).catch(err => console.error("Save failed", err));
}


function initializeApp() {
    try {
        populateWilayaSelects();
        
        // ✅ 1. Populate filters FIRST so the options exist
        populateFilterDropdowns(); 

        // ✅ 2. FORCE DEFAULT YEAR TO 2026 (Current Year)
        const yearFilter = document.getElementById('filterYear');
        if(yearFilter) {
            yearFilter.value = new Date().getFullYear().toString();
        }
        
        // 3. Render Views
        updateDashboard();
        renderClients();
        renderInvoices();
        loadSettings();
        setupWilayaPriceManagement();
        setupLogoHandlers();
        if (typeof loadShareLinks === 'function') loadShareLinks();

    } catch (error) {
        console.error('Error initializing app:', error);
    }
}




function loadSampleData() {
    // Initialiser les paramètres de l’entreprise, incluant NIS et Art. Imp
// In loadSampleData() function, update settings:
settings = {
    name: 'SPA DOUROUB EL DJAZAIR',
    capital: '200 000 000.00 DA',
    nif: '002407024437672',
    nis: '1321323',
    artimp: '0000001',
    rc: '07/00 024437672 B24',
    address: 'Appart N° 8 Bloc A cité Halimi Biskra',
    phone: '+213 560 608 404',
    fax: '+213 560 785 014',
    logoLeft: '',   // ✅ Initialize empty
    logoRight: ''   // ✅ Initialize empty
};


    // Initialiser les clients d’exemple, avec Art. Imp pour chacun
    clients = [
        {
            id: 1,
            nom: "SPA SGEM GUEDILA",
            nif: "099807024437672",
            nis: "000307024251670",
            artimp: "1321323",
            rc: "08/00 024437672 B24",
            adresse: "Zone Industrielle Guedila",
            wilaya: "Biskra",
            phone: "0560123456",
            destinations: [
                "Guedila (Destination : SARL HAMOUCH)",
                "Biskra (Destination : ETS BENALI)"
            ]
        },
        {
            id: 2,
            nom: "SARL TRANSPORT ALGERIE",
            nif: "099807024437673",
            nis: "000307024251671",
            artimp: "1321324",
            rc: "09/00 024437673 B24",
            adresse: "Route Nationale 03",
            wilaya: "Alger",
            phone: "0560123457",
            destinations: [
                "Alger (Destination : CENTRE COMMERCIAL)",
                "Blida (Destination : DEPOT REGIONAL)"
            ]
        }
    ];

    // Initialiser les factures d’exemple
    invoices = [
        {
            id: 1,
            number: "001/2025",
            date: "2025-07-03",
            clientId: 1,
            delaiPaiement: 30,
            modePaiement: "Chèque",
            articles: [
                {
                    no: 1,
                    designation: "Prestation de transport routier ",
                    qte: 5,
                    prixUHT: 34750.00,
                    montantHT: 173750.00
                }
            ],
            blReferences: "BL001, BL002, BL003",
			  contratRef : '',
  bdcRef     : '',
            palettes: 5,
            wilayaDepart: "Biskra",
            wilayaDestination: "Alger",
            remise: { enabled: false, type: 'percentage', value: 0 },
            totals: {
                ht: 173750.00,
                tva: 33012.50,
                ttc: 206762.50,
                netAPayer: 206762.50
            },
            paid: false,
            createdAt: "2025-07-03T10:30:00Z"
        }
    ];

    // Définir le compteur de factures
    invoiceCounter = invoices.length + 1;

    // Sauvegarder dans le LocalStorage
    saveDataToLocalStorage();
}


// Initialiser le tri des rapports au chargement
document.addEventListener('DOMContentLoaded', () => {
    const reportTable = document.getElementById('tableReport');
    if (reportTable) {
        reportTable.querySelectorAll('th.sortable').forEach(th => {
            th.style.cursor = 'pointer'; // Curseur main
            th.addEventListener('click', () => {
                const key = th.dataset.sort;
                // Inverser la direction si on clique sur la même colonne
                if (reportSort.key === key) {
                    reportSort.dir *= -1;
                } else {
                    reportSort.key = key;
                    reportSort.dir = 1; // Ascendant par défaut pour nouvelle colonne
                }
                loadReport(); // Recharger le rapport avec le nouveau tri
            });
        });
    }
});
document.addEventListener('DOMContentLoaded', () => {
  const pickerTrigger = document.getElementById('clientPickerTrigger');
  const dropdown = document.getElementById('clientDropdown');
  const searchInput = document.getElementById('clientSearch');
  const optionsContainer = document.getElementById('clientOptions');
  const selectedContainer = document.getElementById('selectedClientsContainer');

  // 1. Charger les options depuis votre tableau clients[]
  function renderOptions() {
    optionsContainer.innerHTML = '';
    // Ajout de l’option “Tous les clients”
    const allOption = createOptionChip('all', 'Tous les clients');
    allOption.dataset.id = 'all';
    optionsContainer.appendChild(allOption);
    // Options individuelles
    clients.forEach(c => {
      const opt = createOptionChip(c.id, c.nom);
      opt.dataset.id = c.id;
      optionsContainer.appendChild(opt);
    });
  }

  // Crée un élément d’option
  function createOptionChip(id, name) {
    const div = document.createElement('div');
    div.className = 'client-option';
    div.innerHTML = `
      <div class="client-info"><span class="client-name">${name}</span></div>
      <i class="fas fa-check option-check" style="visibility:hidden;"></i>
    `;
    // clic sur option
    div.addEventListener('click', () => toggleSelection(id, name, div));
    return div;
  }

  // Ajouter ou retirer une sélection
  function toggleSelection(id, name, optEl) {
    const isAll = id === 'all';
    // Si “Tous les clients”
    if (isAll) {
      const allSelected = optEl.classList.toggle('selected');
      // vider ou sélectionner tout
      clearAllChips();
      clients.forEach(c => {
        if (allSelected) addChip(c.id, c.nom);
      });
      // Mettre à jour toutes les options
      optionsContainer.querySelectorAll('.client-option').forEach(o => {
        o.classList.toggle('selected', allSelected);
        o.querySelector('.option-check').style.visibility = allSelected ? 'visible' : 'hidden';
      });
      return;
    }

    const already = selectedContainer.querySelector(`.client-chip[data-id="${id}"]`);
    if (already) {
      removeChip(id);
      optEl.classList.remove('selected');
      optEl.querySelector('.option-check').style.visibility = 'hidden';
    } else {
      addChip(id, name);
      optEl.classList.add('selected');
      optEl.querySelector('.option-check').style.visibility = 'visible';
      // désactiver “Tous” si présent
      const allOpt = optionsContainer.querySelector('.client-option[data-id="all"]');
      if (allOpt && allOpt.classList.contains('selected')) {
        allOpt.classList.remove('selected');
        allOpt.querySelector('.option-check').style.visibility = 'hidden';
        removeChip('all');
      }
    }
  }

  // Crée et insère une chip dans selectedContainer
  function addChip(id, name) {
    const chip = document.createElement('div');
    chip.className = 'client-chip active';
    chip.dataset.id = id;
    chip.innerHTML = `
      <span class="chip-text">${name}</span>
      <i class="fas fa-times chip-remove"></i>
    `;
    // clique sur X
    chip.querySelector('.chip-remove').addEventListener('click', () => {
      removeChip(id);
      // décocher option
      const opt = optionsContainer.querySelector(`.client-option[data-id="${id}"]`);
      if (opt) {
        opt.classList.remove('selected');
        opt.querySelector('.option-check').style.visibility = 'hidden';
      }
    });
    selectedContainer.appendChild(chip);
  }

  // Supprime une chip
  function removeChip(id) {
    const chip = selectedContainer.querySelector(`.client-chip[data-id="${id}"]`);
    if (chip) selectedContainer.removeChild(chip);
  }

  // Vide toutes les chips
  function clearAllChips() {
    selectedContainer.innerHTML = '';
  }

  // Filtre les options selon la recherche
  searchInput.addEventListener('input', () => {
    const term = searchInput.value.toLowerCase();
    optionsContainer.querySelectorAll('.client-option').forEach(opt => {
      const name = opt.querySelector('.client-name').textContent.toLowerCase();
      opt.style.display = name.includes(term) ? '' : 'none';
    });
  });

  // Ouvre/ferme le dropdown
  pickerTrigger.addEventListener('click', () => {
    dropdown.classList.toggle('show');
    searchInput.focus();
  });

  // Fermer si clic en dehors
  document.addEventListener('click', e => {
    if (!pickerTrigger.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove('show');
    }
  });

  // Initialisation
  renderOptions();
});



function setupEventListeners() {
    try {
        // Navigation
        document.querySelectorAll('[data-view]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const viewName = e.currentTarget.getAttribute('data-view');
                showView(viewName);
            });
        });

        // ✅ FIX: LISTEN TO INPUT FOR DESTINATION SEARCH
        const filterDest = document.getElementById('filterDestination');
        if (filterDest) filterDest.addEventListener('input', filterInvoices);

        // Client management
        const btnAddClient = document.getElementById('btnAddClient');
        if (btnAddClient) btnAddClient.addEventListener('click', (e) => { e.preventDefault(); openClientModal(); });
        
        const formClient = document.getElementById('formClient');
        if (formClient) formClient.addEventListener('submit', handleClientSubmit);
        
        // Invoice management
        const btnNewInvoice = document.getElementById('btnNewInvoice');
        if (btnNewInvoice) btnNewInvoice.addEventListener('click', (e) => { e.preventDefault(); openInvoiceWizard(); });
        
        const btnMarkPaid = document.getElementById('btnMarkPaid');
        if (btnMarkPaid) btnMarkPaid.addEventListener('click', markSelectedInvoicesPaid);
        
        const btnExportPDF = document.getElementById('btnExportPDF');
        if (btnExportPDF) btnExportPDF.addEventListener('click', exportSelectedInvoicePDF);
        
        // Wizard navigation
        const btnPrevStep = document.getElementById('btnPrevStep');
        if (btnPrevStep) btnPrevStep.addEventListener('click', previousStep);
        
        const btnNextStep = document.getElementById('btnNextStep');
        if (btnNextStep) btnNextStep.addEventListener('click', nextStep);
        
        const btnSaveInvoice = document.getElementById('btnSaveInvoice');
        if (btnSaveInvoice) btnSaveInvoice.addEventListener('click', saveInvoice);
        
        const btnCloseInvoiceWizard = document.getElementById('btnCloseInvoiceWizard');
        if (btnCloseInvoiceWizard) btnCloseInvoiceWizard.addEventListener('click', closeInvoiceWizard);
        
        // Filters
        const filterClient = document.getElementById('filterClient');
        const filterYear = document.getElementById('filterYear');
        const filterMonth = document.getElementById('filterMonth');
        const filterStatus = document.getElementById('filterStatus');
        const btnClearFilters = document.getElementById('btnClearFilters');
        
        if (filterClient) filterClient.addEventListener('change', filterInvoices);
        if (filterYear) filterYear.addEventListener('change', filterInvoices);
        if (filterMonth) filterMonth.addEventListener('change', filterInvoices);
        if (filterStatus) filterStatus.addEventListener('change', filterInvoices);
        if (btnClearFilters) btnClearFilters.addEventListener('click', clearFilters);

        // Global Search
        const globalSearchInput = document.getElementById('globalSearchInput');
        if (globalSearchInput) globalSearchInput.addEventListener('input', () => { renderInvoices(); });
        
        // Reports
        const btnLoadReport = document.getElementById('btnLoadReport');
        if (btnLoadReport) btnLoadReport.addEventListener('click', loadReport);
        
        const btnExportReportCSV = document.getElementById('btnExportReportCSV');
        if (btnExportReportCSV) btnExportReportCSV.addEventListener('click', exportReportCSV);
        
        const btnExportReportPDF = document.getElementById('btnExportReportPDF');
        if (btnExportReportPDF) btnExportReportPDF.addEventListener('click', exportReportPDF);
        
        // Settings
        const formSettings = document.getElementById('formSettings');
        if (formSettings) formSettings.addEventListener('submit', saveSettings);
        
        const setLogo = document.getElementById('setLogo');
        if (setLogo) setLogo.addEventListener('change', handleLogoUpload);
        
        const btnDownloadData = document.getElementById('btnDownloadData');
        if (btnDownloadData) btnDownloadData.addEventListener('click', downloadData);
        
        const inputImportJSON = document.getElementById('inputImportJSON');
        if (inputImportJSON) inputImportJSON.addEventListener('change', importData);
        
        // Select all invoices
        const chkAllInvoices = document.getElementById('chkAllInvoices');
        if (chkAllInvoices) chkAllInvoices.addEventListener('change', toggleAllInvoices);

    } catch (error) {
        console.error('Error setting up event listeners:', error);
    }
}
function showView(viewName) {
    try {
        document.querySelectorAll('.app-view').forEach(view => view.classList.add('d-none'));
        const targetView = document.getElementById(`view-${viewName}`);
        if (targetView) {
            targetView.classList.remove('d-none');
        }
        
        document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
        const targetLink = document.querySelector(`[data-view="${viewName}"]`);
        if (targetLink) {
            targetLink.classList.add('active');
        }
        
        if (viewName === 'dashboard') updateDashboard();
        if (viewName === 'invoices') renderInvoices();
        if (viewName === 'clients') renderClients();
        if (viewName === 'reports') populateReportFilters();
        if (viewName === 'settings') loadSettings();
		if (viewName === 'wilaya-prices') setupWilayaPriceManagement();
        if (viewName === 'immobilisation') updateImmobilisationView();
        if (viewName === 'location') { populateLocClientFilter(); populateLocEquipmentFilter(); updateLocationView(); }
        if (viewName === 'proformas') { renderProformasView(); }

    } catch (error) {
        console.error('Error showing view:', error);
    }
}

function populateWilayaSelects() {
    try {
        const selects = document.querySelectorAll('#clientWilaya, #wilayaDepart, #wilayaDestination');
        selects.forEach(select => {
            if (select) {
                select.innerHTML = '<option value="">Sélectionner wilaya</option>';
                wilayas.forEach(wilaya => {
                    select.innerHTML += `<option value="${wilaya}">${wilaya}</option>`;
                });
            }
        });
    } catch (error) {
        console.error('Error populating wilayas:', error);
    }
}

// Client Management – ouvrir la modal d’ajout/modification de client
function openClientModal(clientId = null) {
    try {
        // First, clean up any existing modal backdrops
        document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
            backdrop.remove();
        });
        
        // Reset body styles
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        
        const modalElement = document.getElementById('modalClient');
        if (!modalElement) return;

        const form = document.getElementById('formClient');

        if (clientId) {
            // Modification d'un client existant
            const client = clients.find(c => c.id === clientId);
            if (client) {
                document.getElementById('modalClientTitle').textContent = 'Modifier client';
                document.getElementById('clientId').value = client.id;
                document.getElementById('clientNom').value = client.nom;
                document.getElementById('clientNIF').value = client.nif;
                document.getElementById('clientNIS').value = client.nis;
                document.getElementById('clientArtImp').value = client.artimp || '';
                document.getElementById('clientRC').value = client.rc;
                if(document.getElementById('clientActivite')) document.getElementById('clientActivite').value = client.activite || '';
                document.getElementById('clientAdresse').value = client.adresse;
                document.getElementById('clientWilaya').value = client.wilaya;
                document.getElementById('clientPhone').value = client.phone || '';

                // Destinations
                const destinationsContainer = document.getElementById('clientDestinations');
                destinationsContainer.innerHTML = '';
                if (Array.isArray(client.destinations) && client.destinations.length) {
                    client.destinations.forEach((dest, idx) => addDestinationField(dest, idx));
                } else {
                    addDestinationField('', 0);
                }
            }
        } else {
            // Nouvel ajout de client
            document.getElementById('modalClientTitle').textContent = 'Ajouter client';
            if (form) form.reset();
            document.getElementById('clientId').value = '';
            const destinationsContainer = document.getElementById('clientDestinations');
            destinationsContainer.innerHTML = '';
            addDestinationField('', 0);
        }

        // Create new modal instance and show
        const modal = new bootstrap.Modal(modalElement, {
            backdrop: 'static', // Prevent closing by clicking backdrop
            keyboard: false     // Prevent closing with ESC key
        });
        
        modal.show();

    } catch (error) {
        console.error('Error opening client modal:', error);
        // Force cleanup on error
        document.querySelectorAll('.modal-backdrop').forEach(backdrop => backdrop.remove());
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
    }
}

function addDestinationField(value = '', index = 0) {
    try {
        const container = document.getElementById('clientDestinations');
        if (!container) return;
        
        const div = document.createElement('div');
        div.className = 'destination-field mb-2';
        div.innerHTML = `
            <div class="input-group">
                <input type="text" class="form-control destination-input" value="${value}" placeholder="Ex: Guedila (Destination : SARL HAMOUCH)">
                <button type="button" class="btn btn--outline btn-remove-destination"><i class="fa fa-trash"></i></button>
            </div>
        `;
        
        const removeBtn = div.querySelector('.btn-remove-destination');
        removeBtn.addEventListener('click', () => {
            div.remove();
        });
        
        container.appendChild(div);
    } catch (error) {
        console.error('Error adding destination field:', error);
    }
}

function addDestination() {
    try {
        const container = document.getElementById('clientDestinations');
        if (container) {
            const currentCount = container.querySelectorAll('.destination-field').length;
            addDestinationField('', currentCount);
        }
    } catch (error) {
        console.error('Error adding destination:', error);
    }
}

function handleClientSubmit(e) {
    try {
        e.preventDefault();

        // Récupérer toutes les destinations saisies
        const destinationInputs = document.querySelectorAll('.destination-input');
        const destinations = Array.from(destinationInputs)
            .map(input => input.value.trim())
            .filter(dest => dest !== '');

        // Construire l'objet client avec Art. Imp inclus
        const clientData = {
            nom: document.getElementById('clientNom').value.trim(),
            nif: document.getElementById('clientNIF').value.trim(),
            nis: document.getElementById('clientNIS').value.trim(),
            artimp: document.getElementById('clientArtImp').value.trim(),
            rc: document.getElementById('clientRC').value.trim(),
            adresse: document.getElementById('clientAdresse').value.trim(),
            wilaya: document.getElementById('clientWilaya').value,
            phone: document.getElementById('clientPhone').value.trim(),
            destinations: destinations
        };

        // Validation des champs obligatoires
        if (
            !clientData.nom ||
            !clientData.nif ||
            !clientData.nis ||
            !clientData.artimp ||
            !clientData.rc ||
            !clientData.adresse ||
            !clientData.wilaya
        ) {
            alert('Veuillez remplir tous les champs obligatoires');
            return;
        }

// Validation NIF (10–20 chiffres)
        if (clientData.nif.length < 10 || clientData.nif.length > 20 || !/^\d+$/.test(clientData.nif)) {
            alert('Le NIF doit contenir entre 10 et 20 chiffres');
            document.getElementById('clientNIF').focus();
            return;
        }

        // Validation NIS (10–20 chiffres)
        if (clientData.nis.length < 10 || clientData.nis.length > 20 || !/^\d+$/.test(clientData.nis)) {
            alert('Le NIS doit contenir entre 10 et 20 chiffres');
            document.getElementById('clientNIS').focus();
            return;
        }

        const clientId = document.getElementById('clientId').value;
        if (clientId) {
            // Mise à jour d'un client existant
            const index = clients.findIndex(c => c.id === parseInt(clientId, 10));
            if (index !== -1) {
                clients[index] = { ...clients[index], ...clientData };
            }
        } else {
            // Ajout d'un nouveau client
            clientData.id = Date.now();
            clients.push(clientData);
        }

        // Sauvegarde et ré-affichage
        saveDataToLocalStorage();
        renderClients();

        // ✅ PROPER MODAL CLEANUP
        closeClientModal();

        alert('Client enregistré avec succès!');
        
    } catch (error) {
        console.error('Error handling client submit:', error);
        alert('Erreur lors de l\'enregistrement du client');
    }
}


function deleteClient(clientId) {
    try {
        if (confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) {
            clients = clients.filter(c => c.id !== clientId);
			saveDataToLocalStorage(); 
            renderClients();
        }
    } catch (error) {
        console.error('Error deleting client:', error);
    }
}

function renderClients() {
    try {
        const tbody = document.querySelector('#tableClients tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        clients.forEach(client => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${client.nom}</td>
                <td>${client.nif}</td>
                <td>${client.nis}</td>
                <td>${client.rc}</td>
                <td>${client.adresse}</td>
                <td>${client.wilaya}</td>
                <td>${client.phone || ''}</td>
                <td>${(client.destinations || []).length} destination(s)</td>
                <td>
                    <div class="d-flex align-items-center gap-2">
                        <button class="btn btn--sm btn--outline" onclick="openClientModal(${client.id})" title="Modifier">
                            <i class="fa fa-edit"></i>
                        </button>
                        <button class="btn btn--sm btn--outline" onclick="deleteClient(${client.id})" title="Supprimer" style="color: var(--color-error);">
                            <i class="fa fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error rendering clients:', error);
    }
}


// Invoice Management
function openInvoiceWizard(initialType = 'transport') {
  const isImmo = initialType === 'immobilisation';
  const isLoc = initialType === 'location';
  const immoRate = settings.defaultImmoRate || 2500;
  const locRate = settings.defaultLocationRate || 150000;
  const defaultEquip = (settings.locationEquipmentTypes || 'Grue 25T').split(',')[0].trim();
  
  let defaultArticle;
  if (isImmo) {
      defaultArticle = {
        no: 1,
        isImmobilisation: true,
        isLocation: false,
        pricingType: 'Immobilisation',
        immoTitle: "Frais d'attente et d'immobilisation",
        immoStage: 'dechargement',
        immoTruckCount: 1,
        matricule: '',
        immoDriver: '',
        immoPeriod: '',
        immoLocation: '',
        immoSiteChargement: '',
        immoSiteDechargement: '',
        immoReason: 'Attente déchargement chez client',
        designation: "<b>Frais d'attente et d'immobilisation au Déchargement</b><br>-Motif : Attente déchargement chez client<br>-Total Heures Facturées : <b>8 Heures</b>",
        qte: 8,
        prixUHT: immoRate,
        montantHT: immoRate * 8,
        wilayaDepart: '',
        wilayaDestination: '',
        selectedDestination: ''
      };
  } else if (isLoc) {
      defaultArticle = {
        no: 1,
        isLocation: true,
        isImmobilisation: false,
        pricingType: 'Location',
        locEquipment: defaultEquip,
        locTonnage: '',
        locPeriodStart: '',
        locPeriodEnd: '',
        locSite: '',
        locDriver: '',
        designation: `<b>Location de ${defaultEquip}</b><br>-Site : <br>-Période : `,
        qte: 1,
        prixUHT: locRate,
        montantHT: locRate,
        wilayaDepart: '',
        wilayaDestination: '',
        selectedDestination: ''
      };
  } else {
      defaultArticle = {
        no: 1,
        isImmobilisation: false,
        isLocation: false,
        pricingType: 'Transport',
        designation: '<b>Prestation de transport routier</b><br>-WILAYA DEPART : <br>-DESTINATION : <br>-Nombre de palettes : 0',
        qte: 1,
        prixUHT: 0,
        montantHT: 0,
        wilayaDepart: '',
        wilayaDestination: '',
        selectedDestination: ''
      };
  }
  
  currentInvoice = {
    documentType: 'facture',
    contratRef : '',
    bdcRef     : '',
    invoiceType: initialType,
    articles: [defaultArticle],

    blReferences: '',
    palettes: isImmo ? 0 : 26,
    refFeuilleRoute: '',
    refBonTransfert: '',
    showDestinationInDoitA: false,
    remise: { enabled: false, type: 'percentage', value: 0 },
    totals: { ht: isImmo ? (immoRate * 8) : (isLoc ? locRate : 0), remise:0, htRemise: isImmo ? (immoRate * 8) : (isLoc ? locRate : 0), tva: isImmo ? (immoRate * 8 * 0.19) : (isLoc ? locRate * 0.19 : 0), ttc: isImmo ? (immoRate * 8 * 1.19) : (isLoc ? locRate * 1.19 : 0), netAPayer: isImmo ? (immoRate * 8 * 1.19) : (isLoc ? locRate * 1.19 : 0) }
  };

  currentStep = 1;
  const modal = new bootstrap.Modal(document.getElementById('modalInvoice'));
  renderWizardStep();
  modal.show();
}

window.goToWizardStep = function(targetStep) {
  if (targetStep === currentStep) return;
  if (targetStep > currentStep) {
    while (currentStep < targetStep) {
      if (typeof validateCurrentStep === 'function' && !validateCurrentStep()) return;
      currentStep++;
    }
  } else {
    currentStep = targetStep;
  }
  renderWizardStep();
};

window.openInvoiceWizardWithImmobilisation = function() {
  openInvoiceWizard('immobilisation');
};



function closeInvoiceWizard() {
    try {
        const modalEl = document.getElementById('modalInvoice');
        const modal = bootstrap.Modal.getInstance(modalEl);
        
        if (modal) {
            modal.hide();
        }
        
        // ✅ AGGRESSIVE CLEANUP - Wait for modal to fully hide
        setTimeout(() => {
            // Remove any lingering backdrops
            document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
                backdrop.remove();
            });
            
            // Force remove modal-open class and restore body scroll
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
            
            // Reset current invoice state
            currentInvoice = {};
            currentStep = 1;
            
            // Switch back to invoices view
            showView('invoices');
        }, 150); // Give Bootstrap time to cleanup
        
    } catch (error) {
        console.error('Error closing invoice wizard:', error);
        // Force cleanup even if there's an error
        document.querySelectorAll('.modal-backdrop').forEach(backdrop => backdrop.remove());
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        showView('invoices');
    }
}





function renderWizardStep() {
    try {
        const container = document.getElementById('wizardForms');
        const prevBtn = document.getElementById('btnPrevStep');
        const nextBtn = document.getElementById('btnNextStep');
        const saveBtn = document.getElementById('btnSaveInvoice');
        
        if (!container) return;
        
        if (prevBtn) prevBtn.classList.toggle('d-none', currentStep === 1);
        if (nextBtn) nextBtn.classList.toggle('d-none', currentStep === 5);
        if (saveBtn) saveBtn.classList.toggle('d-none', currentStep !== 5);

        // Update top stepper tabs
        for (let s = 1; s <= 5; s++) {
            const tab = document.getElementById(`stepTab${s}`);
            if (tab) {
                tab.classList.toggle('active', s === currentStep);
                tab.classList.toggle('completed', s < currentStep);
            }
        }

        // Update card header title & counter
        const stepTitles = [
            '<i class="fa fa-user me-1 text-primary"></i>1. Sélection Client & Type de Facture',
            '<i class="fa fa-calendar-alt me-1 text-primary"></i>2. Dates & Numérotation',
            '<i class="fa fa-credit-card me-1 text-primary"></i>3. Modalités de Paiement & Expédition',
            '<i class="fa fa-layer-group me-1 text-primary"></i>4. Lignes & Frais Facturés',
            '<i class="fa fa-percent me-1 text-primary"></i>5. Remise & Validation Finale'
        ];
        const stepTitleEl = document.getElementById('wizardStepTitle');
        if (stepTitleEl) stepTitleEl.innerHTML = stepTitles[currentStep - 1] || 'Paramètres';

        const stepCounterEl = document.getElementById('wizardStepCounter');
        if (stepCounterEl) stepCounterEl.textContent = `Étape ${currentStep}/5`;
        
        switch(currentStep) {
            case 1:
                renderStep1();
                break;
            case 2:
                renderStep2();
                break;
            case 3:
                renderStep3();
                break;
            case 4:
                renderStep4();
                break;
            case 5:
                renderStep5();
                break;
        }
        
        updateInvoicePreview();
    } catch (error) {
        console.error('Error rendering wizard step:', error);
    }
}

function renderStep1() {
    try {
        const container = document.getElementById('wizardForms');
        if (!container) return;
        
        const clientOptions = clients.map(c => `<option data-id="${c.id}" value="${c.nom}">`).join('');
        
        let currentClientName = '';
        if (currentInvoice.clientId) {
            const found = clients.find(c => c.id === currentInvoice.clientId);
            if (found) currentClientName = found.nom;
        }

        const isImmo = currentInvoice.invoiceType === 'immobilisation' || 
            (currentInvoice.articles && currentInvoice.articles.length > 0 && currentInvoice.articles[0].isImmobilisation);

        container.innerHTML = `
            <h6>Étape 1/5 - Sélection client & Prestation</h6>
            
            <div class="mb-3 p-2 bg-light border rounded">
                <label class="form-label fw-bold mb-2 small text-uppercase text-muted"><i class="fa fa-tag me-1 text-primary"></i>Nature principale de la facture :</label>
                <div class="d-flex gap-4">
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="wizardInvoiceType" id="typeTransport" value="transport" ${!isImmo ? 'checked' : ''}>
                        <label class="form-check-label fw-semibold" for="typeTransport" style="cursor:pointer;">
                            <i class="fa fa-truck text-primary me-1"></i> Prestation de Transport
                        </label>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="wizardInvoiceType" id="typeImmobilisation" value="immobilisation" ${isImmo ? 'checked' : ''}>
                        <label class="form-check-label fw-semibold" for="typeImmobilisation" style="color: var(--immo-primary); cursor:pointer;">
                            <i class="fa fa-stopwatch me-1" style="color: var(--immo-primary);"></i> Frais d'Immobilisation / Attente
                        </label>
                    </div>
                </div>
            </div>

            <div class="mb-3">
                <label class="form-label" style="font-weight:bold;">Client (Recherche) *</label>
                <input list="clientDataList" id="wizardClientInput" class="form-control" 
                       placeholder="Tapez pour chercher un client..." value="${currentClientName}" required>
                <datalist id="clientDataList">
                    ${clientOptions}
                </datalist>
                <input type="hidden" id="wizardClientId" value="${currentInvoice.clientId || ''}">
            </div>
            
            <div class="mb-3 form-check">
                <input class="form-check-input" type="checkbox" id="showDestinationInDoitA">
                <label class="form-check-label" for="showDestinationInDoitA">
                    Afficher une destination dans le bloc "DOIT À"
                </label>
            </div>
            
            <div class="mb-3" id="doitADestinationDiv" style="display: none;">
                <label class="form-label">Destination pour DOIT À</label>
                <input list="destDataList" id="doitADestinationInput" class="form-control" 
                       placeholder="Tapez pour chercher une destination...">
                <datalist id="destDataList">
                </datalist>
            </div>
        `;
        
        // --- Event Listeners Logic (Same as before) ---
        const typeRadios = container.querySelectorAll('input[name="wizardInvoiceType"]');
        typeRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                const picked = this.value;
                currentInvoice.invoiceType = picked;
                if (currentInvoice.articles && currentInvoice.articles.length === 1) {
                    if (picked === 'immobilisation') {
                        if (typeof setArticleType === 'function') setArticleType(0, 'immobilisation');
                    } else {
                        if (typeof setArticleType === 'function') setArticleType(0, 'transport');
                    }
                }
                updateInvoicePreview();
            });
        });

        const clientInput = document.getElementById('wizardClientInput');
        const clientIdHidden = document.getElementById('wizardClientId');
        const showDestinationCheckbox = document.getElementById('showDestinationInDoitA');
        const destInput = document.getElementById('doitADestinationInput');
        const destList = document.getElementById('destDataList');
        const doitADestinationDiv = document.getElementById('doitADestinationDiv');
        
        if (clientInput) {
            clientInput.addEventListener('input', function() {
                const val = this.value;
                const match = clients.find(c => c.nom === val);
                
                if (match) {
                    clientIdHidden.value = match.id;
                    currentInvoice.clientId = match.id;
                    
                    if (match.destinations && match.destinations.length > 0) {
                        destList.innerHTML = match.destinations.map(d => `<option value="${d}">`).join('');
                    } else {
                        destList.innerHTML = '';
                    }
                    updateInvoicePreview();
                } else {
                    clientIdHidden.value = ''; 
                    destList.innerHTML = '';
                }
            });

            if (currentInvoice.clientId) {
                clientInput.dispatchEvent(new Event('input'));
            }
        }
        
        if (showDestinationCheckbox) {
            showDestinationCheckbox.addEventListener('change', function() {
                currentInvoice.showDestinationInDoitA = this.checked;
                doitADestinationDiv.style.display = this.checked ? 'block' : 'none';
                updateInvoicePreview();
            });
            
            if (currentInvoice.showDestinationInDoitA) {
                showDestinationCheckbox.checked = true;
                doitADestinationDiv.style.display = 'block';
            }
        }
        
        if (destInput) {
            destInput.addEventListener('change', function() { 
                currentInvoice.doitADestination = this.value;
                if (currentInvoice.articles) {
                    currentInvoice.articles.forEach(art => {
                        if (!art.selectedDestination) art.selectedDestination = this.value;
                    });
                }
                updateInvoicePreview();
            });
            
            if (currentInvoice.doitADestination) {
                destInput.value = currentInvoice.doitADestination;
            }
        }

    } catch (error) {
        console.error('Error rendering step 1:', error);
    }
}
function renderStep2() {
    try {
        const container = document.getElementById('wizardForms');
        if (!container) return;

        const todayDate = new Date();
        const year = todayDate.getFullYear();
        const dateStr = todayDate.toISOString().split('T')[0];

        // FORCER L'ANNÉE ACTUELLE DANS LE NUMÉRO PAR DÉFAUT
        let invoiceNumberValue = currentInvoice.number;
        
        if (!invoiceNumberValue) {
            // Si pas de numéro, on génère : 00X / ANNÉE_ACTUELLE
            invoiceNumberValue = `${String(invoiceCounter).padStart(3, '0')}/${year}`;
        }

        container.innerHTML = `
            <h6>Étape 2/5 - Informations facture</h6>
            <div class="mb-3 p-2 rounded border bg-light">
                <label class="form-label fw-bold small text-uppercase text-muted">Type de Document</label>
                <div class="btn-group w-100" role="group">
                    <input type="radio" class="btn-check" name="docType" id="docTypeFacture" value="facture" ${currentInvoice.documentType !== 'proforma' ? 'checked' : ''} autocomplete="off">
                    <label class="btn btn-outline-primary" for="docTypeFacture"><i class="fa fa-file-invoice me-1"></i>Facture</label>
                    <input type="radio" class="btn-check" name="docType" id="docTypeProforma" value="proforma" ${currentInvoice.documentType === 'proforma' ? 'checked' : ''} autocomplete="off">
                    <label class="btn btn-outline-warning" for="docTypeProforma"><i class="fa fa-file-alt me-1"></i>Proforma</label>
                </div>
            </div>
            <div class="row g-3">
                <div class="col-md-6">
                    <label class="form-label">N° Facture</label>
                    <input type="text" id="stepNumber" class="form-control fw-bold" value="${invoiceNumberValue}">
                    <div class="form-text text-muted small">Format: 001/${year}</div>
                </div>
                <div class="col-md-6">
                    <label class="form-label">Date *</label>
                    <input type="date" id="wizardDate" class="form-control" value="${dateStr}" required>
                </div>
                <div class="col-md-6">
                    <label class="form-label">Délai de paiement (jours) *</label>
                    <input type="number" id="wizardDelai" class="form-control" value="30" min="1" required>
                </div>
                <div class="col-md-6">
                    <label class="form-label">Mode de paiement *</label>
                    <select id="wizardMode" class="form-control" required>
                        <option value="">Sélectionner mode de paiement</option>
                        ${modesPaiement.map(m => `<option value="${m}" ${m === 'Chèque bancaire' ? 'selected' : ''}>${m}</option>`).join('')}
                    </select>
                </div>
            </div>
        `;

        // Listeners (Code inchangé pour la sauvegarde)
        const docTypeRadios = container.querySelectorAll('input[name="docType"]');
        docTypeRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                currentInvoice.documentType = this.value;
                updateInvoicePreview();
            });
        });

        const wizardDate = document.getElementById('wizardDate');
        const wizardDelai = document.getElementById('wizardDelai');
        const wizardMode = document.getElementById('wizardMode');
        const stepNumberInput = document.getElementById('stepNumber');

        if (wizardDate) {
            wizardDate.addEventListener('change', function() {
                currentInvoice.date = this.value;
                updateInvoicePreview();
            });
            if (currentInvoice.date) wizardDate.value = currentInvoice.date;
        }
        if (wizardDelai) {
            wizardDelai.addEventListener('change', function() {
                currentInvoice.delaiPaiement = parseInt(this.value);
                updateInvoicePreview();
            });
            if (currentInvoice.delaiPaiement) wizardDelai.value = currentInvoice.delaiPaiement;
        }
        if (wizardMode) {
            wizardMode.addEventListener('change', function() {
                currentInvoice.modePaiement = this.value;
                updateInvoicePreview();
            });
            if (currentInvoice.modePaiement) wizardMode.value = currentInvoice.modePaiement;
        }
        if (stepNumberInput) {
            stepNumberInput.addEventListener('input', function() {
                currentInvoice.number = this.value;
                updateInvoicePreview();
            });
        }
    } catch (error) {
        console.error('Error rendering step 2:', error);
    }
}

function renderStep3() {
  const container = document.getElementById('wizardForms');
  if (!container) return;
  
  // Set defaults if not already set (safety check)
  if (currentInvoice.palettes === undefined) currentInvoice.palettes = 26;
  
  container.innerHTML = `
    <h6>Étape 3/5 - Références et Palettes</h6>
    <div class="row g-3">
      <div class="col-md-12">
        <label class="form-label">Nombre de palettes</label>
        <input id="inputPalettes" type="number" class="form-control" value="${currentInvoice.palettes}">
      </div>
      <div class="col-md-6">
        <label class="form-label">Références BL <small class="text-muted">(ex: BL001)</small></label>
        <input id="blReferences" class="form-control" list="datalistBL" value="${currentInvoice.blReferences||''}">
      </div>
      <div class="col-md-6">
        <label class="form-label">Référence Contrat</label>
        <input id="contratRef" class="form-control" list="datalistContrat" value="${currentInvoice.contratRef||''}">
      </div>
      <div class="col-md-6">
        <label class="form-label">Référence Bon de commande</label>
        <input id="bdcRef" class="form-control" list="datalistBDC" value="${currentInvoice.bdcRef||''}">
      </div>
      <div class="col-md-6">
        <label class="form-label">Réf. Feuille de route</label>
        <input id="refFeuilleRoute" class="form-control" list="datalistFeuilleRoute" value="${currentInvoice.refFeuilleRoute||''}">
      </div>
      <div class="col-md-6">
        <label class="form-label">Réf. Bon de transfert</label>
        <input id="refBonTransfert" class="form-control" list="datalistBonTransfert" value="${currentInvoice.refBonTransfert||''}">
      </div>
    </div>`;
  
  // Add event listeners
  ['inputPalettes','blReferences','contratRef','bdcRef', 'refFeuilleRoute', 'refBonTransfert'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => {
      switch (id) {
        case 'inputPalettes': currentInvoice.palettes = parseInt(el.value, 10) || 0; break;
        case 'blReferences': currentInvoice.blReferences = el.value; break;
        case 'contratRef': currentInvoice.contratRef = el.value; break;
        case 'bdcRef': currentInvoice.bdcRef = el.value; break;
        case 'refFeuilleRoute': currentInvoice.refFeuilleRoute = el.value; break;
        case 'refBonTransfert': currentInvoice.refBonTransfert = el.value; break;
      }
      updateInvoicePreview();
    });
  });
}

function renderStep4() {
    try {
        const container = document.getElementById('wizardForms');
        if (!container) return;
        
        const count = currentInvoice.articles ? currentInvoice.articles.length : 0;

        container.innerHTML = `
            <!-- Top Action Header -->
            <div class="p-3 mb-3 rounded-3 border bg-white d-flex justify-content-between align-items-center flex-wrap gap-2 shadow-sm">
                <div>
                    <div class="fw-bold text-dark d-flex align-items-center gap-2">
                        <i class="fa fa-layer-group text-primary"></i>
                        <span class="fs-6">Lignes & Frais Facturés</span>
                        <span class="badge bg-light text-dark border font-monospace" id="articleCountBadge">${count} ligne${count > 1 ? 's' : ''}</span>
                    </div>
                    <div class="text-muted small">Ajoutez du transport routier ou des frais d'attente et d'immobilisation.</div>
                </div>
                <div class="d-flex gap-2 flex-wrap">
                    <button type="button" class="btn btn-primary btn-sm px-3 shadow-sm fw-semibold" onclick="addArticle()">
                        <i class="fa fa-plus-circle me-1"></i> + Ligne Transport
                    </button>
                    <button type="button" class="btn btn-immo btn-sm px-3 shadow-sm fw-semibold" onclick="addImmobilisationArticle()">
                        <i class="fa fa-stopwatch me-1"></i> + Frais d'Immobilisation / Attente
                    </button>
                    <button type="button" class="btn btn-sm px-3 shadow-sm fw-semibold" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:white;" onclick="addLocationArticle()"><i class="fa fa-crane me-1"></i> + Location</button>
                </div>
            </div>

            <!-- Articles List -->
            <div id="articlesContainer"></div>

            <!-- Bottom Action Footer (Accessible without scrolling back up) -->
            <div class="p-3 mt-3 rounded-3 text-center border border-2 border-dashed bg-white shadow-sm">
                <div class="text-muted small fw-semibold mb-2">Ajouter une ligne supplémentaire à cette facture :</div>
                <div class="d-flex justify-content-center gap-2 flex-wrap">
                    <button type="button" class="btn btn-outline-primary btn-sm px-3 fw-semibold" onclick="addArticle()">
                        <i class="fa fa-plus-circle me-1"></i> + Ajouter Ligne Transport
                    </button>
                    <button type="button" class="btn btn-outline-immo btn-sm px-3 fw-semibold" onclick="addImmobilisationArticle()">
                        <i class="fa fa-stopwatch me-1"></i> + Ajouter Frais d'Immobilisation / Attente
                    </button>
                    <button type="button" class="btn btn-sm px-3 shadow-sm fw-semibold" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:white;" onclick="addLocationArticle()"><i class="fa fa-crane me-1"></i> + Location</button>
                </div>
            </div>
        `;
        
        renderArticles();
    } catch (error) {
        console.error('Error rendering step 4:', error);
    }
}

function renderStep5() {
    try {
        const container = document.getElementById('wizardForms');
        if (!container) return;
        
        container.innerHTML = `
            <h6>Étape 5/5 - Remise (optionnel)</h6>
            <div class="mb-3 form-check">
                <input class="form-check-input" type="checkbox" id="enableRemise" ${currentInvoice.remise.enabled ? 'checked' : ''}>
                <label class="form-check-label" for="enableRemise">Appliquer une remise</label>
            </div>
            <div id="remiseOptions" class="${currentInvoice.remise.enabled ? '' : 'd-none'}">
                <div class="row g-3">
                    <div class="col-md-6">
                        <label class="form-label">Type</label>
                        <select id="remiseType" class="form-control">
                            <option value="percentage" ${currentInvoice.remise.type === 'percentage' ? 'selected' : ''}>Pourcentage</option>
                            <option value="amount" ${currentInvoice.remise.type === 'amount' ? 'selected' : ''}>Montant</option>
                        </select>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Valeur</label>
                        <input type="number" id="remiseValue" class="form-control" value="${currentInvoice.remise.value}" min="0" step="0.01">
                    </div>
                </div>
            </div>
            ${typeof renderProformaConditions === 'function' ? renderProformaConditions() : ''}
        `;
        
        const enableRemise = document.getElementById('enableRemise');
        const remiseType = document.getElementById('remiseType');
        const remiseValue = document.getElementById('remiseValue');
        
        if (enableRemise) {
            enableRemise.addEventListener('change', function() {
                const remiseOptions = document.getElementById('remiseOptions');
                if (remiseOptions) {
                    remiseOptions.classList.toggle('d-none', !this.checked);
                }
                currentInvoice.remise.enabled = this.checked;
                updateInvoicePreview();
            });
        }
        
        if (remiseType) {
            remiseType.addEventListener('change', function() {
                currentInvoice.remise.type = this.value;
                updateInvoicePreview();
            });
        }
        
        if (remiseValue) {
            remiseValue.addEventListener('input', function() {
                currentInvoice.remise.value = parseFloat(this.value) || 0;
                updateInvoicePreview();
            });
        }
    } catch (error) {
        console.error('Error rendering step 5:', error);
    }
}

function addArticle() {
    try {
        if (!currentInvoice.articles) {
            currentInvoice.articles = [];
        }
        const newNo = currentInvoice.articles.length + 1;
        
        const mois = currentInvoice.date ? 
            new Date(currentInvoice.date).toLocaleDateString('fr-FR', {month:'long'}) : 
            new Date().toLocaleDateString('fr-FR', {month:'long'});
        
        const defaultDesignation = `<b>Prestation de transport routier pour le mois de ${mois.charAt(0).toUpperCase() + mois.slice(1)}</b><br>`;
        
        // ✅ HERE: Auto-select the destination from Step 1
        const defaultDest = currentInvoice.doitADestination || '';

        currentInvoice.articles.push({
            no: newNo,
            isImmobilisation: false,
            pricingType: 'Transport',
            designation: defaultDesignation,
            qte: 1,
            prixUHT: 0,
            montantHT: 0,
            wilayaDepart: '',
            wilayaDestination: '',
            selectedDestination: defaultDest // ✅ Auto-selected
        });
        renderArticles();
        updateInvoicePreview();
    } catch (error) {
        console.error('Error adding article:', error);
    }
}

window.addImmobilisationArticle = function() {
    try {
        if (!currentInvoice.articles) {
            currentInvoice.articles = [];
        }
        const newNo = currentInvoice.articles.length + 1;
        const rate = settings.defaultImmoRate || 2500;

        const newArt = {
            no: newNo,
            isImmobilisation: true,
            pricingType: 'Immobilisation',
            immoTitle: "Frais d'attente et d'immobilisation",
            immoStage: 'dechargement',
            immoTruckCount: 1,
            matricule: '',
            immoDriver: '',
            immoPeriod: '',
            immoLocation: '',
            immoSiteChargement: '',
            immoSiteDechargement: '',
            immoReason: 'Attente déchargement chez client',
            designation: '',
            qte: 8,
            prixUHT: rate,
            montantHT: rate * 8,
            wilayaDepart: '',
            wilayaDestination: '',
            selectedDestination: ''
        };
        currentInvoice.articles.push(newArt);
        updateImmobilisationDesignation(currentInvoice.articles.length - 1);
        renderArticles();
        const badge = document.getElementById('articleCountBadge');
        if (badge) badge.textContent = `${currentInvoice.articles.length} ligne${currentInvoice.articles.length > 1 ? 's' : ''}`;
        updateInvoicePreview();
    } catch (error) {
        console.error('Error adding immobilisation article:', error);
    }
};

window.duplicateArticle = function(index) {
    try {
        if (!currentInvoice.articles || !currentInvoice.articles[index]) return;
        const orig = currentInvoice.articles[index];
        const clone = JSON.parse(JSON.stringify(orig));
        currentInvoice.articles.splice(index + 1, 0, clone);
        currentInvoice.articles.forEach((a, i) => a.no = i + 1);
        renderArticles();
        const badge = document.getElementById('articleCountBadge');
        if (badge) badge.textContent = `${currentInvoice.articles.length} ligne${currentInvoice.articles.length > 1 ? 's' : ''}`;
        updateInvoicePreview();
    } catch (error) {
        console.error('Error duplicating article:', error);
    }
};

window.setArticleStage = function(index, stage) {
    if (!currentInvoice.articles || !currentInvoice.articles[index]) return;
    const art = currentInvoice.articles[index];
    art.immoStage = stage;
    if (stage === 'chargement') {
        art.immoReason = 'Attente chargement usine / fournisseur';
    } else if (stage === 'dechargement') {
        art.immoReason = 'Attente déchargement chez client';
    } else if (stage === 'both') {
        art.immoReason = 'Attente chargement et déchargement';
    }
    updateImmobilisationDesignation(index);
    renderArticles();
    updateInvoicePreview();
};

window.setArticleType = function(index, type) {
    if (!currentInvoice.articles || !currentInvoice.articles[index]) return;
    const article = currentInvoice.articles[index];
    if (type === 'immobilisation') {
        article.isLocation = false;
        article.isImmobilisation = true;
        article.pricingType = 'Immobilisation';
        if (!article.immoTitle) article.immoTitle = "Frais d'attente et d'immobilisation";
        if (!article.immoStage) article.immoStage = 'dechargement';
        if (!article.immoTruckCount) article.immoTruckCount = 1;
        if (!article.qte || article.qte < 1) article.qte = 8;
        if (!article.prixUHT || article.prixUHT === 0) article.prixUHT = settings.defaultImmoRate || 2500;
        if (!article.immoReason) article.immoReason = 'Attente déchargement chez client';
        article.montantHT = (parseFloat(article.qte) || 0) * (parseFloat(article.prixUHT) || 0);
        updateImmobilisationDesignation(index);
    } else if (type === 'location') {
        article.isLocation = true;
        article.isImmobilisation = false;
        article.pricingType = 'Location';
        if (!article.locEquipment) article.locEquipment = (settings.locationEquipmentTypes || 'Grue 25T').split(',')[0].trim();
        if (!article.qte || article.qte < 1) article.qte = 1;
        if (!article.prixUHT || article.prixUHT === 0) article.prixUHT = settings.defaultLocationRate || 150000;
        article.montantHT = (parseFloat(article.qte) || 0) * (parseFloat(article.prixUHT) || 0);
        updateLocationDesignation(index);
    } else {
        article.isLocation = false;
        article.isImmobilisation = false;
        article.pricingType = 'Transport';
        updateArticleDesignation(index);
    }
    renderArticles();
    updateInvoicePreview();
};

window.setArticleHours = function(index, hours) {
    if (!currentInvoice.articles || !currentInvoice.articles[index]) return;
    const article = currentInvoice.articles[index];
    article.qte = parseFloat(hours) || 1;
    article.montantHT = article.qte * (parseFloat(article.prixUHT) || 0);
    
    const qteInput = document.querySelector(`input[data-field="qte"][data-index="${index}"]`);
    if (qteInput) qteInput.value = article.qte;
    const montantInput = document.querySelector(`input[data-field="montantHT"][data-index="${index}"]`);
    if (montantInput) montantInput.value = article.montantHT;
    
    updateImmobilisationDesignation(index);
    updateInvoicePreview();
};

window.updateImmobilisationDesignation = function(index) {
    if (!currentInvoice.articles || !currentInvoice.articles[index]) return;
    const art = currentInvoice.articles[index];
    
    const immoTitle = (art.immoTitle && art.immoTitle.trim()) ? art.immoTitle.trim() : "Frais d'attente et d'immobilisation";

    let stageTitle = "au Déchargement";
    if (art.immoStage === 'chargement') stageTitle = "au Chargement";
    else if (art.immoStage === 'both') stageTitle = "au Chargement & Déchargement";
    else if (art.immoStage === 'autre') stageTitle = "";

    let headerLine = stageTitle ? `<b>${immoTitle} ${stageTitle}</b>` : `<b>${immoTitle}</b>`;
    let des = headerLine.trim() + `<br>`;

    // Sites / Lieu
    if (art.immoStage === 'chargement' && art.immoSiteChargement && art.immoSiteChargement.trim()) {
        des += `-Lieu / Site de chargement : <b>${art.immoSiteChargement.trim()}</b><br>`;
    } else if (art.immoStage === 'dechargement' && art.immoSiteDechargement && art.immoSiteDechargement.trim()) {
        des += `-Lieu / Site de déchargement : <b>${art.immoSiteDechargement.trim()}</b><br>`;
    } else if (art.immoStage === 'both') {
        if (art.immoSiteChargement && art.immoSiteChargement.trim()) {
            des += `-Site chargement : <b>${art.immoSiteChargement.trim()}</b><br>`;
        }
        if (art.immoSiteDechargement && art.immoSiteDechargement.trim()) {
            des += `-Site déchargement : <b>${art.immoSiteDechargement.trim()}</b><br>`;
        }
    } else if (art.immoLocation && art.immoLocation.trim()) {
        des += `-Lieu / Site : ${art.immoLocation.trim()}<br>`;
    }

    // Camion(s) / Flotte - Chaque camion va sur sa propre ligne !
    const rawTrucks = (art.matricule || '').split(/[\r\n,;/]+/).map(t => t.trim()).filter(Boolean);
    const truckCount = Math.max(rawTrucks.length, parseInt(art.immoTruckCount, 10) || 1);

    if (rawTrucks.length > 1) {
        des += `-Véhicules immobilisés (${rawTrucks.length} camions) :<br>`;
        rawTrucks.forEach((trk, idx) => {
            des += `&nbsp;&nbsp;&nbsp;&nbsp;• Camion N°${idx + 1} : <b>${trk}</b><br>`;
        });
    } else if (rawTrucks.length === 1) {
        des += `-Camion / Remorque : <b>${rawTrucks[0]}</b><br>`;
    } else if (truckCount > 1) {
        des += `-Flotte mobilisée : <b>${truckCount} camions</b><br>`;
    }

    if (art.immoDriver && art.immoDriver.trim()) {
        des += `-Chauffeur / Réf : ${art.immoDriver.trim()}<br>`;
    }
    if (art.immoPeriod && art.immoPeriod.trim()) {
        des += `-Période : ${art.immoPeriod.trim()}<br>`;
    }
    if (art.immoReason && art.immoReason.trim()) {
        des += `-Motif : ${art.immoReason.trim()}<br>`;
    }
    const h = parseFloat(art.qte) || 0;
    if (h > 0) {
        des += `-Total Heures Facturées : <b>${h} Heure${h > 1 ? 's' : ''}</b>`;
    }

    art.designation = des;
    const textarea = document.querySelector(`textarea[data-field="designation"][data-index="${index}"]`);
    if (textarea) textarea.value = des;
};

window.saveImmoRateFromArticle = function(index) {
    const article = currentInvoice.articles[index];
    if (!article) return;
    const rate = parseFloat(article.prixUHT) || 2500;
    settings.defaultImmoRate = rate;
    saveDataToLocalStorage();
    alert(`✅ Tarif horaire par défaut mis à jour : ${rate.toLocaleString('fr-DZ')} DA / heure`);
};

function removeArticle(index) {
    try {
        if (currentInvoice.articles && currentInvoice.articles.length > 1) {
            currentInvoice.articles.splice(index, 1);
            currentInvoice.articles.forEach((article, idx) => {
                article.no = idx + 1;
            });
            renderArticles();
            const badge = document.getElementById('articleCountBadge');
            if (badge) badge.textContent = `${currentInvoice.articles.length} ligne${currentInvoice.articles.length > 1 ? 's' : ''}`;
            updateInvoicePreview();
        }
    } catch (error) {
        console.error('Error removing article:', error);
    }
}

function renderArticles() {
    try {
        const container = document.getElementById('articlesContainer');
        if (!container || !currentInvoice.articles) return;
        
        container.innerHTML = '';
        
        const countBadge = document.getElementById('articleCountBadge');
        if (countBadge) {
            countBadge.textContent = `${currentInvoice.articles.length} ligne${currentInvoice.articles.length > 1 ? 's' : ''}`;
        }
        
        currentInvoice.articles.forEach((article, index) => {
            const isImmo = !!article.isImmobilisation || (article.pricingType && article.pricingType.toLowerCase().includes('immobilis'));
            const isLoc = !!article.isLocation || (article.pricingType && article.pricingType.toLowerCase() === 'location');
            
            // Client destinations
            const client = clients.find(c => c.id === currentInvoice.clientId);
            const destinationOptions = client && client.destinations ? 
                client.destinations.map(dest => `<option value="${dest}" ${article.selectedDestination === dest ? 'selected' : ''}>${dest}</option>`).join('') : 
                '<option value="">Aucune destination disponible</option>';
            
            const div = document.createElement('div');
            div.className = isImmo ? 'article-card-base article-card-immo' : (isLoc ? 'article-card-base' : 'article-card-base article-card-transport');
            if (isLoc) div.style.borderLeftColor = '#f59e0b';
            
            const typeBar = `
                <div class="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom flex-wrap gap-2">
                    <div class="d-flex align-items-center gap-2">
                        <span class="${isImmo ? 'badge-immo' : (isLoc ? 'badge' : 'badge bg-primary')} fs-6 px-2 py-1 shadow-sm" style="${isLoc ? 'background:#fef3c7;color:#92400e;' : ''}">
                            ${isImmo ? '<i class="fa fa-stopwatch me-1"></i>Ligne ' + article.no + ' • Frais d\'Attente / Immobilisation' : (isLoc ? '<i class="fa fa-crane me-1"></i>Ligne ' + article.no + ' • Location' : '<i class="fa fa-truck me-1"></i>Ligne ' + article.no + ' • Transport')}
                        </span>
                        <div class="btn-group btn-group-sm" role="group">
                            <button type="button" class="btn ${!isImmo && !isLoc ? 'btn-primary' : 'btn-outline-secondary'}" onclick="setArticleType(${index}, 'transport')">
                                <i class="fa fa-truck me-1"></i>Transport
                            </button>
                            <button type="button" class="btn ${isImmo ? 'btn-immo' : 'btn-outline-secondary'}" onclick="setArticleType(${index}, 'immobilisation')">
                                <i class="fa fa-stopwatch me-1"></i>Immobilisation
                            </button>
                            <button type="button" class="btn ${isLoc ? 'btn-primary' : 'btn-outline-secondary'}" style="${isLoc ? 'background:linear-gradient(135deg,#f59e0b,#d97706);color:white;border:none;' : ''}" onclick="setArticleType(${index}, 'location')">
                                <i class="fa fa-crane me-1"></i>Location
                            </button>
                        </div>
                    </div>
                    <div class="d-flex align-items-center gap-1">
                        <button type="button" class="btn btn--sm btn--outline text-secondary" onclick="duplicateArticle(${index})" title="Dupliquer cette ligne">
                            <i class="fa fa-copy me-1"></i>Dupliquer
                        </button>
                        <button type="button" class="btn btn--sm btn--outline text-danger" onclick="removeArticle(${index})" ${currentInvoice.articles.length <= 1 ? 'disabled' : ''} title="Supprimer cette ligne">
                            <i class="fa fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            
            let articleFieldsHtml = '';
            
            if (isImmo) {
                const stage = article.immoStage || 'dechargement';
                const currentTitle = article.immoTitle || "Frais d'attente et d'immobilisation";

                // Dynamic location fields depending on stage
                let locationInputsHtml = '';
                if (stage === 'both') {
                    locationInputsHtml = `
                        <div class="col-md-6">
                            <label class="form-label small fw-bold text-muted mb-1"><i class="fa fa-warehouse text-primary me-1"></i>Site de Chargement (Usine/Port/Dépôt)</label>
                            <input type="text" class="form-control form-control-sm" data-field="immoSiteChargement" data-index="${index}" placeholder="Ex: Usine El Eulma / Port..." value="${article.immoSiteChargement || ''}">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label small fw-bold text-muted mb-1"><i class="fa fa-boxes-packing text-primary me-1"></i>Site de Déchargement (Client/Chantier)</label>
                            <input type="text" class="form-control form-control-sm" data-field="immoSiteDechargement" data-index="${index}" placeholder="Ex: Dépôt Client Oran / Chantier..." value="${article.immoSiteDechargement || ''}">
                        </div>
                    `;
                } else if (stage === 'chargement') {
                    locationInputsHtml = `
                        <div class="col-12">
                            <label class="form-label small fw-bold text-muted mb-1"><i class="fa fa-warehouse text-primary me-1"></i>Lieu / Site de Chargement</label>
                            <input type="text" class="form-control form-control-sm" data-field="immoSiteChargement" data-index="${index}" placeholder="Ex: Usine Sétif / Quai chargement..." value="${article.immoSiteChargement || ''}">
                        </div>
                    `;
                } else if (stage === 'autre') {
                    locationInputsHtml = `
                        <div class="col-12">
                            <label class="form-label small fw-bold text-muted mb-1"><i class="fa fa-map-marker-alt text-primary me-1"></i>Lieu / Emplacement d'Immobilisation</label>
                            <input type="text" class="form-control form-control-sm" data-field="immoLocation" data-index="${index}" placeholder="Ex: Poste frontalier / Douane / Route..." value="${article.immoLocation || ''}">
                        </div>
                    `;
                } else {
                    locationInputsHtml = `
                        <div class="col-12">
                            <label class="form-label small fw-bold text-muted mb-1"><i class="fa fa-boxes-packing text-primary me-1"></i>Lieu / Site de Déchargement (Client / Chantier)</label>
                            <input type="text" class="form-control form-control-sm" data-field="immoSiteDechargement" data-index="${index}" placeholder="Ex: Entrepôt Client Biskra / Chantier..." value="${article.immoSiteDechargement || article.immoLocation || ''}">
                        </div>
                    `;
                }

                // Parse trucks for badges display
                const rawTrucks = (article.matricule || '').split(/[\r\n,;/]+/).map(t => t.trim()).filter(Boolean);
                let truckBadgesHtml = '';
                if (rawTrucks.length > 0) {
                    truckBadgesHtml = `
                        <div class="d-flex flex-wrap gap-1 mt-1 align-items-center" id="truckBadges_${index}">
                            <span class="small text-muted me-1" style="font-size:0.75rem;"><i class="fa fa-check-circle text-success me-1"></i>${rawTrucks.length} camion${rawTrucks.length > 1 ? 's' : ''} détecté${rawTrucks.length > 1 ? 's' : ''} :</span>
                            ${rawTrucks.map(t => `<span class="truck-tag-badge">${t}</span>`).join('')}
                        </div>
                    `;
                } else {
                    truckBadgesHtml = `<div class="d-flex flex-wrap gap-1 mt-1 align-items-center" id="truckBadges_${index}"></div>`;
                }

                articleFieldsHtml = `
                    <!-- 1. Intitulé & Étape -->
                    <div class="row g-2 mb-2 align-items-center">
                        <div class="col-md-6">
                            <label class="form-label small fw-bold text-muted mb-1">
                                <i class="fa fa-heading text-primary me-1"></i>Intitulé commercial sur facture *
                            </label>
                            <select class="form-select form-select-sm fw-semibold" data-field="immoTitle" data-index="${index}">
                                <option value="Frais d'attente et d'immobilisation" ${currentTitle === "Frais d'attente et d'immobilisation" ? 'selected' : ''}>Frais d'attente et d'immobilisation (Recommandé)</option>
                                <option value="Frais d'immobilisation de matériel roulant" ${currentTitle === "Frais d'immobilisation de matériel roulant" ? 'selected' : ''}>Frais d'immobilisation de matériel roulant</option>
                                <option value="Indemnité d'attente et d'immobilisation" ${currentTitle === "Indemnité d'attente et d'immobilisation" ? 'selected' : ''}>Indemnité d'attente et d'immobilisation</option>
                                <option value="Frais de détention / surestaries" ${currentTitle === "Frais de détention / surestaries" ? 'selected' : ''}>Frais de détention / surestaries</option>
                            </select>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label small fw-bold text-muted mb-1">
                                <i class="fa fa-layer-group text-primary me-1"></i>Étape d'immobilisation
                            </label>
                            <div class="d-flex flex-wrap gap-1">
                                <button type="button" class="immo-stage-pill ${stage === 'dechargement' ? 'active' : ''}" onclick="setArticleStage(${index}, 'dechargement')">
                                    <i class="fa fa-boxes-packing"></i> Au Déchargement
                                </button>
                                <button type="button" class="immo-stage-pill ${stage === 'chargement' ? 'active' : ''}" onclick="setArticleStage(${index}, 'chargement')">
                                    <i class="fa fa-warehouse"></i> Au Chargement
                                </button>
                                <button type="button" class="immo-stage-pill ${stage === 'both' ? 'active' : ''}" onclick="setArticleStage(${index}, 'both')">
                                    <i class="fa fa-rotate"></i> Les deux
                                </button>
                                <button type="button" class="immo-stage-pill ${stage === 'autre' ? 'active' : ''}" onclick="setArticleStage(${index}, 'autre')">
                                    <i class="fa fa-ellipsis"></i> Autre / Transit
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- 2. Sites / Locations Row -->
                    <div class="row g-2 mb-2">
                        ${locationInputsHtml}
                    </div>

                    <!-- 3. Flotte / Camions (Multi-lignes supporté !) -->
                    <div class="row g-2 mb-2">
                        <div class="col-md-6">
                            <label class="form-label small fw-bold text-muted mb-1 d-flex justify-content-between align-items-center">
                                <span><i class="fa fa-truck me-1" style="color: var(--immo-primary);"></i>Camion(s) / Matricule(s) <span class="badge bg-light text-secondary border font-monospace">Un par ligne</span></span>
                                <small class="text-muted">Chacun ira à la ligne sur la facture</small>
                            </label>
                            <textarea class="form-control form-control-sm font-monospace" rows="2" data-field="matricule" data-index="${index}" placeholder="Ex:&#10;01234-116-16&#10;05678-116-16">${article.matricule || ''}</textarea>
                            ${truckBadgesHtml}
                        </div>
                        <div class="col-md-3">
                            <label class="form-label small fw-bold text-muted mb-1"><i class="fa fa-calendar-alt me-1 text-muted"></i>Période d'attente</label>
                            <input type="text" class="form-control form-control-sm" data-field="immoPeriod" data-index="${index}" placeholder="Ex: Du 12/06 au 14/06" value="${article.immoPeriod || ''}">
                        </div>
                        <div class="col-md-3">
                            <label class="form-label small fw-bold text-muted mb-1"><i class="fa fa-user me-1 text-muted"></i>Chauffeur / Réf BL</label>
                            <input type="text" class="form-control form-control-sm" data-field="immoDriver" data-index="${index}" placeholder="Ex: Chauffeur ou Réf dossier..." value="${article.immoDriver || ''}">
                        </div>
                    </div>

                    <!-- 4. Motif -->
                    <div class="row g-2 mb-2">
                        <div class="col-12">
                            <label class="form-label small fw-bold text-muted mb-1"><i class="fa fa-exclamation-circle text-primary me-1"></i>Motif d'attente / Immobilisation *</label>
                            <input type="text" class="form-control form-control-sm" data-field="immoReason" data-index="${index}" list="datalistImmoMotif" placeholder="Sélectionnez ou tapez le motif..." value="${article.immoReason || 'Attente déchargement chez client'}">
                        </div>
                    </div>

                    <!-- 5. Désignation facturée -->
                    <div class="row g-2 mb-2">
                        <div class="col-12">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <label class="form-label small fw-bold text-muted mb-0">Désignation générée pour la facture *</label>
                                <button type="button" class="btn btn-link btn-xs p-0 text-decoration-none fw-semibold" onclick="updateImmobilisationDesignation(${index})">
                                    <i class="fa fa-sync-alt me-1"></i>Régénérer automatiquement
                                </button>
                            </div>
                            <textarea class="form-control" rows="3" data-field="designation" data-index="${index}" required>${article.designation || ''}</textarea>
                        </div>
                    </div>

                    <!-- 6. Durée, Taux et Montant -->
                    <div class="row g-2 align-items-end">
                        <div class="col-md-5">
                            <label class="form-label small fw-bold mb-1" style="color: var(--immo-primary);"><i class="fa fa-clock me-1"></i>Durée totale en Heures *</label>
                            <input type="number" class="form-control fw-bold" style="border-color: var(--immo-primary);" data-field="qte" data-index="${index}" value="${article.qte || 8}" min="0.5" step="0.5" required>
                            <div class="d-flex gap-1 mt-1 flex-wrap">
                                <button type="button" class="hour-preset-btn" onclick="setArticleHours(${index}, 4)">+4h</button>
                                <button type="button" class="hour-preset-btn" onclick="setArticleHours(${index}, 8)">+8h (1j)</button>
                                <button type="button" class="hour-preset-btn" onclick="setArticleHours(${index}, 12)">+12h</button>
                                <button type="button" class="hour-preset-btn" onclick="setArticleHours(${index}, 24)">+24h (1j)</button>
                                <button type="button" class="hour-preset-btn" onclick="setArticleHours(${index}, 48)">+48h (2j)</button>
                                <button type="button" class="hour-preset-btn" onclick="setArticleHours(${index}, 72)">+72h (3j)</button>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label small fw-bold text-muted mb-1">Taux Horaire HT (DA/h) *</label>
                            <div class="input-group">
                                <input type="number" class="form-control fw-bold" data-field="prixUHT" data-index="${index}" value="${article.prixUHT || settings.defaultImmoRate || 2500}" min="0" step="50" required>
                                <button class="btn btn-success" type="button" onclick="saveImmoRateFromArticle(${index})" title="Mémoriser ce tarif horaire par défaut">
                                    <i class="fa fa-save"></i>
                                </button>
                            </div>
                            <small class="text-muted" style="font-size:0.75rem;">Base système: ${(settings.defaultImmoRate || 2500).toLocaleString('fr-DZ')} DA/h</small>
                        </div>
                        <div class="col-md-3">
                            <label class="form-label small fw-bold text-muted mb-1">Montant Ligne HT (DA)</label>
                            <input type="number" class="form-control fw-bold bg-light" data-field="montantHT" data-index="${index}" value="${article.montantHT || 0}" readonly>
                        </div>
                    </div>
                `;
            } else if (isLoc) {
                // Location article fields
                const equipTypes = (settings.locationEquipmentTypes || 'Grue 25T, Grue 50T, Grue 75T').split(',').map(t => t.trim());
                let eqHtml = '';
                equipTypes.forEach(t => { eqHtml += `<option value="${t}" ${t===article.locEquipment?'selected':''}>${t}</option>`; });
                
                articleFieldsHtml = `
                    <div class="row g-2 mb-2">
                        <div class="col-md-4">
                            <label class="form-label small fw-bold text-muted mb-1"><i class="fa fa-cogs text-warning me-1"></i>Type d'équipement *</label>
                            <select class="form-select form-select-sm" data-field="locEquipment" data-index="${index}" required>${eqHtml}</select>
                        </div>
                        <div class="col-md-8">
                            <label class="form-label small fw-bold text-muted mb-1"><i class="fa fa-map-marker-alt text-warning me-1"></i>Site / Chantier</label>
                            <input type="text" class="form-control form-control-sm" data-field="locSite" data-index="${index}" placeholder="Ex: Base vie Sonatrach Hassi Messaoud..." value="${article.locSite || ''}">
                        </div>
                    </div>
                    <div class="row g-2 mb-2 align-items-end">
                        <div class="col-md-3">
                            <label class="form-label small fw-bold text-muted mb-1">Du *</label>
                            <input type="date" class="form-control form-control-sm" data-field="locPeriodStart" data-index="${index}" value="${article.locPeriodStart || ''}">
                        </div>
                        <div class="col-md-3">
                            <label class="form-label small fw-bold text-muted mb-1">Au *</label>
                            <input type="date" class="form-control form-control-sm" data-field="locPeriodEnd" data-index="${index}" value="${article.locPeriodEnd || ''}">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label small fw-bold text-muted mb-1">Opérateur / Chauffeur / Réf</label>
                            <input type="text" class="form-control form-control-sm" data-field="locDriver" data-index="${index}" placeholder="Ex: Mr. Ali - Permis 12345" value="${article.locDriver || ''}">
                        </div>
                    </div>
                    <div class="row g-2 mb-2">
                        <div class="col-12">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <label class="form-label small fw-bold text-muted mb-0">Désignation facturée *</label>
                                <button type="button" class="btn btn-link btn-xs p-0 text-decoration-none fw-semibold text-warning" onclick="updateLocationDesignation(${index})"><i class="fa fa-sync-alt me-1"></i>Régénérer</button>
                            </div>
                            <textarea class="form-control form-control-sm" rows="3" data-field="designation" data-index="${index}" required>${article.designation || ''}</textarea>
                        </div>
                    </div>
                    <div class="row g-2 align-items-end">
                        <div class="col-md-4">
                            <label class="form-label small fw-bold text-muted mb-1">Jours facturés *</label>
                            <input type="number" class="form-control fw-bold" data-field="qte" data-index="${index}" value="${article.qte || 1}" min="0.5" step="0.5" required>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label small fw-bold text-muted mb-1">Taux Journalier HT *</label>
                            <div class="input-group">
                                <input type="number" class="form-control fw-bold" data-field="prixUHT" data-index="${index}" value="${article.prixUHT || settings.defaultLocationRate || 150000}" min="0" required>
                                <span class="input-group-text">DA/j</span>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label small fw-bold text-muted mb-1">Montant Ligne HT</label>
                            <input type="number" class="form-control fw-bold bg-light" data-field="montantHT" data-index="${index}" value="${article.montantHT || 0}" readonly>
                        </div>
                    </div>
                `;
            } else {
                articleFieldsHtml = `
                    <div class="row g-2 mb-2">
                        <div class="col-md-4">
                            <label class="form-label small fw-bold text-muted mb-1">Wilaya de départ *</label>
                            <select class="form-select form-select-sm wilaya-depart-select" data-field="wilayaDepart" data-index="${index}" required>
                                <option value="">Sélectionner départ</option>
                                ${wilayas.map(w => `<option value="${w}" ${w===article.wilayaDepart?'selected':''}>${w}</option>`).join('')}
                            </select>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label small fw-bold text-muted mb-1">Wilaya de destination *</label>
                            <select class="form-select form-select-sm wilaya-dest-select" data-field="wilayaDestination" data-index="${index}" required>
                                <option value="">Sélectionner destination</option>
                                ${wilayas.map(w => `<option value="${w}" ${w===article.wilayaDestination?'selected':''}>${w}</option>`).join('')}
                            </select>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label small fw-bold text-muted mb-1">Destination client</label>
                            <select class="form-select form-select-sm" data-field="selectedDestination" data-index="${index}">
                                <option value="">Aucune destination</option>
                                ${destinationOptions}
                            </select>
                        </div>
                    </div>
                    
                    <div class="row g-2 mb-2 align-items-center">
                        <div class="col-md-4">
                            <label class="form-label small fw-bold text-primary mb-1">Tarification *</label>
                            <select class="form-select form-select-sm type-tarification-select" data-field="pricingType" data-index="${index}" required>
                                <option value="">Sélectionner un type</option>
                                ${(settings.pricingTypes || 'Transport').split(',').map(t => `<option value="${t.trim()}" ${t.trim() === article.pricingType ? 'selected' : ''}>${t.trim()}</option>`).join('')}
                            </select>
                        </div>
                        <div class="col-md-8 pt-3">
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" data-field="showTypeInDesignation" data-index="${index}" id="showType_${index}" ${article.showTypeInDesignation ? 'checked' : ''}>
                                <label class="form-check-label small text-muted" for="showType_${index}">
                                    Afficher le type dans la désignation (ex: Prestation... (Transfert))
                                </label>
                            </div>
                        </div>
                    </div>
                    
                    <div class="row g-2 mb-2">
                        <div class="col-12">
                            <label class="form-label small fw-bold text-muted mb-1">Désignation sur facture *</label>
                            <textarea class="form-control form-control-sm" rows="3" data-field="designation" data-index="${index}" required>${article.designation || ''}</textarea>
                        </div>
                    </div>
                    
                    <div class="row g-2 align-items-end">
                        <div class="col-md-3">
                            <label class="form-label small fw-bold text-muted mb-1">Quantité *</label>
                            <input type="number" class="form-control form-control-sm" data-field="qte" data-index="${index}" value="${article.qte || 1}" min="1" required>
                        </div>
                        <div class="col-md-5">
                            <label class="form-label small fw-bold text-muted mb-1">Prix U HT *</label>
                            <div class="input-group input-group-sm">
                                <input type="number" class="form-control" data-field="prixUHT" data-index="${index}" value="${article.prixUHT || 0}" min="0" step="0.01" required>
                                <button class="btn btn-success" type="button" onclick="savePriceFromArticle(${index})" title="Mémoriser ce prix">
                                    <i class="fa fa-save"></i>
                                </button>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label small fw-bold text-muted mb-1">Montant HT</label>
                            <input type="number" class="form-control form-control-sm fw-bold bg-light" data-field="montantHT" data-index="${index}" value="${article.montantHT || 0}" readonly>
                        </div>
                    </div>
                `;
            }
            
            div.innerHTML = typeBar + articleFieldsHtml;
            container.appendChild(div);
        });
        
        // Listeners selects
        container.querySelectorAll('select[data-field]').forEach(select => {
            select.addEventListener('change', function() {
                const index = parseInt(this.dataset.index);
                const field = this.dataset.field;
                
                if (currentInvoice.articles && currentInvoice.articles[index]) {
                    currentInvoice.articles[index][field] = this.value;
                    
                    if (field === 'immoTitle') {
                        updateImmobilisationDesignation(index);
                    } else if (field === 'locEquipment') {
                        updateLocationDesignation(index);
                    } else if (['wilayaDepart', 'wilayaDestination', 'selectedDestination', 'pricingType'].includes(field)) {
                        updateArticleDesignation(index);
                    }
                    if (['wilayaDepart', 'wilayaDestination', 'pricingType'].includes(field)) {
                        autoFillArticlePrice(index);
                    }
                    updateInvoicePreview();
                }
            });
        });

        // Listeners checkbox
        container.querySelectorAll('input[type="checkbox"][data-field]').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const index = parseInt(this.dataset.index);
                if (currentInvoice.articles && currentInvoice.articles[index]) {
                    currentInvoice.articles[index][this.dataset.field] = this.checked;
                    updateArticleDesignation(index);
                    updateInvoicePreview();
                }
            });
        });
        
        // Listeners inputs & textareas
        container.querySelectorAll('input[data-field]:not([type="checkbox"]), textarea[data-field]').forEach(input => {
            input.addEventListener('input', function() {
                const index = parseInt(this.dataset.index);
                const field = this.dataset.field;
                const value = this.type === 'number' ? parseFloat(this.value) || 0 : this.value;
                
                if (currentInvoice.articles && currentInvoice.articles[index]) {
                    const article = currentInvoice.articles[index];
                    article[field] = value;
                    
                    if (field === 'qte' || field === 'prixUHT') {
                        article.montantHT = (parseFloat(article.qte) || 0) * (parseFloat(article.prixUHT) || 0);
                        const montantInput = container.querySelector(`[data-field="montantHT"][data-index="${index}"]`);
                        if (montantInput) montantInput.value = article.montantHT;
                    }

                    if (article.isImmobilisation) {
                        if (field === 'matricule') {
                            const rawTrucks = (article.matricule || '').split(/[\r\n,;/]+/).map(t => t.trim()).filter(Boolean);
                            article.immoTruckCount = Math.max(rawTrucks.length, 1);
                            
                            // Update live truck badges in UI without full re-render
                            const badgeContainer = document.getElementById(`truckBadges_${index}`);
                            if (badgeContainer) {
                                if (rawTrucks.length > 0) {
                                    badgeContainer.innerHTML = `
                                        <span class="small text-muted me-1" style="font-size:0.75rem;"><i class="fa fa-check-circle text-success me-1"></i>${rawTrucks.length} camion${rawTrucks.length > 1 ? 's' : ''} détecté${rawTrucks.length > 1 ? 's' : ''} :</span>
                                        ${rawTrucks.map(t => `<span class="truck-tag-badge">${t}</span>`).join('')}
                                    `;
                                } else {
                                    badgeContainer.innerHTML = '';
                                }
                            }
                        }

                        if (['matricule', 'immoTruckCount', 'immoTitle', 'immoDriver', 'immoLocation', 'immoSiteChargement', 'immoSiteDechargement', 'immoPeriod', 'immoReason', 'qte'].includes(field)) {
                            updateImmobilisationDesignation(index);
                        }
                    } else if (article.isLocation) {
                        if (['locSite', 'locPeriodStart', 'locPeriodEnd', 'locDriver', 'qte'].includes(field)) {
                            updateLocationDesignation(index);
                        }
                    }
                    
                    updateInvoicePreview();
                }
            });

            // Smart save prix on blur
            if (input.dataset.field === 'prixUHT') {
                input.addEventListener('blur', function() {
                    const index = parseInt(this.dataset.index);
                    const article = currentInvoice.articles[index];
                    if (article.isImmobilisation) return;
                    const value = parseFloat(this.value) || 0;

                    if (value > 0 && currentInvoice.clientId && article.wilayaDepart && article.wilayaDestination) {
                        const cid = currentInvoice.clientId;
                        const type = article.pricingType || 'Défaut';
                        const key = `${article.wilayaDepart}|${article.wilayaDestination}|${type}`;
                        
                        if (!settings.smartMemory) settings.smartMemory = {};
                        if (!settings.smartMemory.priceTracker) settings.smartMemory.priceTracker = {};
                        
                        const trackerKey = `${cid}|${key}|${value}`;
                        settings.smartMemory.priceTracker[trackerKey] = (settings.smartMemory.priceTracker[trackerKey] || 0) + 1;
                        
                        if (settings.smartMemory.priceTracker[trackerKey] >= 2) {
                            if (!clientWilayaPairPrices[cid]) clientWilayaPairPrices[cid] = {};
                            clientWilayaPairPrices[cid][key] = value;
                            saveDataToLocalStorage();
                        }
                    }
                });
            }
        });

    } catch (error) {
        console.error('Error rendering articles:', error);
    }
}

// Function triggered by the Save button in the UI
window.savePriceFromArticle = function(index) {
    const article = currentInvoice.articles[index];
    if (!article || !currentInvoice.clientId) return;

    if (!article.wilayaDepart || !article.wilayaDestination) {
        alert("Veuillez au moins sélectionner le départ et la destination pour mémoriser le prix.");
        return;
    }

    const value = article.prixUHT || 0;
    const cid = currentInvoice.clientId;
    const type = article.pricingType || 'Défaut';
    const key = `${article.wilayaDepart}|${article.wilayaDestination}|${type}`;

    if (!clientWilayaPairPrices[cid]) clientWilayaPairPrices[cid] = {};
    clientWilayaPairPrices[cid][key] = value;
    saveDataToLocalStorage();
    
    // Visually confirm
    const btn = document.querySelector(`[data-field="prixUHT"][data-index="${index}"]`).parentNode.querySelector('.btn-success');
    if (btn) {
        const oldHtml = btn.innerHTML;
        // Fancy save animation
        btn.innerHTML = '<i class="fa fa-check"></i>';
        btn.classList.replace('btn-success', 'btn-light');
        btn.style.transform = 'scale(1.15)';
        btn.style.boxShadow = '0 0 15px rgba(40, 167, 69, 0.8)';
        btn.style.color = '#28a745';
        
        setTimeout(() => {
            btn.innerHTML = oldHtml;
            btn.classList.replace('btn-light', 'btn-success');
            btn.style.transform = 'scale(1)';
            btn.style.boxShadow = 'none';
            btn.style.color = '';
        }, 1500);
    }
};

function updateArticleDesignation(articleIndex) {
    if (!currentInvoice.articles || !currentInvoice.articles[articleIndex]) return;
    
    const article = currentInvoice.articles[articleIndex];
    const depart = article.wilayaDepart || '';
    const destination = article.wilayaDestination || '';
    const clientDestination = article.selectedDestination || '';
    const palettes = currentInvoice.palettes || 0;
    
    // Get month from invoice date
    const mois = currentInvoice.date ? 
        new Date(currentInvoice.date).toLocaleDateString('fr-FR', {month:'long'}) : 
        new Date().toLocaleDateString('fr-FR', {month:'long'});
    
// ✅ BUILD DESIGNATION LINE BY LINE
    let typeAddition = (article.showTypeInDesignation && article.pricingType) ? ` (${article.pricingType})` : '';
    let designation = `<b>Prestation de transport routier${typeAddition} pour le mois de ${mois.charAt(0).toUpperCase() + mois.slice(1)}</b><br>`;    
    // ✅ ONLY ADD CLIENT DESTINATION IF SELECTED
    if (clientDestination) {
        designation += `-DESTINATION CLIENT : ${clientDestination}<br>`;
    }
    
    // ✅ ONLY ADD WILAYA DEPART IF SELECTED
    if (depart) {
        designation += `-WILAYA DEPART : ${depart}<br>`;
    }
    
    // ✅ ONLY ADD DESTINATION IF SELECTED
    if (destination) {
        designation += `-DESTINATION : ${destination}<br>`;
    }
    
    // ✅ ONLY ADD PALETTES IF > 0
    if (palettes > 0) {
        designation += `-Nombre de palettes : ${palettes}`;
    }
    
    // ✅ UPDATE THE ARTICLE
    article.designation = designation;
    
    // ✅ UPDATE THE TEXTAREA IN THE DOM
    const designationField = document.querySelector(`[data-field="designation"][data-index="${articleIndex}"]`);
    if (designationField) {
        designationField.value = designation;
    }
    
    updateInvoicePreview();
}

function autoFillArticlePrice(articleIndex) {
    const article = currentInvoice.articles[articleIndex];
    const cid = currentInvoice.clientId;
    const dep = article.wilayaDepart;
    const dst = article.wilayaDestination;
    const type = article.pricingType || 'Défaut';
    
    // On ne fait rien s'il manque une info
    if (!cid || !dep || !dst) return;
    
    const key = `${dep}|${dst}|${type}`;
    let price = 0; // Par défaut, on prépare "0"
    
    if (clientWilayaPairPrices[cid] && clientWilayaPairPrices[cid][key]) {
        price = clientWilayaPairPrices[cid][key];
    }
    
    // ON APPLIQUE LE PRIX (Même si c'est 0, pour écraser et réinitialiser l'ancien prix)
    article.prixUHT = price;
    article.montantHT = price * article.qte;
    
    const prixInput = document.querySelector(`[data-field="prixUHT"][data-index="${articleIndex}"]`);
    const montantInput = document.querySelector(`[data-field="montantHT"][data-index="${articleIndex}"]`);
    
    if (prixInput) {
        prixInput.value = price;
        
        // FANCY ANIMATION IF LOADED
        if (price > 0) {
            prixInput.style.transition = 'all 0.5s ease';
            prixInput.style.backgroundColor = 'rgba(40, 167, 69, 0.15)'; // Light green tint
            prixInput.style.borderColor = '#28a745';
            prixInput.style.color = '#28a745';
            prixInput.style.transform = 'scale(1.02)';
            
            // Animate the button to show "Magic"
            const btn = prixInput.parentNode.querySelector('.btn-success');
            let oldHtml = '';
            if (btn) {
                oldHtml = btn.innerHTML;
                btn.innerHTML = '<i class="fa fa-magic"></i>';
                btn.classList.replace('btn-success', 'btn-light');
                btn.style.color = '#28a745';
                btn.style.borderColor = '#28a745';
            }

            setTimeout(() => {
                prixInput.style.backgroundColor = '';
                prixInput.style.borderColor = '';
                prixInput.style.color = '';
                prixInput.style.transform = 'scale(1)';
                if(btn) {
                    btn.innerHTML = oldHtml;
                    btn.classList.replace('btn-light', 'btn-success');
                    btn.style.color = '';
                    btn.style.borderColor = '';
                }
            }, 1200);
        }
    }
    if (montantInput) montantInput.value = article.montantHT;
}

function previousStep() {
    try {
        if (currentStep > 1) {
            currentStep--;
            renderWizardStep();
        }
    } catch (error) {
        console.error('Error going to previous step:', error);
    }
}

function nextStep() {
  try {
    if (validateCurrentStep()) {
      // ❌ REMOVED THIS - it was corrupting articles:
      // if (currentStep === 3) {
      //   updateDesignationWithTransportInfo();
      // }
      
      currentStep++;
      renderWizardStep();
    }
  } catch (error) {
    console.error('Error going to next step:', error);
  }
}



function validateCurrentStep() {
    try {
        switch(currentStep) {
case 1:
                const wizardClientInput = document.getElementById('wizardClientInput');
                const clientIdHidden = document.getElementById('wizardClientId');
                
                // Validate if the typed name matches a real ID
                if (!clientIdHidden || !clientIdHidden.value) {
                    alert('Veuillez sélectionner un client valide dans la liste.');
                    return false;
                }
                currentInvoice.clientId = parseInt(clientIdHidden.value);
                
                // Handle DOIT À destination
                const showDestinationCheckbox = document.getElementById('showDestinationInDoitA');
                const destInput = document.getElementById('doitADestinationInput');
                
                if (showDestinationCheckbox) {
                    currentInvoice.showDestinationInDoitA = showDestinationCheckbox.checked;
                }
                
                if (destInput && currentInvoice.showDestinationInDoitA) {
                    currentInvoice.doitADestination = destInput.value;
                }
                
                return true;
                
            case 2:
                const wizardDate = document.getElementById('wizardDate');
                const wizardDelai = document.getElementById('wizardDelai');
                const wizardMode = document.getElementById('wizardMode');
                
                const date = wizardDate ? wizardDate.value : '';
                const delai = wizardDelai ? wizardDelai.value : '';
                const mode = wizardMode ? wizardMode.value : '';
                
                if (!date || !delai || !mode) {
                    alert('Veuillez remplir tous les champs obligatoires');
                    return false;
                }
                
                currentInvoice.date = date;
                currentInvoice.delaiPaiement = parseInt(delai);
                currentInvoice.modePaiement = mode;
const stepNumberInput = document.getElementById('stepNumber');
if (stepNumberInput) {
    currentInvoice.number = stepNumberInput.value.trim();
}


                return true;
                
// ✅ Around line 1600 - in validateCurrentStep function
case 3:
    const inputPalettes = document.getElementById('inputPalettes');
    currentInvoice.palettes = parseInt(inputPalettes?.value) || 0; // ✅ Changed from 26 to 0
    return true;



                
            case 4:
                if (!currentInvoice.articles || currentInvoice.articles.length === 0) {
                    alert('Veuillez ajouter au moins un article');
                    return false;
                }
                
                for (let article of currentInvoice.articles) {
                    if (!article.designation || !article.qte || !article.prixUHT) {
                        alert('Veuillez remplir tous les champs obligatoires des articles');
                        return false;
                    }
                }
                return true;
                
            case 5:
                return true;
        }
        return false;
    } catch (error) {
        console.error('Error validating step:', error);
        return false;
    }
}

function updateInvoicePreview() {
    try {
        calculateTotals();
        const preview = document.getElementById('wizardPreview');
        if (preview) {
            preview.innerHTML = generateInvoiceHTML(currentInvoice);
        }
        const badge = document.getElementById('previewTotalBadge');
        if (badge && currentInvoice.totals) {
            const net = currentInvoice.totals.netAPayer ?? currentInvoice.totals.ttc ?? 0;
            badge.textContent = `Net : ${formatCurrency(net)}`;
        }
    } catch (error) {
        console.error('Error updating invoice preview:', error);
    }
}

function calculateTotals() {
    try {
        if (!currentInvoice.articles) return;

        let totalHT = 0;

        currentInvoice.articles.forEach(article => {
            article.montantHT = article.qte * article.prixUHT;
            totalHT += article.montantHT;
        });

        let remiseValue = 0;
        let htRemise = totalHT;

        if (currentInvoice.remise && currentInvoice.remise.enabled) {
            if (currentInvoice.remise.type === 'percentage') {
                remiseValue = totalHT * (currentInvoice.remise.value || 0) / 100;
            } else {
                remiseValue = currentInvoice.remise.value || 0;
            }
            htRemise = totalHT - remiseValue;
        }

        const tva = htRemise * 0.19;
        const ttc = htRemise + tva;

        currentInvoice.totals = {
            ht: totalHT,
            remise: remiseValue,
            htRemise: htRemise,
            tva: tva,
            ttc: ttc,
            netAPayer: ttc
        };
    } catch (error) {
        console.error('Error calculating totals:', error);
    }
}


function generateInvoiceHTML(invoice, options = {}) {
    try {
        const isDuplicata = options.duplicata || false;
        const client = clients.find(c => c.id === invoice.clientId);
        if (!client) {
            return '<div class="p-3 text-dark">Sélectionnez un client pour voir l’aperçu</div>';
        }

        const pad = n => n.toString().padStart(2, '0');
        const d = new Date(invoice.date);
        const biskraDate = `Biskra le ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

        const accent = '#007B7C';
        const dark   = '#000000';
        const light  = '#f8f9fa';

        const isVirement = (invoice.modePaiement || '').toLowerCase().includes('virement');
        // Footer RIB (only if virement)
        const footerRib = (isVirement && settings.rib) ? `<br><strong>Compte bancaire :</strong> ${settings.rib}` : '';
        const paymentConditionText = `${invoice.modePaiement || '–'}${footerRib}`;

        // Header RIB (Always show if exists in settings) - THIS WAS MISSING
        const ribInfo = settings.rib ? `<div><strong>Compte bancaire :</strong> ${settings.rib}</div>` : '';

        const refs = [];
        if (invoice.contratRef) refs.push(`<div><strong>Référence Contrat :</strong> ${invoice.contratRef}</div>`);
        if (invoice.bdcRef) refs.push(`<div><strong>Référence Bon de commande :</strong> ${invoice.bdcRef}</div>`);
        if (invoice.blReferences) refs.push(`<div><strong>Références BL :</strong> ${invoice.blReferences}</div>`);
        if (invoice.refFeuilleRoute) refs.push(`<div><strong>Réf. Feuille de route :</strong> ${invoice.refFeuilleRoute}</div>`);
        if (invoice.refBonTransfert) refs.push(`<div><strong>Réf. Bon de transfert :</strong> ${invoice.refBonTransfert}</div>`);
        
        const refsHTML = refs.length > 0 ? `<div class="references-list">${refs.join('')}</div>` : '';

        // DUPLICATA stamp
        const duplicataHTML = isDuplicata ? `<div style="color: #CC0000; font-weight: bold; font-size: 1.1em; letter-spacing: 2px; margin-top: 2px; border: 2px solid #CC0000; display: inline-block; padding: 1px 10px; border-radius: 3px;">DUPLICATA</div>` : '';

        const totalHT = invoice.totals?.ht || 0;
        const totalTTC = invoice.totals?.ttc || 0;
        const totalTVA = invoice.totals?.tva || 0;
        const remiseAmount = invoice.totals?.remise || 0;
        const htRemise = invoice.totals?.htRemise || 0;

        let amountText = nombreEnLettresDA(totalTTC);
        amountText = amountText.charAt(0).toUpperCase() + amountText.slice(1);

        return `
            <style>
                .invoice-preview { font-family: 'Roboto', sans-serif; color: ${dark}; background: #FFF; padding: 25px; max-width: 800px; margin: 0 auto; font-size: 11px; line-height: 1.3; border: 1px solid #ddd; }
                .invoice-header-compact { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid ${accent}; padding-bottom: 15px; }
                .header-logo { flex: 0 0 130px; display: flex; align-items: center; justify-content: center; }
                .header-logo img { max-height: 80px; max-width: 100%; object-fit: contain; }
                .header-info { flex: 1; text-align: center; padding: 0 15px; }
                .company-name { font-size: 1.4rem; font-weight: bold; color: ${accent}; margin-bottom: 5px; text-transform: uppercase; }
                .company-details { font-size: 0.85rem; color: #333; line-height: 1.3; }
                
                .invoice-meta-container { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; gap: 20px; }
                .meta-left { flex: 0 0 40%; }
                .invoice-number { font-size: 1.2rem; font-weight: bold; color: ${accent}; margin-bottom: 5px; }
                .invoice-date { font-size: 1rem; color: #444; }
                
                .bill-to { flex: 1; background: ${light}; padding: 8px 12px; border-radius: 6px; border: 1px solid #e0e0e0; font-size: 0.85rem; }
                .bill-to-title { color: ${accent}; font-weight: bold; margin-bottom: 3px; text-decoration: underline; font-size: 1em; }
                .client-name { font-weight: bold; font-size: 1.1em; margin-bottom: 2px; color: #000; }
                .destination { font-weight: bold; color: ${accent}; margin-bottom: 2px; font-size: 1em; }
                .client-ids-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2px; margin-top: 4px; }
                .client-ids-grid div { font-size: 0.8rem; color: #444; }
                .client-ids-grid strong { color: #000; }

                /* TABLE STYLING */
                table.invoice-table { border-collapse: collapse; width: 100%; font-size: 0.9rem; margin-bottom: 10px; table-layout: fixed; }
                table.invoice-table th, table.invoice-table td { border: 1px solid #000; padding: 5px 8px; text-align: center; vertical-align: middle; }
                table.invoice-table th { background: ${accent}; color: #FFF; font-weight: bold; text-transform: uppercase; font-size: 0.85rem; }
                table.invoice-table td.text-left { text-align: left; }
                
                /* SVG Background for diagonal line */
                .total-cell-empty { 
                    width: 60% !important; 
                    border: 1px solid #000 !important;
                    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' version='1.1' preserveAspectRatio='none' viewBox='0 0 100 100'><line x1='0' y1='100' x2='100' y2='0' stroke='black' stroke-width='1' vector-effect='non-scaling-stroke'/></svg>") !important;
                    background-repeat: no-repeat;
                    background-position: center center;
                    background-size: 100% 100%;
                }
                
                /* TOTALS ALIGNMENT */
                .total-cell-label { background: ${accent} !important; color: #FFF !important; font-weight: bold !important; text-align: center !important; width: 20% !important; }
                .total-cell-value { font-weight: bold !important; background: #fff !important; text-align: center !important; width: 20% !important; }
                .net-cell-label { background: #eee !important; color: #000 !important; font-size: 12px !important; text-align: center !important; font-weight: bold !important; width: 20% !important; }
                .net-cell-value { background: #eee !important; color: #000 !important; font-size: 12px !important; text-align: center !important; font-weight: bold !important; width: 20% !important; }

                .under-table-block { margin-top: 15px; }
                .amount-words { margin-bottom: 10px; padding: 8px; background: #fffdf0; border: 1px solid #e6dbb9; border-radius: 4px; }
                
                .references-list { font-size: 0.85rem; line-height: 1.5; color: #333; margin-top: 10px; text-align: left; }
                .references-list div { margin-bottom: 4px; }
                .references-list strong { color: ${accent}; margin-right: 4px; display: inline; }
            </style>

            <div class="invoice-preview">
                <div class="invoice-header-compact">
                    <div class="header-logo logo-left">${settings.logoLeft ? `<img src="${settings.logoLeft}" alt="Logo">` : ''}</div>
                    <div class="header-info">
                        <div class="company-name">${settings.name}</div>
                        <div class="company-details">
                            Capital : ${settings.capital}<br>
                            NIF : ${settings.nif} – RC : ${settings.rc}<br>
                            NIS : ${settings.nis} – Art. Imp : ${settings.artimp}<br>
                            ${settings.address}<br>
                            ${settings.phone ? `Tél : ${settings.phone}` : ''} ${settings.fax ? `Fax : ${settings.fax}` : ''}
                            ${ribInfo}
                        </div>
                    </div>
                    <div class="header-logo logo-right">${settings.logoRight ? `<img src="${settings.logoRight}" alt="Logo">` : ''}</div>
                </div>

                <div class="invoice-meta-container">
                    <div class="meta-left">
                        <div class="invoice-number">${invoice.documentType === 'proforma' ? 'PROFORMA N°' : 'Facture N°'} ${invoice.number}</div>
                        ${duplicataHTML}
                        <div class="invoice-date">${biskraDate}</div>
                    </div>
                    <div class="bill-to">
                        <div class="bill-to-title">DOIT À :</div>
                        <div class="client-name">${client.nom}</div>
                        ${invoice.showDestinationInDoitA && invoice.doitADestination ? `<div class="destination">${invoice.doitADestination}</div>` : ''}
                        <div style="margin-bottom:4px;">${client.adresse}, ${client.wilaya}</div>
<div class="client-ids-grid">
                   ${client.phone ? `<div style="grid-column: 1 / -1; margin-bottom: 4px;"><strong>Tél:</strong> ${client.phone}</div>` : ''}
                   ${client.rc ? `<div><strong>RC:</strong> ${client.rc}</div>` : ''}
                   ${client.activite ? `<div style="grid-column: 1 / -1; margin-bottom: 4px;"><strong>Activité:</strong> ${client.activite}</div>` : ''}
                   ${client.nif ? `<div><strong>NIF:</strong> ${client.nif}</div>` : ''}
                   ${client.nis ? `<div><strong>NIS:</strong> ${client.nis}</div>` : ''}
                   ${client.artimp ? `<div><strong>Art:</strong> ${client.artimp}</div>` : ''}
                </div>
                    </div>
                </div>

                <table class="invoice-table">
                    <colgroup>
                        <col style="width: 5%;">
                        <col style="width: 45%;">
                        <col style="width: 10%;">
                        <col style="width: 20%;">
                        <col style="width: 20%;">
                    </colgroup>
                    <thead>
                        <tr>
                            <th>N°</th>
                            <th>DÉSIGNATION</th>
                            <th>QTE</th>
                            <th>PRIX U. HT</th>
                            <th>MONTANT HT</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${invoice.articles.map(a => `
                            <tr>
                                <td style="text-align: center !important;">${a.no}</td>
                                <td class="text-left" style="text-align: left !important;">${a.designation}</td>
                                <td style="text-align: center !important;">${a.qte}</td>
                                <td style="text-align: center !important;">${formatCurrency(a.prixUHT).replace(/\s?DA\s?$/, '')}</td>
                                <td style="text-align: center !important;">${formatCurrency(a.montantHT).replace(/\s?DA\s?$/, '')}</td>
                            </tr>
                        `).join('')}
                        
                        <tr>
                            <td colspan="3" class="total-cell-empty"></td>
                            <td class="total-cell-label">TOTAL HT</td>
                            <td class="total-cell-value">${formatCurrency(totalHT).replace(/\s?DA\s?$/, '')}</td>
                        </tr>
                        ${invoice.remise?.enabled ? `
                        <tr>
                            <td colspan="3" class="total-cell-empty"></td>
                            <td class="total-cell-label">REMISE</td>
                            <td class="total-cell-value">- ${formatCurrency(remiseAmount).replace(/\s?DA\s?$/, '')}</td>
                        </tr>
                        <tr>
                            <td colspan="3" class="total-cell-empty"></td>
                            <td class="total-cell-label">HT APRÈS REMISE</td>
                            <td class="total-cell-value">${formatCurrency(htRemise).replace(/\s?DA\s?$/, '')}</td>
                        </tr>` : ''}
                        <tr>
                            <td colspan="3" class="total-cell-empty"></td>
                            <td class="total-cell-label">TVA 19 %</td>
                            <td class="total-cell-value">${formatCurrency(totalTVA).replace(/\s?DA\s?$/, '')}</td>
                        </tr>
                        <tr>
                            <td colspan="3" class="total-cell-empty"></td>
                            <td class="total-cell-label">TOTAL TTC</td>
                            <td class="total-cell-value">${formatCurrency(totalTTC).replace(/\s?DA\s?$/, '')}</td>
                        </tr>
                        <tr>
                            <td colspan="3" class="total-cell-empty"></td>
                            <td class="net-cell-label">Net à payer</td>
                            <td class="net-cell-value">${formatCurrency(totalTTC).replace(/\s?DA\s?$/, '')}</td>
                        </tr>
                    </tbody>
                </table>

                <div class="under-table-block">
                    <div class="amount-words">
                        <strong>Arrêté la présente facture à la somme de :</strong><br>
                        <span class="amount-text">${amountText}</span>
                    </div>
                    <div class="conditions">
                        <strong>Conditions de paiement :</strong><br>
                        <strong>Mode de règlement :</strong> ${paymentConditionText}<br>
                        <strong>Délai de paiement :</strong> ${invoice.delaiPaiement || 30} jours après réception de notre facture
                    </div>
                    ${refsHTML.length > 0 ? `<div class="references-list">${refsHTML}</div>` : ''}
                </div>
                ${invoice.documentType === 'proforma' && invoice.proformaConditions ? `
                <div style="margin-top:15px; padding:10px; border:1px solid #d97706; border-radius:6px; font-size:0.85em;">
                    <div style="font-weight:bold; text-decoration:underline; margin-bottom:8px;">Conditions Générales de Location :</div>
                    <div style="margin-bottom:5px;"><b>Durée et Tarification :</b><br>${invoice.proformaConditions.duree || ''}</div>
                    <div style="margin-bottom:5px;"><b>Modalités de Paiement :</b><br>${invoice.proformaConditions.paiement || ''}</div>
                    <div style="margin-bottom:5px;"><b>Délai de paiement :</b><br>${invoice.proformaConditions.delai || ''}</div>
                    <div style="margin-bottom:5px;"><b>Validité de l'Offre :</b><br>${invoice.proformaConditions.validite || ''}</div>
                </div>` : ''}
            </div>
        `;
    } catch (e) {
        console.error('Erreur génération HTML facture', e);
        return '<div class="p-3 text-dark">Erreur affichage facture</div>';
    }
}


function deleteInvoice(invoiceId) {
    invoiceId = parseInt(invoiceId, 10);
    if (!invoiceId) return;
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette facture ?')) return;

    invoices = invoices.filter(inv => inv.id !== invoiceId);
    saveDataToLocalStorage();    // ← Persiste la suppression
    renderInvoices();
    updateDashboard();
}

/**
 * Ouvre le wizard en mode modification de facture avec préremplissage des données.
 * @param {number|string} invoiceId - ID de la facture à modifier.
 */
function editInvoice(invoiceId) {
    invoiceId = parseInt(invoiceId, 10);
    const inv = invoices.find(i => i.id === invoiceId);
    if (!inv) return;

    // Clone pour éviter de modifier l'original si l'utilisateur annule
    currentInvoice = JSON.parse(JSON.stringify(inv));
    currentStep = 1;

    // Met à jour le titre et le bouton du modal
    const modalTitle = document.getElementById('modalInvoiceTitle');
    if (modalTitle) modalTitle.textContent = 'Modifier la facture';

    const btnSave = document.getElementById('btnSaveInvoice');
    if (btnSave) btnSave.textContent = 'Enregistrer les modifications';

    // Affiche le wizard prérempli
    renderWizardStep();
    new bootstrap.Modal(document.getElementById('modalInvoice')).show();
}

// ✅ AUTO-REMPLISSAGE INTELLIGENT (Smart Memory) Globals
window.recordSmartMemory = function(type, value) {
    if (!settings.smartMemory) settings.smartMemory = {};
    if (!value || value.trim() === '') return;
    const val = value.trim();
    if (!settings.smartMemory[type]) settings.smartMemory[type] = {};
    settings.smartMemory[type][val] = (settings.smartMemory[type][val] || 0) + 1;
};

window.populateSmartMemoryDatalists = function() {
    if (!settings.smartMemory) return;
    
    // Helper to fill datalist if it exists and count >= 2
    const fillDatalist = (type, listId) => {
        const dataList = document.getElementById(listId);
        if (!dataList) return;
        dataList.innerHTML = ''; // Clear old options
        const memoryMap = settings.smartMemory[type] || {};
        
        // Sort by frequency
        const sortedValues = Object.keys(memoryMap).sort((a,b) => memoryMap[b] - memoryMap[a]);
        
        sortedValues.forEach(val => {
            if (memoryMap[val] >= 2) {
                const opt = document.createElement('option');
                opt.value = val;
                dataList.appendChild(opt);
            }
        });
    };

    fillDatalist('bl', 'datalistBL');
    fillDatalist('contrat', 'datalistContrat');
    fillDatalist('bdc', 'datalistBDC');
    fillDatalist('feuilleroute', 'datalistFeuilleRoute');
    fillDatalist('bontransfert', 'datalistBonTransfert');
    fillDatalist('payref', 'datalistPayRef');
    fillDatalist('matricule', 'datalistMatricule');
};

/**
 * Sauvegarde ou modifie une facture selon l'existence de currentInvoice.id.
 * Remplacez entièrement votre fonction saveInvoice par celle-ci.
 */
function saveInvoice() {
    try {
        if (!validateCurrentStep()) return;

        // ✅ PROPERLY READ ALL FIELDS FROM DOM (Step 3 fields only)
        const inputPalettes = document.getElementById('inputPalettes');
        const blReferences = document.getElementById('blReferences');
        const contratRef = document.getElementById('contratRef');
        const bdcRef = document.getElementById('bdcRef');
        
        // ✅ UPDATE CURRENT INVOICE WITH DOM VALUES (only Step 3 fields)
		if (inputPalettes) currentInvoice.palettes = parseInt(inputPalettes.value) || 0;
        if (blReferences) currentInvoice.blReferences = blReferences.value;
        if (contratRef) currentInvoice.contratRef = contratRef.value;
        if (bdcRef) currentInvoice.bdcRef = bdcRef.value;
        // ✅ Add these lines:
        const refFeuilleRoute = document.getElementById('refFeuilleRoute');
        const refBonTransfert = document.getElementById('refBonTransfert');
        if (refFeuilleRoute) currentInvoice.refFeuilleRoute = refFeuilleRoute.value;
        if (refBonTransfert) currentInvoice.refBonTransfert = refBonTransfert.value;

        // ✅ IMPORTANT: Don't modify article designations here!
        // User has already set them in Step 4

        // ✅ AUTO-REMPLISSAGE INTELLIGENT (Record)
        if (typeof recordSmartMemory === 'function') {
            recordSmartMemory('bl', currentInvoice.blReferences);
            recordSmartMemory('contrat', currentInvoice.contratRef);
            recordSmartMemory('bdc', currentInvoice.bdcRef);
            recordSmartMemory('feuilleroute', currentInvoice.refFeuilleRoute);
            recordSmartMemory('bontransfert', currentInvoice.refBonTransfert);
            if (currentInvoice.articles) {
                currentInvoice.articles.forEach(art => {
                    if (art.matricule) recordSmartMemory('matricule', art.matricule);
                });
            }
        }

        if (currentInvoice.id) {
            // Editing existing invoice
            const idx = invoices.findIndex(i => i.id === currentInvoice.id);
            if (idx !== -1) {
                currentInvoice.createdAt = invoices[idx].createdAt;
                invoices[idx] = JSON.parse(JSON.stringify(currentInvoice));
            }
        } else {
            // ✅ NEW INVOICE - preserve all article data as-is
            const newInv = {
                ...currentInvoice,
                id: Date.now(),
                paid: false,
                paymentStatus: 'pending',
                createdAt: new Date().toISOString()
            };
            
            // Handle proforma conditions
            if (typeof saveProformaConditions === 'function') saveProformaConditions();

            if (currentInvoice.documentType === 'proforma') {
                const year = new Date().getFullYear();
                newInv.number = `FP-${String(proformaCounter).padStart(3, '0')}/${year}`;
                proformaCounter++;
            } else {
                // Update counter for next invoice
                const base = parseInt(currentInvoice.number.split('/')[0], 10);
                invoiceCounter = Number.isNaN(base) ? invoiceCounter + 1 : (base + 1);
            }
            
            invoices.push(newInv);
        }

        saveDataToLocalStorage();
        
        // Simple modal close
        const modalEl = document.getElementById('modalInvoice');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) {
            modal.hide();
        }
        
        // Reset current invoice
        currentInvoice = {};
        currentStep = 1;
        
        // Refresh the invoices view
        renderInvoices();
        updateDashboard();
        showView('invoices');
        
        alert('Facture sauvegardée avec succès !');
    } catch (error) {
        console.error('Error saving invoice:', error);
        alert('Erreur lors de la sauvegarde de la facture');
    }
}
// 1. REGISTER PLUGIN
if (typeof ChartDataLabels !== 'undefined') {
    Chart.register(ChartDataLabels);
}

// Global chart mode settings (HT/TTC toggles)
let chartSettings = {
    revenue: 'TTC',
    clients: 'TTC',
    debt: 'TTC',
    forecast: 'TTC'
};


function renderInvoices() {
  try {
    populateFilterDropdowns(); // Refresh dropdowns (and ensure Year defaults to current)
    let filteredInvoices = getFilteredInvoices();

    // SORTING LOGIC
    const keyMap = {
      number: inv => { 
          const parts = inv.number.split('/');
          if (parts.length === 2) return parseInt(parts[1], 10) * 100000 + parseInt(parts[0], 10);
          return parseInt(inv.number) || 0; 
      },
      date: inv => inv.date,
      client: inv => { const c = clients.find(cl => cl.id === inv.clientId); return c ? c.nom.toLowerCase() : ''; },
      destination: inv => (inv.selectedDestination || '').toLowerCase(),
      amount: inv => inv.totals ? inv.totals.netAPayer : 0,
      status: inv => getInvoiceStatus(inv).text.toLowerCase()
    };

    if (factureSort.key) {
      filteredInvoices.sort((a, b) => {
        let vA = keyMap[factureSort.key](a), vB = keyMap[factureSort.key](b);
        return (vA < vB ? -1 : 1) * factureSort.dir;
      });
    }

    const tbody = document.querySelector('#tableInvoices tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    filteredInvoices.forEach(inv => {
      const client = clients.find(c => c.id === inv.clientId) || {};
      const isPaid = inv.paid || inv.paymentStatus === 'encaissee';
      
      // STATUS BADGE
      let badgeHtml = '';
      const today = new Date();
      const dueDate = new Date(new Date(inv.date).getTime() + ((inv.delaiPaiement||30) * 86400000));
      const daysLeft = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

      if (isPaid) {
          badgeHtml = '<span class="badge bg-success rounded-pill"><i class="fa fa-check me-1"></i>PAYÉE</span>';
      } else if (daysLeft < 0) {
          badgeHtml = '<span class="badge bg-danger rounded-pill">EN RETARD</span>';
      } else if (daysLeft <= 3) {
          badgeHtml = '<span class="badge bg-warning text-dark rounded-pill">ÉCHÉANCE PROCHE</span>';
      } else {
          badgeHtml = '<span class="badge bg-info text-dark rounded-pill">EN ATTENTE</span>';
      }

      // DATE
      let dateDisplay = `<div class="fw-bold">${formatDate(inv.date)}</div>`;
      if (isPaid && inv.paymentDetails && inv.paymentDetails.ref) {
          dateDisplay += `<div class="tx-ref-highlight"><i class="fa fa-hashtag me-1"></i>${inv.paymentDetails.ref}</div>`;
      }

      // ✅ FIX: SHOW ALL DESTINATIONS FROM ALL LINES
      let uniqueDests = new Set();

      // 1. Check Invoice Main Destination
      if (inv.selectedDestination) uniqueDests.add(inv.selectedDestination);
      if (inv.wilayaDestination) uniqueDests.add(inv.wilayaDestination);

      // 2. Check Every Article
      if (inv.articles && inv.articles.length > 0) {
          inv.articles.forEach(art => {
              if (art.selectedDestination) uniqueDests.add(art.selectedDestination);
              if (art.wilayaDestination) uniqueDests.add(art.wilayaDestination);
          });
      }

      // 3. Join them (e.g. "Biskra, Batna")
      // Filter removes empty strings, join adds the comma
      let displayDest = Array.from(uniqueDests).filter(d => d && d.trim() !== '').join(', ');
      
      if (!displayDest) displayDest = '—';

      // Check for immobilisation
      const hasImmo = inv.invoiceType === 'immobilisation' || (inv.articles && inv.articles.some(a => a.isImmobilisation || (a.pricingType && a.pricingType.toLowerCase().includes('immobilis'))));
      const immoBadgeHtml = hasImmo ? `<span class="badge badge-immo me-1" title="Contient des frais d'attente / immobilisation"><i class="fa fa-stopwatch me-1"></i>Immo</span>` : '';

      // Check for location
      const hasLoc = inv.invoiceType === 'location' || (inv.articles && inv.articles.some(a => a.isLocation || (a.pricingType && a.pricingType.toLowerCase() === 'location')));
      const locBadgeHtml = hasLoc ? `<span class="badge me-1" style="background:#f59e0b;color:#fff;" title="Contient de la location"><i class="fa fa-crane me-1"></i>Loc</span>` : '';
      
      // Check for proforma
      const isProforma = inv.documentType === 'proforma';
      const proformaBadgeHtml = isProforma ? `<span class="badge bg-warning text-dark me-1"><i class="fa fa-file-alt me-1"></i>PROFORMA</span>` : '';
      const convertBtn = isProforma ? `<button class="btn btn-sm btn-success ms-1" onclick="convertProformaToFacture(${inv.id}); event.stopPropagation();" title="Convertir en Facture"><i class="fa fa-exchange-alt"></i></button>` : '';

      // BUTTONS
      let actionButtons = '';
      if (isPaid) {
          actionButtons = `
            <button class="btn btn-sm btn-outline-warning ms-1" onclick="openPaymentModal(${inv.id}); event.stopPropagation();" title="Modifier le paiement"><i class="fa fa-pencil-alt"></i></button>
            <button class="btn btn-sm btn-outline-danger ms-1" onclick="revertPayment(${inv.id}); event.stopPropagation();" title="Annuler le paiement"><i class="fa fa-undo"></i></button>`;
      }
      const commonButtons = `
        <button class="btn btn-sm btn-outline-primary" onclick="editInvoice(${inv.id}); event.stopPropagation();" title="Modifier Facture"><i class="fa fa-edit"></i></button>
        ${actionButtons}
        ${convertBtn}
        <button class="btn btn-sm btn-outline-danger" onclick="deleteInvoice(${inv.id}); event.stopPropagation();" title="Supprimer Facture"><i class="fa fa-trash"></i></button>
      `;

      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="text-center"><input type="checkbox" class="invoice-checkbox" data-id="${inv.id}"></td>
        <td class="fw-bold text-primary">${proformaBadgeHtml}${inv.number}</td>
        <td>${dateDisplay}</td>
        <td class="fw-semibold">${client.nom || 'Inconnu'}</td>
        
        <td>
            <small class="text-muted text-truncate d-block" style="max-width: 200px;" title="${displayDest}">
                ${immoBadgeHtml}${locBadgeHtml}${displayDest}
            </small>
        </td>
        
        <td class="text-end fw-bold">${formatCurrency(inv.totals.netAPayer)}</td>
        <td class="text-center">${badgeHtml}</td>
        <td class="text-end" style="min-width: 120px;">
          <div class="btn-group">${commonButtons}</div>
        </td>
      `;

      row.style.cursor = 'pointer';
      row.title = "Double-cliquez pour voir les détails";
      
      row.addEventListener('click', e => {
         if (e.target.closest('button') || e.target.closest('input')) return;
         document.querySelectorAll('#tableInvoices tr').forEach(r => r.classList.remove('selected-invoice-row'));
         row.classList.add('selected-invoice-row');
      });

      row.addEventListener('dblclick', e => {
        if (e.target.closest('button') || e.target.closest('input')) return;
        openViewInvoiceModal(inv);
      });

      tbody.appendChild(row);
    });
    
    updateSortIcons(document.getElementById('tableInvoices'), factureSort);

  } catch (error) { console.error('Error rendering invoices:', error); }
}
/* -----------------------------------------------------------
   FULL SCREEN MODAL PREVIEW LOGIC
----------------------------------------------------------- */
function openViewInvoiceModal(invoice) {
    // 1. Reset duplicata checkbox
    const chk = document.getElementById('chkDuplicata');
    if (chk) chk.checked = false;

    // 2. Generate HTML
    const content = document.getElementById('fullScreenPreviewContent');
    if(content) {
        content.innerHTML = generateInvoiceHTML(invoice);
    }
    
    // 3. Set current invoice for export
    window.currentPreviewInvoice = invoice;

    // 4. Open Modal
    const modalEl = document.getElementById('modalViewInvoice');
    if(modalEl) {
        new bootstrap.Modal(modalEl).show();
    }
}

function toggleDuplicata() {
    const chk = document.getElementById('chkDuplicata');
    const isDup = chk ? chk.checked : false;
    const content = document.getElementById('fullScreenPreviewContent');
    if (content && window.currentPreviewInvoice) {
        content.innerHTML = generateInvoiceHTML(window.currentPreviewInvoice, { duplicata: isDup });
    }
}

function exportOpenedInvoicePDF() {
    if (window.currentPreviewInvoice) {
        // Close modal first to avoid overlay issues in capture (optional, but safer)
        const modalEl = document.getElementById('modalViewInvoice');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if(modal) modal.hide();

        // Pass duplicata state to the PDF export
        const chk = document.getElementById('chkDuplicata');
        const isDup = chk ? chk.checked : false;
        window.currentPreviewInvoice._duplicata = isDup;

        setTimeout(() => {
            exportInvoiceToPDF(window.currentPreviewInvoice);
        }, 300);
    }
}


function getFilteredInvoices() {
    try {
        let filtered = [...invoices];
        
        // Get Elements
        const filterClient = document.getElementById('filterClient');
        const filterDest = document.getElementById('filterDestination'); // ✅ Added
        const filterYear = document.getElementById('filterYear');
        const filterMonth = document.getElementById('filterMonth');
        const filterStatus = document.getElementById('filterStatus');
        
        // Get Values
        const clientFilter = filterClient ? filterClient.value : '';
        const destFilter = filterDest ? filterDest.value.toLowerCase() : ''; // ✅ Added
        const yearFilter = filterYear ? filterYear.value : '';
        const monthFilter = filterMonth ? filterMonth.value : '';
        const statusFilter = filterStatus ? filterStatus.value : '';
        
        // 1. Filter by Client
        if (clientFilter) filtered = filtered.filter(inv => inv.clientId === parseInt(clientFilter));

        // ✅ 2. Filter by Destination (Deep Search)
        if (destFilter) {
            filtered = filtered.filter(inv => {
                // Check main invoice
                const mainDest = (inv.selectedDestination || inv.wilayaDestination || '').toLowerCase();
                
                // Check all articles
                const artDest = (inv.articles || []).some(a => 
                    (a.selectedDestination || '').toLowerCase().includes(destFilter) ||
                    (a.wilayaDestination || '').toLowerCase().includes(destFilter)
                );
                
                return mainDest.includes(destFilter) || artDest;
            });
        }

        // 3. Filter by Year
        if (yearFilter) {
            filtered = filtered.filter(inv => {
                const d = new Date(inv.date || inv.createdAt);
                return d.getFullYear().toString() === yearFilter;
            });
        }

        // 4. Filter by Month
        if (monthFilter) filtered = filtered.filter(inv => inv.date.startsWith(monthFilter));

        // 5. Filter by Status
        if (statusFilter) filtered = filtered.filter(inv => getInvoiceStatus(inv).class === statusFilter);

        // 6. Global Search
        const globalSearchInput = document.getElementById('globalSearchInput');
        if (globalSearchInput && globalSearchInput.value.trim() !== '') {
            const term = globalSearchInput.value.toLowerCase();
            filtered = filtered.filter(inv => {
                const client = clients.find(c => c.id === inv.clientId);
                const clientName = client ? client.nom.toLowerCase() : '';
                const number = (inv.number || '').toLowerCase();
                const dest = (inv.selectedDestination || '').toLowerCase();
                return clientName.includes(term) || number.includes(term) || dest.includes(term);
            });
        }
        
        return filtered;
    } catch (error) {
        console.error('Error filtering invoices:', error);
        return [];
    }
}
function getInvoiceStatus(invoice) {
    try {
        // ✅ NEW: Handle new payment statuses
        if (invoice.paymentStatus === 'encaissee') {
            return { class: 'encaissee', color: 'success', text: 'Encaissée' };
        }
        if (invoice.paymentStatus === 'encaisse' || invoice.paid) {
            return { class: 'encaisse', color: 'info', text: 'Encaissé' };
        }
        
        const today = new Date();
        const invoiceDate = new Date(invoice.date);
        const dueDate = new Date(invoiceDate);
        dueDate.setDate(dueDate.getDate() + invoice.delaiPaiement);
        
        if (today > dueDate) {
            return { class: 'overdue', color: 'danger', text: 'En retard' };
        } else if (today >= new Date(dueDate.getTime() - 3 * 24 * 60 * 60 * 1000)) {
            return { class: 'due', color: 'warning', text: 'Échéance proche' };
        } else {
            return { class: 'pending', color: 'secondary', text: 'En attente' };
        }
    } catch (error) {
        console.error('Error getting invoice status:', error);
        return { class: 'pending', color: 'secondary', text: 'En attente' };
    }
}


function showInvoiceDetail(invoice) {
  // Show the preview section
  const detailSection = document.getElementById('invoiceDetail');
  if (!detailSection) return;

  detailSection.classList.remove('d-none');

  // Populate the preview (adapt this to your app)
  const previewWrapper = document.getElementById('invoicePreviewWrapper');
  if (previewWrapper) {
    previewWrapper.innerHTML = generateInvoiceHTML(invoice); // Or your rendering logic
  }

  // Handler to close when clicking outside the preview card
  function handleOutsideClick(e) {
    // If click is outside the .card inside #invoiceDetail
    const card = detailSection.querySelector('.card');
    if (card && !card.contains(e.target)) {
      detailSection.classList.add('d-none');
      document.removeEventListener('mousedown', handleOutsideClick);
    }
  }

  // Attach the event listener (only once per open)
  setTimeout(() => {
    document.addEventListener('mousedown', handleOutsideClick);
  }, 0);
}


function markSelectedInvoicesPaid() {
    try {
        const checkboxes = document.querySelectorAll('.invoice-checkbox:checked');
        const invoiceIds = Array.from(checkboxes).map(cb => parseInt(cb.dataset.id));
        
        if (invoiceIds.length === 0) {
            alert('Veuillez sélectionner au moins une facture');
            return;
        }
        
        // ✅ NEW: Show date picker popup
        const today = new Date().toISOString().split('T')[0];
        const recoveryDate = prompt(`Date d'encaissement (format: YYYY-MM-DD):`, today);
        
        if (!recoveryDate) {
            return; // User cancelled
        }
        
        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(recoveryDate)) {
            alert('Format de date invalide. Utilisez YYYY-MM-DD');
            return;
        }
        
        invoiceIds.forEach(id => {
            const invoice = invoices.find(inv => inv.id === id);
            if (invoice) {
                // ✅ NEW: Check current status and update accordingly
                if (!invoice.paymentStatus || invoice.paymentStatus === 'pending') {
                    // First click: mark as "encaissé"
                    invoice.paid = true;
                    invoice.paymentStatus = 'encaisse';
                    invoice.paidDate = recoveryDate;
                } else if (invoice.paymentStatus === 'encaisse') {
                    // Second click: mark as "encaissée" (fully processed)
                    invoice.paymentStatus = 'encaissee';
                    invoice.processedDate = recoveryDate;
                }
            }
        });
        
        saveDataToLocalStorage();
        renderInvoices();
        updateDashboard();
        
        alert(`${invoiceIds.length} facture(s) mise(s) à jour avec succès`);
        
    } catch (error) {
        console.error('Error marking invoices as paid:', error);
        alert('Erreur lors du marquage des factures');
    }
}

function exportSelectedInvoicePDF() {
    try {
        const checkboxes = document.querySelectorAll('.invoice-checkbox:checked');
        
        if (checkboxes.length === 0) {
            alert('Veuillez sélectionner au moins une facture');
            return;
        }
        
        // Collect all selected invoices
        const selectedInvoices = [];
        checkboxes.forEach(checkbox => {
            const invoiceId = parseInt(checkbox.dataset.id);
            const invoice = invoices.find(inv => inv.id === invoiceId);
            if (invoice) selectedInvoices.push(invoice);
        });

        if (selectedInvoices.length === 0) return;

        // Open the export options modal ONCE for all invoices
        const modalEl = document.getElementById('modalExportOptions');
        if (!modalEl) {
            alert("Erreur: Modal d'exportation introuvable.");
            return;
        }

        const modal = new bootstrap.Modal(modalEl);
        modal.show();

        // Replace the confirm button to remove old listeners
        const btnConfirm = document.getElementById('btnConfirmExport');
        const newBtn = btnConfirm.cloneNode(true);
        btnConfirm.parentNode.replaceChild(newBtn, btnConfirm);

        newBtn.addEventListener('click', async () => {
            // Read settings from modal
            const showHeaderAll = document.getElementById('exportShowHeaderAll').checked;
            const qualityScale = parseInt(document.getElementById('exportQuality').value) || 2;
            const isDuplicata = document.getElementById('exportDuplicata')?.checked || false;

            // Close modal
            modal.hide();

            // Export all invoices sequentially with a delay
            for (let i = 0; i < selectedInvoices.length; i++) {
                const inv = selectedInvoices[i];
                inv._duplicata = isDuplicata;

                try {
                    await exportSmartInvoicePDF(inv, {
                        pageSize: 'normal',
                        maxRowsPerPage: 10,
                        showSignatures: true,
                        duplicateHeaderAllPages: showHeaderAll,
                        scaleFactor: qualityScale
                    });
                } catch (err) {
                    console.error(`Error exporting invoice ${inv.number}:`, err);
                }

                // Small delay between exports to let browser breathe
                if (i < selectedInvoices.length - 1) {
                    await new Promise(r => setTimeout(r, 800));
                }
            }

            alert(`✅ ${selectedInvoices.length} facture(s) exportée(s) avec succès !`);
        });
    } catch (error) {
        console.error('Error exporting PDF:', error);
        alert('Erreur lors de l\'export PDF');
    }
}

function exportInvoiceToPDF(invoice) {
    try {
        if (!window.html2canvas || !window.jspdf) {
            alert('PDF libraries not available. Please reload the page.');
            return;
        }

        const articleCount = invoice.articles ? invoice.articles.length : 0;
        
        if (articleCount <= 3) {
            // Single page export for 3 or fewer articles
            exportSinglePagePDF(invoice);
        } else if (articleCount <= 14) {
            // Two page export for 4-14 articles
            exportTwoPagePDF(invoice);
        } else {
            // Three page export for 15+ articles
            exportThreePagePDF(invoice);
        }
    } catch (error) {
        console.error('Export PDF error:', error);
        alert('Error during PDF export');
    }
}

// Single page PDF export (3 or fewer articles)
function exportSinglePagePDF(invoice) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = generateInvoiceHTML(invoice, { duplicata: invoice._duplicata || false });
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.width = '800px';
    document.body.appendChild(tempDiv);

    const element = tempDiv.querySelector('.invoice-preview');

    html2canvas(element, {
        scale: 3,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
        width: 800,
        height: 1100
    }).then(canvas => {
        try {
            const imgData = canvas.toDataURL('image/jpeg', 0.85);
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4', true);

            const imgWidth = 210; // A4 width in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
            pdf.save(`Facture_${invoice.number.replace(/\//g, '_')}.pdf`);
        } catch (pdfError) {
            console.error('PDF generation error:', pdfError);
            alert('Error during PDF generation');
        } finally {
            document.body.removeChild(tempDiv);
        }
    }).catch(canvasError => {
        console.error('Canvas generation error:', canvasError);
        alert('Error during image generation');
        document.body.removeChild(tempDiv);
    });
}

// Two page PDF export (4-14 articles)
function exportTwoPagePDF(invoice) {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4', true);
    
    // Split articles: first 3 on page 1, rest on page 2
    const firstPageArticles = invoice.articles.slice(0, 3);
    const secondPageArticles = invoice.articles.slice(3);
    
const firstPageInvoice = {
    ...invoice,
    articles: firstPageArticles,
    showTotals: false,
    currentPage: 1,
    totalPages: 2
};

const secondPageInvoice = {
    ...invoice,
    articles: secondPageArticles,
    showTotals: true,
    showHeader: false,
    currentPage: 2,
    totalPages: 2
};

    
    // Generate first page
    generatePDFPage(pdf, firstPageInvoice, true).then(() => {
        // Add new page and generate second page
        pdf.addPage();
        generatePDFPage(pdf, secondPageInvoice, false).then(() => {
            pdf.save(`Facture_${invoice.number.replace(/\//g, '_')}.pdf`);
        });
    });
}

// Three page PDF export (15+ articles)
function exportThreePagePDF(invoice) {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4', true);
    
    // Split articles: first 3 on page 1, next 11 on page 2, rest on page 3
    const firstPageArticles = invoice.articles.slice(0, 3);
    const secondPageArticles = invoice.articles.slice(3, 14);
    const thirdPageArticles = invoice.articles.slice(14);
    
    // Create first page (3 articles, no totals)
const firstPageInvoice = {
    ...invoice,
    articles: firstPageArticles,
    showTotals: false,
    currentPage: 1,
    totalPages: 3
};

const secondPageInvoice = {
    ...invoice,
    articles: secondPageArticles,
    showTotals: false,
    showHeader: false,
    currentPage: 2,
    totalPages: 3
};

const thirdPageInvoice = {
    ...invoice,
    articles: thirdPageArticles,
    showTotals: true,
    showHeader: false,
    currentPage: 3,
    totalPages: 3
};

    
    // Generate all pages
    generatePDFPage(pdf, firstPageInvoice, true).then(() => {
        pdf.addPage();
        generatePDFPage(pdf, secondPageInvoice, false).then(() => {
            pdf.addPage();
            generatePDFPage(pdf, thirdPageInvoice, false).then(() => {
                pdf.save(`Facture_${invoice.number.replace(/\//g, '_')}.pdf`);
            });
        });
    });
}

// Generate individual PDF page (updated to handle the table properly)
function generatePDFPage(pdf, invoiceData, isFirstPage) {
    return new Promise((resolve, reject) => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = generateInvoiceHTMLForPDF(invoiceData, {
            currentPage: invoiceData.currentPage || 1,
            totalPages: invoiceData.totalPages || 1,
            showHeader: invoiceData.showHeader !== false,
            showTotals: invoiceData.showTotals !== false,
            isFirstPage: isFirstPage,
            duplicata: invoiceData._duplicata || false
        });
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        tempDiv.style.width = '800px';
        document.body.appendChild(tempDiv);

        const element = tempDiv.querySelector('.invoice-preview');

        html2canvas(element, {
            scale: 3,
            backgroundColor: '#ffffff',
            useCORS: true,
            allowTaint: true,
            width: 800,
            height: 1100
        }).then(canvas => {
            try {
                const imgData = canvas.toDataURL('image/jpeg', 0.85);
                const imgWidth = 210; // A4 width in mm
                const imgHeight = (canvas.height * imgWidth) / canvas.width;

                pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, Math.min(imgHeight, 280));
                
                
                document.body.removeChild(tempDiv);
                resolve();
            } catch (error) {
                document.body.removeChild(tempDiv);
                reject(error);
            }
        }).catch(error => {
            document.body.removeChild(tempDiv);
            reject(error);
        });
    });
}

function generateInvoiceHTMLForPDF(invoice, options = {}) {
  try {
    const {
      pageSize = 'normal',
      showCompanyHeader = true,
      showInvoiceMeta = true,
      showTotals = true,
      showSignatures = true,
      currentPage = 1,
      totalPages = 1,
      articlesToShow = null,
      duplicata = false
    } = options;

    const client = clients.find(c => c.id === invoice.clientId);
    if (!client) return '<div class="p-3 text-dark">Client not found</div>';

    const pad = n => n.toString().padStart(2, '0');
    const d = new Date(invoice.date);
    const biskraDate = `Biskra le ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

    const accent = '#007B7C';
    const dark = '#000000';
    const light = '#f8f9fa';

    // FORCE COMPACT PADDING
    const ps = { fontSize: '11px', headerSize: '1.4rem' };
    const articlesForThisPage = articlesToShow || invoice.articles || [];

    const headerRibInfo = settings.rib ? `<div style="margin-top:2px; font-weight:bold;">Compte bancaire : ${settings.rib}</div>` : '';

    let companyHeaderHTML = '';
    // Only show header if option is true
    if (showCompanyHeader) {
      companyHeaderHTML = `
        <div class="invoice-header-compact">
          <div class="header-logo logo-left">${settings.logoLeft ? `<img src="${settings.logoLeft}" alt="Logo">` : ''}</div>
          <div class="header-info">
            <div class="company-name">${settings.name}</div>
            <div class="company-details">
              Capital : ${settings.capital}<br>
              NIF : ${settings.nif} – RC : ${settings.rc}<br>
              NIS : ${settings.nis} – Art. Imp : ${settings.artimp}<br>
              ${settings.address}<br>
              ${settings.phone ? `Tél : ${settings.phone}` : ''} ${settings.fax ? `Fax : ${settings.fax}` : ''}
              ${headerRibInfo}
            </div>
          </div>
          <div class="header-logo logo-right">${settings.logoRight ? `<img src="${settings.logoRight}" alt="Logo">` : ''}</div>
        </div>
      `;
    } else {
        // Create an invisible spacer to keep layout consistent if needed, or just empty
        companyHeaderHTML = `<div style="height: 20px;"></div>`; 
    }

    let invoiceMetaHTML = '';
    if (showInvoiceMeta) {
      invoiceMetaHTML = `
        <div class="invoice-meta-container">
            <div class="meta-left">
                <div class="invoice-number">${invoice.documentType === 'proforma' ? 'PROFORMA N°' : 'Facture N°'} ${invoice.number}</div>
                ${duplicata ? '<div style="color: #CC0000; font-weight: bold; font-size: 1.1em; letter-spacing: 2px; margin-top: 2px; border: 2px solid #CC0000; display: inline-block; padding: 1px 10px; border-radius: 3px;">DUPLICATA</div>' : ''}
                <div class="invoice-date">${biskraDate}</div>
            </div>
            <div class="bill-to">
                <div class="bill-to-title">DOIT À :</div>
                <div class="client-name">${client.nom}</div>
                ${invoice.showDestinationInDoitA && invoice.doitADestination ? `<div class="destination">${invoice.doitADestination}</div>` : ''}
                <div style="margin-bottom:4px;">${client.adresse}, ${client.wilaya}</div>
<div class="client-ids-grid">
                           ${client.phone ? `<div style="grid-column: 1 / -1; margin-bottom: 4px;"><strong>Tél:</strong> ${client.phone}</div>` : ''}
                           ${client.rc ? `<div><strong>RC:</strong> ${client.rc}</div>` : ''}
                           ${client.activite ? `<div style="grid-column: 1 / -1; margin-bottom: 4px;"><strong>Activité:</strong> ${client.activite}</div>` : ''}
                           ${client.nif ? `<div><strong>NIF:</strong> ${client.nif}</div>` : ''}
                           ${client.nis ? `<div><strong>NIS:</strong> ${client.nis}</div>` : ''}
                           ${client.artimp ? `<div><strong>Art:</strong> ${client.artimp}</div>` : ''}
                        </div>
            </div>
        </div>
      `;
    }

    // ROWS
    let rows = articlesForThisPage.map(a => `
      <tr class="article-row">
        <td style="text-align: center !important;">${a.no}</td>
        <td class="text-left" style="text-align: left !important;">${a.designation}</td>
        <td style="text-align: center !important;">${a.qte}</td>
        <td style="text-align: center !important;">${formatCurrency(a.prixUHT).replace(/\s?DA\s?$/, '')}</td>
        <td style="text-align: center !important;">${formatCurrency(a.montantHT).replace(/\s?DA\s?$/, '')}</td>
      </tr>
    `).join('');

    // TOTALS (Only if showTotals is true, usually last page)
    let totalsHTML = '';
    let underTable = '';
    
    if (showTotals) {
      const totalHT = (invoice.articles || []).reduce((s, a) => s + (a.montantHT || 0), 0);
      const remiseAmount = invoice.remise?.enabled ? (invoice.totals?.remise || 0) : 0;
      const htRemise = invoice.remise?.enabled ? (invoice.totals?.htRemise || (totalHT - remiseAmount)) : totalHT;
      const totalTVA = invoice.totals?.tva ?? (htRemise * 0.19);
      const totalTTC = invoice.totals?.ttc ?? (htRemise + totalTVA);

      totalsHTML = `
        <tr class="totals-row"><td colspan="3" class="total-cell-empty"></td><td class="total-cell-label" style="width:20%;">TOTAL HT</td><td class="total-cell-value" style="width:20%;">${formatCurrency(totalHT).replace(/\s?DA\s?$/, '')}</td></tr>
        ${invoice.remise?.enabled ? `
        <tr class="totals-row"><td colspan="3" class="total-cell-empty"></td><td class="total-cell-label" style="width:20%;">REMISE</td><td class="total-cell-value" style="width:20%;">- ${formatCurrency(remiseAmount).replace(/\s?DA\s?$/, '')}</td></tr>
        <tr class="totals-row"><td colspan="3" class="total-cell-empty"></td><td class="total-cell-label" style="width:20%;">HT APRÈS REMISE</td><td class="total-cell-value" style="width:20%;">${formatCurrency(htRemise).replace(/\s?DA\s?$/, '')}</td></tr>` : ''}
        <tr class="totals-row"><td colspan="3" class="total-cell-empty"></td><td class="total-cell-label" style="width:20%;">TVA 19 %</td><td class="total-cell-value" style="width:20%;">${formatCurrency(totalTVA).replace(/\s?DA\s?$/, '')}</td></tr>
        <tr class="totals-row"><td colspan="3" class="total-cell-empty"></td><td class="total-cell-label" style="width:20%;">TOTAL TTC</td><td class="total-cell-value" style="width:20%;">${formatCurrency(totalTTC).replace(/\s?DA\s?$/, '')}</td></tr>
        <tr class="totals-row final-total"><td colspan="3" class="total-cell-empty"></td><td class="net-cell-label" style="width:20%;">Net à payer</td><td class="net-cell-value" style="width:20%;">${formatCurrency(totalTTC).replace(/\s?DA\s?$/, '')}</td></tr>
      `;

      const isVirement = (invoice.modePaiement || '').toLowerCase().includes('virement');
      const footerRib = (isVirement && settings.rib) ? `<br><strong>Compte bancaire :</strong> ${settings.rib}` : '';
      const paymentConditionText = `${invoice.modePaiement || '–'}${footerRib}`;

      // REFERENCES
      const refs = [];
      if (invoice.contratRef) refs.push(`<div><strong>Référence Contrat :</strong> ${invoice.contratRef}</div>`);
      if (invoice.bdcRef) refs.push(`<div><strong>Référence Bon de commande :</strong> ${invoice.bdcRef}</div>`);
      if (invoice.blReferences) refs.push(`<div><strong>Références BL :</strong> ${invoice.blReferences}</div>`);
      if (invoice.refFeuilleRoute) refs.push(`<div><strong>Réf. Feuille de route :</strong> ${invoice.refFeuilleRoute}</div>`);
      if (invoice.refBonTransfert) refs.push(`<div><strong>Réf. Bon de transfert :</strong> ${invoice.refBonTransfert}</div>`);
      
      const refsHTML = refs.length > 0 ? `<div class="references-list">${refs.join('')}</div>` : '';
      let amountText = nombreEnLettresDA(totalTTC);
      amountText = amountText.charAt(0).toUpperCase() + amountText.slice(1);

      underTable = `
        <div class="under-table-block">
          <div class="amount-words">
            <strong>Arrêté la présente facture à la somme de :</strong><br>
            <span class="amount-text">${amountText}</span>
          </div>
          <div class="conditions under-amount">
            <strong>Conditions de paiement :</strong><br>
            <strong>Mode de règlement :</strong> ${paymentConditionText}<br>
            <strong>Délai de paiement :</strong> ${invoice.delaiPaiement || 30} jours après réception de notre facture
          </div>
          
          ${refs.length > 0 ? `
            <div class="references-wrapper">
                <div class="references-section">${refsHTML}</div>
            </div>` : ''}
        </div>`;
    }

    // SIGNATURES 
    // Logic: If it's the last page, show signatures. 
    // CSS Change: "margin-top: auto" pushes it to the bottom, BUT inside the flex container, ensuring no overlap.
    const signaturesHTML = (showSignatures) ? `
        <div class="signatures-section">
          <div class="signature-row">
            <div class="sig-box">
                <div class="sig-label">Signature du client</div>
                <div class="sig-space"></div>
            </div>
            <div class="sig-box">
                <div class="sig-label">Directeur Général</div>
                <div class="sig-space"></div>
            </div>
          </div>
        </div>` : '';

    const pageNumberHTML = `
        <div class="page-number-only">Page ${currentPage} sur ${totalPages}</div>
    `;

    return `
      <style>
        @page { margin: 0; }
        body { margin: 0; padding: 0; }

/* FLEXBOX LAYOUT TO PREVENT OVERLAP */
        .invoice-preview { 
            font-family: 'Roboto', sans-serif; 
            color: ${dark}; 
            background: #FFF; 
            padding: 20px 40px 80px 40px; /* Increased to 80px to push everything up */
            width: 794px;  /* Exact A4 Width */
            height: 1123px; /* Exact A4 Height */
            margin: 0 auto; 
            font-size: ${ps.fontSize}; 
            line-height: 1.3; 
            box-sizing: border-box; 
            overflow: hidden;
            display: flex;
            flex-direction: column; /* Stacks elements vertically */
        }

        /* Content grows to fill space, but doesn't force footer off if small */
        .invoice-body-content {
            flex: 1; 
            display: flex;
            flex-direction: column;
        }

        .invoice-header-compact { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid ${accent}; padding-bottom: 15px; }
        
        .header-logo { flex: 0 0 130px; display: flex; align-items: center; justify-content: center; }
        .header-logo.logo-left img { max-height: 110px; max-width: 100%; object-fit: contain; } 
        .header-logo.logo-right img { max-height: 80px; max-width: 100%; object-fit: contain; }

        .header-info { flex: 1; text-align: center; padding: 0 15px; }
        .company-name { font-size: ${ps.headerSize}; font-weight: bold; color: ${accent}; margin-bottom: 5px; text-transform: uppercase; }
        .company-details { font-size: 1.2em; }

        .invoice-meta-container { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; gap: 20px; }
        .meta-left { flex: 0 0 40%; }
        .invoice-number { font-size: 1.2rem; font-weight: bold; color: ${accent}; margin-bottom: 5px; }
        .invoice-date { font-size: 1.1em; }
        .bill-to { flex: 1; background: ${light}; padding: 8px 12px; border-radius: 6px; border: 1px solid #e0e0e0; font-size: 0.85rem; }
        .bill-to-title { color: ${accent}; font-weight: bold; margin-bottom: 3px; text-decoration: underline; font-size: 1em; }
        .client-name { font-weight: bold; font-size: 1.1em; margin-bottom: 2px; color: #000; }
        .destination { font-weight: bold; color: ${accent}; margin-bottom: 2px; font-size: 1em; }
        .client-ids-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2px; margin-top: 4px; }
        .client-ids-grid div { font-size: 0.8rem; color: #444; }
        .client-ids-grid strong { color: #000; }

        table.invoice-table { border-collapse: collapse; width: 100%; font-size: 0.75rem; margin-bottom: 10px; table-layout: fixed; }
        table.invoice-table th, table.invoice-table td { border: 1px solid #000; padding: 5px 8px; text-align: center; vertical-align: middle; }
        table.invoice-table th { background: ${accent}; color: #FFF; font-weight: bold; text-transform: uppercase; font-size: 0.75rem; }
        table.invoice-table td.text-left { text-align: left; }
        
        .total-cell-empty { 
            width: 60% !important; 
            border: 1px solid #000 !important;
            background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' version='1.1' preserveAspectRatio='none' viewBox='0 0 100 100'><line x1='0' y1='100' x2='100' y2='0' stroke='black' stroke-width='1' vector-effect='non-scaling-stroke'/></svg>") !important;
            background-repeat: no-repeat;
            background-position: center center;
            background-size: 100% 100%;
        }

        .total-cell-label { background: ${accent} !important; color: #FFF !important; font-weight: bold !important; text-align: center !important; width: 20% !important; }
        .total-cell-value { font-weight: bold !important; background: #fff !important; text-align: center !important; width: 20% !important; }
        .net-cell-label { background: #eee !important; color: #000 !important; font-size: 0.8rem !important; text-align: center !important; font-weight: bold !important; width: 20% !important; }
        .net-cell-value { background: #eee !important; color: #000 !important; font-size: 0.8rem !important; text-align: center !important; font-weight: bold !important; width: 20% !important; }

        .under-table-block { margin-top: 15px; }
        .amount-words { margin-bottom: 10px; padding: 8px; background: #fffdf0; border: 1px solid #e6dbb9; border-radius: 4px; font-size: 1.1em; }
        .conditions { font-size: 12px; line-height: 1.4; }
        .references-wrapper { margin-top: 20px; border-top: 1px solid #aaa; padding-top: 5px; }
        .references-section { font-size: 0.6rem; font-family: 'Roboto', sans-serif; color: #333; text-align: left; }
        
        /* FOOTER WRAPPER: Pushed to bottom via Flexbox, relative positioning prevents overlap */
        .footer-wrapper {
            margin-top: auto; /* This pushes it to the bottom of the flex container */
            width: 100%;
            padding-top: 20px;
        }

.signatures-section { margin-bottom: 5px; }
        .signature-row { display: flex; justify-content: space-between; padding: 0 40px; }
        .sig-box { display: flex; flex-direction: column; align-items: center; width: 200px; }
        .sig-label { font-weight: bold; margin-bottom: 5px; text-transform: uppercase; text-decoration: underline; }
        .sig-space { height: 30px; width: 100%; } /* Squeezed even more */

        .page-number-only { text-align: center; font-size: 0.8rem; color: #666; border-top: 1px solid #eee; padding-top: 5px; padding-bottom: 30px; margin-top: 5px; } /* Added large bottom padding to lift text */		
        @media print { .invoice-preview { height: 1123px; } }
      </style>

      <div class="invoice-preview">
            <div class="invoice-body-content">
                ${companyHeaderHTML}
                ${invoiceMetaHTML}
                <table class="invoice-table">
                  <colgroup>
                      <col style="width: 5%;">
                      <col style="width: 45%;">
                      <col style="width: 10%;">
                      <col style="width: 20%;">
                      <col style="width: 20%;">
                  </colgroup>
                  <thead>
                    <tr>
                      <th>N°</th>
                      <th>DÉSIGNATION</th>
                      <th>QTE</th>
                      <th>PRIX U. HT</th>
                      <th>MONTANT HT</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rows}
                    ${totalsHTML}
                  </tbody>
                </table>
                ${underTable}
            </div>
        
        <div class="footer-wrapper">
             ${signaturesHTML}
             ${pageNumberHTML}
        </div>
      </div>
    `;
  } catch (e) {
    console.error('Error generating PDF HTML', e);
    return '<div class="p-3 text-dark">Error generating invoice</div>';
  }
}
/**
 * Smart PDF export - Duplicates ONLY company header (logos + info), NOT invoice meta
 */
/**
 * REWRITTEN: Smart PDF Export with dynamic row counting
 */
async function exportSmartInvoicePDF(invoice, options = {}) {
    try {
        const {
            pageSize = 'normal',
            showSignatures = true,
            duplicateHeaderAllPages = false,
            scaleFactor = 2 // Default quality
        } = options;

        const allArticles = invoice.articles || [];
        const count = allArticles.length;

        if (count === 0) {
            alert('Aucun article à exporter');
            return;
        }

// --- CONFIGURATION OF ROW LIMITS (You can change these numbers) ---
        // How many lines fit on Page 1 (Needs space for Client Info + Totals + Signature)
        const LIMIT_PAGE_1 = 5; 
        
        // How many lines fit on Next Pages WITH Header (Needs space for Logo)
        const LIMIT_PAGE_NEXT_WITH_HEADER = 7; 
        
        // How many lines fit on Next Pages WITHOUT Header (Full space)
        const LIMIT_PAGE_NEXT_NO_HEADER = 10; 
        // ------------------------------------------------------------------        // ------------------------------------------------------------------

        // 1. Calculate Pages Logic
        const pages = [];
        let currentArticleIndex = 0;
        let pageIndex = 1;

        while (currentArticleIndex < count) {
            let limitForThisPage = 0;

            if (pageIndex === 1) {
                // Page 1 is always tight
                limitForThisPage = LIMIT_PAGE_1;
            } else {
                // Page 2+ depends on checkbox
                if (duplicateHeaderAllPages) {
                    limitForThisPage = LIMIT_PAGE_NEXT_WITH_HEADER;
                } else {
                    limitForThisPage = LIMIT_PAGE_NEXT_NO_HEADER;
                }
            }

            // Slice the articles for this page
            const articlesChunk = allArticles.slice(currentArticleIndex, currentArticleIndex + limitForThisPage);
            
            // Check if this is the very last page
            const isLastPage = (currentArticleIndex + articlesChunk.length) >= count;

            pages.push({
                articles: articlesChunk,
                showCompanyHeader: (pageIndex === 1) || duplicateHeaderAllPages,
                showInvoiceMeta: (pageIndex === 1), // Only Page 1 gets Client Info
                showTotals: isLastPage,
                currentPage: pageIndex,
                // We don't know total pages yet, will fix later
            });

            // Advance index
            currentArticleIndex += limitForThisPage;
            pageIndex++;
        }

        // Update total pages count for all pages
        const finalTotalPages = pages.length;
        pages.forEach(p => p.totalPages = finalTotalPages);

        // 2. Generate PDF
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4', true);

        for (let i = 0; i < pages.length; i++) {
            const pg = pages[i];
            const pageOptions = {
                ...options,
                pageSize,
                articlesToShow: pg.articles,
                currentPage: pg.currentPage,
                totalPages: pg.totalPages,
                showCompanyHeader: pg.showCompanyHeader,
                showInvoiceMeta: pg.showInvoiceMeta,
                showTotals: pg.showTotals,
                showSignatures: showSignatures && pg.showTotals,
                duplicata: invoice._duplicata || false
            };

            // Render the page
            await generatePDFPageSmart(pdf, invoice, pageOptions, i === 0);
        }

        const headerSuffix = duplicateHeaderAllPages ? '_with_headers' : '';
        pdf.save(`Facture_${invoice.number.replace(/\//g, '_')}${headerSuffix}.pdf`);

    } catch (error) {
        console.error('PDF generation error:', error);
        alert('Erreur lors de la génération du PDF');
    }
}
// ✅ IMPROVED: Handles High Quality Scaling
// ✅ UPDATED: MAX QUALITY (Scale 5) & Fixed A4 Dimensions
function generatePDFPageSmart(pdf, invoice, options, isFirstPage) {
  return new Promise((resolve, reject) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = generateInvoiceHTMLForPDF(invoice, options);
    
    // FORCE Exact A4 Dimensions (794px x 1123px at 96 DPI)
    Object.assign(tempDiv.style, {
        position: 'fixed',
        left: '-10000px',
        top: '0',
        width: '794px',       
        height: '1123px',     
        overflow: 'hidden',   
        zIndex: '-1000'
    });
    
    document.body.appendChild(tempDiv);
    const element = tempDiv.querySelector('.invoice-preview');

    // Slight delay to ensure fonts render
    setTimeout(() => {
        html2canvas(element, {
          scale: 5, // ⭐️ MAX QUALITY (Ultra Sharp)
          backgroundColor: '#ffffff',
          useCORS: true,
          width: 794,
          height: 1123,
          windowHeight: 1123,
          scrollY: 0
        }).then(canvas => {
          try {
            // Use JPEG 1.0 (Maximum compression quality)
            const imgData = canvas.toDataURL('image/jpeg', 1.0);
            const imgWidth = 210; // A4 width mm
            const pageHeight = 297; // A4 height mm
            
            if (!isFirstPage) pdf.addPage();
            
            pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, pageHeight);

            document.body.removeChild(tempDiv);
            resolve();
          } catch (e) {
            if(document.body.contains(tempDiv)) document.body.removeChild(tempDiv);
            reject(e);
          }
        }).catch(e => {
          if(document.body.contains(tempDiv)) document.body.removeChild(tempDiv);
          reject(e);
        });
    }, 150); 
  });
}
/**
 * Updated export function with header duplication option
 */
// ✅ NEW: Open Export Modal instead of Prompts
function exportInvoiceToPDF(invoice) {
    // 1. Save the invoice we want to export in a global variable or closure
    window.currentExportInvoice = invoice;
    
    // 2. Open the Bootstrap modal
    const modalEl = document.getElementById('modalExportOptions');
    if (modalEl) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
        
        // 3. Handle the "Download" button click inside the modal
        const btnConfirm = document.getElementById('btnConfirmExport');
        
        // Remove old listeners to prevent multiple clicks
        const newBtn = btnConfirm.cloneNode(true);
        btnConfirm.parentNode.replaceChild(newBtn, btnConfirm);
        
        newBtn.addEventListener('click', () => {
            // Get values from modal inputs
            const showHeaderAll = document.getElementById('exportShowHeaderAll').checked;
            const qualityScale = parseInt(document.getElementById('exportQuality').value) || 2;
            const isDuplicata = document.getElementById('exportDuplicata')?.checked || false;
            
            // Close modal
            modal.hide();
            
            // Set duplicata flag on invoice
            window.currentExportInvoice._duplicata = isDuplicata;
            
            // Run Export
            exportSmartInvoicePDF(window.currentExportInvoice, {
                pageSize: 'normal',
                maxRowsPerPage: 10,
                showSignatures: true,
                duplicateHeaderAllPages: showHeaderAll,
                scaleFactor: qualityScale
            });
        });
    } else {
        alert("Erreur: Modal d'exportation introuvable.");
    }
}

function populateFilterDropdowns() {
    try {
        // 1. CLIENTS
        const clientFilter = document.getElementById('filterClient');
        let selectedClientId = null;
        
        if (clientFilter) {
            const currentVal = clientFilter.value;
            selectedClientId = currentVal ? parseInt(currentVal) : null;
            
            if (clientFilter.options.length <= 1) {
                 clientFilter.innerHTML = '<option value="">Tous les clients</option>';
                 clients.forEach(client => {
                     clientFilter.innerHTML += `<option value="${client.id}">${client.nom}</option>`;
                 });
                 clientFilter.value = currentVal;
            }
        }

        // ✅ 2. DESTINATIONS (Smart Search)
        const destInput = document.getElementById('filterDestination');
        const destList = document.getElementById('destOptions');

        if (destInput && destList) {
            const destinations = new Set();
            
            // Filter by Client if selected
            const invoicesToScan = selectedClientId 
                ? invoices.filter(inv => inv.clientId === selectedClientId) 
                : invoices;

            invoicesToScan.forEach(inv => {
                if (inv.selectedDestination) destinations.add(inv.selectedDestination);
                if (inv.wilayaDestination) destinations.add(inv.wilayaDestination);
                if (inv.articles) {
                    inv.articles.forEach(art => {
                        if (art.selectedDestination) destinations.add(art.selectedDestination);
                        if (art.wilayaDestination) destinations.add(art.wilayaDestination);
                    });
                }
            });

            // Add Client Profile Destinations
            if (selectedClientId) {
                const clientProfile = clients.find(c => c.id === selectedClientId);
                if (clientProfile && clientProfile.destinations) {
                    clientProfile.destinations.forEach(d => destinations.add(d));
                }
            }

            // Build List
            destList.innerHTML = '';
            Array.from(destinations).sort().forEach(d => {
                if(d && d.trim()) {
                    const opt = document.createElement('option');
                    opt.value = d;
                    destList.appendChild(opt);
                }
            });
        }

        // ✅ 3. YEARS (Fixed: Allows "All Years")
        const yearFilter = document.getElementById('filterYear');
        if (yearFilter) {
            const currentVal = yearFilter.value; // Save selection
            
            yearFilter.innerHTML = '<option value="">Toutes années</option>';
            
            const years = new Set();
            years.add(new Date().getFullYear()); 
            
            invoices.forEach(inv => {
                if (inv.date) years.add(new Date(inv.date).getFullYear());
            });

            Array.from(years).sort((a, b) => b - a).forEach(year => {
                yearFilter.innerHTML += `<option value="${year}">${year}</option>`;
            });

            // Restore selection (This keeps "2026" if set by initializeApp, or "" if you chose All)
            yearFilter.value = currentVal;
        }

        // 4. MONTHS
        const monthFilter = document.getElementById('filterMonth');
        if (monthFilter) {
            const currentVal = monthFilter.value;
            monthFilter.innerHTML = '<option value="">Tous les mois</option>';
            const uniqueMonths = new Set();
            invoices.forEach(inv => {
                if(inv.date) uniqueMonths.add(inv.date.substring(0, 7));
            });
            Array.from(uniqueMonths).sort().reverse().forEach(monthStr => {
                const [y, m] = monthStr.split('-');
                const date = new Date(parseInt(y), parseInt(m) - 1);
                const label = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
                monthFilter.innerHTML += `<option value="${monthStr}">${label.charAt(0).toUpperCase() + label.slice(1)}</option>`;
            });
            monthFilter.value = currentVal;
        }

    } catch (error) {
        console.error('Error populating filters:', error);
    }
}
function filterInvoices() {
    try {
        renderInvoices(); // This will now use filtered invoices
    } catch (error) {
        console.error('Error filtering invoices:', error);
    }
}


function clearFilters() {
    try {
        const filterClient = document.getElementById('filterClient');
        const filterYear = document.getElementById('filterYear'); // NEW
        const filterMonth = document.getElementById('filterMonth');
        const filterStatus = document.getElementById('filterStatus');
        const globalSearchInput = document.getElementById('globalSearchInput');

        if (filterClient) filterClient.value = '';
        
        // Reset Year to current year by default
        if (filterYear) {
            filterYear.value = new Date().getFullYear();
        }
        
        if (filterMonth) filterMonth.value = '';
        if (filterStatus) filterStatus.value = '';
        if (globalSearchInput) globalSearchInput.value = '';
        
        renderInvoices();
    } catch (error) {
        console.error('Error clearing filters:', error);
    }
}


function toggleAllInvoices() {
    try {
        const mainCheckbox = document.getElementById('chkAllInvoices');
        const checkboxes = document.querySelectorAll('.invoice-checkbox');
        
        if (mainCheckbox) {
            checkboxes.forEach(checkbox => {
                checkbox.checked = mainCheckbox.checked;
            });
        }
    } catch (error) {
        console.error('Error toggling all invoices:', error);
    }
}

// ═══════════════════════════════════════════════════════════════
// ████  DASHBOARD — COMPLETE REWRITE  ████
// ═══════════════════════════════════════════════════════════════
let revenueChartInstance = null;

// ─── Populate client dropdowns ───
function populateDashboardClientSelect() {
    if (!clients || !clients.length) return;
    const sorted = [...clients].sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));

    const mainSel = document.getElementById('dashboardClientSelect');
    if (mainSel && mainSel.options.length <= 1) {
        mainSel.innerHTML = '<option value="all">👑 Tous les clients</option>';
        sorted.forEach(c => { mainSel.innerHTML += `<option value="${c.id}">${c.nom}</option>`; });
    }

    const trajetSel = document.getElementById('chartTrajetClientSelect');
    if (trajetSel && trajetSel.options.length <= 1) {
        trajetSel.innerHTML = '<option value="">🌍 Vue Globale</option>';
        sorted.forEach(c => { trajetSel.innerHTML += `<option value="${c.id}">${c.nom}</option>`; });
    }
}

// ─── Reset all filters ───
function resetDashboardFilters() {
    const cs = document.getElementById('dashboardClientSelect');
    const ys = document.getElementById('dashboardYearSelect');
    const ps = document.getElementById('dashboardPeriodSelect');
    const tcs = document.getElementById('chartTrajetClientSelect');
    const customDates = document.getElementById('dashboardCustomDates');
    const dateFrom = document.getElementById('dashboardDateFrom');
    const dateTo = document.getElementById('dashboardDateTo');
    if (cs) cs.value = 'all';
    if (ys) ys.value = '2026';
    if (ps) ps.value = 'all';
    if (tcs) tcs.value = '';
    if (dateFrom) dateFrom.value = '';
    if (dateTo) dateTo.value = '';
    if (customDates) customDates.style.display = 'none';
    // Reset HT/TTC toggles
    chartSettings = { revenue: 'TTC', clients: 'TTC', debt: 'TTC', forecast: 'TTC' };
    ['revTTC', 'cliTTC', 'debtTTC', 'fcTTC'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.checked = true;
    });
    updateDashboard();
}

// ─── Show/hide custom date pickers when period changes ───
function onDashboardPeriodChange() {
    const periodSel = document.getElementById('dashboardPeriodSelect');
    const customDates = document.getElementById('dashboardCustomDates');
    if (!periodSel || !customDates) return;

    if (periodSel.value === 'custom') {
        customDates.style.display = 'flex';
        // Pre-fill with current year range if empty
        const dateFrom = document.getElementById('dashboardDateFrom');
        const dateTo = document.getElementById('dashboardDateTo');
        const yearSel = document.getElementById('dashboardYearSelect');
        const year = yearSel?.value || new Date().getFullYear();
        if (dateFrom && !dateFrom.value) dateFrom.value = `${year}-01-01`;
        if (dateTo && !dateTo.value) {
            const today = new Date();
            dateTo.value = today.toISOString().slice(0, 10);
        }
    } else {
        customDates.style.display = 'none';
    }
    updateDashboard();
}

// ─── CORE: Filter invoices by Client + Year + Period (incl. Semesters & Custom) ───
function getDashboardFilteredInvoices() {
    const clientSel = document.getElementById('dashboardClientSelect');
    const yearSel   = document.getElementById('dashboardYearSelect');
    const periodSel = document.getElementById('dashboardPeriodSelect');

    const clientVal = clientSel ? clientSel.value : 'all';
    const yearVal   = yearSel ? yearSel.value : '';
    const periodVal = periodSel ? periodSel.value : 'all';

    // Pre-parse custom dates once (outside the loop for performance)
    let customFrom = null, customTo = null;
    if (periodVal === 'custom') {
        const fromEl = document.getElementById('dashboardDateFrom');
        const toEl = document.getElementById('dashboardDateTo');
        if (fromEl && fromEl.value) customFrom = new Date(fromEl.value + 'T00:00:00');
        if (toEl && toEl.value) customTo = new Date(toEl.value + 'T23:59:59');
    }

    return invoices.filter(inv => {
        // Client filter
        if (clientVal !== 'all' && String(inv.clientId) !== String(clientVal)) return false;

        // Date of invoice
        const d = new Date(inv.date || inv.createdAt);

        // Year filter (applies to all modes except custom which has its own dates)
        if (periodVal !== 'custom' && yearVal !== '' && d.getFullYear() !== parseInt(yearVal)) return false;

        // Period filter
        if (periodVal !== 'all') {
            const m = d.getMonth();

            // Semesters
            if (periodVal === 'S1' && (m < 0 || m > 5)) return false;
            if (periodVal === 'S2' && (m < 6 || m > 11)) return false;

            // Trimesters
            if (periodVal === 'Q1' && (m < 0 || m > 2)) return false;
            if (periodVal === 'Q2' && (m < 3 || m > 5)) return false;
            if (periodVal === 'Q3' && (m < 6 || m > 8)) return false;
            if (periodVal === 'Q4' && (m < 9 || m > 11)) return false;

            // Individual month
            if (!isNaN(periodVal) && m !== parseInt(periodVal)) return false;

            // Custom date range
            if (periodVal === 'custom') {
                if (customFrom && d < customFrom) return false;
                if (customTo && d > customTo) return false;
            }
        }
        return true;
    });
}

// ═══════════════════════════════════════════════════════════════
// ████  MAIN UPDATE DASHBOARD  ████
// ═══════════════════════════════════════════════════════════════
function updateDashboard(targetChart, mode) {
    try {
        // Handle HT/TTC toggle clicks
        if (targetChart && mode) {
            chartSettings[targetChart] = mode;
            const radioMap = {
                revenue:  { HT: 'revHT',  TTC: 'revTTC'  },
                clients:  { HT: 'cliHT',  TTC: 'cliTTC'  },
                debt:     { HT: 'debtHT', TTC: 'debtTTC' },
                forecast: { HT: 'fcHT',   TTC: 'fcTTC'   }
            };
            const radioId = radioMap[targetChart]?.[mode];
            if (radioId) { const el = document.getElementById(radioId); if (el) el.checked = true; }
        }

        // Populate dropdowns
        populateDashboardClientSelect();
        if (typeof updateSidebarImmoBadge === 'function') updateSidebarImmoBadge();

        // 1. FILTER DATA
        const filtered = getDashboardFilteredInvoices();

        // 2. KPI CALCULATIONS
        const revTTC = filtered.reduce((s, i) => s + (i.totals?.ttc || 0), 0);
        const revHT  = filtered.reduce((s, i) => s + (i.totals?.ht  || 0), 0);

        const paidList = filtered.filter(i => i.paid || i.paymentStatus === 'encaissee');
        const paidTTC  = paidList.reduce((s, i) => s + (i.totals?.ttc || 0), 0);
        const paidHT   = paidList.reduce((s, i) => s + (i.totals?.ht  || 0), 0);

        const debtTTC = revTTC - paidTTC;
        const debtHT  = revHT  - paidHT;

        const today = new Date();
        const overdueList = filtered.filter(i => {
            if (i.paid || i.paymentStatus === 'encaissee') return false;
            const due = new Date(new Date(i.date).getTime() + ((i.delaiPaiement || 30) * 86400000));
            return due < today;
        });
        const overdueTTC = overdueList.reduce((s, i) => s + (i.totals?.ttc || 0), 0);
        const overdueHT  = overdueList.reduce((s, i) => s + (i.totals?.ht  || 0), 0);

        const recoveryRate = revTTC > 0 ? ((paidTTC / revTTC) * 100).toFixed(5) : '0.00000';

        // 3. KPI CARD RENDERER
        const renderCard = (title, settingKey, color, icon, valTTC, valHT, footerText) => {
            const cur = chartSettings[settingKey] || 'TTC';
            const primaryVal = cur === 'TTC' ? valTTC : valHT;
            const primaryLabel = cur;
            const secondaryVal = cur === 'TTC' ? valHT : valTTC;
            const secondaryLabel = cur === 'TTC' ? 'HT' : 'TTC';
            return `
                <div class="col-lg-3 col-md-6">
                    <div class="card border-0 shadow-sm h-100 overflow-hidden">
                        <div class="card-body p-3 position-relative">
                            <div class="border-start border-4 border-${color} position-absolute top-0 bottom-0 start-0"></div>
                            <div class="ms-2">
                                <div class="text-uppercase small fw-bold text-muted mb-2">${title}</div>
                                <div class="d-flex align-items-baseline">
                                    <span class="h4 fw-bold text-${color} mb-0">${formatCurrency(primaryVal).replace('DA','')}</span>
                                    <span class="badge bg-${color}-subtle text-${color} border border-${color}-subtle ms-2" onclick="updateDashboard('${settingKey}', '${primaryLabel}')" style="cursor:pointer">${primaryLabel} <i class="fa fa-check-circle ms-1" style="font-size:0.6em"></i></span>
                                </div>
                                <div class="d-flex align-items-baseline mt-1" style="cursor:pointer;" onclick="updateDashboard('${settingKey}', '${secondaryLabel}')" title="Voir en ${secondaryLabel}">
                                    <span class="h6 fw-normal text-secondary mb-0">${formatCurrency(secondaryVal).replace('DA','')}</span>
                                    <span class="badge bg-white text-secondary border ms-2">${secondaryLabel}</span>
                                </div>
                                <div class="small text-${color} mt-3 pt-2 border-top">
                                    <i class="fa ${icon} me-1"></i> ${footerText}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>`;
        };

        // 4. RENDER KPI CARDS
        const kpiC = document.getElementById('kpiContainer');
        if (kpiC) {
            kpiC.innerHTML = ''
                + renderCard("Chiffre d'Affaires", 'revenue', 'primary', 'fa-file-invoice', revTTC, revHT, `${filtered.length} facture(s)`)
                + renderCard("Total Encaissé", 'debt', 'success', 'fa-check-circle', paidTTC, paidHT, `${recoveryRate}% recouvré`)
                + renderCard("Crédit Client", 'debt', 'warning', 'fa-clock', debtTTC, debtHT, "En attente de paiement")
                + renderCard("Retards de Paiement", 'forecast', 'danger', 'fa-exclamation-triangle', overdueTTC, overdueHT, `${overdueList.length} facture(s) échue(s)`);
        }

        // ─── CHART DATA PREP ───
        const months = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc'];
        const destroy = (key) => { if (dashboardCharts[key]) { dashboardCharts[key].destroy(); dashboardCharts[key] = null; } };

        // A. Revenue by month
        const dataRev = Array(12).fill(0);
        filtered.forEach(inv => {
            const m = new Date(inv.date || inv.createdAt).getMonth();
            dataRev[m] += chartSettings.revenue === 'HT' ? (inv.totals?.ht || 0) : (inv.totals?.ttc || 0);
        });

        // B. Payment methods (by bank for paid, by modePaiement for unpaid)
        const methodsMap = {};
        const bankLabelMap = {};
        if (typeof ALGERIAN_BANKS !== 'undefined') {
            [...ALGERIAN_BANKS.public, ...ALGERIAN_BANKS.private, ...ALGERIAN_BANKS.other]
                .forEach(b => { bankLabelMap[b.value] = b.label; });
        }
        filtered.forEach(inv => {
            let key = 'Non défini';
            if (inv.paymentDetails && inv.paymentDetails.bank) {
                key = bankLabelMap[inv.paymentDetails.bank] || inv.paymentDetails.bank;
            } else if (inv.paymentDetails && inv.paymentDetails.method) {
                key = inv.paymentDetails.method;
            } else if (inv.modePaiement) {
                key = inv.modePaiement;
            }
            methodsMap[key] = (methodsMap[key] || 0) + 1;
        });

        // C. Top Clients
        const clientData = {};
        let totalClientVal = 0;
        filtered.forEach(inv => {
            const cName = clients.find(c => c.id === inv.clientId)?.nom || 'Inconnu';
            const val = chartSettings.clients === 'HT' ? (inv.totals?.ht || 0) : (inv.totals?.ttc || 0);
            clientData[cName] = (clientData[cName] || 0) + val;
            totalClientVal += val;
        });
        const sortedClients = Object.entries(clientData).sort((a, b) => b[1] - a[1]);

        // D. Debt status
        const paidChartVal = paidList.reduce((s, i) => s + (chartSettings.debt === 'HT' ? (i.totals?.ht||0) : (i.totals?.ttc||0)), 0);
        const totalChartVal = filtered.reduce((s, i) => s + (chartSettings.debt === 'HT' ? (i.totals?.ht||0) : (i.totals?.ttc||0)), 0);
        const unpaidChartVal = totalChartVal - paidChartVal;

        // E. Forecast
        const yearSel = document.getElementById('dashboardYearSelect');
        const yearValue = yearSel ? yearSel.value : '';
        const forecastData = Array(12).fill(0);
        filtered.filter(inv => !inv.paid).forEach(inv => {
            const d = new Date(inv.date);
            const delay = (inv.delaiPaiement !== undefined && inv.delaiPaiement !== null) ? parseInt(inv.delaiPaiement) : 30;
            d.setDate(d.getDate() + delay);
            if (yearValue === '' || d.getFullYear() === parseInt(yearValue)) {
                forecastData[d.getMonth()] += chartSettings.forecast === 'HT' ? (inv.totals?.ht || 0) : (inv.totals?.ttc || 0);
            }
        });

        // ─── RENDER CHARTS ───
        const palette = ['#2563eb','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16','#f97316','#6366f1','#14b8a6','#d946ef','#0ea5e9','#a3e635','#fb923c','#c084fc','#22d3ee','#4ade80','#facc15','#f87171','#818cf8','#34d399','#fbbf24','#60a5fa'];
        const hasDataLabels = typeof ChartDataLabels !== 'undefined';

        // 1. REVENUE BAR CHART
        destroy('revenueMonth');
        const ctxRev = document.getElementById('chartRevenueMonth');
        if (ctxRev) {
            dashboardCharts.revenueMonth = new Chart(ctxRev, {
                type: 'bar',
                plugins: hasDataLabels ? [ChartDataLabels] : [],
                data: {
                    labels: months,
                    datasets: [{ 
                        label: `C.A. ${chartSettings.revenue}`, 
                        data: dataRev, 
                        backgroundColor: '#2563eb', 
                        borderRadius: 6 
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { 
                        legend: { display: false },
                        tooltip: { callbacks: { label: (c) => formatCurrency(c.raw) } },
                        datalabels: hasDataLabels ? {
                            anchor: 'end', align: 'top', color: '#333', font: { size: 9, weight: 'bold' },
                            formatter: (v) => v > 0 ? (v / 1000000).toFixed(1) + 'M' : ''
                        } : false
                    },
                    scales: { y: { beginAtZero: true, ticks: { callback: v => (v / 1000000).toFixed(0) + 'M' } } }
                }
            });
        }

        // 2. PAYMENT METHODS DOUGHNUT
        destroy('paymentMethods');
        const ctxPay = document.getElementById('chartPaymentMethods');
        if (ctxPay) {
            const payLabels = Object.keys(methodsMap);
            dashboardCharts.paymentMethods = new Chart(ctxPay, {
                type: 'doughnut',
                plugins: hasDataLabels ? [ChartDataLabels] : [],
                data: {
                    labels: payLabels,
                    datasets: [{
                        data: Object.values(methodsMap),
                        backgroundColor: payLabels.map((_, i) => palette[i % palette.length]),
                        borderWidth: 2, borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false, cutout: '60%',
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                boxWidth: 12, font: { size: 10 },
                                generateLabels: (chart) => chart.data.labels.map((label, i) => ({
                                    text: label.length > 22 ? label.substring(0, 22) + '…' : label,
                                    fillStyle: palette[i % palette.length], strokeStyle: '#fff', lineWidth: 2, index: i
                                }))
                            }
                        },
                        tooltip: { callbacks: { label: (c) => ` ${c.label}: ${c.raw} facture(s)` } },
                        datalabels: hasDataLabels ? {
                            color: '#fff', font: { weight: 'bold', size: 10 },
                            formatter: (val, ctx) => {
                                const sum = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                                const pct = (val * 100 / sum).toFixed(5);
                                return pct >= 5 ? pct + '%' : '';
                            }
                        } : false
                    }
                }
            });
        }

        // 3. TOP CLIENTS DOUGHNUT
        destroy('topClients');
        const ctxCli = document.getElementById('chartTopClients');
        if (ctxCli) {
            const cliLabels = sortedClients.map(([name, val]) => {
                const pct = totalClientVal > 0 ? ((val / totalClientVal) * 100).toFixed(5) : 0;
                return `${name} (${pct}%)`;
            });
            dashboardCharts.topClients = new Chart(ctxCli, {
                type: 'doughnut',
                plugins: hasDataLabels ? [ChartDataLabels] : [],
                data: {
                    labels: cliLabels,
                    datasets: [{
                        data: sortedClients.map(i => i[1]),
                        backgroundColor: cliLabels.map((_, i) => palette[i % palette.length]),
                        borderWidth: 2, borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false, cutout: '50%',
                    plugins: {
                        legend: { position: 'right', labels: { boxWidth: 10, font: { size: 11 } } },
                        tooltip: { callbacks: { label: (c) => `${c.label.split(' (')[0]}: ${formatCurrency(c.raw)}` } },
                        datalabels: hasDataLabels ? {
                            color: '#fff', font: { weight: 'bold', size: 11 },
                            formatter: (val) => (val / totalClientVal > 0.03) ? ((val / totalClientVal) * 100).toFixed(5) + '%' : ''
                        } : false
                    }
                }
            });
        }

        // 4. DEBT STATUS BAR
        destroy('debtStatus');
        const ctxDebt = document.getElementById('chartDebtStatus');
        if (ctxDebt) {
            dashboardCharts.debtStatus = new Chart(ctxDebt, {
                type: 'bar',
                data: {
                    labels: ['État Global'],
                    datasets: [
                        { label: 'Payé', data: [paidChartVal], backgroundColor: '#10b981', barThickness: 40 },
                        { label: 'Impayé', data: [unpaidChartVal], backgroundColor: '#f59e0b', barThickness: 40 },
                    ]
                },
                options: {
                    indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                    scales: { x: { stacked: true }, y: { stacked: true, display: false } },
                    plugins: { 
                        legend: { position: 'bottom' },
                        tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${formatCurrency(c.raw)}` } },
                        datalabels: false
                    }
                }
            });
        }

        // 5. FORECAST LINE
        destroy('forecast');
        const ctxFc = document.getElementById('chartForecast');
        if (ctxFc) {
            dashboardCharts.forecast = new Chart(ctxFc, {
                type: 'line',
                data: {
                    labels: months,
                    datasets: [{
                        label: `Entrées prévues (${chartSettings.forecast})`,
                        data: forecastData,
                        borderColor: '#dc2626', backgroundColor: 'rgba(220, 38, 38, 0.05)',
                        fill: true, tension: 0.4, pointRadius: 4, pointHoverRadius: 8
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { 
                        legend: { display: false },
                        tooltip: { callbacks: { label: (c) => formatCurrency(c.raw) } },
                        datalabels: false
                    },
                    scales: { y: { beginAtZero: true, ticks: { callback: v => (v / 1000000).toFixed(1) + 'M' } } }
                }
            });
        }

        // 6. TRAJETS
        updateTrajetChart();

        // 7. RECENT INVOICES TABLE
        updateRecentInvoicesTable();

    } catch (error) {
        console.error('Dashboard Error:', error);
    }
}

// ═══════════════════════════════════════════════════════════════
// ████  TRAJET CHART  ████
// ═══════════════════════════════════════════════════════════════
function updateTrajetChart() {
    const select = document.getElementById('chartTrajetClientSelect');
    const canvas = document.getElementById('chartTrajets');
    const emptyState = document.getElementById('trajetEmptyState');
    if (!canvas) return;

    // Get client: specific dropdown first, then fallback to global
    let clientId = (select && select.value !== '') ? parseInt(select.value, 10) : null;
    if (!clientId) {
        const globalSel = document.getElementById('dashboardClientSelect');
        if (globalSel && globalSel.value !== 'all') {
            clientId = parseInt(globalSel.value, 10);
            if (select) select.value = globalSel.value;
        }
    }

    // Get year & period
    const yearSel   = document.getElementById('dashboardYearSelect');
    const periodSel = document.getElementById('dashboardPeriodSelect');
    const yearVal   = yearSel ? yearSel.value : '';
    const periodVal = periodSel ? periodSel.value : 'all';

    // Gather trajet data
    const trajetsMap = {};
    invoices.forEach(inv => {
        if (clientId && inv.clientId !== clientId) return;

        const d = new Date(inv.date || inv.createdAt);
        if (yearVal !== '' && d.getFullYear() !== parseInt(yearVal)) return;
        if (periodVal !== 'all') {
            const m = d.getMonth();
            if (periodVal === 'Q1' && (m < 0 || m > 2)) return;
            if (periodVal === 'Q2' && (m < 3 || m > 5)) return;
            if (periodVal === 'Q3' && (m < 6 || m > 8)) return;
            if (periodVal === 'Q4' && (m < 9 || m > 11)) return;
            if (!isNaN(periodVal) && m !== parseInt(periodVal)) return;
        }

        if (inv.articles && inv.articles.length > 0) {
            inv.articles.forEach(art => {
                let dest = (art.wilayaDestination && art.wilayaDestination.trim() !== '' && art.wilayaDestination !== 'Inconnu')
                    ? art.wilayaDestination.trim()
                    : (art.selectedDestination || 'Inconnu');
                if (dest.toLowerCase().startsWith('pour le compte')) {
                    dest = art.wilayaDestination || 'Inconnu';
                }
                const dep = (art.wilayaDepart && art.wilayaDepart.trim() !== '') ? art.wilayaDepart.trim() : 'Inconnu';
                if (dep !== 'Inconnu' && dest !== 'Inconnu') {
                    const key = `${dep} ➝ ${dest}`;
                    const qty = parseInt(art.qte) || 1;
                    trajetsMap[key] = (trajetsMap[key] || 0) + qty;
                }
            });
        }
    });

    const sortedTrajets = Object.entries(trajetsMap).sort((a, b) => b[1] - a[1]).slice(0, 10);

    if (dashboardCharts.trajets) { dashboardCharts.trajets.destroy(); dashboardCharts.trajets = null; }

    if (sortedTrajets.length === 0) {
        canvas.style.display = 'none';
        if (emptyState) {
            emptyState.classList.remove('d-none');
            emptyState.innerHTML = clientId
                ? '<small class="text-muted">Aucun trajet trouvé pour ce client.</small>'
                : '<small class="text-muted">Aucune donnée de trajet disponible.</small>';
        }
        return;
    }

    canvas.style.display = 'block';
    if (emptyState) emptyState.classList.add('d-none');

    const hasDataLabels = typeof ChartDataLabels !== 'undefined';
    dashboardCharts.trajets = new Chart(canvas, {
        type: 'bar',
        plugins: hasDataLabels ? [ChartDataLabels] : [],
        data: {
            labels: sortedTrajets.map(t => t[0]),
            datasets: [{
                label: 'Nombre de voyages',
                data: sortedTrajets.map(t => t[1]),
                backgroundColor: 'rgba(109, 40, 217, 0.7)',
                borderColor: 'rgba(109, 40, 217, 1)',
                borderWidth: 1, borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (c) => `${c.raw} voyages` } },
                datalabels: hasDataLabels ? {
                    anchor: 'end', align: 'end', color: '#666', font: { size: 10 },
                    formatter: (val) => val
                } : false
            },
            scales: { x: { beginAtZero: true, ticks: { precision: 0 } } }
        }
    });
}

// ─── Legacy toggle (kept for backward compatibility) ───
function toggleChartMode() {
    chartMode = (chartMode === 'TTC') ? 'HT' : 'TTC';
    const btn = document.getElementById('btnToggleChart');
    if (btn) {
        btn.innerHTML = (chartMode === 'TTC') ? 'Voir en HT' : 'Voir en TTC';
        btn.classList.toggle('btn-outline-primary');
        btn.classList.toggle('btn-primary');
    }
    updateDashboard();
}

// ═══════════════════════════════════════════════════════════════
// ████  DASHBOARD EXCEL EXPORT  ████
// ═══════════════════════════════════════════════════════════════
function exportDashboardToExcel() {
    try {
        const filtered = getDashboardFilteredInvoices();
        if (filtered.length === 0) {
            alert('Aucune donnée à exporter. Vérifiez vos filtres.');
            return;
        }

        const wb = XLSX.utils.book_new();
        const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

        // ── STYLE HELPERS ──
        const colorHeader = '003366';
        const colorSubHeader = '1a5276';
        const colorEven = 'dbe9ff';
        const colorOdd = 'ffffff';
        const colorTotal = '2D3748';
        const colorSuccess = '10b981';
        const colorDanger = 'ef4444';
        const colorWarning = 'f59e0b';

        const hdrStyle = (bg = colorHeader) => ({
            font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11, name: 'Calibri' },
            fill: { fgColor: { rgb: bg } },
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
            border: { top: {style:'thin',color:{rgb:'000000'}}, bottom: {style:'thin',color:{rgb:'000000'}}, left: {style:'thin',color:{rgb:'000000'}}, right: {style:'thin',color:{rgb:'000000'}} }
        });
        const rowStyle = (isEven, align = 'center') => ({
            font: { sz: 10, name: 'Calibri' },
            fill: { fgColor: { rgb: isEven ? colorEven : colorOdd } },
            alignment: { horizontal: align, vertical: 'center' },
            border: { top: {style:'thin',color:{rgb:'CCCCCC'}}, bottom: {style:'thin',color:{rgb:'CCCCCC'}}, left: {style:'thin',color:{rgb:'CCCCCC'}}, right: {style:'thin',color:{rgb:'CCCCCC'}} }
        });
        const moneyStyle = (isEven) => ({
            ...rowStyle(isEven, 'right'),
            numFmt: '#,##0.00'
        });
        const pctStyle = (isEven) => ({
            ...rowStyle(isEven, 'center'),
            numFmt: '0.00000"%"'
        });
        const totalStyle = (align = 'center') => ({
            font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11, name: 'Calibri' },
            fill: { fgColor: { rgb: colorTotal } },
            alignment: { horizontal: align, vertical: 'center' },
            border: { top: {style:'medium',color:{rgb:'000000'}}, bottom: {style:'medium',color:{rgb:'000000'}}, left: {style:'thin',color:{rgb:'000000'}}, right: {style:'thin',color:{rgb:'000000'}} },
            numFmt: '#,##0.00'
        });
        const titleStyle = () => ({
            font: { bold: true, sz: 14, color: { rgb: '003366' }, name: 'Calibri' },
            alignment: { horizontal: 'left', vertical: 'center' }
        });
        const subtitleStyle = () => ({
            font: { italic: true, sz: 10, color: { rgb: '666666' }, name: 'Calibri' },
            alignment: { horizontal: 'left' }
        });

        // Helpers
        const c = (v, s) => ({ v, t: typeof v === 'number' ? 'n' : 's', s });
        const addSheet = (ws, name) => { XLSX.utils.book_append_sheet(wb, ws, name); };

        // Get filter description
        const yearSel = document.getElementById('dashboardYearSelect');
        const clientSel = document.getElementById('dashboardClientSelect');
        const periodSel = document.getElementById('dashboardPeriodSelect');
        const filterDesc = `Filtres: ${clientSel?.selectedOptions[0]?.text || 'Tous'} | ${yearSel?.value || 'Toutes'} | ${periodSel?.selectedOptions[0]?.text || 'Toute période'}`;
        const exportDate = new Date().toLocaleString('fr-DZ');

        // ══════════════════════════════════════
        // SHEET 1: KPIs SUMMARY
        // ══════════════════════════════════════
        const ws1 = {};
        const revTTC = filtered.reduce((s, i) => s + (i.totals?.ttc || 0), 0);
        const revHT  = filtered.reduce((s, i) => s + (i.totals?.ht  || 0), 0);
        const paidList = filtered.filter(i => i.paid || i.paymentStatus === 'encaissee');
        const paidTTC = paidList.reduce((s, i) => s + (i.totals?.ttc || 0), 0);
        const paidHT  = paidList.reduce((s, i) => s + (i.totals?.ht  || 0), 0);
        const debtTTC = revTTC - paidTTC;
        const debtHT  = revHT - paidHT;
        const today = new Date();
        const overdueList = filtered.filter(i => {
            if (i.paid || i.paymentStatus === 'encaissee') return false;
            const due = new Date(new Date(i.date).getTime() + ((i.delaiPaiement || 30) * 86400000));
            return due < today;
        });
        const overdueTTC = overdueList.reduce((s, i) => s + (i.totals?.ttc || 0), 0);
        const overdueHT  = overdueList.reduce((s, i) => s + (i.totals?.ht  || 0), 0);
        const recoveryPct = revTTC > 0 ? (paidTTC / revTTC * 100) : 0;

        ws1['A1'] = c('📊 TABLEAU DE BORD — INDICATEURS CLÉS', titleStyle());
        ws1['A2'] = c(filterDesc, subtitleStyle());
        ws1['A3'] = c(`Exporté le: ${exportDate}`, subtitleStyle());

        ws1['A5'] = c('INDICATEUR', hdrStyle()); ws1['B5'] = c('MONTANT HT (DA)', hdrStyle()); ws1['C5'] = c('MONTANT TTC (DA)', hdrStyle()); ws1['D5'] = c('DÉTAIL', hdrStyle());

        const kpiRows = [
            ["Chiffre d'Affaires Global", revHT, revTTC, `${filtered.length} facture(s)`],
            ["Total Encaissé", paidHT, paidTTC, `${recoveryPct.toFixed(5)}% recouvré`],
            ["Crédit Client (Impayé)", debtHT, debtTTC, `${filtered.length - paidList.length} facture(s) en attente`],
            ["Retards de Paiement", overdueHT, overdueTTC, `${overdueList.length} facture(s) en retard`],
        ];
        kpiRows.forEach((row, i) => {
            const r = 6 + i;
            const isE = i % 2 === 0;
            ws1[`A${r}`] = c(row[0], rowStyle(isE, 'left'));
            ws1[`B${r}`] = c(row[1], moneyStyle(isE));
            ws1[`C${r}`] = c(row[2], moneyStyle(isE));
            ws1[`D${r}`] = c(row[3], rowStyle(isE, 'left'));
        });
        ws1['!ref'] = 'A1:D10';
        ws1['!cols'] = [{wch:35},{wch:22},{wch:22},{wch:30}];
        ws1['!merges'] = [{s:{r:0,c:0},e:{r:0,c:3}},{s:{r:1,c:0},e:{r:1,c:3}}];
        addSheet(ws1, '📊 KPIs');

        // ══════════════════════════════════════
        // SHEET 2: REVENUE BY MONTH
        // ══════════════════════════════════════
        const ws2 = {};
        const dataRevHT = Array(12).fill(0);
        const dataRevTTC = Array(12).fill(0);
        const dataCount = Array(12).fill(0);
        filtered.forEach(inv => {
            const m = new Date(inv.date || inv.createdAt).getMonth();
            dataRevHT[m] += inv.totals?.ht || 0;
            dataRevTTC[m] += inv.totals?.ttc || 0;
            dataCount[m]++;
        });

        ws2['A1'] = c('📈 CHIFFRE D\'AFFAIRES PAR MOIS', titleStyle());
        ws2['A2'] = c(filterDesc, subtitleStyle());
        ws2['A4'] = c('MOIS', hdrStyle()); ws2['B4'] = c('NB FACTURES', hdrStyle()); ws2['C4'] = c('TOTAL HT (DA)', hdrStyle()); ws2['D4'] = c('TOTAL TTC (DA)', hdrStyle()); ws2['E4'] = c('% DU C.A.', hdrStyle());

        let totalFactCount = 0;
        months.forEach((m, i) => {
            const r = 5 + i;
            const isE = i % 2 === 0;
            const pct = revTTC > 0 ? (dataRevTTC[i] / revTTC * 100) : 0;
            totalFactCount += dataCount[i];
            ws2[`A${r}`] = c(m, rowStyle(isE, 'left'));
            ws2[`B${r}`] = c(dataCount[i], rowStyle(isE));
            ws2[`C${r}`] = c(dataRevHT[i], moneyStyle(isE));
            ws2[`D${r}`] = c(dataRevTTC[i], moneyStyle(isE));
            ws2[`E${r}`] = c(pct.toFixed(5) + '%', rowStyle(isE));
        });
        // Total row
        const r2t = 17;
        ws2[`A${r2t}`] = c('TOTAL', totalStyle('left'));
        ws2[`B${r2t}`] = c(totalFactCount, totalStyle());
        ws2[`C${r2t}`] = c(revHT, totalStyle('right'));
        ws2[`D${r2t}`] = c(revTTC, totalStyle('right'));
        ws2[`E${r2t}`] = c('100%', totalStyle());
        ws2['!ref'] = `A1:E${r2t}`;
        ws2['!cols'] = [{wch:18},{wch:15},{wch:22},{wch:22},{wch:15}];
        ws2['!merges'] = [{s:{r:0,c:0},e:{r:0,c:4}}];
        addSheet(ws2, '📈 C.A. par Mois');

        // ══════════════════════════════════════
        // SHEET 3: TOP CLIENTS
        // ══════════════════════════════════════
        const ws3 = {};
        const clientData = {};
        filtered.forEach(inv => {
            const cName = clients.find(c2 => String(c2.id) === String(inv.clientId))?.nom || 'Inconnu';
            const htVal = inv.totals?.ht || 0;
            const ttcVal = inv.totals?.ttc || 0;
            if (!clientData[cName]) clientData[cName] = { ht: 0, ttc: 0, count: 0 };
            clientData[cName].ht += htVal;
            clientData[cName].ttc += ttcVal;
            clientData[cName].count++;
        });
        const sortedClients = Object.entries(clientData).sort((a, b) => b[1].ttc - a[1].ttc);

        ws3['A1'] = c('👥 RÉPARTITION PAR CLIENT', titleStyle());
        ws3['A2'] = c(filterDesc, subtitleStyle());
        ws3['A4'] = c('#', hdrStyle()); ws3['B4'] = c('CLIENT', hdrStyle()); ws3['C4'] = c('NB FACTURES', hdrStyle()); ws3['D4'] = c('TOTAL HT (DA)', hdrStyle()); ws3['E4'] = c('TOTAL TTC (DA)', hdrStyle()); ws3['F4'] = c('% DU C.A.', hdrStyle()); ws3['G4'] = c('RANG', hdrStyle());

        const medals = ['🥇', '🥈', '🥉'];
        sortedClients.forEach(([name, data], i) => {
            const r = 5 + i;
            const isE = i % 2 === 0;
            const pct = revTTC > 0 ? (data.ttc / revTTC * 100) : 0;
            ws3[`A${r}`] = c(i + 1, rowStyle(isE));
            ws3[`B${r}`] = c(name, rowStyle(isE, 'left'));
            ws3[`C${r}`] = c(data.count, rowStyle(isE));
            ws3[`D${r}`] = c(data.ht, moneyStyle(isE));
            ws3[`E${r}`] = c(data.ttc, moneyStyle(isE));
            ws3[`F${r}`] = c(pct.toFixed(5) + '%', rowStyle(isE));
            ws3[`G${r}`] = c(i < 3 ? medals[i] : `#${i+1}`, rowStyle(isE));
        });
        const r3t = 5 + sortedClients.length;
        ws3[`A${r3t}`] = c('', totalStyle()); ws3[`B${r3t}`] = c('TOTAL', totalStyle('left')); ws3[`C${r3t}`] = c(filtered.length, totalStyle()); ws3[`D${r3t}`] = c(revHT, totalStyle('right')); ws3[`E${r3t}`] = c(revTTC, totalStyle('right')); ws3[`F${r3t}`] = c('100%', totalStyle()); ws3[`G${r3t}`] = c('', totalStyle());
        ws3['!ref'] = `A1:G${r3t}`;
        ws3['!cols'] = [{wch:5},{wch:30},{wch:14},{wch:22},{wch:22},{wch:16},{wch:8}];
        ws3['!merges'] = [{s:{r:0,c:0},e:{r:0,c:6}}];
        addSheet(ws3, '👥 Clients');

        // ══════════════════════════════════════
        // SHEET 4: PAYMENT METHODS
        // ══════════════════════════════════════
        const ws4 = {};
        const methodsMap = {};
        const bankLabelMap = {};
        if (typeof ALGERIAN_BANKS !== 'undefined') {
            [...ALGERIAN_BANKS.public, ...ALGERIAN_BANKS.private, ...ALGERIAN_BANKS.other]
                .forEach(b => { bankLabelMap[b.value] = b.label; });
        }
        filtered.forEach(inv => {
            let key = 'Non défini';
            if (inv.paymentDetails && inv.paymentDetails.bank) {
                key = bankLabelMap[inv.paymentDetails.bank] || inv.paymentDetails.bank;
            } else if (inv.paymentDetails && inv.paymentDetails.method) {
                key = inv.paymentDetails.method;
            } else if (inv.modePaiement) {
                key = inv.modePaiement;
            }
            if (!methodsMap[key]) methodsMap[key] = { count: 0, ht: 0, ttc: 0 };
            methodsMap[key].count++;
            methodsMap[key].ht += inv.totals?.ht || 0;
            methodsMap[key].ttc += inv.totals?.ttc || 0;
        });
        const sortedMethods = Object.entries(methodsMap).sort((a, b) => b[1].count - a[1].count);

        ws4['A1'] = c('💳 MODES DE PAIEMENT', titleStyle());
        ws4['A2'] = c(filterDesc, subtitleStyle());
        ws4['A4'] = c('MODE / BANQUE', hdrStyle()); ws4['B4'] = c('NB FACTURES', hdrStyle()); ws4['C4'] = c('% DES FACTURES', hdrStyle()); ws4['D4'] = c('MONTANT HT (DA)', hdrStyle()); ws4['E4'] = c('MONTANT TTC (DA)', hdrStyle());

        sortedMethods.forEach(([name, data], i) => {
            const r = 5 + i;
            const isE = i % 2 === 0;
            const pct = filtered.length > 0 ? (data.count / filtered.length * 100) : 0;
            ws4[`A${r}`] = c(name, rowStyle(isE, 'left'));
            ws4[`B${r}`] = c(data.count, rowStyle(isE));
            ws4[`C${r}`] = c(pct.toFixed(5) + '%', rowStyle(isE));
            ws4[`D${r}`] = c(data.ht, moneyStyle(isE));
            ws4[`E${r}`] = c(data.ttc, moneyStyle(isE));
        });
        const r4t = 5 + sortedMethods.length;
        ws4[`A${r4t}`] = c('TOTAL', totalStyle('left')); ws4[`B${r4t}`] = c(filtered.length, totalStyle()); ws4[`C${r4t}`] = c('100%', totalStyle()); ws4[`D${r4t}`] = c(revHT, totalStyle('right')); ws4[`E${r4t}`] = c(revTTC, totalStyle('right'));
        ws4['!ref'] = `A1:E${r4t}`;
        ws4['!cols'] = [{wch:35},{wch:14},{wch:16},{wch:22},{wch:22}];
        ws4['!merges'] = [{s:{r:0,c:0},e:{r:0,c:4}}];
        addSheet(ws4, '💳 Paiements');

        // ══════════════════════════════════════
        // SHEET 5: DEBT ANALYSIS
        // ══════════════════════════════════════
        const ws5 = {};
        const unpaidList = filtered.filter(i => !i.paid && i.paymentStatus !== 'encaissee');
        ws5['A1'] = c('⚠️ ANALYSE DES CRÉANCES', titleStyle());
        ws5['A2'] = c(filterDesc, subtitleStyle());

        ws5['A4'] = c('CATÉGORIE', hdrStyle()); ws5['B4'] = c('NB FACTURES', hdrStyle()); ws5['C4'] = c('MONTANT HT (DA)', hdrStyle()); ws5['D4'] = c('MONTANT TTC (DA)', hdrStyle()); ws5['E4'] = c('% DU TOTAL', hdrStyle());
        const debtRows = [
            ['✅ Payées', paidList.length, paidHT, paidTTC, revTTC > 0 ? (paidTTC/revTTC*100) : 0],
            ['⏳ En attente (dans délai)', unpaidList.length - overdueList.length, debtHT - overdueHT, debtTTC - overdueTTC, revTTC > 0 ? ((debtTTC-overdueTTC)/revTTC*100) : 0],
            ['🔴 En retard (hors délai)', overdueList.length, overdueHT, overdueTTC, revTTC > 0 ? (overdueTTC/revTTC*100) : 0],
        ];
        debtRows.forEach((row, i) => {
            const r = 5 + i;
            const isE = i % 2 === 0;
            ws5[`A${r}`] = c(row[0], rowStyle(isE, 'left'));
            ws5[`B${r}`] = c(row[1], rowStyle(isE));
            ws5[`C${r}`] = c(row[2], moneyStyle(isE));
            ws5[`D${r}`] = c(row[3], moneyStyle(isE));
            ws5[`E${r}`] = c(row[4].toFixed(5) + '%', rowStyle(isE));
        });
        ws5['A8'] = c('TOTAL', totalStyle('left')); ws5['B8'] = c(filtered.length, totalStyle()); ws5['C8'] = c(revHT, totalStyle('right')); ws5['D8'] = c(revTTC, totalStyle('right')); ws5['E8'] = c('100%', totalStyle());
        ws5['!ref'] = 'A1:E8';
        ws5['!cols'] = [{wch:30},{wch:14},{wch:22},{wch:22},{wch:14}];
        ws5['!merges'] = [{s:{r:0,c:0},e:{r:0,c:4}}];
        addSheet(ws5, '⚠️ Créances');

        // ══════════════════════════════════════
        // SHEET 6: FORECAST
        // ══════════════════════════════════════
        const ws6 = {};
        const forecastHT = Array(12).fill(0);
        const forecastTTC = Array(12).fill(0);
        const forecastCount = Array(12).fill(0);
        filtered.filter(inv => !inv.paid).forEach(inv => {
            const d = new Date(inv.date);
            const delay = parseInt(inv.delaiPaiement) || 30;
            d.setDate(d.getDate() + delay);
            forecastHT[d.getMonth()] += inv.totals?.ht || 0;
            forecastTTC[d.getMonth()] += inv.totals?.ttc || 0;
            forecastCount[d.getMonth()]++;
        });
        ws6['A1'] = c('🔮 PRÉVISION DES ENCAISSEMENTS', titleStyle());
        ws6['A2'] = c(filterDesc, subtitleStyle());
        ws6['A4'] = c('MOIS D\'ÉCHÉANCE', hdrStyle()); ws6['B4'] = c('NB FACTURES', hdrStyle()); ws6['C4'] = c('MONTANT HT (DA)', hdrStyle()); ws6['D4'] = c('MONTANT TTC (DA)', hdrStyle());
        let fcTotalCount = 0, fcTotalHT = 0, fcTotalTTC = 0;
        months.forEach((m, i) => {
            const r = 5 + i;
            const isE = i % 2 === 0;
            fcTotalCount += forecastCount[i]; fcTotalHT += forecastHT[i]; fcTotalTTC += forecastTTC[i];
            ws6[`A${r}`] = c(m, rowStyle(isE, 'left'));
            ws6[`B${r}`] = c(forecastCount[i], rowStyle(isE));
            ws6[`C${r}`] = c(forecastHT[i], moneyStyle(isE));
            ws6[`D${r}`] = c(forecastTTC[i], moneyStyle(isE));
        });
        ws6['A17'] = c('TOTAL', totalStyle('left')); ws6['B17'] = c(fcTotalCount, totalStyle()); ws6['C17'] = c(fcTotalHT, totalStyle('right')); ws6['D17'] = c(fcTotalTTC, totalStyle('right'));
        ws6['!ref'] = 'A1:D17';
        ws6['!cols'] = [{wch:22},{wch:14},{wch:22},{wch:22}];
        ws6['!merges'] = [{s:{r:0,c:0},e:{r:0,c:3}}];
        addSheet(ws6, '🔮 Prévisions');

        // ══════════════════════════════════════
        // SHEET 7: TRAJETS
        // ══════════════════════════════════════
        const ws7 = {};
        const trajetsMap = {};
        filtered.forEach(inv => {
            if (inv.articles && inv.articles.length > 0) {
                inv.articles.forEach(art => {
                    let dest = (art.wilayaDestination && art.wilayaDestination.trim() !== '' && art.wilayaDestination !== 'Inconnu')
                        ? art.wilayaDestination.trim() : (art.selectedDestination || 'Inconnu');
                    if (dest.toLowerCase().startsWith('pour le compte')) dest = art.wilayaDestination || 'Inconnu';
                    const dep = (art.wilayaDepart && art.wilayaDepart.trim() !== '') ? art.wilayaDepart.trim() : 'Inconnu';
                    if (dep !== 'Inconnu' && dest !== 'Inconnu') {
                        const key = `${dep} ➝ ${dest}`;
                        const qty = parseInt(art.qte) || 1;
                        if (!trajetsMap[key]) trajetsMap[key] = { voyages: 0, factures: 0 };
                        trajetsMap[key].voyages += qty;
                        trajetsMap[key].factures++;
                    }
                });
            }
        });
        const sortedTrajets = Object.entries(trajetsMap).sort((a, b) => b[1].voyages - a[1].voyages);
        const totalVoyages = sortedTrajets.reduce((s, t) => s + t[1].voyages, 0);

        ws7['A1'] = c('🚛 ANALYSE DES TRAJETS', titleStyle());
        ws7['A2'] = c(filterDesc, subtitleStyle());
        ws7['A4'] = c('#', hdrStyle()); ws7['B4'] = c('TRAJET', hdrStyle()); ws7['C4'] = c('NB VOYAGES', hdrStyle()); ws7['D4'] = c('NB FACTURES', hdrStyle()); ws7['E4'] = c('% DES VOYAGES', hdrStyle());

        sortedTrajets.forEach(([route, data], i) => {
            const r = 5 + i;
            const isE = i % 2 === 0;
            const pct = totalVoyages > 0 ? (data.voyages / totalVoyages * 100) : 0;
            ws7[`A${r}`] = c(i + 1, rowStyle(isE));
            ws7[`B${r}`] = c(route, rowStyle(isE, 'left'));
            ws7[`C${r}`] = c(data.voyages, rowStyle(isE));
            ws7[`D${r}`] = c(data.factures, rowStyle(isE));
            ws7[`E${r}`] = c(pct.toFixed(5) + '%', rowStyle(isE));
        });
        const r7t = 5 + sortedTrajets.length;
        ws7[`A${r7t}`] = c('', totalStyle()); ws7[`B${r7t}`] = c('TOTAL', totalStyle('left')); ws7[`C${r7t}`] = c(totalVoyages, totalStyle()); ws7[`D${r7t}`] = c(sortedTrajets.reduce((s,t)=>s+t[1].factures,0), totalStyle()); ws7[`E${r7t}`] = c('100%', totalStyle());
        ws7['!ref'] = `A1:E${r7t}`;
        ws7['!cols'] = [{wch:5},{wch:35},{wch:14},{wch:14},{wch:16}];
        ws7['!merges'] = [{s:{r:0,c:0},e:{r:0,c:4}}];
        addSheet(ws7, '🚛 Trajets');

        // ── SAVE FILE ──
        const fileName = `Dashboard_${yearSel?.value || 'All'}_${new Date().toISOString().slice(0,10)}.xlsx`;
        XLSX.writeFile(wb, fileName);
        alert(`✅ Export réussi ! Fichier: ${fileName}\n\n7 feuilles générées:\n• KPIs\n• C.A. par Mois\n• Clients\n• Paiements\n• Créances\n• Prévisions\n• Trajets`);

    } catch (error) {
        console.error('Dashboard Excel export error:', error);
        alert('Erreur lors de l\'export Excel: ' + error.message);
    }
}

// Reports
function populateReportFilters() {
  try {
    // Réinitialiser les dates à ce mois-ci par défaut
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = (today.getMonth() + 1).toString().padStart(2, '0');
    const dd = today.getDate().toString().padStart(2, '0');
    
    const startDate = document.getElementById('reportStartDate');
    const endDate = document.getElementById('reportEndDate');
    
    // On ne change la date que si elle est vide (pour ne pas effacer le choix de l'utilisateur si il revient sur l'onglet)
    if (startDate && !startDate.value) startDate.value = `${yyyy}-${mm}-01`;
    if (endDate && !endDate.value) endDate.value = `${yyyy}-${mm}-${dd}`;

    // ✅ Injecter toutes les banques algériennes dans les deux filtres banques de rapport
    const allBanks = [
        ...ALGERIAN_BANKS.public,
        ...ALGERIAN_BANKS.private,
        ...ALGERIAN_BANKS.other
    ];

    const bankFilter = document.getElementById('reportBankFilter');
    if (bankFilter && bankFilter.options.length <= 1) {
        allBanks.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b.value;
            opt.textContent = b.label;
            bankFilter.appendChild(opt);
        });
    }

    const quickBankFilter = document.getElementById('reportQuickBank');
    if (quickBankFilter && quickBankFilter.options.length <= 1) {
        allBanks.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b.value;
            opt.textContent = b.label;
            quickBankFilter.appendChild(opt);
        });
    }
  } catch (error) {
    console.error('Error populating report filters:', error);
  }
}

function exportReportXLS() {
    try {
        const filtered = getFilteredReportInvoices();
        if (filtered.length === 0) {
            alert('Aucune facture disponible pour l\'export');
            return;
        }

        // Colors from settings (strip # and uppercase for xlsx-js-style)
        const colorEven   = (settings.excelColorEven || '#dbe9ff').replace('#', '').toUpperCase();
        const colorOdd    = (settings.excelColorOdd  || '#ffffff').replace('#', '').toUpperCase();
        const colorHeader = '003366';
        const colorTotal  = '2D3748';

        const wb = XLSX.utils.book_new();
        const ws = {};

        // --- Column definitions ---
        const headers = [
            'ETAT', 'REF. TRANSACTION', 'BANQUE', 'MODE', 'DATE PAIEMENT',
            'MOIS', 'BL (Qt\u00e9)', 'DATE FACTURE', 'N\u00b0 FACTURE', 'CLIENT',
            'MONTANT HT', 'TOTAL TTC', 'ENCAISS\u00c9 TTC', 'CR\u00c9ANCE HT', 'CR\u00c9ANCE TTC'
        ];

        // --- Header style ---
        const headerStyle = {
            fill: { fgColor: { rgb: colorHeader } },
            font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 },
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
            border: { top:{style:'thin',color:{rgb:'AAAAAA'}}, bottom:{style:'thin',color:{rgb:'AAAAAA'}}, left:{style:'thin',color:{rgb:'AAAAAA'}}, right:{style:'thin',color:{rgb:'AAAAAA'}} }
        };
        headers.forEach((h, ci) => {
            const ref = XLSX.utils.encode_cell({ r: 0, c: ci });
            ws[ref] = { v: h, t: 's', s: headerStyle };
        });

        let tHT = 0, tTTC = 0, tPaid = 0, tDebtHT = 0, tDebtTTC = 0, tBL = 0;
        const numFmt = '#,##0.00 "DA"';

        filtered.forEach((inv, rowIdx) => {
            const r      = rowIdx + 1;
            const bgColor = rowIdx % 2 === 0 ? colorEven : colorOdd;

            const cs = (align = 'left', bold = false, color = '000000') => ({
                fill: { fgColor: { rgb: bgColor } },
                font: { sz: 9, bold, color: { rgb: color } },
                alignment: { horizontal: align, vertical: 'center' },
                border: { top:{style:'thin',color:{rgb:'DDDDDD'}}, bottom:{style:'thin',color:{rgb:'DDDDDD'}}, left:{style:'thin',color:{rgb:'DDDDDD'}}, right:{style:'thin',color:{rgb:'DDDDDD'}} }
            });
            const ns = (color = '000000', bold = false) => ({
                fill: { fgColor: { rgb: bgColor } },
                font: { sz: 9, bold, color: { rgb: color } },
                numFmt,
                alignment: { horizontal: 'right', vertical: 'center' },
                border: { top:{style:'thin',color:{rgb:'DDDDDD'}}, bottom:{style:'thin',color:{rgb:'DDDDDD'}}, left:{style:'thin',color:{rgb:'DDDDDD'}}, right:{style:'thin',color:{rgb:'DDDDDD'}} }
            });

            const client = clients.find(c => c.id === inv.clientId)?.nom || 'Inconnu';
            const isPaid = inv.paid || inv.paymentStatus === 'encaissee';
            const ht     = inv.totals?.ht  || 0;
            const ttc    = inv.totals?.ttc || 0;
            const paid   = isPaid ? ttc : 0;
            const debtHT  = !isPaid ? ht  : 0;
            const debtTTC = !isPaid ? ttc : 0;
            const bl = (inv.articles || []).reduce((s, a) => s + (parseInt(a.qte) || 0), 0);

            const dateObj  = new Date(inv.date);
            const dateStr  = dateObj.toLocaleDateString('fr-FR');
            let   monthStr = dateObj.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
            monthStr = monthStr.charAt(0).toUpperCase() + monthStr.slice(1);

            let pBank = '-', pMode = '-', pDate = '-', pRef = '-';
            if (isPaid && inv.paymentDetails) {
                pBank = inv.paymentDetails.bank   || '-';
                pMode = inv.paymentDetails.method || '-';
                pDate = inv.paymentDetails.date   ? new Date(inv.paymentDetails.date).toLocaleDateString('fr-FR') : '-';
                pRef  = inv.paymentDetails.ref    || '-';
            }

            const row = [
                { v: isPaid ? 'PAY\u00c9E' : 'IMPAY\u00c9E', t: 's', s: cs('center', true, isPaid ? '006400' : '8B0000') },
                { v: pRef,    t: 's', s: cs('center') },
                { v: pBank,   t: 's', s: cs('center') },
                { v: pMode,   t: 's', s: cs('center') },
                { v: pDate,   t: 's', s: cs('center') },
                { v: monthStr, t: 's', s: cs('left') },
                { v: bl,       t: 'n', s: cs('center') },
                { v: dateStr,  t: 's', s: cs('center') },
                { v: inv.number, t: 's', s: cs('center', true) },
                { v: client,   t: 's', s: cs('left') },
                { v: ht,       t: 'n', s: ns() },
                { v: ttc,      t: 'n', s: ns('000000', true) },
                { v: paid,     t: 'n', s: ns('006400', true) },
                { v: debtHT,   t: 'n', s: ns('8B0000') },
                { v: debtTTC,  t: 'n', s: ns('8B0000', true) }
            ];
            row.forEach((cell, ci) => { ws[XLSX.utils.encode_cell({ r, c: ci })] = cell; });

            tHT += ht; tTTC += ttc; tPaid += paid; tDebtHT += debtHT; tDebtTTC += debtTTC; tBL += bl;
        });

        // --- Total row ---
        const totalR = filtered.length + 1;
        const ts = (align = 'center', color = 'FFFFFF', bold = true) => ({
            fill: { fgColor: { rgb: colorTotal } },
            font: { bold, color: { rgb: color }, sz: 10 },
            alignment: { horizontal: align, vertical: 'center' },
            border: { top:{style:'medium',color:{rgb:'000000'}}, bottom:{style:'medium',color:{rgb:'000000'}}, left:{style:'thin',color:{rgb:'555555'}}, right:{style:'thin',color:{rgb:'555555'}} }
        });
        const tns = (color = 'FFFFFF') => ({ ...ts('right', color), numFmt });

        const totalRow = [
            { v: 'TOTAUX',             t: 's', s: ts() },
            { v: '',  t: 's', s: ts() }, { v: '', t: 's', s: ts() }, { v: '', t: 's', s: ts() }, { v: '', t: 's', s: ts() },
            { v: `${filtered.length} facture(s)`, t: 's', s: ts() },
            { v: tBL, t: 'n', s: ts('center') },
            { v: '', t: 's', s: ts() }, { v: '', t: 's', s: ts() }, { v: '', t: 's', s: ts() },
            { v: tHT,     t: 'n', s: tns() },
            { v: tTTC,    t: 'n', s: tns() },
            { v: tPaid,   t: 'n', s: tns('90EE90') },
            { v: tDebtHT, t: 'n', s: tns('FFB3B3') },
            { v: tDebtTTC,t: 'n', s: tns('FFB3B3') }
        ];
        totalRow.forEach((cell, ci) => { ws[XLSX.utils.encode_cell({ r: totalR, c: ci })] = cell; });

        ws['!ref']  = XLSX.utils.encode_range({ s:{r:0,c:0}, e:{r:totalR,c:headers.length-1} });
        ws['!cols'] = [{wch:10},{wch:18},{wch:18},{wch:12},{wch:14},{wch:18},{wch:8},{wch:12},{wch:12},{wch:30},{wch:16},{wch:16},{wch:16},{wch:16},{wch:16}];
        ws['!rows'] = [{ hpt: 28 }, ...Array(filtered.length + 1).fill({ hpt: 18 })];

        XLSX.utils.book_append_sheet(wb, ws, 'Rapport Financier');
        XLSX.writeFile(wb, `Rapport_Financier_${new Date().toISOString().slice(0,10)}.xlsx`, { cellStyles: true });

    } catch (error) {
        console.error('Erreur Export Excel:', error);
        alert('Erreur lors de l\'export Excel.');
    }
}
function exportReportPDF() {
  try {
    const filtered = filterInvoicesForReport();
    if (filtered.length === 0) {
      alert('Aucun rapport à exporter');
      return;
    }

    const logoLeft = settings.logoLeft ? `<img src="${settings.logoLeft}" style="max-height:40px;">` : '';
    const logoRight = settings.logoRight ? `<img src="${settings.logoRight}" style="max-height:40px;">` : '';
    const dateStr = new Date().toLocaleDateString('fr-FR');
    
    // Calculs Totaux pour le header PDF
    const totalHT = filtered.reduce((acc, i) => acc + i.totals.ht, 0);
    const totalTTC = filtered.reduce((acc, i) => acc + i.totals.ttc, 0);
    const totalEncaisse = filtered.reduce((acc, i) => acc + (i.paid ? i.totals.ttc : 0), 0);
    const totalCreanceTTC = filtered.reduce((acc, i) => acc + (!i.paid ? i.totals.ttc : 0), 0);

    // Construction du Tableau HTML pour le PDF
    let rowsHTML = filtered.map((inv, idx) => {
        const client = clients.find(c=>c.id===inv.clientId)?.nom.substring(0, 15) || '';
        const isPaid = inv.paid;
        const ht = inv.totals.ht;
        const ttc = inv.totals.ttc;
        const enc = isPaid ? ttc : 0;
        const creHT = !isPaid ? ht : 0;
        const creTTC = !isPaid ? ttc : 0;
        const bg = idx % 2 === 0 ? '#fff' : '#f4f4f4';
        
        return `
        <tr style="background:${bg};">
            <td style="padding:4px; border:1px solid #ccc; font-size:9px;">${inv.number}</td>
            <td style="padding:4px; border:1px solid #ccc; font-size:9px;">${formatDate(inv.date)}</td>
            <td style="padding:4px; border:1px solid #ccc; font-size:9px;">${client}</td>
            <td style="padding:4px; border:1px solid #ccc; text-align:right; font-size:9px;">${formatCurrency(ht).replace('DA','')}</td>
            <td style="padding:4px; border:1px solid #ccc; text-align:right; font-size:9px;">${formatCurrency(ttc).replace('DA','')}</td>
            <td style="padding:4px; border:1px solid #ccc; text-align:right; font-size:9px; color:green;">${isPaid ? formatCurrency(enc).replace('DA','') : '-'}</td>
            <td style="padding:4px; border:1px solid #ccc; text-align:right; font-size:9px; color:red;">${!isPaid ? formatCurrency(creHT).replace('DA','') : '-'}</td>
            <td style="padding:4px; border:1px solid #ccc; text-align:right; font-size:9px; color:red; font-weight:bold;">${!isPaid ? formatCurrency(creTTC).replace('DA','') : '-'}</td>
        </tr>`;
    }).join('');

    // Template HTML Complet
    const container = document.getElementById('reportPDFContent');
    container.innerHTML = `
      <div style="font-family: sans-serif; padding: 20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:2px solid #007B7C; padding-bottom:10px;">
           <div>${logoLeft}</div>
           <div style="text-align:center;">
              <h2 style="margin:0; color:#007B7C;">RAPPORT FINANCIER DÉTAILLÉ</h2>
              <div style="font-size:10px; color:#666;">Généré le : ${dateStr}</div>
           </div>
           <div>${logoRight}</div>
        </div>

        <div style="display:flex; justify-content:space-between; margin-bottom:20px; background:#f8f9fa; padding:10px; border:1px solid #ddd;">
            <div style="text-align:center;">
                <div style="font-size:9px; text-transform:uppercase;">Chiffre d'Affaires HT</div>
                <div style="font-weight:bold; font-size:11px;">${formatCurrency(totalHT)}</div>
            </div>
            <div style="text-align:center;">
                <div style="font-size:9px; text-transform:uppercase;">Total TTC</div>
                <div style="font-weight:bold; font-size:11px;">${formatCurrency(totalTTC)}</div>
            </div>
            <div style="text-align:center; color:green;">
                <div style="font-size:9px; text-transform:uppercase;">Encaissé TTC</div>
                <div style="font-weight:bold; font-size:11px;">${formatCurrency(totalEncaisse)}</div>
            </div>
            <div style="text-align:center; color:red;">
                <div style="font-size:9px; text-transform:uppercase;">Reste à Percevoir TTC</div>
                <div style="font-weight:bold; font-size:11px;">${formatCurrency(totalCreanceTTC)}</div>
            </div>
        </div>

        <table style="width:100%; border-collapse:collapse;">
            <thead>
                <tr style="background:#007B7C; color:white;">
                    <th style="padding:5px; border:1px solid #000; font-size:10px;">N°</th>
                    <th style="padding:5px; border:1px solid #000; font-size:10px;">Date</th>
                    <th style="padding:5px; border:1px solid #000; font-size:10px;">Client</th>
                    <th style="padding:5px; border:1px solid #000; font-size:10px; text-align:right;">Fact. HT</th>
                    <th style="padding:5px; border:1px solid #000; font-size:10px; text-align:right;">Fact. TTC</th>
                    <th style="padding:5px; border:1px solid #000; font-size:10px; text-align:right;">Encaissé</th>
                    <th style="padding:5px; border:1px solid #000; font-size:10px; text-align:right;">Créance HT</th>
                    <th style="padding:5px; border:1px solid #000; font-size:10px; text-align:right;">Créance TTC</th>
                </tr>
            </thead>
            <tbody>
                ${rowsHTML}
            </tbody>
        </table>
      </div>
    `;

    // Génération PDF (Landscape pour avoir de la place)
    html2canvas(container, { scale: 2 }).then(canvas => {
      const imgData = canvas.toDataURL('image/jpeg', 0.9);
      const { jsPDF } = window.jspdf;
      // 'l' = landscape (paysage)
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgProps = pdf.getImageProperties(imgData);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      // Si une seule page suffit
      if (imgHeight <= pdfHeight) {
          pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeight);
      } else {
          // Gestion basique multipage (sinon l'image est coupée ou écrasée)
          // Pour simplifier ici, on ajuste à la page
           pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeight);
      }
      
      pdf.save(`Rapport_Financier_${dateStr.replace(/\//g,'-')}.pdf`);
    });

  } catch (err) {
    console.error('Erreur PDF:', err);
    alert('Erreur lors de la génération du PDF');
  }
}

// Settings
function setExcelColors(even, odd) {
    const elEven = document.getElementById('excelColorEven');
    const elOdd = document.getElementById('excelColorOdd');
    if (elEven) elEven.value = even;
    if (elOdd) elOdd.value = odd;
}

function loadSettings() {
    // Load all text inputs
    document.getElementById('companyName').value = settings.name || '';
    document.getElementById('companyCapital').value = settings.capital || '';
    document.getElementById('companyNIF').value = settings.nif || '';
    document.getElementById('companyNIS').value = settings.nis || '';
    document.getElementById('companyArtImp').value = settings.artimp || '';
    document.getElementById('companyRC').value = settings.rc || '';
    document.getElementById('companyAddress').value = settings.address || '';
    document.getElementById('companyPhone').value = settings.phone || '';
    document.getElementById('companyFax').value = settings.fax || '';
    document.getElementById('companyRIB').value = settings.rib || '';
    if(document.getElementById('companyPricingTypes')) {
        document.getElementById('companyPricingTypes').value = settings.pricingTypes || 'Transport, Transfert';
    }
    const elEven = document.getElementById('excelColorEven');
    const elOdd = document.getElementById('excelColorOdd');
    if (elEven) elEven.value = settings.excelColorEven || '#dbe9ff';
    if (elOdd) elOdd.value = settings.excelColorOdd || '#ffffff';
    const elImmoRate = document.getElementById('defaultImmoRate');
    if (elImmoRate) elImmoRate.value = settings.defaultImmoRate !== undefined ? settings.defaultImmoRate : 2500;
    if(document.getElementById('locationEquipmentTypes')) document.getElementById('locationEquipmentTypes').value = settings.locationEquipmentTypes || 'Grue 25T, Grue 50T, Grue 75T';
    const elLocRate = document.getElementById('defaultLocationRate');
    if (elLocRate) elLocRate.value = settings.defaultLocationRate !== undefined ? settings.defaultLocationRate : 150000;

    // ✅ Load left logo
    const logoLeftDisplay = document.getElementById('logoLeftDisplay');
    if (settings.logoLeft) {
        logoLeftDisplay.innerHTML = `<img src="${settings.logoLeft}" style="max-height: 80px; max-width: 200px;">`;
    } else {
        logoLeftDisplay.innerHTML = 'Le logo gauche apparaîtra ici';
    }

    // ✅ Load right logo  
    const logoRightDisplay = document.getElementById('logoRightDisplay');
    if (settings.logoRight) {
        logoRightDisplay.innerHTML = `<img src="${settings.logoRight}" style="max-height: 80px; max-width: 200px;">`;
    } else {
        logoRightDisplay.innerHTML = 'Le logo droite apparaîtra ici';
    }
}

function saveSettings() {
    // Save all text inputs
    settings.name = document.getElementById('companyName').value;
    settings.capital = document.getElementById('companyCapital').value;
    settings.nif = document.getElementById('companyNIF').value;
    settings.nis = document.getElementById('companyNIS').value;
    settings.artimp = document.getElementById('companyArtImp').value;
    settings.rc = document.getElementById('companyRC').value;
    settings.address = document.getElementById('companyAddress').value;
    settings.phone = document.getElementById('companyPhone').value;
    settings.fax = document.getElementById('companyFax').value;
    settings.rib = document.getElementById('companyRIB').value;
    if(document.getElementById('companyPricingTypes')) {
        settings.pricingTypes = document.getElementById('companyPricingTypes').value;
    }
    const elEven = document.getElementById('excelColorEven');
    const elOdd = document.getElementById('excelColorOdd');
    if (elEven) settings.excelColorEven = elEven.value;
    if (elOdd) settings.excelColorOdd = elOdd.value;
    const elImmoRate = document.getElementById('defaultImmoRate');
    if (elImmoRate) settings.defaultImmoRate = parseFloat(elImmoRate.value) || 2500;
    if(document.getElementById('locationEquipmentTypes')) settings.locationEquipmentTypes = document.getElementById('locationEquipmentTypes').value;
    const elLocRate2 = document.getElementById('defaultLocationRate');
    if (elLocRate2) settings.defaultLocationRate = parseFloat(elLocRate2.value) || 150000;

    saveDataToLocalStorage();
    alert('✅ Paramètres sauvegardés !');
}

// ✅ Setup logo upload handlers
function setupLogoHandlers() {
    // Left logo handler
    const logoLeftInput = document.getElementById('logoLeftInput');
    if (logoLeftInput) {
        logoLeftInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    settings.logoLeft = e.target.result;
                    const logoLeftDisplay = document.getElementById('logoLeftDisplay');
                    logoLeftDisplay.innerHTML = `<img src="${settings.logoLeft}" style="max-height: 80px; max-width: 200px;">`;
                    saveDataToLocalStorage();
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Right logo handler  
    const logoRightInput = document.getElementById('logoRightInput');
    if (logoRightInput) {
        logoRightInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    settings.logoRight = e.target.result;
                    const logoRightDisplay = document.getElementById('logoRightDisplay');
                    logoRightDisplay.innerHTML = `<img src="${settings.logoRight}" style="max-height: 80px; max-width: 200px;">`;
                    saveDataToLocalStorage();
                };
                reader.readAsDataURL(file);
            }
        });
    }
}

// Status filter buttons logic
const statusButtons = document.querySelectorAll('#reportStatus .status-btn');

statusButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const value = btn.dataset.value;
    if (value === 'all') {
      // Toggle all: deselect others or select all
      const isActive = btn.classList.toggle('active');
      statusButtons.forEach(b => {
        if (b !== btn) b.classList.toggle('active', isActive);
      });
    } else {
      // Toggle individual status
      btn.classList.toggle('active');
      // If any non-all toggled, deactivate “all”
      const allBtn = document.querySelector('#reportStatus .all');
      if (allBtn && statusButtons.length > 1) {
        allBtn.classList.remove('active');
      }
      // If all non-all are active, toggle “all”
      const nonAll = Array.from(statusButtons).filter(b => b.dataset.value !== 'all');
      if (nonAll.every(b => b.classList.contains('active'))) {
        allBtn.classList.add('active');
      }
    }
    // After toggling, reload report
    loadReport();
  });
});

// Function to mark single invoice as paid
function markInvoiceAsPaid(invoiceId) {
    try {
        const invoice = invoices.find(inv => inv.id === invoiceId);
        if (invoice) {
            invoice.paid = true;
            invoice.paidDate = new Date().toISOString().split('T')[0];
            
            saveDataToLocalStorage();
            renderInvoices();
            updateDashboard();
            
            const currentView = document.querySelector('.app-view:not(.hidden)');
            if (currentView && currentView.id === 'reports') {
                loadReport();
            }
            
            alert('Facture marquée comme payée');
        }
    } catch (error) {
        console.error('Error marking invoice as paid:', error);
        alert('Erreur lors du marquage de la facture');
    }
}

// Function to mark invoice as unpaid
function markInvoiceAsUnpaid(invoiceId) {
    try {
        const invoice = invoices.find(inv => inv.id === invoiceId);
        if (invoice) {
            invoice.paid = false;
            invoice.paidDate = null;
            
            saveDataToLocalStorage();
            renderInvoices();
            updateDashboard();
            
            const currentView = document.querySelector('.app-view:not(.hidden)');
            if (currentView && currentView.id === 'reports') {
                loadReport();
            }
            
            alert('Facture marquée comme impayée');
        }
    } catch (error) {
        console.error('Error marking invoice as unpaid:', error);
        alert('Erreur lors du marquage de la facture');
    }
}


// Fonction de gestion du submit du formulaire client (incluant Art. Imp)
function handleClientSubmit(e) {
    try {
        e.preventDefault();

        // Préparer les destinations
        const destinations = Array.from(document.querySelectorAll('.destination-input'))
            .map(input => input.value.trim())
            .filter(v => v);

        // Construire l’objet client
        const clientData = {
            nom:     document.getElementById('clientNom').value.trim(),
            nif:     document.getElementById('clientNIF').value.trim(),
            nis:     document.getElementById('clientNIS').value.trim(),
            artimp:  document.getElementById('clientArtImp').value.trim(),
            rc:      document.getElementById('clientRC').value.trim(),
            activite: document.getElementById('clientActivite') ? document.getElementById('clientActivite').value.trim() : '',
            adresse: document.getElementById('clientAdresse').value.trim(),
            wilaya:  document.getElementById('clientWilaya').value,
            phone:   document.getElementById('clientPhone').value.trim(),
            destinations: destinations
        };

        // Validation des champs obligatoires (NIF et NIS ne sont plus vérifiés)
        if (!clientData.nom || !clientData.nif || !clientData.rc ||
            !clientData.adresse || !clientData.wilaya) {
            return alert('Veuillez renseigner tous les champs obligatoires (Nom, NIF, RC, Adresse, Wilaya).');
        }

        const clientId = document.getElementById('clientId').value;
        if (clientId) {
            // Mise à jour
            const idx = clients.findIndex(c => c.id === +clientId);
            if (idx !== -1) clients[idx] = { ...clients[idx], ...clientData };
        } else {
            // Création
            clientData.id = Date.now();
            clients.push(clientData);
        }

        saveDataToLocalStorage();  // Persiste la liste des clients
        renderClients();

        // Fermer la modal
        const modalInst = bootstrap.Modal.getInstance(document.getElementById('modalClient'));
        if (modalInst) modalInst.hide();

        alert('Client enregistré avec succès !');
    } catch (error) {
        console.error('Error handling client submit:', error);
        alert('Erreur lors de l\'enregistrement du client');
    }
}



/** Adaptation de handleLogoUpload() pour persister immédiatement le logo */
function handleLogoUpload(event) {
    try {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            settings.logo = e.target.result;
            const logoPreview = document.getElementById('logoPreview');
            if (logoPreview) {
                logoPreview.src = settings.logo;
                logoPreview.style.display = 'block';
            }
            saveDataToLocalStorage();  // ← Persiste le logo
        };
        reader.readAsDataURL(file);
    } catch (error) {
        console.error('Error handling logo upload:', error);
        alert('Erreur lors du chargement du logo');
    }
}

function downloadData() {
    try {
        const data = {
            clients: clients,
            invoices: invoices,
            settings: settings,
            invoiceCounter: invoiceCounter
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'douroub_data.json';
        a.click();
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error downloading data:', error);
    }
}

function importData(e) {
    try {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    if (data.clients) clients = data.clients;
                    if (data.invoices) invoices = data.invoices;
                    if (data.settings) settings = data.settings;
                    if (data.invoiceCounter) invoiceCounter = data.invoiceCounter;
                    
                    loadSettings();
                    renderClients();
                    renderInvoices();
                    updateDashboard();
                    
                    alert('Données importées avec succès!');
                } catch (error) {
                    alert('Erreur lors de l\'importation des données');
                }
            };
            reader.readAsText(file);
        }
    } catch (error) {
        console.error('Error importing data:', error);
    }
}

// Utility functions
function formatCurrency(amount) {
    if (amount === undefined || amount === null) return '0.00 DA';
    // Force 2 decimals, replace dot with comma for decimals, and add space separators for thousands
    let parts = parseFloat(amount).toFixed(2).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " "); 
    return parts.join(',') + ' DA';
}

function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR');
    } catch (error) {
        return dateString;
    }
}

function nombreEnLettresDA(montant) {
    try {
        const unites = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
        const dizaines = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];
        const dizainesSpe = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
        
        function convertirNombre(n) {
            if (n === 0) return 'zéro';
            if (n < 10) return unites[n];
            if (n < 20) return dizainesSpe[n - 10];
            if (n < 100) {
                const d = Math.floor(n / 10);
                const u = n % 10;
                if (d === 7) return 'soixante-' + dizainesSpe[u];
                if (d === 9) return 'quatre-vingt-' + dizainesSpe[u];
                return dizaines[d] + (u ? '-' + unites[u] : '');
            }
            if (n < 1000) {
                const c = Math.floor(n / 100);
                const r = n % 100;
                let result = (c === 1 ? 'cent' : unites[c] + ' cent');
                if (r) result += ' ' + convertirNombre(r);
                return result;
            }
            if (n < 1000000) {
                const m = Math.floor(n / 1000);
                const r = n % 1000;
                let result = (m === 1 ? 'mille' : convertirNombre(m) + ' mille');
                if (r) result += ' ' + convertirNombre(r);
                return result;
            }
            if (n < 1000000000) {
                const m = Math.floor(n / 1000000);
                const r = n % 1000000;
                let result = (m === 1 ? 'un million' : convertirNombre(m) + ' millions');
                if (r) result += ' ' + convertirNombre(r);
                return result;
            }
            return 'nombre trop grand';
        }
        
        const parties = montant.toFixed(2).split('.');
        const dinars = parseInt(parties[0]);
        const centimes = parseInt(parties[1]);
        
        let result = convertirNombre(dinars) + ' dinar' + (dinars > 1 ? 's' : '');
        if (centimes > 0) {
            result += ' et ' + convertirNombre(centimes) + ' centime' + (centimes > 1 ? 's' : '');
        }
        
        return result;
    } catch (error) {
        console.error('Error converting number to words:', error);
        return 'Montant non défini';
    }
}
/**
 * Supprime une facture et met à jour l’affichage et le stockage local.
 * @param {number|string} invoiceId - L’ID de la facture à supprimer.
 */
function updateRecentInvoicesTable() {
    try {
        const tableBody = document.getElementById('recentInvoicesTable');
        if (!tableBody) return;

        // Get the 5 most recent invoices
        const recentInvoices = invoices
            .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
            .slice(0, 5);

        if (recentInvoices.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4" class="text-center">Aucune facture</td></tr>';
            return;
        }

        tableBody.innerHTML = recentInvoices.map(invoice => {
            const client = clients.find(c => c.id === invoice.clientId);
            const clientName = client ? client.nom : 'Client inconnu';
            
            let statusClass = 'status--info';
            let statusText = 'En attente';
            
            if (invoice.paid) {
                statusClass = 'status--success';
                statusText = 'Payée';
            } else {
                const invDate = new Date(invoice.date || invoice.createdAt);
                const daysDiff = Math.floor((new Date() - invDate) / (1000 * 60 * 60 * 24));
                const paymentTerm = invoice.delaiPaiement || 30;
                
                if (daysDiff > paymentTerm) {
                    statusClass = 'status--error';
                    statusText = 'En retard';
                } else if (paymentTerm - daysDiff <= 3) {
                    statusClass = 'status--warning';
                    statusText = 'Échéance ≤ 3 jours';
                }
            }

            return `
                <tr>
                    <td>${invoice.number}</td>
                    <td>${clientName}</td>
                    <td>${formatCurrency(invoice.totals?.ttc || 0)}</td>
                    <td><span class="status ${statusClass}">${statusText}</span></td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        console.error('Error updating recent invoices table:', error);
    }
}
// Pour <select multiple>
function getSelectedValues(selectElement) {
  return Array.from(selectElement.selectedOptions).map(opt => opt.value);
}

// Pour les cases à cocher dans un conteneur (ex: statuts, modes de paiement)
function getCheckedValues(containerId) {
  return Array.from(document.querySelectorAll(`#${containerId} input[type="checkbox"]:checked`))
    .map(cb => cb.value);
}
function filterInvoicesForReport() {
    try {
        // A. Récupérer les dates
        const startInput = document.getElementById('reportStartDate');
        const endInput = document.getElementById('reportEndDate');
        const startDate = startInput && startInput.value ? new Date(startInput.value) : null;
        const endDate = endInput && endInput.value ? new Date(endInput.value) : null;
        
        // Ajuster la fin de date à 23h59:59 pour inclure toute la journée
        if (endDate) endDate.setHours(23, 59, 59, 999);

        // B. Récupérer les clients sélectionnés (Les petites étiquettes/chips)
        const selectedChips = document.querySelectorAll('#selectedClientsContainer .selected-client-chip');
        const selectedClientIds = Array.from(selectedChips).map(chip => parseInt(chip.dataset.id));

        // C. Récupérer le statut actif (Bouton coloré)
        const activeBtn = document.querySelector('#reportStatus .status-btn.active');
        const statusValue = activeBtn ? activeBtn.dataset.value : 'all';

        // D. ✅ NOUVEAU : Filtrer par banque (select dynamique avec toutes les banques algériennes)
        const bankFilterEl = document.getElementById('reportBankFilter');
        const selectedBank = bankFilterEl ? bankFilterEl.value : '';

        // E. FILTRAGE
        return invoices.filter(inv => {
            const d = new Date(inv.date);
            
            // 1. Filtre Date
            if (startDate && d < startDate) return false;
            if (endDate && d > endDate) return false;

            // 2. Filtre Client (Si aucun client choisi, on affiche tout)
            if (selectedClientIds.length > 0 && !selectedClientIds.includes(inv.clientId)) return false;

            // 3. Filtre Statut
            const isPaid = inv.paid || inv.paymentStatus === 'encaissee';
            const today = new Date();
            const dueDate = new Date(d.getTime() + ((inv.delaiPaiement || 30) * 86400000));

            if (statusValue === 'paid' && !isPaid) return false;
            if (statusValue === 'overdue') {
                if (isPaid) return false; // Pas en retard si payé
                if (today <= dueDate) return false; // Pas encore échu
            }

            // 4. ✅ Filtre Banque (flexible et insensible à la casse)
            if (selectedBank) {
                if (!isPaid) return false; // Facture impayée → pas de banque
                const b = (inv.paymentDetails?.bank || '').toLowerCase().trim();
                const target = selectedBank.toLowerCase().trim();
                if (b !== target && !b.includes(target) && !target.includes(b)) return false;
            }

            return true;
        });

    } catch (e) {
        console.error("Erreur filtrage:", e);
        return []; // En cas d'erreur, on renvoie une liste vide pour ne pas planter
    }
}


function renderReportTable(filtered) {
    const tbody = document.querySelector('#tableReport tbody');
    const tfoot = document.querySelector('#tableReport tfoot');
    const summaryContainer = document.getElementById('reportSummaryCards');
    const tableHeader = document.querySelector('#tableReport thead');
    
    if (!tbody) return;

    // --- SORTING LOGIC ---
    if (filtered.length > 0 && typeof reportSort !== 'undefined') {
        const getVal = (item, key) => {
             if (key === 'status') return item.paid ? 1 : 0;
             if (key === 'ref') return item.paymentDetails?.ref || '';
             if (key === 'bank') return item.paymentDetails?.bank || '';
             if (key === 'mode') return item.paymentDetails?.method || '';
             if (key === 'datePay') return item.paymentDetails?.date ? new Date(item.paymentDetails.date).getTime() : 0;
             if (key === 'date') return new Date(item.date).getTime();
             if (key === 'number') return parseInt(item.number.split('/')[0]) || 0;
             if (key === 'amount') return item.totals.ttc;
             if (key === 'ht') return item.totals.ht;
             if (key === 'client') {
                 const c = clients.find(cl => cl.id === item.clientId);
                 return c ? c.nom.toLowerCase() : '';
             }
             return 0;
        };

        filtered.sort((a, b) => {
            let valA = getVal(a, reportSort.key);
            let valB = getVal(b, reportSort.key);
            return (valA < valB ? -1 : 1) * reportSort.dir;
        });
        
        if(tableHeader) updateSortIcons(document.getElementById('tableReport'), reportSort);
    }

    // Initialize Totals
    let totalHT = 0, totalTTC = 0, totalPaid = 0, totalDebtHT = 0, totalDebtTTC = 0, totalBL = 0;
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="16" class="text-center p-5 text-muted">Aucune donnée trouvée pour cette période.</td></tr>';
        if(summaryContainer) summaryContainer.innerHTML = '';
        if(tfoot) tfoot.innerHTML = '';
        return;
    }

    // --- Generate Rows ---
    const rowsHTML = filtered.map(inv => {
        const client = clients.find(c => c.id === inv.clientId)?.nom || 'Inconnu';
        const isPaid = inv.paid || inv.paymentStatus === 'encaissee';
        
        // Calcs
        const ht = inv.totals?.ht || 0;
        const ttc = inv.totals?.ttc || 0;
        const paidAmount = isPaid ? ttc : 0;
        const debtHT = !isPaid ? ht : 0;
        const debtTTC = !isPaid ? ttc : 0;
        const bl = (inv.articles || []).reduce((sum, art) => sum + (parseInt(art.qte) || 0), 0);
        
        // Accumulate Totals
        totalHT += ht; totalTTC += ttc; totalPaid += paidAmount;
        totalDebtHT += debtHT; totalDebtTTC += debtTTC; totalBL += bl;

        // Date formatting
        const dateObj = new Date(inv.date);
        const monthName = dateObj.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
        const monthStr = monthName.charAt(0).toUpperCase() + monthName.slice(1);
        const dateStr = dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

        const badge = isPaid 
            ? '<span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill">Payée</span>' 
            : '<span class="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill">Impayée</span>';

        const refVal = (isPaid && inv.paymentDetails?.ref) ? inv.paymentDetails.ref : '-';
        const bankVal = (isPaid && inv.paymentDetails?.bank) ? inv.paymentDetails.bank : '-';
        const modeVal = (isPaid && inv.paymentDetails?.method) ? inv.paymentDetails.method : '-';
        let datePayVal = '-';
        if (isPaid && inv.paymentDetails?.date) {
            const dp = new Date(inv.paymentDetails.date);
            if (!isNaN(dp.getTime())) {
                datePayVal = dp.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            } else {
                datePayVal = inv.paymentDetails.date;
            }
        }

        return `
            <tr style="vertical-align: middle; font-size: 0.85rem; border-bottom: 1px solid #eee;">
                <td class="text-center" style="border-right: 1px solid #eee;">${badge}</td>
                
                <td class="text-center fw-bold text-primary" style="border-right: 1px solid #eee;">${refVal}</td>
                <td class="text-center fw-bold text-dark" style="border-right: 1px solid #eee;">${bankVal}</td>
                <td class="text-center" style="border-right: 1px solid #eee;">${modeVal}</td>
                <td class="text-center font-monospace" style="border-right: 1px solid #eee;">${datePayVal}</td>
                
                <td class="text-center fw-bold text-secondary text-capitalize" style="border-right: 1px solid #eee;">${monthStr}</td>
                <td class="text-center" style="border-right: 1px solid #eee;">${bl}</td>
                <td class="text-center font-monospace text-muted" style="border-right: 1px solid #eee;">${dateStr}</td>
                <td class="text-center fw-bold text-primary" style="border-right: 1px solid #eee;">${inv.number}</td>
                <td class="text-truncate" style="max-width: 150px; border-right: 1px solid #eee;" title="${client}">${client}</td>
                
                <td class="text-center font-monospace no-wrap-money" style="background:#fcfcfc; border-left: 2px solid #dee2e6; border-right: 2px solid #adb5bd;">${formatCurrency(ht).replace('DA','')}</td>
                <td class="text-center font-monospace fw-bold no-wrap-money" style="background:#fcfcfc; border-right: 2px solid #dee2e6;">${formatCurrency(ttc).replace('DA','')}</td>
                <td class="text-center font-monospace fw-bold text-success no-wrap-money" style="background:#f0fff4; border-right: 2px solid #adb5bd;">${isPaid ? formatCurrency(paidAmount).replace('DA','') : '-'}</td>
                <td class="text-center font-monospace text-danger no-wrap-money" style="background:#fff5f5; border-right: 1px solid #ffebe9;">${!isPaid ? formatCurrency(debtHT).replace('DA','') : '-'}</td>
                <td class="text-center font-monospace fw-bold text-danger no-wrap-money" style="background:#fff5f5; border-right: 2px solid #dee2e6;">${!isPaid ? formatCurrency(debtTTC).replace('DA','') : '-'}</td>
                
                <td class="text-center">
                    <button class="btn btn-sm btn-light border shadow-sm" onclick="viewInvoiceFromReport(${inv.id})">
                        <i class="fa fa-eye text-primary"></i>
                    </button>
                </td>
            </tr>`;
    }).join(''); 

    tbody.innerHTML = rowsHTML;

    // --- FOOTER ---
    if (tfoot) {
        tfoot.innerHTML = `
            <tr class="report-footer-row">
                <td colspan="6" class="report-footer-label">TOTAUX GÉNÉRAUX</td>
                
                <td class="text-center fw-bold text-warning" style="font-size:1.1rem; border-left:1px solid #eee;">${totalBL}</td>
                
                <td colspan="3"></td> 
                
                <td class="text-center report-footer-money text-info no-wrap-money" style="border-left: 2px solid #2563eb;">${formatCurrency(totalHT).replace('DA','')}</td>
                <td class="text-center report-footer-money text-dark no-wrap-money" style="border-left: 1px solid #ccc;">${formatCurrency(totalTTC).replace('DA','')}</td>
                <td class="text-center report-footer-money text-success no-wrap-money" style="border-left: 1px solid #ccc;">${formatCurrency(totalPaid).replace('DA','')}</td>
                <td class="text-center report-footer-money text-danger no-wrap-money" style="border-left: 1px solid #ccc; opacity: 0.7;">${formatCurrency(totalDebtHT).replace('DA','')}</td>
                <td class="text-center report-footer-money text-danger no-wrap-money" style="border-left: 1px solid #ccc;">${formatCurrency(totalDebtTTC).replace('DA','')}</td>
                <td></td>
            </tr>`;
    }

    if (summaryContainer) {
        const percentPaid = totalTTC > 0 ? ((totalPaid / totalTTC) * 100).toFixed(5) : '0.00000';
        const percentDebt = totalTTC > 0 ? (((totalTTC - totalPaid) / totalTTC) * 100).toFixed(5) : '0.00000';
        summaryContainer.innerHTML = `
        <div class="col-md-4">
            <div class="p-3 bg-white border rounded shadow-sm h-100 border-start border-4 border-secondary">
                <div class="text-muted small text-uppercase fw-bold">Chiffre d'Affaires</div>
                <div class="fs-3 fw-bold text-dark">${formatCurrency(totalHT).replace('DA','')} <small class="fs-6 text-muted">HT</small></div>
                <div class="small text-muted">TTC : ${formatCurrency(totalTTC)}</div>
            </div>
        </div>
        <div class="col-md-4">
            <div class="p-3 bg-white border rounded shadow-sm h-100 border-start border-4 border-success">
                <div class="d-flex justify-content-between"><span class="text-success fw-bold small text-uppercase">Total Encaissé</span><span class="badge bg-success">${percentPaid}%</span></div>
                <div class="fs-3 fw-bold text-success">${formatCurrency(totalPaid).replace('DA','')}</div>
            </div>
        </div>
        <div class="col-md-4">
            <div class="p-3 bg-white border rounded shadow-sm h-100 border-start border-4 border-danger">
                <div class="d-flex justify-content-between"><span class="text-danger fw-bold small text-uppercase">Reste à percevoir</span><span class="badge bg-danger">${percentDebt}%</span></div>
                <div class="fs-3 fw-bold text-danger">${formatCurrency(totalDebtTTC).replace('DA','')}</div>
            </div>
        </div>`;
    }
}

let currentReportList = [];

function initReportQuickFilter(list) {
    currentReportList = list || [];
    const bankSelect = document.getElementById('reportQuickBank');
    if (bankSelect) {
        const banks = new Set();
        currentReportList.forEach(inv => {
            if ((inv.paid || inv.paymentStatus === 'encaissee') && inv.paymentDetails && inv.paymentDetails.bank) {
                banks.add(inv.paymentDetails.bank);
            }
        });
        bankSelect.innerHTML = '<option value="">Toutes banques</option>';
        Array.from(banks).sort().forEach(b => {
            bankSelect.innerHTML += `<option value="${b}">${b}</option>`;
        });
    }
    const searchEl = document.getElementById('reportQuickSearch');
    if(searchEl) searchEl.value = '';
    const modeEl = document.getElementById('reportQuickMode');
    if(modeEl) modeEl.value = '';
    const statusEl = document.getElementById('reportQuickStatus');
    if(statusEl) statusEl.value = '';
    applyReportQuickFilter();
}

function getFilteredReportInvoices() {
    const list = (currentReportList && currentReportList.length > 0) ? currentReportList : filterInvoicesForReport();
    const search = (document.getElementById('reportQuickSearch')?.value || '').toLowerCase().trim();
    const bank = (document.getElementById('reportQuickBank')?.value || '').toLowerCase().trim();
    const mode = (document.getElementById('reportQuickMode')?.value || '').toLowerCase().trim();
    const status = document.getElementById('reportQuickStatus')?.value || '';

    return (list || []).filter(inv => {
        const isPaid = inv.paid || inv.paymentStatus === 'encaissee';
        if (status === 'paid' && !isPaid) return false;
        if (status === 'unpaid' && isPaid) return false;

        if (bank) {
            if (!isPaid) return false;
            const b = (inv.paymentDetails?.bank || '').toLowerCase().trim();
            if (b !== bank && !b.includes(bank) && !bank.includes(b)) return false;
        }

        if (mode) {
            if (!isPaid) return false;
            const m = (inv.paymentDetails?.method || inv.modePaiement || '').toLowerCase().trim();
            if (m !== mode && !m.includes(mode) && !mode.includes(m)) return false;
        }

        if (search) {
            const clientNom = clients.find(c => c.id === inv.clientId)?.nom || '';
            const num = inv.number || '';
            const pRef = (inv.paymentDetails?.ref || '') + ' ' + (inv.paymentDetails?.bank || '') + ' ' + (inv.paymentDetails?.method || '') + ' ' + (inv.modePaiement || '');
            const combined = `${num} ${clientNom} ${pRef}`.toLowerCase();
            if (!combined.includes(search)) return false;
        }
        return true;
    });
}

function applyReportQuickFilter() {
    const res = getFilteredReportInvoices();
    renderReportTable(res);
    const countEl = document.getElementById('reportQuickCount');
    if (countEl) {
        countEl.textContent = `ℹ️ ${res.length} ligne(s) affichée(s) sur ${currentReportList.length}`;
    }
}

function resetReportQuickFilter() {
    const searchEl = document.getElementById('reportQuickSearch');
    if(searchEl) searchEl.value = '';
    const bankEl = document.getElementById('reportQuickBank');
    if(bankEl) bankEl.value = '';
    const modeEl = document.getElementById('reportQuickMode');
    if(modeEl) modeEl.value = '';
    const statusEl = document.getElementById('reportQuickStatus');
    if(statusEl) statusEl.value = '';
    applyReportQuickFilter();
}

function loadReport() {
  // 1. Filtrer les données
  const filtered = filterInvoicesForReport();
  
  // 2. Initialiser le filtre rapide et afficher le tableau
  initReportQuickFilter(filtered);
  
  // 3. Afficher la section (Wrapper)
  const wrapper = document.getElementById('reportWrapper');
  if (wrapper) {
      wrapper.classList.remove('d-none');
  }
}

// At the very top of app.js, before any listeners:
let factureSort = { key: 'number', dir: 1 };

// Single DOMContentLoaded listener:
document.addEventListener('DOMContentLoaded', () => {
  const table = document.getElementById('tableInvoices');
  if (!table) return;
  table.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      if (factureSort.key === key) {
        factureSort.dir *= -1;
      } else {
        factureSort.key = key;
        factureSort.dir = 1;
      }
      renderInvoices();
      updateSortIcons(table, factureSort);
    });
  });
});


function updateSortIcons(table, sortState) {
  table.querySelectorAll('th.sortable').forEach(th => {
    th.classList.remove('sorted-asc', 'sorted-desc');
    if (th.dataset.sort === sortState.key) {
      th.classList.add(sortState.dir === 1 ? 'sorted-asc' : 'sorted-desc');
    }
  });
}
// Initialize wilaya pair prices
function initializeWilayaPairPrices(clientId) {
  if (!clientWilayaPairPrices[clientId]) clientWilayaPairPrices[clientId] = {};
  const types = (settings.pricingTypes || 'Transport, Transfert').split(',').map(t => t.trim());
  
  wilayas.forEach(dep=>{
    wilayas.forEach(dest=>{
      if (dep!==dest) {
        types.forEach(type => {
            const k = dep + '|' + dest + '|' + type;
            if (clientWilayaPairPrices[clientId][k] === undefined)
              clientWilayaPairPrices[clientId][k] = 0;
        });
      }
    });
  });
}

function saveWilayaPairPrices() {
    // Save to the main data storage system
    saveDataToLocalStorage(); // ✅ Use the main save function
    alert("Prix sauvegardés !");
}


// Load from localStorage
function loadWilayaPairPrices() {
    const saved = localStorage.getItem("wilayaPairPrices");
    if (saved) {
        wilayaPairPrices = JSON.parse(saved);
    } else {
        initializeWilayaPairPrices();
    }
}

// Render the table of all pairs
// Render the table of all pairs with proper organization


// Update price for a pair
function updateWilayaPairPrice(dep, dest, value) {
    wilayaPairPrices[dep + "|" + dest] = parseFloat(value) || 0;
}

// Populate select dropdowns
// Populate select dropdowns with default values
function populateWilayaPairSelects() {
    const depSel = document.getElementById("prixWilayaDepart");
    const destSel = document.getElementById("prixWilayaDestination");
    if (!depSel || !destSel) return;
    
    // Set Biskra as default for departure
    depSel.innerHTML = '<option value="">Toutes</option>' + wilayas.map(w => `<option value="${w}" ${w === 'Biskra' ? 'selected' : ''}>${w}</option>`).join('');
    
    // Set "Tout" as default for destination
    destSel.innerHTML = '<option value="" selected>Tout</option>' + wilayas.map(w => `<option value="${w}">${w}</option>`).join('');
}
// ✅ DEBUG: Add this function to test data persistence
function testDataPersistence() {
  console.log('🔍 Testing data persistence...');
  console.log('Clients in memory:', clients.length);
  console.log('Invoices in memory:', invoices.length);
  console.log('Client prices keys:', Object.keys(clientWilayaPairPrices));
  
  // Check localStorage
  const savedClients = localStorage.getItem('clients');
  const savedInvoices = localStorage.getItem('invoices');
  const savedPrices = localStorage.getItem(KEY_CLIENT_PAIR_PRICES);
  
  console.log('Clients in localStorage:', savedClients ? JSON.parse(savedClients).length : 0);
  console.log('Invoices in localStorage:', savedInvoices ? JSON.parse(savedInvoices).length : 0);
  console.log('Prices in localStorage:', savedPrices ? Object.keys(JSON.parse(savedPrices)).length : 0);
}

// Call this in browser console to debug: testDataPersistence()

// Call this when your app loads
/* ────────────────────────────────────────────────
   1. Appelé quand la vue « wilaya-prices » s’affiche
─────────────────────────────────────────────────*/
function setupWilayaPriceManagement() {
  const sel = document.getElementById('prixClient');
  const typeSel = document.getElementById('prixType');
  if (!sel) return;
  
  if (typeSel) {
      const types = (settings.pricingTypes || 'Transport, Transfert').split(',').map(t => t.trim());
      typeSel.innerHTML = types.map(t => `<option value="${t}">${t}</option>`).join('');
  }
  
  sel.innerHTML = '<option value="">Choisir…</option>' +
                  clients.map(c => `<option value="${c.id}">${c.nom}</option>`).join('');

  // ✅ Add change handler for client selection
  sel.addEventListener('change', function() {
    const clientId = this.value;
    if (clientId) {
      initializeWilayaPairPrices(clientId);
      saveDataToLocalStorage(); // Save when client structure is initialized
    }
    renderWilayaPairTable();
  });

  if (clients.length) {
    initializeWilayaPairPrices(clients[0].id);
    saveDataToLocalStorage(); // Save initial setup
  }

  populateWilayaPairSelects();
  renderWilayaPairTable();
}


/* ────────────────────────────────────────────────
   2. Affiche la table ; lit désormais le client actif
─────────────────────────────────────────────────*/
function renderWilayaPairTable() {
  const cid = document.getElementById('prixClient')?.value || '';
  const depFilter = document.getElementById('prixWilayaDepart')?.value || '';
  const dstFilter = document.getElementById('prixWilayaDestination')?.value || '';
  const search = (document.getElementById('prixWilayaSearch')?.value || '').toLowerCase();
  const box = document.getElementById('wilayaPairPricesTable');
  if (!box) return;

  if (!cid) { 
    box.innerHTML = '<p class="text-muted">Choisissez un client.</p>'; 
    return; 
  }

  initializeWilayaPairPrices(cid);
  let rows = '';
  let count = 0;

const selectedType = document.getElementById('prixType') ? document.getElementById('prixType').value : 'Transport';

  wilayas.forEach(dep => {
    if (depFilter && dep !== depFilter) return;
    wilayas.forEach(dst => {
      if (dep === dst) return;
      if (dstFilter && dst !== dstFilter) return;
      if (search && !(dep.toLowerCase().includes(search) || dst.toLowerCase().includes(search))) return;

      const key = dep + '|' + dst + '|' + selectedType;
      const price = clientWilayaPairPrices[cid][key] || 0;
      count++;

rows += `
        <tr>
          <td class="fw-semibold">${dep}</td>
          <td class="fw-semibold">${dst}</td>
          <td>
            <div class="input-group">
              <input type="number" class="form-control text-end"
                     value="${price}" min="0"
                     onchange="updateDraftPrice('${cid}', '${key}', this.value)">
              <span class="input-group-text">DA</span>
            </div>
          </td>
          <td>
            <button class="btn btn--sm btn-success me-1 text-white" title="Sauvegarde Rapide"
                    onclick="quickSavePrice(this)">
              <i class="fa fa-save"></i>
            </button>
            <button class="btn btn--sm btn--secondary me-1" title="Copier"
                    onclick="navigator.clipboard.writeText( (clientWilayaPairPrices['${cid}']['${key}']||0).toString() )">
              <i class="fa fa-copy"></i>
            </button>
            <button class="btn btn--sm btn--outline text-danger" title="Réinitialiser"
                    onclick="resetDraftPrice('${cid}', '${key}')">
              <i class="fa fa-trash"></i>
            </button>
          </td>
        </tr>`;
    });
  });

  if (!count) {
    rows = `<tr><td colspan="4" class="text-center text-muted py-4">
              <i class="fa fa-search me-2"></i>Aucun trajet trouvé
            </td></tr>`;
  }

  box.innerHTML = `
    <table class="table table-bordered">
      <thead>
        <tr class="table-primary">
          <th style="width:25%">Départ</th>
          <th style="width:25%">Destination</th>
          <th style="width:20%">Prix (DA)</th>
          <th style="width:30%">Actions</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="mt-2 text-muted"><small>Total : ${count} trajets affichés</small></div>`;
}
// ✅ MODE BROUILLON : Garder en mémoire SANS sauvegarder en base de données
function updateDraftPrice(clientId, key, value) {
    clientWilayaPairPrices[clientId][key] = parseFloat(value) || 0;
    // La donnée est prête, mais on attend que l'utilisateur clique sur Sauvegarder !
}

// ✅ MODE BROUILLON : Remettre à zéro en mémoire
function resetDraftPrice(clientId, key) {
    clientWilayaPairPrices[clientId][key] = 0;
    renderWilayaPairTable();
}

// ✅ ACTION : Sauvegarde Rapide (depuis la ligne du tableau)
function quickSavePrice(btnElement) {
    saveDataToLocalStorage(); // Sauvegarde tout l'état en cours
    
    // Petit effet visuel sympa pour confirmer à l'utilisateur
    const originalHtml = btnElement.innerHTML;
    btnElement.innerHTML = '<i class="fa fa-check-double"></i>';
    btnElement.classList.replace('btn-success', 'btn-primary');
    
    setTimeout(() => {
        btnElement.innerHTML = originalHtml;
        btnElement.classList.replace('btn-primary', 'btn-success');
    }, 1500);
}

function autoFillWilayaPrice() {
  const { clientId:cid, wilayaDepart:dep, wilayaDestination:dst } = currentInvoice;
  if (!cid || !dep || !dst) return alert('Choisissez client + wilayas d’abord');
  const price = (clientWilayaPairPrices[cid]||{})[dep+'|'+dst] || 0;
  if (!price) return alert('Aucun tarif enregistré pour ce trajet.');
  currentInvoice.articles[0].prixUHT   = price;
  currentInvoice.articles[0].montantHT = price * currentInvoice.articles[0].qte;
  renderArticles(); updateInvoicePreview();
}
// Copy price for a specific pair
function copyPairPrice(dep, dest) {
    const key = dep + "|" + dest;
    const price = wilayaPairPrices[key] || 0;
    navigator.clipboard.writeText(price.toString()).then(() => {
        alert(`Prix copié: ${dep} → ${dest} = ${price} DA`);
    }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = price.toString();
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert(`Prix copié: ${dep} → ${dest} = ${price} DA`);
    });
}

// Clear price for a specific pair
function clearPairPrice(dep, dest) {
    if (confirm(`Êtes-vous sûr de vouloir réinitialiser le prix pour ${dep} → ${dest} ?`)) {
        wilayaPairPrices[dep + "|" + dest] = 0;
        renderWilayaPairTable();
    }
}

// Bulk set all visible prices
function setAllVisiblePrices() {
    const price = prompt('Entrez le prix à appliquer pour tous les trajets visibles:');
    if (price !== null && !isNaN(price)) {
        const priceValue = parseFloat(price) || 0;
        const dep = document.getElementById("prixWilayaDepart").value;
        const dest = document.getElementById("prixWilayaDestination").value;
        const search = document.getElementById("prixWilayaSearch").value.toLowerCase();
        
        wilayas.forEach(w1 => {
            if (dep && w1 !== dep) return;
            wilayas.forEach(w2 => {
                if (w1 === w2) return;
                if (dest && w2 !== dest) return;
                if (
                    search &&
                    !(
                        w1.toLowerCase().includes(search) ||
                        w2.toLowerCase().includes(search)
                    )
                )
                    return;
                wilayaPairPrices[w1 + "|" + w2] = priceValue;
            });
        });
        renderWilayaPairTable();
        alert(`Prix mis à jour pour tous les trajets visibles: ${priceValue} DA`);
    }
}
// --- GESTION DES PAIEMENTS (NOUVEAU) ---

function openPaymentModal(invoiceId) {
    const inv = invoices.find(i => i.id === invoiceId);
    if (!inv) return;

    document.getElementById('payInvoiceId').value = inv.id;
    document.getElementById('payAmountDisplay').textContent = formatCurrency(inv.totals.ttc);

    // ✅ Remplir la liste de TOUTES les banques algériennes
    const savedBank = inv.paymentDetails?.bank || '';
    populateBankSelect('#payBank', savedBank);
    
    // Charger les infos existantes si elles existent
    if (inv.paymentDetails) {
        document.getElementById('payDate').value = inv.paymentDetails.date || new Date().toISOString().split('T')[0];
        document.getElementById('payRef').value = inv.paymentDetails.ref || '';
        document.getElementById('payMethod').value = inv.paymentDetails.method || 'Virement';
    } else {
        // Sinon valeurs par défaut
        document.getElementById('payDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('payRef').value = '';
    }
    
    new bootstrap.Modal(document.getElementById('modalPayment')).show();
}
// 2. INITIALISATION DES NOUVEAUX ÉLÉMENTS (Boutons, Dropdown)
document.addEventListener('DOMContentLoaded', () => {
    
    // --- Gestion des Boutons Statut (Tout / Payées / Retard) ---
// =========================================================
// 2. INITIALISATION & LISTENERS (VERSION AVEC BOUTON EFFACER)
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
    
    // --- A. Gestion des Boutons Statut (Payée, Retard...) ---
    const statusBtns = document.querySelectorAll('#reportStatus .status-btn');
    statusBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            statusBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // --- B. Gestion du Sélecteur de Client "Élégant" ---
    const trigger = document.getElementById('clientPickerTrigger');
    const dropdown = document.getElementById('clientDropdown');
    const optionsContainer = document.getElementById('clientOptions');
    const search = document.getElementById('clientSearch');
    const selectedContainer = document.getElementById('selectedClientsContainer');

    // --- C. NOUVEAU : Fonction qui gère le bouton "Tout effacer" ---
    function updateClearButton() {
        if (!selectedContainer) return;
        
        // Est-ce qu'il y a des clients sélectionnés ?
        const hasChips = selectedContainer.querySelectorAll('.selected-client-chip').length > 0;
        let clearBtn = document.getElementById('btnClearAllClients');

        if (hasChips) {
            // OUI : On affiche le bouton rouge (s'il n'existe pas déjà)
            if (!clearBtn) {
                clearBtn = document.createElement('button');
                clearBtn.id = 'btnClearAllClients';
                clearBtn.type = 'button'; // Important pour ne pas soumettre de formulaire
                clearBtn.className = 'btn btn-xs btn-outline-danger ms-auto';
                clearBtn.style.fontSize = '0.75rem';
                clearBtn.style.padding = '2px 8px';
                clearBtn.style.marginTop = '4px';
                clearBtn.innerHTML = '<i class="fa fa-times me-1"></i>Tout effacer';
                
                // Action au clic : Vider la liste
                clearBtn.onclick = (e) => {
                    e.stopPropagation(); 
                    selectedContainer.innerHTML = ''; // On efface tout
                    updateClearButton(); // Le bouton se supprime lui-même
                };
                
                // On l'ajoute à la fin de la zone
                selectedContainer.appendChild(clearBtn);
            }
        } else {
            // NON : On supprime le bouton s'il existe
            if (clearBtn) clearBtn.remove();
        }
    }

    if (trigger && dropdown) {
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = dropdown.style.display === 'block';
            dropdown.style.display = isVisible ? 'none' : 'block';
            if (!isVisible) {
                renderClientOptionsInternal();
                if(search) search.focus();
            }
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.elegant-client-picker')) {
                dropdown.style.display = 'none';
            }
        });

        if(search) {
            search.addEventListener('input', (e) => {
                renderClientOptionsInternal(e.target.value);
            });
            search.addEventListener('click', (e) => e.stopPropagation());
        }
    }

    // Afficher la liste des clients dans le menu
    function renderClientOptionsInternal(filterText = '') {
        if (!optionsContainer) return;
        optionsContainer.innerHTML = '';
        
        // Option spéciale "Ajouter tous les clients" (En bleu)
        if (filterText === '') {
            const allDiv = document.createElement('div');
            allDiv.className = 'dropdown-option fw-bold text-primary';
            allDiv.style.padding = '8px 12px';
            allDiv.style.cursor = 'pointer';
            allDiv.style.borderBottom = '2px solid #f8f9fa';
            allDiv.innerHTML = `<i class="fa fa-check-double me-2"></i>Ajouter tous les clients`;
            
            allDiv.addEventListener('click', () => {
                // On ajoute tout le monde
                clients.forEach(c => addClientChipInternal(c));
                dropdown.style.display = 'none'; // On ferme le menu
            });
            optionsContainer.appendChild(allDiv);
        }

        const filtered = clients.filter(c => c.nom.toLowerCase().includes(filterText.toLowerCase()));
        
        filtered.forEach(client => {
            const div = document.createElement('div');
            div.className = 'dropdown-option';
            div.style.padding = '8px 12px';
            div.style.cursor = 'pointer';
            div.style.borderBottom = '1px solid #f8f9fa';
            div.innerHTML = `<i class="fa fa-user me-2 text-muted"></i>${client.nom}`;
            
            div.addEventListener('click', () => {
                addClientChipInternal(client);
                dropdown.style.display = 'none';
                if(search) search.value = '';
            });
            
            div.addEventListener('mouseover', () => div.style.background = '#f0f8ff');
            div.addEventListener('mouseout', () => div.style.background = 'white');
            
            optionsContainer.appendChild(div);
        });
        
        if(filtered.length === 0) {
            optionsContainer.innerHTML = '<div class="p-3 text-muted small text-center">Aucun client trouvé</div>';
        }
    }

    // Ajouter un client (Chip)
    function addClientChipInternal(client) {
        if (!selectedContainer) return;
        // Si déjà présent, on ne fait rien
        if (selectedContainer.querySelector(`.selected-client-chip[data-id="${client.id}"]`)) return;

        // On enlève temporairement le bouton "Tout effacer" pour qu'il reste toujours à la fin
        const clearBtn = document.getElementById('btnClearAllClients');
        if(clearBtn) clearBtn.remove();

        const chip = document.createElement('div');
        chip.className = 'selected-client-chip badge bg-light text-dark border me-1 mb-1 shadow-sm';
        chip.dataset.id = client.id;
        chip.style.display = 'inline-flex';
        chip.style.alignItems = 'center';
        chip.style.padding = '8px 12px';
        chip.style.fontSize = '0.9rem';
        chip.innerHTML = `
            <span>${client.nom}</span>
            <i class="fa fa-times ms-2 text-danger hover-scale" style="cursor:pointer"></i>
        `;
        
        // Clic sur la petite croix d'un client
        chip.querySelector('.fa-times').addEventListener('click', (e) => {
            e.stopPropagation();
            chip.remove();
            updateClearButton(); // Vérifier s'il reste des clients
        });
        
        selectedContainer.appendChild(chip);
        
        // On remet le bouton "Tout effacer" à la fin
        updateClearButton(); 
    }
});
// Initialiser l'écouteur du formulaire de paiement
document.addEventListener('DOMContentLoaded', () => {
    const payForm = document.getElementById('formPayment');
if (payForm) {
        payForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const invIdVal = document.getElementById('payInvoiceId').value;
            const bank = document.getElementById('payBank').value;
            const method = document.getElementById('payMethod').value;
            const date = document.getElementById('payDate').value;
            const ref = document.getElementById('payRef').value;
            
            // Si c'est un paiement groupé
            if (invIdVal === 'BATCH') {
                const selectedIds = Array.from(document.querySelectorAll('.invoice-checkbox:checked'))
                                         .map(cb => parseInt(cb.dataset.id));
                
                selectedIds.forEach(id => {
                    const idx = invoices.findIndex(i => i.id === id);
                    if (idx !== -1) {
                        invoices[idx].paid = true;
                        invoices[idx].paymentStatus = 'encaissee';
                        invoices[idx].paymentDetails = { bank, method, date, ref }; // Mêmes infos pour tous
                        invoices[idx].paidDate = date;
                    }
                });
                alert(`✅ ${selectedIds.length} factures marquées comme payées !`);

            } else {
                // Paiement individuel (code existant)
                const invId = parseInt(invIdVal);
                const idx = invoices.findIndex(i => i.id === invId);
                if (idx !== -1) {
                    invoices[idx].paid = true;
                    invoices[idx].paymentStatus = 'encaissee';
                    invoices[idx].paymentDetails = { bank, method, date, ref };
                    invoices[idx].paidDate = date;
                    alert("✅ Paiement enregistré !");
                }
            }

            saveDataToLocalStorage();
            renderInvoices();
            updateDashboard();
            bootstrap.Modal.getInstance(document.getElementById('modalPayment')).hide();
        });
    }
	});

// --- FONCTION DE REDIRECTION DEPUIS LE RAPPORT ---
function viewInvoiceFromReport(id) {
    // 1. Trouver la facture
    const inv = invoices.find(i => i.id === id);
    if (!inv) return;

    // 2. Changer de vue vers "Factures"
    showView('invoices');

    // 3. Attendre un court instant que la vue change, puis ouvrir l'aperçu
    setTimeout(() => {
        openViewInvoiceModal(inv);
        
        // Optionnel : Scroller vers la ligne
        const row = document.querySelector(`.invoice-checkbox[data-id="${id}"]`);
        if(row) {
            row.closest('tr').scrollIntoView({behavior: "smooth", block: "center"});
            row.closest('tr').classList.add('selected-invoice-row');
        }
    }, 100);
}

function renderClientOptions(filterText = '') {
    const optionsContainer = document.getElementById('clientOptions');
    const selectedContainer = document.getElementById('selectedClientsContainer');
    
    if (!optionsContainer) return;
    optionsContainer.innerHTML = ''; // On vide la liste

    // --- 1. BOUTON ROUGE "TOUT DÉSÉLECTIONNER" (Si on a déjà choisi des gens) ---
    const hasSelection = selectedContainer.querySelectorAll('.selected-client-chip').length > 0;
    
    if (hasSelection && filterText === '') {
        const clearBtn = document.createElement('div');
        clearBtn.className = 'btn-deselect-all'; // Utilise le style CSS ajouté
        clearBtn.innerHTML = '<i class="fa fa-trash me-2"></i>Tout Désélectionner';
        
        clearBtn.onclick = (e) => {
            e.stopPropagation(); // Ne pas fermer le menu
            selectedContainer.innerHTML = ''; // ON VIDE TOUT D'UN COUP
            renderClientOptions(); // On rafraîchit la liste
        };
        optionsContainer.appendChild(clearBtn);
    }

    // --- 2. LISTE DES CLIENTS ---
    const filtered = clients.filter(c => c.nom.toLowerCase().includes(filterText.toLowerCase()));
    
    if (filtered.length === 0) {
        optionsContainer.innerHTML += '<div class="p-3 text-muted text-center">Aucun client</div>';
    } else {
        filtered.forEach(client => {
            // Création de la ligne client
            const div = document.createElement('div');
            div.className = 'dropdown-option';
            div.style.padding = '10px';
            div.style.cursor = 'pointer';
            div.style.borderBottom = '1px solid #eee';
            
            // Vérifier si déjà coché
            const isSelected = selectedContainer.querySelector(`.selected-client-chip[data-id="${client.id}"]`);
            
            if (isSelected) {
                div.style.background = '#f0f0f0';
                div.style.color = '#999';
                div.innerHTML = `<i class="fa fa-check text-success me-2"></i>${client.nom}`;
            } else {
                div.innerHTML = `<i class="fa fa-user me-2 text-primary"></i>${client.nom}`;
            }

            // Click sur le client
            div.onclick = (e) => {
                e.stopPropagation();
                // Ajout manuel
                if (!isSelected) {
                    const chip = document.createElement('div');
                    chip.className = 'selected-client-chip badge bg-light text-dark border me-1 mb-1';
                    chip.dataset.id = client.id;
                    chip.style.padding = '5px 10px';
                    chip.innerHTML = `${client.nom} <i class="fa fa-times text-danger ms-2" style="cursor:pointer" onclick="this.parentElement.remove(); renderClientOptions()"></i>`;
                    selectedContainer.appendChild(chip);
                }
                
                // On vide la recherche mais on garde le menu ouvert
                const search = document.getElementById('clientSearch');
                if(search) search.value = '';
                
                renderClientOptions(); // Rafraîchir pour afficher le bouton rouge
            };
            
            optionsContainer.appendChild(div);
        });
    }
}
// Fonction utilitaire (à vérifier qu'elle est bien présente)
function addClientChip(client) {
    const selectedContainer = document.getElementById('selectedClientsContainer');
    if (!selectedContainer) return;
    if (selectedContainer.querySelector(`.selected-client-chip[data-id="${client.id}"]`)) return;

    const chip = document.createElement('div');
    chip.className = 'selected-client-chip badge bg-light text-dark border me-1 mb-1 shadow-sm';
    chip.dataset.id = client.id;
    chip.style.display = 'inline-flex';
    chip.style.alignItems = 'center';
    chip.style.padding = '6px 10px';
    chip.style.fontSize = '0.85rem';
    chip.innerHTML = `<span>${client.nom}</span><i class="fa fa-times ms-2 text-danger" style="cursor:pointer"></i>`;
    
    chip.querySelector('.fa-times').addEventListener('click', (e) => {
        e.stopPropagation();
        chip.remove();
        renderClientOptions(); // Mise à jour du menu si ouvert
    });
    
    selectedContainer.appendChild(chip);
}
});

// --- FONCTION POUR ANNULER UN PAIEMENT ---
function revertPayment(id) {
    if (!confirm("Voulez-vous vraiment annuler ce paiement et remettre la facture en 'Non Payée' ?")) return;

    const idx = invoices.findIndex(i => i.id === id);
    if (idx !== -1) {
        // On remet à zéro
        invoices[idx].paid = false;
        invoices[idx].paymentStatus = ''; 
        invoices[idx].paymentDetails = null; // On efface les traces du paiement
        invoices[idx].paidDate = null;
        
        saveDataToLocalStorage();
        renderInvoices();
        updateDashboard(); // Mettre à jour les chiffres
        alert("Paiement annulé. La facture est de nouveau impayée.");
    }
}

// --- GESTION PAIEMENT GROUPÉ (BATCH) ---
function openBatchPaymentModal() {
    // Récupérer les ID sélectionnés
    const selectedIds = Array.from(document.querySelectorAll('.invoice-checkbox:checked'))
                             .map(cb => parseInt(cb.dataset.id));
    
    if (selectedIds.length === 0) {
        alert("Veuillez sélectionner au moins une facture.");
        return;
    }

    // Calcul du total
    const totalTTC = selectedIds.reduce((sum, id) => {
        const inv = invoices.find(i => i.id === id);
        return sum + (inv ? inv.totals.ttc : 0);
    }, 0);

    // Remplir la modal
    document.getElementById('payInvoiceId').value = 'BATCH'; // Marqueur spécial
    document.getElementById('payAmountDisplay').textContent = formatCurrency(totalTTC) + ` (${selectedIds.length} factures)`;
    
    // Reset champs
    document.getElementById('payDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('payRef').value = '';

    // ✅ FIX: Populate bank dropdown (was missing, causing empty bank list)
    populateBankSelect('#payBank', '');

    new bootstrap.Modal(document.getElementById('modalPayment')).show();
}

// --- CORRECTION BUG RAPPORT ---
// On l'attache à window pour être sûr qu'elle soit accessible depuis le HTML
// --- FIX: OPEN MODAL DIRECTLY WITHOUT SWITCHING VIEWS ---
window.viewInvoiceFromReport = function(id) {
    console.log("Opening invoice preview in modal:", id);
    
    // 1. Find the invoice
    const inv = invoices.find(i => i.id === id);
    if (!inv) {
        console.error("Invoice not found ID:", id);
        return;
    }

    // 2. DO NOT switch view (Removed showView('invoices'))

    // 3. Open the full screen preview modal directly
    openViewInvoiceModal(inv);
};


// =========================================================
// 1. FONCTION DE PAIEMENT (Correction du rafraîchissement)
// =========================================================
function confirmPayment() {
    // Récupération des valeurs
    const invIdVal = document.getElementById('payInvoiceId').value;
    const bank = document.getElementById('payBank').value;
    const method = document.getElementById('payMethod').value;
    const date = document.getElementById('payDate').value;
    const ref = document.getElementById('payRef').value;

    // Vérification basique
    if (!bank || !method || !date || !ref) {
        alert("Veuillez remplir tous les champs obligatoires (*)");
        return;
    }

    // Cas 1 : Paiement Groupé (Batch)
    if (invIdVal === 'BATCH') {
        const selectedIds = Array.from(document.querySelectorAll('.invoice-checkbox:checked'))
                                 .map(cb => parseInt(cb.dataset.id));
        
        let count = 0;
        selectedIds.forEach(id => {
            const idx = invoices.findIndex(i => i.id === id);
            if (idx !== -1) {
                invoices[idx].paid = true;
                invoices[idx].paymentStatus = 'encaissee';
                invoices[idx].paymentDetails = { bank, method, date, ref };
                invoices[idx].paidDate = date;
                count++;
            }
        });
        alert(`✅ ${count} factures encaissées avec succès !`);
    } 
    // Cas 2 : Paiement Unique
    else {
        const invId = parseInt(invIdVal);
        const idx = invoices.findIndex(i => i.id === invId);
        if (idx !== -1) {
            invoices[idx].paid = true;
            invoices[idx].paymentStatus = 'encaissee';
            invoices[idx].paymentDetails = { bank, method, date, ref };
            invoices[idx].paidDate = date;
            alert("✅ Paiement enregistré !");
        }
    }

    // Sauvegarde et Mise à jour
    saveDataToLocalStorage();
    renderInvoices();
    updateDashboard();
    
    // Fermer la fenêtre proprement
    const modalEl = document.getElementById('modalPayment');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();
}

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. BOUTON GLOBAL D'EFFACEMENT (NOUVEAU) ---
    // On l'injecte dynamiquement juste après le bouton d'ouverture du menu
    const pickerContainer = document.querySelector('.elegant-client-picker');
    if (pickerContainer && !document.getElementById('btnGlobalDeselect')) {
        const clearBtn = document.createElement('button');
        clearBtn.id = 'btnGlobalDeselect';
        clearBtn.type = 'button';
        clearBtn.className = 'btn btn-sm btn-outline-danger position-absolute top-0 end-0 m-1';
        clearBtn.style.zIndex = '10';
        clearBtn.innerHTML = '<i class="fa fa-trash"></i>';
        clearBtn.title = "Tout désélectionner";
        clearBtn.onclick = (e) => {
            e.stopPropagation();
            document.getElementById('selectedClientsContainer').innerHTML = ''; // Vide tout
            updateClearButtonVisibility(); // Cache le bouton
            renderClientOptions(); // Rafraîchit la liste
        };
        pickerContainer.appendChild(clearBtn);
    }

    // Fonction pour montrer/cacher le bouton poubelle rouge
    function updateClearButtonVisibility() {
        const container = document.getElementById('selectedClientsContainer');
        const btn = document.getElementById('btnGlobalDeselect');
        if (!container || !btn) return;
        
        // S'il y a des clients, on affiche le bouton rouge
        if (container.children.length > 0) {
            btn.style.display = 'block';
        } else {
            btn.style.display = 'none';
        }
    }

    // --- 2. GESTION DU MENU DÉROULANT ---
    const trigger = document.getElementById('clientPickerTrigger');
    const dropdown = document.getElementById('clientDropdown');
    const search = document.getElementById('clientSearch');

    if (trigger && dropdown) {
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            // Bascule Afficher / Cacher
            const isVisible = dropdown.style.display === 'block';
            dropdown.style.display = isVisible ? 'none' : 'block';
            
            if (!isVisible) {
                renderClientOptions(); // Charger la liste
                if(search) search.focus();
            }
        });

        // Fermer si on clique ailleurs
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.elegant-client-picker')) {
                dropdown.style.display = 'none';
            }
        });

        if(search) {
            search.addEventListener('input', (e) => {
                renderClientOptions(e.target.value);
            });
            search.addEventListener('click', (e) => e.stopPropagation());
        }
    }

    // --- 3. FONCTION D'AFFICHAGE DES OPTIONS ---
    window.renderClientOptions = function(filterText = '') {
        const optionsContainer = document.getElementById('clientOptions');
        const selectedContainer = document.getElementById('selectedClientsContainer');
        if (!optionsContainer) return;
        
        optionsContainer.innerHTML = '';

        // Option "Tout Sélectionner" en haut de la liste
        if (filterText === '') {
            const allDiv = document.createElement('div');
            allDiv.className = 'dropdown-option fw-bold text-primary';
            allDiv.style.padding = '10px';
            allDiv.style.borderBottom = '2px solid #eee';
            allDiv.style.cursor = 'pointer';
            allDiv.style.background = '#eef8ff';
            allDiv.innerHTML = `<i class="fa fa-check-double me-2"></i>Ajouter tous les clients`;
            
            allDiv.onclick = (e) => {
                e.stopPropagation();
                clients.forEach(c => addClientChipInternal(c));
                updateClearButtonVisibility();
                dropdown.style.display = 'none'; // On ferme après avoir tout ajouté
            };
            optionsContainer.appendChild(allDiv);
        }

        const filtered = clients.filter(c => c.nom.toLowerCase().includes(filterText.toLowerCase()));
        
        if (filtered.length === 0) {
            optionsContainer.innerHTML += '<div class="p-3 text-muted text-center">Aucun résultat</div>';
        } else {
            filtered.forEach(client => {
                const div = document.createElement('div');
                div.className = 'dropdown-option';
                div.style.padding = '10px';
                div.style.cursor = 'pointer';
                div.style.borderBottom = '1px solid #f8f9fa';
                div.innerHTML = client.nom;

                // Griser si déjà sélectionné
                const isSelected = selectedContainer.querySelector(`.selected-client-chip[data-id="${client.id}"]`);
                if (isSelected) {
                    div.style.background = '#f0f0f0';
                    div.style.color = '#aaa';
                    div.innerHTML += ' <i class="fa fa-check ms-2"></i>';
                }

                div.onclick = (e) => {
                    e.stopPropagation();
                    addClientChipInternal(client);
                    updateClearButtonVisibility();
                    if(search) search.value = '';
                    renderClientOptions(); // Rafraîchir l'état visuel
                };
                
                // Hover
                div.onmouseover = () => { if(!isSelected) div.style.background = '#f8f9fa'; };
                div.onmouseout = () => { if(!isSelected) div.style.background = 'white'; };

                optionsContainer.appendChild(div);
            });
        }
    };

    // Fonction interne pour ajouter une puce
    function addClientChipInternal(client) {
        const selectedContainer = document.getElementById('selectedClientsContainer');
        if (selectedContainer.querySelector(`.selected-client-chip[data-id="${client.id}"]`)) return;

        const chip = document.createElement('div');
        chip.className = 'selected-client-chip badge bg-light text-dark border me-1 mb-1';
        chip.dataset.id = client.id;
        chip.style.padding = '5px 10px';
        chip.innerHTML = `${client.nom} <i class="fa fa-times text-danger ms-2" style="cursor:pointer"></i>`;
        
        chip.querySelector('.fa-times').onclick = (e) => {
            e.stopPropagation();
            chip.remove();
            updateClearButtonVisibility(); // Vérifier s'il faut cacher le bouton poubelle
        };
        
        selectedContainer.appendChild(chip);
    }
    
// Initialisation Boutons Statut
    const statusBtns = document.querySelectorAll('#reportStatus .status-btn');
    statusBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            statusBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Check initial
    updateClearButtonVisibility();
});

// ════════════════════════════════════════════════════════════════════════════════
// 🚛 MODULE IMMOBILISATION & RENTABILITÉ FLOTTE
// ════════════════════════════════════════════════════════════════════════════════

function isImmobilisationArticle(art) {
    if (!art) return false;
    if (art.isImmobilisation === true) return true;
    if (art.pricingType && typeof art.pricingType === 'string' && art.pricingType.toLowerCase().includes('immobilis')) return true;
    if (art.designation && typeof art.designation === 'string' && art.designation.toLowerCase().includes('immobilisation')) return true;
    return false;
}

function isImmobilisationInvoice(inv) {
    if (!inv) return false;
    if (inv.invoiceType === 'immobilisation') return true;
    return inv.articles && inv.articles.some(a => isImmobilisationArticle(a));
}

function populateImmoClientFilter() {
    const sel = document.getElementById('immoFilterClient');
    if (!sel) return;
    const currentVal = sel.value || 'all';
    let html = '<option value="all">👑 Tous les clients</option>';
    clients.forEach(c => {
        html += `<option value="${c.id}" ${String(c.id) === String(currentVal) ? 'selected' : ''}>${c.nom}</option>`;
    });
    sel.innerHTML = html;
}

window.onImmoPeriodChange = function() {
    const periodSel = document.getElementById('immoFilterPeriod');
    const customDiv = document.getElementById('immoCustomDates');
    if (periodSel && customDiv) {
        if (periodSel.value === 'custom') {
            customDiv.style.setProperty('display', 'flex', 'important');
        } else {
            customDiv.style.setProperty('display', 'none', 'important');
        }
    }
    updateImmobilisationView();
};

window.resetImmoFilters = function() {
    const clientSel = document.getElementById('immoFilterClient');
    const yearSel = document.getElementById('immoFilterYear');
    const periodSel = document.getElementById('immoFilterPeriod');
    const customDiv = document.getElementById('immoCustomDates');
    const matInput = document.getElementById('immoFilterMatricule');
    const searchInput = document.getElementById('immoTableSearch');
    const dFrom = document.getElementById('immoDateFrom');
    const dTo = document.getElementById('immoDateTo');
    
    if (clientSel) clientSel.value = 'all';
    if (yearSel) yearSel.value = '2026';
    if (periodSel) periodSel.value = 'all';
    if (customDiv) customDiv.style.setProperty('display', 'none', 'important');
    if (dFrom) dFrom.value = '';
    if (dTo) dTo.value = '';
    if (matInput) matInput.value = '';
    if (searchInput) searchInput.value = '';
    
    updateImmobilisationView();
};

function getFilteredImmoData() {
    const clientVal = document.getElementById('immoFilterClient')?.value || 'all';
    const yearVal = document.getElementById('immoFilterYear')?.value || '';
    const periodVal = document.getElementById('immoFilterPeriod')?.value || 'all';
    const dateFrom = document.getElementById('immoDateFrom')?.value || '';
    const dateTo = document.getElementById('immoDateTo')?.value || '';
    const matriculeVal = (document.getElementById('immoFilterMatricule')?.value || '').trim().toLowerCase();

    const results = [];

    invoices.forEach(inv => {
        if (!inv.articles || inv.articles.length === 0) return;

        // Year & Period filters
        if (inv.date) {
            const d = new Date(inv.date);
            const invYear = d.getFullYear();
            if (yearVal && invYear !== parseInt(yearVal, 10)) return;

            const m = d.getMonth(); // 0..11
            if (periodVal === 'S1' && (m < 0 || m > 5)) return;
            if (periodVal === 'S2' && (m < 6 || m > 11)) return;
            if (periodVal === 'Q1' && (m < 0 || m > 2)) return;
            if (periodVal === 'Q2' && (m < 3 || m > 5)) return;
            if (periodVal === 'Q3' && (m < 6 || m > 8)) return;
            if (periodVal === 'Q4' && (m < 9 || m > 11)) return;
            if (['0','1','2','3','4','5','6','7','8','9','10','11'].includes(periodVal) && m !== parseInt(periodVal, 10)) return;
            if (periodVal === 'custom') {
                const invDateStr = inv.date;
                if (dateFrom && invDateStr < dateFrom) return;
                if (dateTo && invDateStr > dateTo) return;
            }
        }

        // Client filter
        if (clientVal !== 'all' && String(inv.clientId) !== String(clientVal)) return;

        const clientObj = clients.find(c => c.id === inv.clientId) || { nom: 'Inconnu' };

        inv.articles.forEach((art, idx) => {
            if (!isImmobilisationArticle(art)) return;

            const mat = (art.matricule || '').trim();
            if (matriculeVal) {
                const searchIn = (mat + ' ' + (art.designation || '') + ' ' + (art.immoDriver || '') + ' ' + (art.immoLocation || '')).toLowerCase();
                if (!searchIn.includes(matriculeVal)) return;
            }

            const hours = parseFloat(art.qte) || 0;
            const rate = parseFloat(art.prixUHT) || 0;
            const ht = parseFloat(art.montantHT) || (hours * rate) || 0;
            const ttc = ht * 1.19;

            // Determine stage
            let stage = art.immoStage || 'dechargement';
            if (!art.immoStage) {
                const combined = ((art.designation || '') + ' ' + (art.immoReason || '')).toLowerCase();
                if (combined.includes('chargement &') || combined.includes('chargement et')) stage = 'both';
                else if (combined.includes('chargement') && !combined.includes('déchargement')) stage = 'chargement';
                else if (combined.includes('autre') || combined.includes('douane')) stage = 'autre';
                else stage = 'dechargement';
            }

            const location = art.immoLocation || art.immoSiteDechargement || art.immoSiteChargement || '';

            results.push({
                invoiceId: inv.id,
                invoiceNumber: inv.number,
                invoiceDate: inv.date,
                client: clientObj,
                clientId: inv.clientId,
                clientName: clientObj.nom,
                articleIndex: idx,
                article: art,
                stage: stage,
                siteChargement: art.immoSiteChargement || '',
                siteDechargement: art.immoSiteDechargement || '',
                truckCount: parseInt(art.immoTruckCount, 10) || 1,
                matricule: mat,
                driver: art.immoDriver || '',
                period: art.immoPeriod || '',
                location: location,
                reason: art.immoReason || 'Attente déchargement chez client',
                hours: hours,
                rate: rate,
                montantHT: ht,
                montantTTC: ttc,
                paid: inv.paid || inv.paymentStatus === 'encaissee',
                invoice: inv
            });
        });
    });

    return results;
}

function renderImmoKPICards(data) {
    const container = document.getElementById('immoKpiContainer');
    if (!container) return;

    let totalHours = 0;
    let totalHT = 0;
    let totalTTC = 0;
    const distinctTrucks = new Set();
    const distinctClients = new Set();

    data.forEach(item => {
        totalHours += item.hours;
        totalHT += item.montantHT;
        totalTTC += item.montantTTC;
        if (item.matricule) distinctTrucks.add(item.matricule);
        if (item.clientId) distinctClients.add(item.clientId);
    });

    const avgRate = totalHours > 0 ? (totalHT / totalHours) : (settings.defaultImmoRate || 2500);
    const daysBlocked = (totalHours / 24).toFixed(1);

    container.innerHTML = `
        <div class="col-xl-3 col-md-6">
            <div class="card border-0 shadow-sm border-start border-4 h-100" style="border-left-color: #6366f1 !important;">
                <div class="card__body p-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <span class="text-muted small fw-bold text-uppercase">Heures Immobilisées</span>
                            <h3 class="mb-0 mt-1 fw-bold" style="color: #6366f1;">${totalHours.toLocaleString('fr-DZ')} h</h3>
                            <small class="text-muted"><i class="fa fa-clock me-1"></i>~${daysBlocked} jours de blocage flotte</small>
                        </div>
                        <div class="p-3 rounded-circle" style="background-color: var(--immo-light-bg); color: var(--immo-primary);">
                            <i class="fa fa-stopwatch fa-2x"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-xl-3 col-md-6">
            <div class="card border-0 shadow-sm border-start border-4 border-success h-100">
                <div class="card__body p-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <span class="text-muted small fw-bold text-uppercase">C.A. Immobilisation (HT)</span>
                            <h3 class="mb-0 mt-1 fw-bold text-success">${formatCurrency(totalHT)}</h3>
                            <small class="text-muted"><i class="fa fa-calculator me-1"></i>TTC : ${formatCurrency(totalTTC)}</small>
                        </div>
                        <div class="p-3 bg-success-subtle text-success rounded-circle">
                            <i class="fa fa-coins fa-2x"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-xl-3 col-md-6">
            <div class="card border-0 shadow-sm border-start border-4 border-primary h-100">
                <div class="card__body p-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <span class="text-muted small fw-bold text-uppercase">Taux Horaire Moyen</span>
                            <h3 class="mb-0 mt-1 fw-bold text-primary">${formatCurrency(avgRate)} / h</h3>
                            <small class="text-muted"><i class="fa fa-sliders me-1"></i>Tarif base : ${formatCurrency(settings.defaultImmoRate || 2500)} / h</small>
                        </div>
                        <div class="p-3 bg-primary-subtle text-primary rounded-circle">
                            <i class="fa fa-chart-pie fa-2x"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-xl-3 col-md-6">
            <div class="card border-0 shadow-sm border-start border-4 border-info h-100">
                <div class="card__body p-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <span class="text-muted small fw-bold text-uppercase">Impact Flotte</span>
                            <h3 class="mb-0 mt-1 fw-bold text-info">${distinctTrucks.size > 0 ? distinctTrucks.size + ' Camion(s)' : data.length + ' Ligne(s)'}</h3>
                            <small class="text-muted"><i class="fa fa-users me-1"></i>Sur ${distinctClients.size} client(s) facturé(s)</small>
                        </div>
                        <div class="p-3 bg-info-subtle text-info rounded-circle">
                            <i class="fa fa-truck-ramp-box fa-2x"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderImmoAdvisor(data) {
    const card = document.getElementById('immoAdvisorCard');
    const content = document.getElementById('immoAdvisorContent');
    if (!card || !content) return;

    if (!data || data.length === 0) {
        card.style.display = 'block';
        content.innerHTML = `
            <div class="alert alert-info w-100 mb-0 d-flex align-items-center">
                <i class="fa fa-info-circle fa-2x me-3 text-info"></i>
                <div>
                    <h6 class="fw-bold mb-1">Aucune heure d'immobilisation enregistrée</h6>
                    <div class="small text-muted">Vos camions circulent sans temps d'attente facturé sur la sélection courante.</div>
                </div>
            </div>
        `;
        return;
    }

    let totalH = 0;
    const clientMap = {};
    data.forEach(item => {
        totalH += item.hours;
        if (!clientMap[item.clientName]) {
            clientMap[item.clientName] = { hours: 0, ht: 0, count: 0 };
        }
        clientMap[item.clientName].hours += item.hours;
        clientMap[item.clientName].ht += item.montantHT;
        clientMap[item.clientName].count += 1;
    });

    const sortedClients = Object.entries(clientMap).sort((a,b) => b[1].hours - a[1].hours);
    const topClient = sortedClients[0];
    const topName = topClient[0];
    const topStats = topClient[1];
    const pct = totalH > 0 ? ((topStats.hours / totalH) * 100) : 0;
    const avgRateTop = topStats.hours > 0 ? (topStats.ht / topStats.hours) : 0;

    card.style.display = 'block';

    if (pct >= 35 || topStats.hours >= 16) {
        content.innerHTML = `
            <div class="immo-advisor-box immo-advisor-warning w-100">
                <div class="d-flex align-items-start gap-3">
                    <i class="fa-solid fa-triangle-exclamation fa-2x mt-1" style="color: var(--immo-primary);"></i>
                    <div class="flex-grow-1">
                        <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
                            <h6 class="fw-bold mb-0 text-dark">
                                ⚠️ ALERTE RENTABILITÉ FLOTTE : Monopolisation par "${topName}"
                            </h6>
                            <span class="badge-immo px-2 py-1 fs-7">
                                ${topStats.hours}h / ${pct.toFixed(1)}% du temps total
                            </span>
                        </div>
                        <p class="mb-2 text-dark" style="font-size:0.9rem;">
                            Le client <strong>${topName}</strong> accapare à lui seul <strong>${topStats.hours} heures</strong> d'immobilisation 
                            (soit <strong>${pct.toFixed(1)}%</strong> du temps mort total de votre flotte) pour un C.A. facturé de <strong>${formatCurrency(topStats.ht)}</strong> 
                            (taux moyen appliqué : <strong>${formatCurrency(avgRateTop)}/h</strong>).
                        </p>
                        <div class="p-3 bg-white rounded border small shadow-xs">
                            <div class="fw-bold text-dark mb-1"><i class="fa fa-lightbulb text-primary me-1"></i> Recommandations Décisionnelles Stratégiques :</div>
                            <div class="text-muted mb-2">Si vos camions passent trop de temps à l'arrêt chez ce client, ce temps immobilisé vous prive de rotations de transport à forte rentabilité :</div>
                            <ul class="mb-0 ps-3 text-dark">
                                <li><strong>Option 1 - Augmentation du tarif horaire :</strong> Revaloriser le taux d'immobilisation au-delà de 4h d'attente (ex: passer de ${formatCurrency(avgRateTop)} à 3 500 DA/h) pour compenser la perte d'exploitation.</li>
                                <li><strong>Option 2 - Arbitrage et réaffectation :</strong> Réorienter vos véhicules prioritaires vers des clients avec chargement/déchargement fluide (&lt; 2h).</li>
                                <li><strong>Option 3 - Fin de collaboration ciblée :</strong> Si les retards excessifs persistent sans rentabilité satisfaisante, privilégier des missions de transport actif plus profitables.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } else {
        content.innerHTML = `
            <div class="immo-advisor-box immo-advisor-success w-100">
                <div class="d-flex align-items-start gap-3">
                    <i class="fa-solid fa-circle-check fa-2x text-success mt-1"></i>
                    <div class="flex-grow-1">
                        <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-1">
                            <h6 class="fw-bold mb-0 text-success-emphasis">
                                ✅ RENTABILITÉ FLOTTE ÉQUILIBRÉE
                            </h6>
                            <span class="badge bg-success px-2 py-1 fs-7">Rotation Flotte Saine</span>
                        </div>
                        <p class="mb-0 text-dark" style="font-size:0.9rem;">
                            Le temps d'attente est bien réparti entre vos différents partenaires (premier compte : <strong>${topName}</strong> avec ${topStats.hours}h, soit ${pct.toFixed(1)}% du total). Aucun client ne bloque abusivement la rotation productive de vos camions.
                        </p>
                    </div>
                </div>
            </div>
        `;
    }
}

function renderImmoCharts(data) {
    const destroyChart = (key) => {
        if (dashboardCharts[key]) {
            dashboardCharts[key].destroy();
            dashboardCharts[key] = null;
        }
    };

    // 1. Chart Clients (Top Chronophages)
    destroyChart('immoClients');
    const ctxCli = document.getElementById('chartImmoClients');
    const emptyCli = document.getElementById('immoClientsEmptyState');

    if (ctxCli) {
        const clientHoursMap = {};
        data.forEach(item => {
            clientHoursMap[item.clientName] = (clientHoursMap[item.clientName] || 0) + item.hours;
        });

        const sorted = Object.entries(clientHoursMap).sort((a,b) => b[1] - a[1]).slice(0, 8);

        if (sorted.length === 0) {
            ctxCli.classList.add('d-none');
            if (emptyCli) emptyCli.classList.remove('d-none');
        } else {
            ctxCli.classList.remove('d-none');
            if (emptyCli) emptyCli.classList.add('d-none');

            dashboardCharts.immoClients = new Chart(ctxCli, {
                type: 'bar',
                data: {
                    labels: sorted.map(i => i[0]),
                    datasets: [{
                        label: 'Heures d\'immobilisation (h)',
                        data: sorted.map(i => i[1]),
                        backgroundColor: 'rgba(99, 102, 241, 0.85)',
                        borderColor: '#6366f1',
                        borderWidth: 1.5,
                        borderRadius: 6
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (c) => ` ${c.raw} heures d'attente (~${(c.raw/24).toFixed(1)} j)`
                            }
                        }
                    },
                    scales: {
                        x: {
                            title: { display: true, text: 'Heures' },
                            grid: { color: 'rgba(0,0,0,0.05)' }
                        },
                        y: {
                            grid: { display: false }
                        }
                    }
                }
            });
        }
    }

    // 2. Chart Months (Heures vs CA HT)
    destroyChart('immoMonths');
    const ctxMon = document.getElementById('chartImmoMonths');
    const emptyMon = document.getElementById('immoMonthsEmptyState');

    if (ctxMon) {
        const monthHours = Array(12).fill(0);
        const monthHT = Array(12).fill(0);

        data.forEach(item => {
            if (item.invoiceDate) {
                const m = new Date(item.invoiceDate).getMonth();
                if (m >= 0 && m <= 11) {
                    monthHours[m] += item.hours;
                    monthHT[m] += item.montantHT;
                }
            }
        });

        const hasAnyData = monthHours.some(h => h > 0);

        if (!hasAnyData) {
            ctxMon.classList.add('d-none');
            if (emptyMon) emptyMon.classList.remove('d-none');
        } else {
            ctxMon.classList.remove('d-none');
            if (emptyMon) emptyMon.classList.add('d-none');

            dashboardCharts.immoMonths = new Chart(ctxMon, {
                type: 'bar',
                data: {
                    labels: ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc'],
                    datasets: [
                        {
                            type: 'bar',
                            label: 'Heures d\'attente (h)',
                            data: monthHours,
                            backgroundColor: 'rgba(99, 102, 241, 0.7)',
                            borderColor: '#6366f1',
                            borderWidth: 1,
                            borderRadius: 4,
                            yAxisID: 'y'
                        },
                        {
                            type: 'line',
                            label: 'C.A. Facturé HT (DA)',
                            data: monthHT,
                            borderColor: '#10b981',
                            backgroundColor: 'rgba(16, 185, 129, 0.08)',
                            borderWidth: 2.5,
                            tension: 0.3,
                            fill: true,
                            pointRadius: 4,
                            yAxisID: 'y1'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'top' },
                        tooltip: {
                            callbacks: {
                                label: (c) => c.datasetIndex === 0 ? ` Heures: ${c.raw} h` : ` C.A. HT: ${formatCurrency(c.raw)}`
                            }
                        }
                    },
                    scales: {
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            title: { display: true, text: 'Heures' },
                            grid: { color: 'rgba(0,0,0,0.05)' }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            title: { display: true, text: 'C.A. HT (DA)' },
                            grid: { drawOnChartArea: false }
                        }
                    }
                }
            });
        }
    }

    // 3. Chart Stages (Déchargement vs Chargement vs Mixte vs Autre)
    destroyChart('immoStages');
    const ctxStg = document.getElementById('chartImmoStages');
    const emptyStg = document.getElementById('immoStagesEmptyState');

    if (ctxStg) {
        let dechH = 0, chgH = 0, bothH = 0, autreH = 0;
        data.forEach(item => {
            if (item.stage === 'chargement') chgH += item.hours;
            else if (item.stage === 'both') bothH += item.hours;
            else if (item.stage === 'autre') autreH += item.hours;
            else dechH += item.hours;
        });

        const totalStgH = dechH + chgH + bothH + autreH;

        if (totalStgH === 0) {
            ctxStg.classList.add('d-none');
            if (emptyStg) emptyStg.classList.remove('d-none');
        } else {
            ctxStg.classList.remove('d-none');
            if (emptyStg) emptyStg.classList.add('d-none');

            dashboardCharts.immoStages = new Chart(ctxStg, {
                type: 'doughnut',
                data: {
                    labels: ['Déchargement', 'Chargement', 'Mixte (Chg & Déchg)', 'Autre / Transit'],
                    datasets: [{
                        data: [dechH, chgH, bothH, autreH],
                        backgroundColor: ['#6366f1', '#06b6d4', '#8b5cf6', '#94a3b8'],
                        borderWidth: 2,
                        borderColor: '#ffffff',
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '65%',
                    plugins: {
                        legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
                        tooltip: {
                            callbacks: {
                                label: (c) => {
                                    const val = c.raw;
                                    const p = totalStgH > 0 ? ((val / totalStgH) * 100).toFixed(1) : 0;
                                    return ` ${c.label}: ${val} h (${p}%)`;
                                }
                            }
                        }
                    }
                }
            });
        }
    }

    // 4. Chart Reasons (Causes & Motifs d'attente)
    destroyChart('immoReasons');
    const ctxRsn = document.getElementById('chartImmoReasons');
    const emptyRsn = document.getElementById('immoReasonsEmptyState');

    if (ctxRsn) {
        const reasonMap = {};
        data.forEach(item => {
            const r = (item.reason || 'Attente non spécifiée').trim();
            reasonMap[r] = (reasonMap[r] || 0) + item.hours;
        });

        const sortedReasons = Object.entries(reasonMap).sort((a,b) => b[1] - a[1]).slice(0, 6);

        if (sortedReasons.length === 0) {
            ctxRsn.classList.add('d-none');
            if (emptyRsn) emptyRsn.classList.remove('d-none');
        } else {
            ctxRsn.classList.remove('d-none');
            if (emptyRsn) emptyRsn.classList.add('d-none');

            dashboardCharts.immoReasons = new Chart(ctxRsn, {
                type: 'bar',
                data: {
                    labels: sortedReasons.map(r => r[0].length > 25 ? r[0].substring(0, 22) + '...' : r[0]),
                    datasets: [{
                        label: 'Heures d\'attente',
                        data: sortedReasons.map(r => r[1]),
                        backgroundColor: 'rgba(2, 132, 199, 0.75)',
                        borderColor: '#0284c7',
                        borderWidth: 1.5,
                        borderRadius: 6
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                title: (c) => sortedReasons[c[0].dataIndex][0],
                                label: (c) => ` ${c.raw} heures immobilisées`
                            }
                        }
                    },
                    scales: {
                        x: { grid: { color: 'rgba(0,0,0,0.05)' } },
                        y: { grid: { display: false } }
                    }
                }
            });
        }
    }

    // 5. Chart Rates (Taux Moyen Facturé par Client DA / h)
    destroyChart('immoRates');
    const ctxRat = document.getElementById('chartImmoRates');
    const emptyRat = document.getElementById('immoRatesEmptyState');

    if (ctxRat) {
        const clientRateAgg = {};
        data.forEach(item => {
            if (!clientRateAgg[item.clientName]) {
                clientRateAgg[item.clientName] = { hours: 0, ht: 0 };
            }
            clientRateAgg[item.clientName].hours += item.hours;
            clientRateAgg[item.clientName].ht += item.montantHT;
        });

        const rateList = Object.entries(clientRateAgg)
            .filter(([_, stats]) => stats.hours > 0)
            .map(([name, stats]) => ({ name, rate: Math.round(stats.ht / stats.hours) }))
            .sort((a,b) => b.rate - a.rate)
            .slice(0, 8);

        if (rateList.length === 0) {
            ctxRat.classList.add('d-none');
            if (emptyRat) emptyRat.classList.remove('d-none');
        } else {
            ctxRat.classList.remove('d-none');
            if (emptyRat) emptyRat.classList.add('d-none');

            dashboardCharts.immoRates = new Chart(ctxRat, {
                type: 'bar',
                data: {
                    labels: rateList.map(r => r.name),
                    datasets: [{
                        label: 'Taux moyen appliqué (DA/h)',
                        data: rateList.map(r => r.rate),
                        backgroundColor: 'rgba(16, 185, 129, 0.75)',
                        borderColor: '#10b981',
                        borderWidth: 1.5,
                        borderRadius: 6
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (c) => ` Taux facturé: ${formatCurrency(c.raw)} / heure`
                            }
                        }
                    },
                    scales: {
                        x: {
                            title: { display: true, text: 'DA / Heure' },
                            grid: { color: 'rgba(0,0,0,0.05)' }
                        },
                        y: { grid: { display: false } }
                    }
                }
            });
        }
    }

    // 6. Chart Trucks (Heures Perdues par Camion / Tracteur)
    destroyChart('immoTrucks');
    const ctxTrk = document.getElementById('chartImmoTrucks');
    const emptyTrk = document.getElementById('immoTrucksEmptyState');

    if (ctxTrk) {
        const truckMap = {};
        data.forEach(item => {
            const m = (item.matricule || '').trim();
            if (m) {
                const parts = m.split(',').map(p => p.trim()).filter(Boolean);
                const share = parts.length > 0 ? (item.hours / parts.length) : item.hours;
                parts.forEach(p => {
                    truckMap[p] = (truckMap[p] || 0) + share;
                });
            }
        });

        const sortedTrucks = Object.entries(truckMap).sort((a,b) => b[1] - a[1]).slice(0, 10);

        if (sortedTrucks.length === 0) {
            ctxTrk.classList.add('d-none');
            if (emptyTrk) emptyTrk.classList.remove('d-none');
        } else {
            ctxTrk.classList.remove('d-none');
            if (emptyTrk) emptyTrk.classList.add('d-none');

            dashboardCharts.immoTrucks = new Chart(ctxTrk, {
                type: 'bar',
                data: {
                    labels: sortedTrucks.map(t => t[0]),
                    datasets: [{
                        label: 'Heures perdues (h)',
                        data: sortedTrucks.map(t => Math.round(t[1] * 10) / 10),
                        backgroundColor: 'rgba(71, 85, 105, 0.75)',
                        borderColor: '#475569',
                        borderWidth: 1.5,
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (c) => ` ${c.raw} heures d'arrêt (${(c.raw/24).toFixed(1)} j)`
                            }
                        }
                    },
                    scales: {
                        y: {
                            title: { display: true, text: 'Heures' },
                            grid: { color: 'rgba(0,0,0,0.05)' }
                        },
                        x: { grid: { display: false } }
                    }
                }
            });
        }
    }
}

let currentImmoDataCache = [];

window.renderImmoTable = function(data) {
    if (data) currentImmoDataCache = data;
    const list = currentImmoDataCache || [];
    const tbody = document.getElementById('tableImmoBody');
    const tfoot = document.getElementById('tableImmoFoot');
    if (!tbody) return;

    const searchVal = (document.getElementById('immoTableSearch')?.value || '').trim().toLowerCase();
    
    let displayList = list;
    if (searchVal) {
        displayList = list.filter(item => {
            return (item.invoiceNumber || '').toLowerCase().includes(searchVal) ||
                   (item.clientName || '').toLowerCase().includes(searchVal) ||
                   (item.matricule || '').toLowerCase().includes(searchVal) ||
                   (item.driver || '').toLowerCase().includes(searchVal) ||
                   (item.location || '').toLowerCase().includes(searchVal) ||
                   (item.siteChargement || '').toLowerCase().includes(searchVal) ||
                   (item.siteDechargement || '').toLowerCase().includes(searchVal) ||
                   (item.reason || '').toLowerCase().includes(searchVal);
        });
    }

    if (displayList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="12" class="text-center text-muted py-4"><i class="fa fa-info-circle me-1"></i>Aucune facture d'immobilisation trouvée sur cette sélection.</td></tr>`;
        if (tfoot) tfoot.innerHTML = '';
        return;
    }

    let tHours = 0, tHT = 0, tTTC = 0;

    tbody.innerHTML = displayList.map(item => {
        tHours += item.hours;
        tHT += item.montantHT;
        tTTC += item.montantTTC;

        const badgeHtml = item.paid ? 
            '<span class="badge bg-success rounded-pill"><i class="fa fa-check me-1"></i>Payée</span>' :
            '<span class="badge rounded-pill" style="background:#fef3c7; color:#92400e;">En attente</span>';

        let stageBadge = '';
        if (item.stage === 'chargement') {
            stageBadge = '<span class="badge" style="background:#e0f2fe; color:#0369a1;"><i class="fa fa-warehouse me-1"></i>Chargement</span>';
        } else if (item.stage === 'both') {
            stageBadge = '<span class="badge" style="background:#f3e8ff; color:#7e22ce;"><i class="fa fa-rotate me-1"></i>Mixte</span>';
        } else if (item.stage === 'autre') {
            stageBadge = '<span class="badge bg-secondary-subtle text-secondary"><i class="fa fa-ellipsis me-1"></i>Autre</span>';
        } else {
            stageBadge = '<span class="badge" style="background:#eef2ff; color:#4338ca;"><i class="fa fa-boxes-packing me-1"></i>Déchargement</span>';
        }

        let siteInfo = '';
        if (item.stage === 'both') {
            if (item.siteChargement) siteInfo += `<div class="small text-muted">Chg: ${item.siteChargement}</div>`;
            if (item.siteDechargement) siteInfo += `<div class="small text-muted">Déch: ${item.siteDechargement}</div>`;
        } else if (item.location) {
            siteInfo = `<div class="small text-muted">${item.location}</div>`;
        }

        let truckInfo = '';
        if (item.matricule) {
            truckInfo += `<span class="badge bg-dark text-white font-monospace">${item.matricule}</span>`;
        }
        if (item.truckCount > 1) {
            truckInfo += `<span class="badge bg-secondary ms-1">${item.truckCount} camions</span>`;
        }
        if (!item.matricule && item.truckCount <= 1) {
            truckInfo = `<span class="text-muted small">Non spécifié</span>`;
        }
        if (item.driver) {
            truckInfo += `<div class="small text-muted">${item.driver}</div>`;
        }

        return `
            <tr class="text-center">
                <td class="text-nowrap small">${item.invoiceDate ? formatDate(item.invoiceDate) : '—'}</td>
                <td class="fw-bold text-primary text-nowrap">
                    <a href="javascript:void(0)" onclick="viewInvoiceFromReport(${item.invoiceId})" class="text-decoration-none fw-bold">
                        ${item.invoiceNumber || '—'}
                    </a>
                </td>
                <td class="text-start fw-semibold text-truncate" style="max-width: 170px;" title="${item.clientName}">
                    ${item.clientName}
                </td>
                <td class="text-start" style="max-width: 160px;">
                    ${stageBadge}
                    ${siteInfo}
                </td>
                <td style="max-width: 160px;">
                    ${truckInfo}
                </td>
                <td class="small text-truncate" style="max-width: 180px;" title="${item.reason}">
                    ${item.reason}
                </td>
                <td style="background-color: var(--immo-light-bg); color: var(--immo-text); font-weight: 800; font-size: 0.95rem;">
                    ${item.hours} h
                </td>
                <td class="text-end small">${formatCurrency(item.rate)}</td>
                <td class="text-end fw-bold">${formatCurrency(item.montantHT)}</td>
                <td class="text-end fw-semibold text-muted small">${formatCurrency(item.montantTTC)}</td>
                <td>${badgeHtml}</td>
                <td class="text-nowrap">
                    <button class="btn btn-sm btn-outline-primary py-0 px-2" onclick="viewInvoiceFromReport(${item.invoiceId})" title="Voir la facture">
                        <i class="fa fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-secondary py-0 px-2 ms-1" onclick="editInvoice(${item.invoiceId})" title="Modifier">
                        <i class="fa fa-pencil-alt"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    if (tfoot) {
        tfoot.innerHTML = `
            <tr class="table-dark fw-bold text-center">
                <td colspan="6" class="text-end text-uppercase">TOTAL GÉNÉRAL :</td>
                <td style="background-color: #4f46e5; color: #ffffff; font-size: 1rem;">${tHours.toLocaleString('fr-DZ')} h</td>
                <td>—</td>
                <td class="text-end text-white fs-6">${formatCurrency(tHT)}</td>
                <td class="text-end fs-6" style="color: #cbd5e1;">${formatCurrency(tTTC)}</td>
                <td colspan="2"></td>
            </tr>
        `;
    }
};

function updateSidebarImmoBadge() {
    const badge = document.getElementById('sidebarImmoBadge');
    if (!badge) return;
    let totalH = 0;
    invoices.forEach(inv => {
        if (inv.articles) {
            inv.articles.forEach(art => {
                if (isImmobilisationArticle(art)) {
                    totalH += parseFloat(art.qte) || 0;
                }
            });
        }
    });
    if (totalH > 0) {
        badge.textContent = `${totalH}h`;
        badge.classList.remove('d-none');
    } else {
        badge.classList.add('d-none');
    }
}

window.updateImmobilisationView = function() {
    try {
        populateImmoClientFilter();
        const data = getFilteredImmoData();
        renderImmoKPICards(data);
        renderImmoAdvisor(data);
        renderImmoCharts(data);
        renderImmoTable(data);
        updateSidebarImmoBadge();
    } catch (err) {
        console.error('Error updating immobilisation view:', err);
    }
};

window.exportImmobilisationToExcel = function() {
    try {
        const data = getFilteredImmoData();
        if (data.length === 0) {
            alert("Aucune donnée d'immobilisation à exporter avec les filtres sélectionnés.");
            return;
        }

        const wb = XLSX.utils.book_new();

        // Colors
        const colorHdr = '003366';
        const colorSubHdr = '1a5276';
        const colorEven = settings.excelColorEven?.replace('#','') || 'dbe9ff';
        const colorOdd = settings.excelColorOdd?.replace('#','') || 'ffffff';
        const colorTotal = '2D3748';

        // ════ SHEET 1: DETAIL IMMOBILISATION ════
        const wsDetail = {};
        const headers = [
            'DATE', 'N° FACTURE', 'CLIENT', 'ÉTAPE', 'LIEU / SITE', 
            'CAMION(S) / FLOTTE', 'CHAUFFEUR / RÉF', 'PÉRIODE', 
            'MOTIF D\'ATTENTE', 'HEURES (H)', 'TAUX HORAIRE (DA)', 
            'MONTANT HT (DA)', 'MONTANT TTC (DA)', 'STATUT'
        ];

        headers.forEach((h, ci) => {
            wsDetail[XLSX.utils.encode_cell({ r: 0, c: ci })] = {
                v: h, t: 's',
                s: {
                    fill: { fgColor: { rgb: colorHdr } },
                    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10, name: 'Calibri' },
                    alignment: { horizontal: 'center', vertical: 'center', wrapText: true }
                }
            };
        });

        let tHours = 0, tHT = 0, tTTC = 0;
        data.forEach((item, idx) => {
            const r = idx + 1;
            const bg = idx % 2 === 0 ? colorEven : colorOdd;
            const rowStyle = (align = 'center', bold = false, numFmt = undefined) => ({
                fill: { fgColor: { rgb: bg } },
                font: { sz: 10, name: 'Calibri', bold },
                alignment: { horizontal: align, vertical: 'center' },
                border: { top: {style:'thin',color:{rgb:'D0D0D0'}}, bottom: {style:'thin',color:{rgb:'D0D0D0'}} },
                numFmt
            });

            let stageLabel = 'Au Déchargement';
            if (item.stage === 'chargement') stageLabel = 'Au Chargement';
            else if (item.stage === 'both') stageLabel = 'Mixte (Chg & Déchg)';
            else if (item.stage === 'autre') stageLabel = 'Autre / Transit';

            let truckLabel = item.matricule || '—';
            if (item.truckCount > 1) {
                truckLabel = item.matricule ? `${item.matricule} (${item.truckCount} camions)` : `${item.truckCount} camions`;
            }

            const cells = [
                { v: item.invoiceDate ? formatDate(item.invoiceDate) : '', s: rowStyle('center') },
                { v: item.invoiceNumber || '', s: rowStyle('center', true) },
                { v: item.clientName || '', s: rowStyle('left') },
                { v: stageLabel, s: rowStyle('center') },
                { v: item.location || '—', s: rowStyle('left') },
                { v: truckLabel, s: rowStyle('center', true) },
                { v: item.driver || '—', s: rowStyle('left') },
                { v: item.period || '—', s: rowStyle('center') },
                { v: item.reason || '', s: rowStyle('left') },
                { v: item.hours, t: 'n', s: rowStyle('center', true, '#,##0.0') },
                { v: item.rate, t: 'n', s: rowStyle('right', false, '#,##0.00 "DA"') },
                { v: item.montantHT, t: 'n', s: rowStyle('right', true, '#,##0.00 "DA"') },
                { v: item.montantTTC, t: 'n', s: rowStyle('right', false, '#,##0.00 "DA"') },
                { v: item.paid ? 'PAYÉE' : 'EN ATTENTE', s: rowStyle('center', true) }
            ];

            cells.forEach((c, ci) => {
                wsDetail[XLSX.utils.encode_cell({ r, c: ci })] = c;
            });

            tHours += item.hours;
            tHT += item.montantHT;
            tTTC += item.montantTTC;
        });

        // Totals Row
        const totR = data.length + 1;
        const totStyle = (align = 'center', numFmt = undefined) => ({
            fill: { fgColor: { rgb: colorTotal } },
            font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10, name: 'Calibri' },
            alignment: { horizontal: align, vertical: 'center' },
            border: { top: {style:'medium',color:{rgb:'000000'}}, bottom: {style:'medium',color:{rgb:'000000'}} },
            numFmt
        });

        const totCells = [
            { v: 'TOTAL GÉNÉRAL', s: totStyle('center') },
            { v: '', s: totStyle('center') },
            { v: '', s: totStyle('center') },
            { v: '', s: totStyle('center') },
            { v: '', s: totStyle('center') },
            { v: '', s: totStyle('center') },
            { v: '', s: totStyle('center') },
            { v: '', s: totStyle('center') },
            { v: '', s: totStyle('center') },
            { v: tHours, t: 'n', s: totStyle('center', '#,##0.0 "h"') },
            { v: '', s: totStyle('center') },
            { v: tHT, t: 'n', s: totStyle('right', '#,##0.00 "DA"') },
            { v: tTTC, t: 'n', s: totStyle('right', '#,##0.00 "DA"') },
            { v: '', s: totStyle('center') }
        ];
        totCells.forEach((c, ci) => {
            wsDetail[XLSX.utils.encode_cell({ r: totR, c: ci })] = c;
        });

        wsDetail['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: totR, c: headers.length - 1 } });
        wsDetail['!cols'] = [
            { wch: 12 }, { wch: 14 }, { wch: 28 }, { wch: 18 }, { wch: 20 },
            { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 30 }, { wch: 12 }, 
            { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 14 }
        ];
        wsDetail['!rows'] = [{ hpt: 26 }, ...Array(data.length + 1).fill({ hpt: 20 })];

        XLSX.utils.book_append_sheet(wb, wsDetail, 'Detail_Immobilisation');

        // ════ SHEET 2: SYNTHÈSE RENTABILITÉ PAR CLIENT ════
        const wsClients = {};
        const clientHeaders = ['CLIENT', 'HEURES D\'ATTENTE (H)', '% TEMPS TOTAL', 'C.A. FACTURÉ HT (DA)', 'TAUX MOYEN / H', 'NOMBRE DE FACTURES'];
        clientHeaders.forEach((h, ci) => {
            wsClients[XLSX.utils.encode_cell({ r: 0, c: ci })] = {
                v: h, t: 's',
                s: {
                    fill: { fgColor: { rgb: colorSubHdr } },
                    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10, name: 'Calibri' },
                    alignment: { horizontal: 'center', vertical: 'center' }
                }
            };
        });

        const clientAgg = {};
        data.forEach(item => {
            if (!clientAgg[item.clientName]) {
                clientAgg[item.clientName] = { hours: 0, ht: 0, count: 0 };
            }
            clientAgg[item.clientName].hours += item.hours;
            clientAgg[item.clientName].ht += item.montantHT;
            clientAgg[item.clientName].count += 1;
        });

        const sortedCliList = Object.entries(clientAgg).sort((a,b) => b[1].hours - a[1].hours);
        sortedCliList.forEach(([cName, stats], idx) => {
            const r = idx + 1;
            const bg = idx % 2 === 0 ? colorEven : colorOdd;
            const rowStyle = (align = 'center', bold = false, numFmt = undefined) => ({
                fill: { fgColor: { rgb: bg } },
                font: { sz: 10, name: 'Calibri', bold },
                alignment: { horizontal: align, vertical: 'center' },
                border: { top: {style:'thin',color:{rgb:'D0D0D0'}}, bottom: {style:'thin',color:{rgb:'D0D0D0'}} },
                numFmt
            });

            const pct = tHours > 0 ? (stats.hours / tHours) * 100 : 0;
            const avgR = stats.hours > 0 ? (stats.ht / stats.hours) : 0;

            const cells = [
                { v: cName, s: rowStyle('left', true) },
                { v: stats.hours, t: 'n', s: rowStyle('center', true, '#,##0.0 "h"') },
                { v: (pct / 100), t: 'n', s: rowStyle('center', false, '0.0%') },
                { v: stats.ht, t: 'n', s: rowStyle('right', true, '#,##0.00 "DA"') },
                { v: avgR, t: 'n', s: rowStyle('right', false, '#,##0.00 "DA"') },
                { v: stats.count, t: 'n', s: rowStyle('center', false, '#,##0') }
            ];
            cells.forEach((c, ci) => {
                wsClients[XLSX.utils.encode_cell({ r, c: ci })] = c;
            });
        });

        wsClients['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: sortedCliList.length, c: clientHeaders.length - 1 } });
        wsClients['!cols'] = [{ wch: 30 }, { wch: 22 }, { wch: 16 }, { wch: 22 }, { wch: 18 }, { wch: 20 }];
        wsClients['!rows'] = [{ hpt: 26 }, ...Array(sortedCliList.length).fill({ hpt: 20 })];

        XLSX.utils.book_append_sheet(wb, wsClients, 'Rentabilite_Par_Client');

        const yr = document.getElementById('immoFilterYear')?.value || '2026';
        const fileName = `Rapport_Immobilisation_Flotte_${yr}_${new Date().toISOString().slice(0,10)}.xlsx`;
        XLSX.writeFile(wb, fileName, { cellStyles: true });

    } catch (err) {
        console.error('Erreur export immobilisation:', err);
        alert('Erreur lors de l\'export Excel : ' + err.message);
    }
};
// ════════════════════════════════════════════════════════════════
// 🏗️ MODULE LOCATION & RENTAL
// ════════════════════════════════════════════════════════════════

window.addLocationArticle = function() {
    try {
        if (!currentInvoice.articles) currentInvoice.articles = [];
        const newNo = currentInvoice.articles.length + 1;
        const rate = settings.defaultLocationRate || 150000;
        const defaultEquip = (settings.locationEquipmentTypes || 'Grue 25T').split(',')[0].trim();
        currentInvoice.articles.push({
            no: newNo, isLocation: true, isImmobilisation: false, pricingType: 'Location',
            locEquipment: defaultEquip, locTonnage: '', locPeriodStart: '', locPeriodEnd: '',
            locSite: '', locDriver: '', designation: '', qte: 1,
            prixUHT: rate, montantHT: rate, wilayaDepart: '', wilayaDestination: '', selectedDestination: ''
        });
        updateLocationDesignation(currentInvoice.articles.length - 1);
        renderArticles();
        const badge = document.getElementById('articleCountBadge');
        if (badge) badge.textContent = `${currentInvoice.articles.length} ligne${currentInvoice.articles.length > 1 ? 's' : ''}`;
        updateInvoicePreview();
    } catch (e) { console.error('Error adding location article:', e); }
};

window.updateLocationDesignation = function(index) {
    if (!currentInvoice.articles || !currentInvoice.articles[index]) return;
    const art = currentInvoice.articles[index];
    const equip = art.locEquipment || 'Engin';
    let des = `<b>Location de ${equip}</b><br>`;
    if (art.locSite && art.locSite.trim()) des += `-Site / Chantier : <b>${art.locSite.trim()}</b><br>`;
    if (art.locPeriodStart || art.locPeriodEnd) {
        const from = art.locPeriodStart ? new Date(art.locPeriodStart).toLocaleDateString('fr-FR') : '...';
        const to = art.locPeriodEnd ? new Date(art.locPeriodEnd).toLocaleDateString('fr-FR') : '...';
        des += `-Période : Du ${from} au ${to}<br>`;
    }
    if (art.locDriver && art.locDriver.trim()) des += `-Opérateur / Réf : ${art.locDriver.trim()}<br>`;
    const qty = parseFloat(art.qte) || 0;
    if (qty > 0) des += `-Durée : <b>${qty} Jour${qty > 1 ? 's' : ''}</b>`;
    art.designation = des;
    const textarea = document.querySelector(`textarea[data-field="designation"][data-index="${index}"]`);
    if (textarea) textarea.value = des;
};

function isLocationArticle(art) {
    if (!art) return false;
    if (art.isLocation === true) return true;
    if (art.pricingType && typeof art.pricingType === 'string' && art.pricingType.toLowerCase() === 'location') return true;
    return false;
}
function isLocationInvoice(inv) {
    if (!inv) return false;
    if (inv.invoiceType === 'location') return true;
    return inv.articles && inv.articles.some(a => isLocationArticle(a));
}

window.convertProformaToFacture = function(invoiceId) {
    const inv = invoices.find(i => i.id === invoiceId);
    if (!inv || inv.documentType !== 'proforma') return;
    if (!confirm('Convertir cette proforma en facture définitive ?')) return;
    
    // Create a new facture from the proforma
    const year = new Date().getFullYear();
    const newFacture = JSON.parse(JSON.stringify(inv));
    newFacture.id = Date.now();
    newFacture.documentType = 'facture';
    newFacture.number = `${String(invoiceCounter).padStart(3, '0')}/${year}`;
    newFacture.convertedFromProforma = invoiceId;
    newFacture.createdAt = new Date().toISOString();
    invoiceCounter++;
    invoices.push(newFacture);
    
    saveDataToLocalStorage();
    renderInvoices();
    if (typeof renderProformasView === 'function') renderProformasView();
    updateDashboard();
    alert('\u2705 Facture N° ' + newFacture.number + ' créée à partir de la Proforma ' + inv.number);
};

// --- Location Analytics ---
function populateLocClientFilter() {
    const sel = document.getElementById('locFilterClient');
    if (!sel) return;
    const cv = sel.value || 'all';
    let html = '<option value="all">\ud83d\udc51 Tous les clients</option>';
    clients.forEach(c => { html += `<option value="${c.id}" ${String(c.id) === String(cv) ? 'selected' : ''}>${c.nom}</option>`; });
    sel.innerHTML = html;
}
function populateLocEquipmentFilter() {
    const sel = document.getElementById('locFilterEquipment');
    if (!sel) return;
    const types = new Set();
    invoices.forEach(inv => { if (inv.articles) inv.articles.forEach(a => { if (isLocationArticle(a) && a.locEquipment) types.add(a.locEquipment); }); });
    let html = '<option value="all">Tous les types</option>';
    types.forEach(t => { html += `<option value="${t}">${t}</option>`; });
    sel.innerHTML = html;
}

function getFilteredLocData() {
    const clientId = document.getElementById('locFilterClient')?.value || 'all';
    const year = document.getElementById('locFilterYear')?.value || '';
    const equip = document.getElementById('locFilterEquipment')?.value || 'all';
    const period = document.getElementById('locFilterPeriod')?.value || 'all';
    const dateFrom = document.getElementById('locDateFrom')?.value;
    const dateTo = document.getElementById('locDateTo')?.value;
    let items = [];
    invoices.forEach(inv => {
        if (!inv.articles || !inv.date) return;
        if (inv.documentType === 'proforma') return;
        const d = new Date(inv.date);
        if (year && d.getFullYear() !== parseInt(year)) return;
        if (clientId !== 'all' && String(inv.clientId) !== String(clientId)) return;
        // Period filter
        const m = d.getMonth();
        if (period !== 'all' && period !== 'custom') {
            if (period === 'S1' && m > 5) return;
            if (period === 'S2' && m < 6) return;
            if (period === 'Q1' && (m < 0 || m > 2)) return;
            if (period === 'Q2' && (m < 3 || m > 5)) return;
            if (period === 'Q3' && (m < 6 || m > 8)) return;
            if (period === 'Q4' && (m < 9 || m > 11)) return;
            if (/^\d+$/.test(period) && m !== parseInt(period)) return;
        }
        if (period === 'custom') {
            if (dateFrom && inv.date < dateFrom) return;
            if (dateTo && inv.date > dateTo) return;
        }
        inv.articles.forEach(art => {
            if (!isLocationArticle(art)) return;
            if (equip !== 'all' && art.locEquipment !== equip) return;
            const client = clients.find(c => c.id === inv.clientId);
            items.push({
                invoiceId: inv.id, date: inv.date, number: inv.number,
                clientName: client ? client.nom : 'Inconnu', clientId: inv.clientId,
                equipment: art.locEquipment || 'N/A', site: art.locSite || '',
                periodStart: art.locPeriodStart || '', periodEnd: art.locPeriodEnd || '',
                days: parseFloat(art.qte) || 0, rate: parseFloat(art.prixUHT) || 0,
                montantHT: parseFloat(art.montantHT) || 0,
                montantTTC: (parseFloat(art.montantHT) || 0) * 1.19,
                paid: !!inv.paid, documentType: inv.documentType || 'facture'
            });
        });
    });
    return items;
}

function updateLocationView() {
    const data = getFilteredLocData();
    renderLocKPICards(data);
    renderLocCharts(data);
    renderLocTable();
    updateSidebarLocationBadge();
}

function renderLocKPICards(data) {
    const c = document.getElementById('locKpiContainer');
    if (!c) return;
    const totalHT = data.reduce((s, i) => s + i.montantHT, 0);
    const totalTTC = data.reduce((s, i) => s + i.montantTTC, 0);
    const totalDays = data.reduce((s, i) => s + i.days, 0);
    const nbFactures = new Set(data.map(i => i.invoiceId)).size;
    const unpaid = data.filter(i => !i.paid).reduce((s, i) => s + i.montantTTC, 0);
    const equipTypes = new Set(data.map(i => i.equipment)).size;
    const avgRate = data.length ? (totalHT / totalDays) : 0;
    const kpis = [
        { icon: 'fa-money-bill-trend-up', color: '#f59e0b', label: 'CA Location HT', value: formatCurrency(totalHT) },
        { icon: 'fa-file-invoice', color: '#3b82f6', label: 'Factures', value: nbFactures },
        { icon: 'fa-calendar-days', color: '#10b981', label: 'Jours Total', value: totalDays.toFixed(1) },
        { icon: 'fa-cogs', color: '#8b5cf6', label: 'Types Équipement', value: equipTypes },
        { icon: 'fa-coins', color: '#ec4899', label: 'Taux Moyen / Jour', value: formatCurrency(avgRate) },
        { icon: 'fa-triangle-exclamation', color: '#ef4444', label: 'Créance Location', value: formatCurrency(unpaid) },
    ];
    c.innerHTML = kpis.map(k => `
        <div class="col-lg-2 col-md-4 col-6">
            <div class="card border-0 shadow-sm h-100" style="border-left:4px solid ${k.color} !important;">
                <div class="card__body p-3 text-center">
                    <i class="fa-solid ${k.icon} fs-4 mb-2" style="color:${k.color};"></i>
                    <div class="fw-bold fs-5">${k.value}</div>
                    <div class="text-muted small">${k.label}</div>
                </div>
            </div>
        </div>
    `).join('');
}

function renderLocCharts(data) {
    const colors = ['#f59e0b','#3b82f6','#10b981','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16'];
    const months = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc'];
    // 1. CA by client
    const byClient = {};
    data.forEach(i => { byClient[i.clientName] = (byClient[i.clientName] || 0) + i.montantHT; });
    const sortedClients = Object.entries(byClient).sort((a,b) => b[1]-a[1]);
    if (dashboardCharts.locClients) dashboardCharts.locClients.destroy();
    const ctx1 = document.getElementById('chartLocClients');
    if (ctx1) dashboardCharts.locClients = new Chart(ctx1, { type:'bar', data:{ labels:sortedClients.map(c=>c[0]), datasets:[{ label:'CA HT', data:sortedClients.map(c=>c[1]), backgroundColor:colors, borderRadius:6 }] }, options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false}, datalabels:{ anchor:'end', align:'right', formatter:v=>formatCurrency(v), font:{size:10} } } } });
    // 2. CA by month
    const byMonth = Array(12).fill(0);
    data.forEach(i => { const m = new Date(i.date).getMonth(); byMonth[m] += i.montantHT; });
    if (dashboardCharts.locMonths) dashboardCharts.locMonths.destroy();
    const ctx2 = document.getElementById('chartLocMonths');
    if (ctx2) dashboardCharts.locMonths = new Chart(ctx2, { type:'bar', data:{ labels:months, datasets:[{ label:'CA HT Location', data:byMonth, backgroundColor:'#f59e0b', borderRadius:6 }] }, options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false}, datalabels:{ anchor:'end', align:'top', formatter:v=>v>0?formatCurrency(v):'', font:{size:10} } } } });
    // 3. By equipment type
    const byEquip = {};
    data.forEach(i => { byEquip[i.equipment] = (byEquip[i.equipment] || 0) + i.montantHT; });
    const eqEntries = Object.entries(byEquip);
    if (dashboardCharts.locEquipment) dashboardCharts.locEquipment.destroy();
    const ctx3 = document.getElementById('chartLocEquipment');
    if (ctx3) dashboardCharts.locEquipment = new Chart(ctx3, { type:'doughnut', data:{ labels:eqEntries.map(e=>e[0]), datasets:[{ data:eqEntries.map(e=>e[1]), backgroundColor:colors }] }, options:{ responsive:true, maintainAspectRatio:false, plugins:{ datalabels:{ formatter:(v,c)=>{ const t=c.dataset.data.reduce((a,b)=>a+b,0); return t?((v/t)*100).toFixed(0)+'%':''; }, color:'#fff', font:{weight:'bold'} } } } });
    // 4. Duration by client
    const durByClient = {};
    data.forEach(i => { durByClient[i.clientName] = (durByClient[i.clientName] || 0) + i.days; });
    const durSorted = Object.entries(durByClient).sort((a,b) => b[1]-a[1]);
    if (dashboardCharts.locDurations) dashboardCharts.locDurations.destroy();
    const ctx4 = document.getElementById('chartLocDurations');
    if (ctx4) dashboardCharts.locDurations = new Chart(ctx4, { type:'bar', data:{ labels:durSorted.map(c=>c[0]), datasets:[{ label:'Jours', data:durSorted.map(c=>c[1]), backgroundColor:'#10b981', borderRadius:6 }] }, options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false}, datalabels:{ anchor:'end', align:'right', formatter:v=>v.toFixed(1)+'j', font:{size:10} } } } });
    // 5. Avg rate by equipment
    const rateByEquip = {}; const daysByEquip = {};
    data.forEach(i => { rateByEquip[i.equipment] = (rateByEquip[i.equipment] || 0) + i.montantHT; daysByEquip[i.equipment] = (daysByEquip[i.equipment] || 0) + i.days; });
    const rateEntries = Object.keys(rateByEquip).map(k => ({ name:k, avg: daysByEquip[k] ? rateByEquip[k]/daysByEquip[k] : 0 }));
    if (dashboardCharts.locRates) dashboardCharts.locRates.destroy();
    const ctx5 = document.getElementById('chartLocRates');
    if (ctx5) dashboardCharts.locRates = new Chart(ctx5, { type:'bar', data:{ labels:rateEntries.map(r=>r.name), datasets:[{ label:'DA/Jour', data:rateEntries.map(r=>r.avg), backgroundColor:'#8b5cf6', borderRadius:6 }] }, options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false}, datalabels:{ anchor:'end', align:'top', formatter:v=>formatCurrency(v), font:{size:10} } } } });
}

function renderLocTable() {
    const data = getFilteredLocData();
    const search = (document.getElementById('locTableSearch')?.value || '').toLowerCase();
    const filtered = search ? data.filter(i => (i.clientName+i.number+i.equipment+i.site).toLowerCase().includes(search)) : data;
    const tbody = document.getElementById('tableLocBody');
    const tfoot = document.getElementById('tableLocFoot');
    if (!tbody) return;
    if (!filtered.length) { tbody.innerHTML = '<tr><td colspan="12" class="text-center text-muted py-4">Aucune donnée de location trouvée.</td></tr>'; if(tfoot) tfoot.innerHTML=''; return; }
    let totalHT = 0, totalTTC = 0, totalDays = 0;
    tbody.innerHTML = filtered.map(i => {
        totalHT += i.montantHT; totalTTC += i.montantTTC; totalDays += i.days;
        const statusBadge = i.paid ? '<span class="badge bg-success">Payée</span>' : '<span class="badge bg-danger">Impayée</span>';
        const docBadge = i.documentType === 'proforma' ? '<span class="badge bg-warning text-dark">PRO</span>' : '<span class="badge bg-primary">FAC</span>';
        const period = (i.periodStart && i.periodEnd) ? `${new Date(i.periodStart).toLocaleDateString('fr-FR')} - ${new Date(i.periodEnd).toLocaleDateString('fr-FR')}` : '-';
        return `<tr class="text-center small">
            <td>${new Date(i.date).toLocaleDateString('fr-FR')}</td>
            <td class="fw-bold">${i.number || '-'}</td>
            <td style="text-align:left;" class="fw-semibold">${i.clientName}</td>
            <td>${docBadge}</td>
            <td><span class="badge" style="background:#fef3c7;color:#92400e;">${i.equipment}</span></td>
            <td class="small">${period}</td>
            <td class="fw-bold" style="background:#fef3c7;color:#92400e;">${i.days.toFixed(1)}j</td>
            <td>${formatCurrency(i.rate)}</td>
            <td class="fw-bold">${formatCurrency(i.montantHT)}</td>
            <td class="fw-bold">${formatCurrency(i.montantTTC)}</td>
            <td>${statusBadge}</td>
            <td><button class="btn btn-outline-primary btn-sm" onclick="viewInvoiceFromReport(${i.invoiceId})"><i class="fa fa-eye"></i></button></td>
        </tr>`;
    }).join('');
    if (tfoot) tfoot.innerHTML = `<tr class="fw-bold text-center bg-light"><td colspan="6">TOTAUX</td><td style="background:#fef3c7;color:#92400e;">${totalDays.toFixed(1)}j</td><td></td><td>${formatCurrency(totalHT)}</td><td>${formatCurrency(totalTTC)}</td><td colspan="2"></td></tr>`;
}

function onLocPeriodChange() {
    const p = document.getElementById('locFilterPeriod')?.value;
    const cd = document.getElementById('locCustomDates');
    if (cd) cd.style.display = (p === 'custom') ? 'flex' : 'none';
    updateLocationView();
}
function resetLocFilters() {
    const els = ['locFilterClient','locFilterYear','locFilterEquipment','locFilterPeriod'];
    els.forEach(id => { const e = document.getElementById(id); if(e) e.selectedIndex = 0; });
    const cd = document.getElementById('locCustomDates');
    if (cd) cd.style.display = 'none';
    updateLocationView();
}
function updateSidebarLocationBadge() {
    const badge = document.getElementById('sidebarLocationBadge');
    if (!badge) return;
    let count = 0;
    invoices.forEach(inv => { if (inv.articles) inv.articles.forEach(a => { if (isLocationArticle(a)) count++; }); });
    badge.textContent = count;
}
function exportLocationToExcel() {
    const data = getFilteredLocData();
    if (!data.length) { alert('Aucune donnée à exporter.'); return; }
    const wsData = [['Date','N° Facture','Client','Équipement','Site','Période Début','Période Fin','Jours','Taux/Jour','Montant HT','Montant TTC','Statut']];
    data.forEach(i => wsData.push([new Date(i.date).toLocaleDateString('fr-FR'), i.number, i.clientName, i.equipment, i.site, i.periodStart, i.periodEnd, i.days, i.rate, i.montantHT, i.montantTTC, i.paid ? 'Payée' : 'Impayée']));
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Location');
    XLSX.writeFile(wb, `Location_Export_${new Date().toISOString().slice(0,10)}.xlsx`);
}

// ════════════════════════════════════════════════════════════════
// 🔗 MODULE SHARE LINKS
// ════════════════════════════════════════════════════════════════

async function generateShareLink() {
    const password = document.getElementById('shareLinkPassword')?.value;
    const expiresAt = document.getElementById('shareLinkExpiry')?.value;
    const label = document.getElementById('shareLinkLabel')?.value || 'Dashboard';
    if (!password || !expiresAt) { alert('Veuillez remplir le mot de passe et la date d\'expiration.'); return; }
    try {
        const resp = await fetch(API_URL + '/api/share-links', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: CURRENT_ACCESS_KEY, password, expiresAt, label })
        });
        const result = await resp.json();
        if (result.success) {
            const fullLink = window.location.origin + '/shared/' + result.token;
            prompt('\u2705 Lien créé ! Copiez-le :', fullLink);
            loadShareLinks();
        } else { alert('Erreur: ' + (result.message || 'Échec')); }
    } catch(e) { console.error(e); alert('Erreur réseau'); }
}

async function loadShareLinks() {
    if (!CURRENT_ACCESS_KEY) return;
    try {
        const resp = await fetch(API_URL + '/api/share-links/' + CURRENT_ACCESS_KEY);
        const links = await resp.json();
        const container = document.getElementById('shareLinksContainer');
        if (!container) return;
        if (!links.length) { container.innerHTML = '<div class="text-center text-muted small py-2">Aucun lien actif</div>'; return; }
        container.innerHTML = links.map(l => {
            const exp = new Date(l.expiresAt);
            const isExp = exp < new Date();
            const lastAcc = l.lastAccessedAt ? new Date(l.lastAccessedAt).toLocaleString('fr-FR') : 'Jamais';
            return `<div class="p-2 mb-2 rounded border ${isExp?'bg-light text-muted':'bg-white shadow-sm'}">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <div class="fw-bold small"><i class="fa fa-link me-1"></i>${l.label||'Dashboard'}</div>
                    <div class="d-flex gap-1">
                        <button class="btn btn-outline-primary btn-sm" onclick="copyShareLink('${l.token}')" title="Copier"><i class="fa fa-copy"></i></button>
                        <button class="btn btn-outline-warning btn-sm" onclick="extendShareLink('${l.token}')" title="Prolonger"><i class="fa fa-calendar-plus"></i></button>
                        <button class="btn btn-outline-danger btn-sm" onclick="deleteShareLink('${l.token}')" title="Supprimer"><i class="fa fa-trash"></i></button>
                    </div>
                </div>
                <div class="d-flex justify-content-between align-items-end" style="font-size:0.7rem;">
                    <div>
                        <div class="text-muted">Expire : ${exp.toLocaleDateString('fr-FR')} ${isExp?'<span class="badge bg-danger">Expiré</span>':'<span class="badge bg-success">Actif</span>'}</div>
                    </div>
                    <div class="text-end text-muted">
                        <div>Vues : <b class="text-dark">${l.accessCount || 0}</b></div>
                        <div>Dernier accès : <b class="text-dark">${lastAcc}</b></div>
                        ${l.lastIP ? `<div>IP : <b class="text-dark">${l.lastIP}</b></div>` : ''}
                    </div>
                </div>
            </div>`;
        }).join('');
    } catch(e) { console.error(e); }
}
window.copyShareLink = function(token) {
    const url = window.location.origin + '/shared/' + token;
    navigator.clipboard.writeText(url).then(() => alert('\u2705 Lien copié !')).catch(() => prompt('Copiez ce lien:', url));
};
window.extendShareLink = async function(token) {
    const newDate = prompt('Nouvelle date d\'expiration (AAAA-MM-JJ):');
    if (!newDate) return;
    try {
        await fetch(API_URL + '/api/share-links/' + token + '/extend', { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({expiresAt:newDate}) });
        loadShareLinks(); alert('\u2705 Lien prolongé !');
    } catch(e) { alert('Erreur'); }
};
window.deleteShareLink = async function(token) {
    if (!confirm('Supprimer ce lien partagé ?')) return;
    try { await fetch(API_URL + '/api/share-links/' + token, { method:'DELETE' }); loadShareLinks(); } catch(e) { alert('Erreur'); }
};


// ════════════════════════════════════════════════════════════════════════════════
// 📄 MODULE PROFORMA
// ════════════════════════════════════════════════════════════════════════════════

function openProformaWizard(initialType = null) {
    // If no type specified, show type selector first
    currentInvoice = {
        documentType: 'proforma',
        invoiceType: initialType || 'transport',
        contratRef: '', bdcRef: '', blReferences: '', palettes: 0,
        refFeuilleRoute: '', refBonTransfert: '',
        showDestinationInDoitA: false,
        remise: { enabled: false, type: 'percentage', value: 0 },
        articles: [],
        totals: { ht: 0, remise: 0, htRemise: 0, tva: 0, ttc: 0, netAPayer: 0 },
        proformaConditions: {
            duree: 'Location minimum de 4 heures avec tolérance de 30 minutes. Au-delà de 4h30, facturation automatique de 4 heures supplémentaires (total 8 heures).',
            paiement: 'Chèque bancaire',
            delai: '15 jours après réception de notre facture',
            validite: "Cette proforma est valable 15 jours."
        }
    };
    
    // Set proforma number
    const year = new Date().getFullYear();
    currentInvoice.number = `FP-${String(proformaCounter).padStart(3, '0')}/${year}`;
    currentInvoice.date = new Date().toISOString().split('T')[0];
    
    if (!initialType) {
        // Show type selector modal
        showProformaTypeSelector();
    } else {
        // Add default article based on type
        addDefaultArticleForType(initialType);
        currentStep = 1;
        const modal = new bootstrap.Modal(document.getElementById('modalInvoice'));
        renderWizardStep();
        modal.show();
    }
}

function showProformaTypeSelector() {
    const html = `
    <div class="modal fade" id="modalProformaType" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg">
                <div class="modal-header border-0" style="background: linear-gradient(135deg, #f59e0b, #d97706);">
                    <h5 class="modal-title text-white fw-bold"><i class="fa fa-file-alt me-2"></i>Nouvelle Proforma — Type de Service</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body p-4">
                    <p class="text-muted mb-4">Sélectionnez le type de service pour cette proforma :</p>
                    <div class="d-grid gap-3">
                        <button class="btn btn-lg btn-outline-primary text-start p-3 d-flex align-items-center gap-3" onclick="selectProformaType('transport')">
                            <i class="fa fa-truck fa-2x" style="width:40px;"></i>
                            <div><div class="fw-bold">Transport</div><div class="small text-muted">Prestation de transport routier de marchandises</div></div>
                        </button>
                        <button class="btn btn-lg text-start p-3 d-flex align-items-center gap-3" style="border:2px solid #dc3545;color:#dc3545;" onclick="selectProformaType('immobilisation')">
                            <i class="fa fa-stopwatch fa-2x" style="width:40px;"></i>
                            <div><div class="fw-bold">Immobilisation / Attente</div><div class="small text-muted">Frais d'attente et d'immobilisation de matériel roulant</div></div>
                        </button>
                        <button class="btn btn-lg text-start p-3 d-flex align-items-center gap-3" style="border:2px solid #f59e0b;color:#d97706;" onclick="selectProformaType('location')">
                            <i class="fa fa-crane fa-2x" style="width:40px;"></i>
                            <div><div class="fw-bold">Location / Engin</div><div class="small text-muted">Location de grue ou engin (25T, 50T, 75T...)</div></div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
    let existingModal = document.getElementById('modalProformaType');
    if (existingModal) existingModal.remove();
    document.body.insertAdjacentHTML('beforeend', html);
    const modal = new bootstrap.Modal(document.getElementById('modalProformaType'));
    modal.show();
}

window.selectProformaType = function(type) {
    const typeModal = bootstrap.Modal.getInstance(document.getElementById('modalProformaType'));
    if (typeModal) typeModal.hide();
    currentInvoice.invoiceType = type;
    addDefaultArticleForType(type);
    setTimeout(() => {
        currentStep = 1;
        const modal = new bootstrap.Modal(document.getElementById('modalInvoice'));
        renderWizardStep();
        modal.show();
    }, 300);
};

function addDefaultArticleForType(type) {
    const immoRate = settings.defaultImmoRate || 2500;
    const locRate = settings.defaultLocationRate || 150000;
    const defaultEquip = (settings.locationEquipmentTypes || 'Grue 25T').split(',')[0].trim();
    let art;
    if (type === 'immobilisation') {
        art = { no:1, isImmobilisation:true, isLocation:false, pricingType:'Immobilisation', immoTitle:"Frais d'attente et d'immobilisation", immoStage:'dechargement', immoTruckCount:1, matricule:'', immoDriver:'', immoPeriod:'', immoLocation:'', immoSiteChargement:'', immoSiteDechargement:'', immoReason:'Attente déchargement chez client', designation:"<b>Frais d'attente et d'immobilisation au Déchargement</b><br>-Motif : Attente déchargement chez client<br>-Total Heures Facturées : <b>8 Heures</b>", qte:8, prixUHT:immoRate, montantHT:immoRate*8, wilayaDepart:'', wilayaDestination:'', selectedDestination:'' };
    } else if (type === 'location') {
        art = { no:1, isLocation:true, isImmobilisation:false, pricingType:'Location', locEquipment:defaultEquip, locTonnage:'', locPeriodStart:'', locPeriodEnd:'', locSite:'', locDriver:'', designation:`<b>Location de ${defaultEquip}</b><br>-Site : <br>-Période : `, qte:1, prixUHT:locRate, montantHT:locRate, wilayaDepart:'', wilayaDestination:'', selectedDestination:'' };
    } else {
        art = { no:1, isImmobilisation:false, isLocation:false, pricingType:'Transport', designation:'<b>Prestation de transport routier</b><br>-WILAYA DEPART : <br>-DESTINATION : <br>-Nombre de palettes : 0', qte:1, prixUHT:0, montantHT:0, wilayaDepart:'', wilayaDestination:'', selectedDestination:'' };
    }
    currentInvoice.articles = [art];
    currentInvoice.totals = { ht: art.montantHT, remise:0, htRemise: art.montantHT, tva: art.montantHT * 0.19, ttc: art.montantHT * 1.19, netAPayer: art.montantHT * 1.19 };
}

// Also modify openInvoiceWizard to show a type selector for facture too
function openFactureTypeSelector() {
    const html = `
    <div class="modal fade" id="modalFactureType" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg">
                <div class="modal-header border-0" style="background: linear-gradient(135deg, #007B7C, #005a5a);">
                    <h5 class="modal-title text-white fw-bold"><i class="fa fa-file-invoice me-2"></i>Nouvelle Facture — Type de Service</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body p-4">
                    <p class="text-muted mb-4">Sélectionnez le type de service pour cette facture :</p>
                    <div class="d-grid gap-3">
                        <button class="btn btn-lg btn-outline-primary text-start p-3 d-flex align-items-center gap-3" onclick="selectFactureType('transport')">
                            <i class="fa fa-truck fa-2x" style="width:40px;"></i>
                            <div><div class="fw-bold">Transport</div><div class="small text-muted">Prestation de transport routier de marchandises</div></div>
                        </button>
                        <button class="btn btn-lg text-start p-3 d-flex align-items-center gap-3" style="border:2px solid #dc3545;color:#dc3545;" onclick="selectFactureType('immobilisation')">
                            <i class="fa fa-stopwatch fa-2x" style="width:40px;"></i>
                            <div><div class="fw-bold">Immobilisation / Attente</div><div class="small text-muted">Frais d'attente et d'immobilisation de matériel roulant</div></div>
                        </button>
                        <button class="btn btn-lg text-start p-3 d-flex align-items-center gap-3" style="border:2px solid #f59e0b;color:#d97706;" onclick="selectFactureType('location')">
                            <i class="fa fa-crane fa-2x" style="width:40px;"></i>
                            <div><div class="fw-bold">Location / Engin</div><div class="small text-muted">Location de grue ou engin (25T, 50T, 75T...)</div></div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
    let existingModal = document.getElementById('modalFactureType');
    if (existingModal) existingModal.remove();
    document.body.insertAdjacentHTML('beforeend', html);
    const modal = new bootstrap.Modal(document.getElementById('modalFactureType'));
    modal.show();
}
window.selectFactureType = function(type) {
    const typeModal = bootstrap.Modal.getInstance(document.getElementById('modalFactureType'));
    if (typeModal) typeModal.hide();
    setTimeout(() => openInvoiceWizard(type), 300);
};

// Proforma conditions step in the wizard - add to Step 5
function renderProformaConditions() {
    if (currentInvoice.documentType !== 'proforma') return '';
    const conds = currentInvoice.proformaConditions || {};
    return `
    <div class="card border-warning mt-3">
        <div class="card__header" style="background: linear-gradient(135deg, #fef3c7, #fde68a); color: #92400e;">
            <h6 class="mb-0 fw-bold"><i class="fa fa-gavel me-2"></i>Conditions Générales de Location</h6>
        </div>
        <div class="card__body">
            <div class="mb-3">
                <label class="form-label small fw-bold">Durée et Tarification :</label>
                <textarea class="form-control form-control-sm" rows="2" id="condDuree">${conds.duree || ''}</textarea>
            </div>
            <div class="mb-3">
                <label class="form-label small fw-bold">Modalités de Paiement :</label>
                <input type="text" class="form-control form-control-sm" id="condPaiement" value="${conds.paiement || 'Chèque bancaire'}">
            </div>
            <div class="mb-3">
                <label class="form-label small fw-bold">Délai de paiement :</label>
                <input type="text" class="form-control form-control-sm" id="condDelai" value="${conds.delai || '15 jours après réception de notre facture'}">
            </div>
            <div class="mb-3">
                <label class="form-label small fw-bold">Validité de l'Offre :</label>
                <input type="text" class="form-control form-control-sm" id="condValidite" value="${conds.validite || "Proforma valable 15 jours."}">
            </div>
        </div>
    </div>`;
}

// Save proforma conditions from DOM
function saveProformaConditions() {
    if (currentInvoice.documentType !== 'proforma') return;
    if (!currentInvoice.proformaConditions) currentInvoice.proformaConditions = {};
    const d = document.getElementById('condDuree');
    const p = document.getElementById('condPaiement');
    const dl = document.getElementById('condDelai');
    const v = document.getElementById('condValidite');
    if (d) currentInvoice.proformaConditions.duree = d.value;
    if (p) currentInvoice.proformaConditions.paiement = p.value;
    if (dl) currentInvoice.proformaConditions.delai = dl.value;
    if (v) currentInvoice.proformaConditions.validite = v.value;
}

// Proforma view functions
function renderProformasView() {
    const proformas = invoices.filter(i => i.documentType === 'proforma');
    const converted = invoices.filter(i => i.convertedFromProforma);
    const pending = proformas.filter(i => !converted.some(c => c.convertedFromProforma === i.id));
    
    // KPIs
    const kpiTotal = document.getElementById('kpiProformaTotal');
    const kpiConverted = document.getElementById('kpiProformaConverted');
    const kpiRendement = document.getElementById('kpiProformaRendement');
    const kpiPending = document.getElementById('kpiProformaPending');
    if (kpiTotal) kpiTotal.textContent = proformas.length;
    if (kpiConverted) kpiConverted.textContent = converted.length;
    if (kpiRendement) kpiRendement.textContent = proformas.length ? ((converted.length / proformas.length) * 100).toFixed(0) + '%' : '0%';
    if (kpiPending) kpiPending.textContent = pending.length;
    
    // Badge
    const badge = document.getElementById('sidebarProformaBadge');
    if (badge) badge.textContent = proformas.length;
    
    // Table
    const tbody = document.getElementById('proformaTableBody');
    if (!tbody) return;
    if (!proformas.length) { tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">Aucune proforma créée.</td></tr>'; return; }
    tbody.innerHTML = proformas.sort((a,b) => new Date(b.date) - new Date(a.date)).map(fp => {
        const client = clients.find(c => c.id === fp.clientId) || {};
        const isConverted = converted.some(c => c.convertedFromProforma === fp.id);
        const typeIcon = fp.invoiceType === 'location' ? '<i class="fa fa-crane" style="color:#f59e0b;"></i> Location' : fp.invoiceType === 'immobilisation' ? '<i class="fa fa-stopwatch text-danger"></i> Immo' : '<i class="fa fa-truck text-primary"></i> Transport';
        const statusBadge = isConverted ? '<span class="badge bg-success"><i class="fa fa-check me-1"></i>Convertie</span>' : '<span class="badge bg-warning text-dark"><i class="fa fa-hourglass-half me-1"></i>En attente</span>';
        const actions = isConverted ? `<button class="btn btn-sm btn-outline-secondary" disabled><i class="fa fa-check"></i></button>` : `<button class="btn btn-sm btn-success" onclick="convertProformaToFacture(${fp.id})" title="Convertir en Facture"><i class="fa fa-exchange-alt me-1"></i>Facture</button>`;
        return `<tr class="text-center small">
            <td class="fw-bold" style="color:#d97706;">${fp.number}</td>
            <td>${new Date(fp.date).toLocaleDateString('fr-FR')}</td>
            <td style="text-align:left;" class="fw-semibold">${client.nom || 'Inconnu'}</td>
            <td>${typeIcon}</td>
            <td class="fw-bold">${formatCurrency(fp.totals?.netAPayer || 0)}</td>
            <td>${statusBadge}</td>
            <td><div class="btn-group">
                <button class="btn btn-sm btn-outline-primary" onclick="editInvoice(${fp.id})" title="Modifier"><i class="fa fa-edit"></i></button>
                ${actions}
                <button class="btn btn-sm btn-outline-danger" onclick="deleteInvoice(${fp.id})" title="Supprimer"><i class="fa fa-trash"></i></button>
            </div></td>
        </tr>`;
    }).join('');
}

// Password generator for share links
function generateRandomPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pwd = '';
    for (let i = 0; i < 15; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    const el = document.getElementById('shareLinkPassword');
    if (el) el.value = pwd;
}