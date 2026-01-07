// app.js

const mediasContainer = document.getElementById('medias');
const continentSelect = document.getElementById('continentSelect');
const paysSelect = document.getElementById('paysSelect');
const regionSelect = document.getElementById('regionSelect');
const categorieSelect = document.getElementById('categorieSelect');
const langueSelect = document.getElementById('langueSelect');
const searchInput = document.getElementById('searchInput');
const paginationEl = document.getElementById('pagination');
const favOnlyCheckbox = document.getElementById('favOnlyCheckbox');

let allMedias = [];
let currentPage = 1;
const pageSize = 24;

// ensemble d'IDs de favoris (clé locale : media.url)
let favoriteSet = new Set();

const currentFilters = {
  continent: '',
  pays: '',
  region: '',
  categorie: '',
  langue: '',
  search: '',
  onlyFavorites: false
};

function safeText(value) {
  if (value === null || value === undefined) return '';
  return String(value);
}

function mediaComparator(a, b) {
  const continentA = safeText(a.continent);
  const continentB = safeText(b.continent);
  const paysA = safeText(a.pays);
  const paysB = safeText(b.pays);
  const regionA = safeText(a.region);
  const regionB = safeText(b.region);
  const categorieA = safeText(a.categorie);
  const categorieB = safeText(b.categorie);
  const nomA = safeText(a.nom);
  const nomB = safeText(b.nom);

  const prioContinent = (c) => (c === 'Europe' ? 0 : 1);
  if (prioContinent(continentA) !== prioContinent(continentB)) {
    return prioContinent(continentA) - prioContinent(continentB);
  }

  const prioPays = (p) => (p === 'France' ? 0 : 1);
  if (prioPays(paysA) !== prioPays(paysB)) {
    return prioPays(paysA) - prioPays(paysB);
  }

  if (continentA !== continentB) return continentA.localeCompare(continentB);
  if (paysA !== paysB) return paysA.localeCompare(paysB);

  const isRegionEmptyA = regionA === '' ? 0 : 1;
  const isRegionEmptyB = regionB === '' ? 0 : 1;
  if (isRegionEmptyA !== isRegionEmptyB) {
    return isRegionEmptyA - isRegionEmptyB;
  }
  if (regionA !== regionB) return regionA.localeCompare(regionB);

  if (categorieA !== categorieB) return categorieA.localeCompare(categorieB);

  return nomA.localeCompare(nomB);
}

// Favoris – localStorage

const FAVORITES_KEY = 'annuaireMediasFavorites';

function loadFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) {
      favoriteSet = new Set();
      return;
    }
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) {
      favoriteSet = new Set(arr);
    } else {
      favoriteSet = new Set();
    }
  } catch (e) {
    console.error('Erreur lecture favoris', e);
    favoriteSet = new Set();
  }
}

function saveFavorites() {
  try {
    const arr = Array.from(favoriteSet);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(arr));
  } catch (e) {
    console.error('Erreur sauvegarde favoris', e);
  }
}

function getMediaId(m) {
  const url = safeText(m.url);
  if (url) return url;
  const nom = safeText(m.nom);
  const pays = safeText(m.pays);
  const region = safeText(m.region);
  return `${nom}::${pays}::${region}`;
}

function isFavorite(m) {
  const id = getMediaId(m);
  return favoriteSet.has(id);
}

function toggleFavorite(m) {
  const id = getMediaId(m);
  if (favoriteSet.has(id)) {
    favoriteSet.delete(id);
  } else {
    favoriteSet.add(id);
  }
  saveFavorites();
}

// Chargement des données

async function loadMedias() {
  try {
    const response = await fetch('medias.json');
    if (!response.ok) {
      throw new Error('Erreur HTTP ' + response.status);
    }
    const data = await response.json();
    allMedias = Array.isArray(data.medias) ? data.medias : [];

    allMedias.sort(mediaComparator);

    populateFilters();
    updateUI();
  } catch (error) {
    console.error('Erreur chargement medias.json', error);
    mediasContainer.innerHTML = '<p>Erreur de chargement des médias.</p>';
  }
}

// Filtres

function populateFilters() {
  populateContinentFilter();
  populatePaysFilter();
  populateRegionFilter();
  populateCategorieFilter();
  populateLangueFilter();
}

function populateContinentFilter() {
  const continents = new Set();
  allMedias.forEach(m => {
    const c = safeText(m.continent);
    if (c) continents.add(c);
  });

  const sorted = Array.from(continents).sort((a, b) => {
    const prio = (c) => (c === 'Europe' ? 0 : 1);
    if (prio(a) !== prio(b)) return prio(a) - prio(b);
    return a.localeCompare(b);
  });

  continentSelect.innerHTML = '<option value="">Tous les continents</option>';
  sorted.forEach(continent => {
    const opt = document.createElement('option');
    opt.value = continent;
    opt.textContent = continent;
    continentSelect.appendChild(opt);
  });
}

function populatePaysFilter() {
  const paysSet = new Set();
  allMedias.forEach(m => {
    const p = safeTe
