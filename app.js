/**
 * app.js - Logique de l'annuaire des médias
 * Gère le chargement des données, le filtrage dynamique et l'affichage des cartes.
 */

// --- Récupération des principaux éléments du DOM ---
const mediasContainer = document.getElementById('medias');
const continentSelect = document.getElementById('continentSelect');
const paysSelect = document.getElementById('paysSelect');
const regionSelect = document.getElementById('regionSelect');
const categorieSelect = document.getElementById('categorieSelect');
const langueSelect = document.getElementById('langueSelect');
const searchInput = document.getElementById('searchInput');
const searchActiveCheckbox = document.getElementById('searchActiveCheckbox');
const favOnlyCheckbox = document.getElementById('favOnlyCheckbox');
const resetFiltersBtn = document.getElementById('resetFiltersBtn');
const resultCountEl = document.getElementById('resultCount');

// Éléments pour le rideau de filtres (affichage/masquage sur mobile)
const toggleFiltersBtn = document.getElementById('toggleFiltersBtn');
const filtersSection = document.getElementById('filtersSection');

// --- État de l'application ---
let allMedias = []; // Liste complète chargée depuis le JSON
let favoriteSet = new Set(); // Ensemble des IDs des médias favoris

/** 
 * Dictionnaire pour traduire les codes ISO des langues en noms lisibles.
 */
const langueFullNames = {
  'fr': 'Français', 'en': 'Anglais', 'es': 'Espagnol', 'pt': 'Portugais',
  'de': 'Allemand', 'it': 'Italien', 'nl': 'Néerlandais', 'pl': 'Polonais',
  'ru': 'Russe', 'zh': 'Chinois', 'hi': 'Hindi', 'ta': 'Tamoul',
  'ml': 'Malayalam', 'he': 'Hébreu', 'ja': 'Japonais', 'id': 'Indonésien',
  'bg': 'Bulgare', 'da': 'Danois', 'fi': 'Finnois', 'el': 'Grec',
  'no': 'Norvégien', 'sv': 'Suédois', 'cs': 'Tchèque', 'uk': 'Ukrainien'
};

function getLangueName(code) {
  return langueFullNames[code] || code;
}

// État actuel des filtres sélectionnés par l'utilisateur
const currentFilters = {
  continent: '',
  pays: '',
  region: '',
  categorie: '',
  langue: '',
  search: '',
  onlyFavorites: false
};

// --- Fonctions Utilitaires ---

function safeText(value) {
  return (value === null || value === undefined) ? '' : String(value);
}

/** Supprime les accents pour faciliter la recherche textuelle */
function removeAccents(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** 
 * Comparateur pour le tri des médias : 
 * Priorité Europe > France, puis tri alphabétique Continent > Pays > Région > Catégorie > Nom.
 */
function mediaComparator(a, b) {
  const continentA = safeText(a.continent), continentB = safeText(b.continent);
  const paysA = safeText(a.pays), paysB = safeText(b.pays);
  const regionA = safeText(a.region), regionB = safeText(b.region);
  const nomA = safeText(a.nom), nomB = safeText(b.nom);

  // Priorité Europe
  const prioContinent = (c) => (c === 'Europe' ? 0 : 1);
  if (prioContinent(continentA) !== prioContinent(continentB)) return prioContinent(continentA) - prioContinent(continentB);

  // Priorité France
  const prioPays = (p) => (p === 'France' ? 0 : 1);
  if (prioPays(paysA) !== prioPays(paysB)) return prioPays(paysA) - prioPays(paysB);

  if (continentA !== continentB) return continentA.localeCompare(continentB);
  if (paysA !== paysB) return paysA.localeCompare(paysB);
  if (regionA !== regionB) return regionA.localeCompare(regionB);
  
  return nomA.localeCompare(nomB);
}

// --- Gestion des Favoris (via localStorage) ---

const FAVORITES_KEY = 'annuaireMediasFavorites';

function loadFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    favoriteSet = new Set(Array.isArray(arr) ? arr : []);
  } catch (e) {
    favoriteSet = new Set();
  }
}

function saveFavorites() {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(favoriteSet)));
}

/** Génère un identifiant unique pour un média (URL ou concaténation infos) */
function getMediaId(m) {
  return safeText(m.url) || `${safeText(m.nom)}::${safeText(m.pays)}::${safeText(m.region)}`;
}

function isFavorite(m) { return favoriteSet.has(getMediaId(m)); }

function toggleFavorite(m) {
  const id = getMediaId(m);
  favoriteSet.has(id) ? favoriteSet.delete(id) : favoriteSet.add(id);
  saveFavorites();
}

// --- Chargement des données JSON ---

async function loadMedias() {
  try {
    const response = await fetch('medias.json');
    if (!response.ok) throw new Error('Erreur HTTP ' + response.status);
    const data = await response.json();
    allMedias = Array.isArray(data.medias) ? data.medias : [];
    allMedias.sort(mediaComparator);

    populateFilters(); // Initialise les menus déroulants
    updateUI();        // Affiche les résultats
  } catch (error) {
    console.error('Erreur chargement:', error);
    mediasContainer.innerHTML = '<p>Erreur de chargement des données.</p>';
  }
}

// --- Population dynamique des filtres ---

function populateFilters() {
  populateContinentFilter();
  populatePaysFilter();
  populateRegionFilter();
  populateCategorieFilter();
  populateLangueFilter();
}

/** Remplit le sélecteur de continents */
function populateContinentFilter() {
  const continents = new Set();
  allMedias.forEach(m => { if (m.continent) continents.add(m.continent); });

  const sorted = Array.from(continents).sort((a, b) => {
    const prio = (c) => (c === 'Europe' ? 0 : 1);
    return (prio(a) !== prio(b)) ? prio(a) - prio(b) : a.localeCompare(b);
  });

  continentSelect.innerHTML = '<option value="">Tous les continents</option>';
  sorted.forEach(c => {
    const opt = document.createElement('option');
    opt.value = opt.textContent = c;
    continentSelect.appendChild(opt);
  });
}

/** Remplit le sélecteur de pays, éventuellement filtré par continent */
function populatePaysFilter(continentFilter = '') {
  const paysSet = new Set();
  allMedias.forEach(m => {
    if (m.pays && (!continentFilter || m.continent === continentFilter)) paysSet.add(m.pays);
  });

  const sorted = Array.from(paysSet).sort((a, b) => {
    const prio = (p) => (p === 'France' ? 0 : 1);
    return (prio(a) !== prio(b)) ? prio(a) - prio(b) : a.localeCompare(b);
  });

  paysSelect.innerHTML = '<option value="">Tous les pays</option>';
  sorted.forEach(p => {
    const opt = document.createElement('option');
    opt.value = opt.textContent = p;
    paysSelect.appendChild(opt);
  });
}

/** Remplit le sélecteur de régions avec un système d'optgroup (groupement par pays) */
function populateRegionFilter(continentFilter = '', paysFilter = '') {
  const regionsByCountry = new Map();

  allMedias.forEach(m => {
    if (!m.region) return;
    if (continentFilter && m.continent !== continentFilter) return;
    if (paysFilter && m.pays !== paysFilter) return;

    const key = `${m.continent} / ${m.pays}`;
    if (!regionsByCountry.has(key)) regionsByCountry.set(key, new Set());
    regionsByCountry.get(key).add(m.region);
  });

  regionSelect.innerHTML = '<option value="">Toutes les régions</option>';
  
  // Tri et affichage par groupe Pays
  const sortedKeys = Array.from(regionsByCountry.keys()).sort();
  sortedKeys.forEach(key => {
    const group = document.createElement('optgroup');
    group.label = key;
    Array.from(regionsByCountry.get(key)).sort().forEach(region => {
      const opt = document.createElement('option');
      opt.value = opt.textContent = region;
      group.appendChild(opt);
    });
    regionSelect.appendChild(group);
  });
}

function populateCategorieFilter() {
  const cats = new Set();
  allMedias.forEach(m => { if (m.categorie) cats.add(m.categorie); });
  categorieSelect.innerHTML = '<option value="">Toutes les catégories</option>';
  Array.from(cats).sort().forEach(c => {
    const opt = document.createElement('option');
    opt.value = opt.textContent = c;
    categorieSelect.appendChild(opt);
  });
}

function populateLangueFilter() {
  const codes = new Set();
  allMedias.forEach(m => { if (m.langue) codes.add(m.langue); });
  langueSelect.innerHTML = '<option value="">Toutes les langues</option>';
  Array.from(codes).sort((a, b) => getLangueName(a).localeCompare(getLangueName(b))).forEach(code => {
    const opt = document.createElement('option');
    opt.value = code;
    opt.textContent = getLangueName(code);
    langueSelect.appendChild(opt);
  });
}

// --- Logique de Filtrage et Affichage ---

function resetAllFilters(keepSearch = false, keepFavOnly = false) {
  currentFilters.continent = currentFilters.pays = currentFilters.region = currentFilters.categorie = currentFilters.langue = '';
  if (!keepSearch) { currentFilters.search = ''; searchInput.value = ''; searchActiveCheckbox.checked = false; }
  if (!keepFavOnly) { currentFilters.onlyFavorites = false; favOnlyCheckbox.checked = false; }
  
  [continentSelect, paysSelect, regionSelect, categorieSelect, langueSelect].forEach(s => s.value = '');
}

/** Filtre la liste des médias selon les critères sélectionnés */
function getFilteredMedias() {
  return allMedias.filter(m => {
    if (currentFilters.continent && m.continent !== currentFilters.continent) return false;
    if (currentFilters.pays && m.pays !== currentFilters.pays) return false;
    if (currentFilters.region && m.region !== currentFilters.region) return false;
    if (currentFilters.categorie && m.categorie !== currentFilters.categorie) return false;
    if (currentFilters.langue && m.langue !== currentFilters.langue) return false;
    if (currentFilters.onlyFavorites && !isFavorite(m)) return false;

    if (currentFilters.search) {
      const q = removeAccents(currentFilters.search.toLowerCase());
      const haystack = removeAccents(`${m.nom} ${m.pays} ${m.region}`.toLowerCase());
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

/** Génère le HTML pour chaque média et met à jour le compteur */
function renderMedias() {
  const filtered = getFilteredMedias();
  resultCountEl.textContent = `(${filtered.length}/${allMedias.length})`;
  mediasContainer.innerHTML = filtered.length ? '' : '<p>Aucun média trouvé.</p>';

  filtered.forEach(m => {
    const card = document.createElement('a');
    card.className = 'media-card';
    card.href = m.url || '#';
    card.target = '_blank';
    card.rel = 'noopener noreferrer';

    // En-tête avec drapeau et nom
    const header = document.createElement('div');
    header.className = 'media-card-header';
    if (m.code_pays) {
      const flag = document.createElement('span');
      flag.className = `fi fi-${m.code_pays.toLowerCase()}`;
      header.appendChild(flag);
    }
    const title = document.createElement('h3');
    title.textContent = m.nom;
    header.appendChild(title);
    card.appendChild(header);

    // Méta-données (Région, Catégorie, Langue)
    const meta = document.createElement('p');
    meta.className = 'media-meta';
    meta.textContent = [m.region, `${m.categorie} en ${getLangueName(m.langue)}`].filter(Boolean).join(' · ');
    card.appendChild(meta);

    // Bouton favori (étoile)
    const favBtn = document.createElement('span');
    favBtn.className = `favorite-toggle ${isFavorite(m) ? 'is-favorite' : ''}`;
    favBtn.textContent = isFavorite(m) ? '★' : '☆';
    favBtn.onclick = (e) => {
      e.preventDefault(); e.stopPropagation();
      toggleFavorite(m);
      updateUI();
    };
    card.appendChild(favBtn);

    mediasContainer.appendChild(card);
  });
}

function updateUI() { renderMedias(); }

// --- Initialisation et Écouteurs d'événements ---

document.addEventListener('DOMContentLoaded', () => {
  loadFavorites();
  loadMedias();

  // Affichage/Masquage du panneau de filtres (mobile)
  toggleFiltersBtn.onclick = () => {
    const show = filtersSection.classList.toggle('show');
    toggleFiltersBtn.textContent = show ? 'Masquer les filtres' : 'Afficher les filtres';
    toggleFiltersBtn.classList.toggle('active', show);
  };

  // Gestion des changements de filtres (cascade)
  continentSelect.onchange = () => {
    currentFilters.continent = continentSelect.value;
    currentFilters.pays = currentFilters.region = '';
    populatePaysFilter(currentFilters.continent);
    populateRegionFilter(currentFilters.continent, '');
    updateUI();
  };

  paysSelect.onchange = () => {
    currentFilters.pays = paysSelect.value;
    currentFilters.region = '';
    populateRegionFilter(currentFilters.continent, currentFilters.pays);
    updateUI();
  };

  [regionSelect, categorieSelect, langueSelect].forEach(el => {
    el.onchange = () => {
      currentFilters[el.id.replace('Select', '')] = el.value;
      updateUI();
    };
  });

  // Recherche textuelle
  searchInput.oninput = () => {
    currentFilters.search = searchInput.value.trim();
    searchActiveCheckbox.checked = currentFilters.search.length > 0;
    updateUI();
  };

  searchActiveCheckbox.onchange = () => {
    if (!searchActiveCheckbox.checked) { currentFilters.search = ''; searchInput.value = ''; }
    else { currentFilters.search = searchInput.value.trim(); }
    updateUI();
  };

  favOnlyCheckbox.onchange = () => {
    currentFilters.onlyFavorites = favOnlyCheckbox.checked;
    resetAllFilters(false, true); // On garde les favoris mais reset le reste pour plus de clarté
    updateUI();
  };

  resetFiltersBtn.onclick = () => {
    resetAllFilters();
    populatePaysFilter();
    populateRegionFilter();
    updateUI();
  };
});
