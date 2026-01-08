// app.js

const mediasContainer = document.getElementById('medias');
const continentSelect = document.getElementById('continentSelect');
const paysSelect = document.getElementById('paysSelect');
const regionSelect = document.getElementById('regionSelect');
const categorieSelect = document.getElementById('categorieSelect');
const langueSelect = document.getElementById('langueSelect');
const searchInput = document.getElementById('searchInput');
const searchActiveCheckbox = document.getElementById('searchActiveCheckbox');
const paginationEl = document.getElementById('pagination');
const favOnlyCheckbox = document.getElementById('favOnlyCheckbox');

let allMedias = [];
let currentPage = 1;
const pageSize = 24;

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

    // initialisation des filtres
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

function populatePaysFilter(continentFilter = '') {
  const paysSet = new Set();
  allMedias.forEach(m => {
    const c = safeText(m.continent);
    const p = safeText(m.pays);
    if (!p) return;
    if (continentFilter && c !== continentFilter) return;
    paysSet.add(p);
  });

  const sorted = Array.from(paysSet).sort((a, b) => {
    const prio = (p) => (p === 'France' ? 0 : 1);
    if (prio(a) !== prio(b)) return prio(a) - prio(b);
    return a.localeCompare(b);
  });

  paysSelect.innerHTML = '<option value="">Tous les pays</option>';
  sorted.forEach(pays => {
    const opt = document.createElement('option');
    opt.value = pays;
    opt.textContent = pays;
    paysSelect.appendChild(opt);
  });
}

function populateRegionFilter(continentFilter = '', paysFilter = '') {
  const map = new Map();

  allMedias.forEach(m => {
    const continent = safeText(m.continent);
    const pays = safeText(m.pays);
    const region = safeText(m.region);

    if (!region) return;
    if (continentFilter && continent !== continentFilter) return;
    if (paysFilter && pays !== paysFilter) return;

    const key = `${continent}||${pays}||${region}`;
    if (!map.has(key)) {
      map.set(key, { continent, pays, region });
    }
  });

  let entries = Array.from(map.values());

  entries.sort((a, b) => {
    const prioContinent = (c) => (c === 'Europe' ? 0 : 1);
    const prioPays = (p) => (p === 'France' ? 0 : 1);

    if (prioContinent(a.continent) !== prioContinent(b.continent)) {
      return prioContinent(a.continent) - prioContinent(b.continent);
    }
    if (prioPays(a.pays) !== prioPays(b.pays)) {
      return prioPays(a.pays) - prioPays(b.pays);
    }
    if (a.continent !== b.continent) {
      return a.continent.localeCompare(b.continent);
    }
    if (a.pays !== b.pays) {
      return a.pays.localeCompare(b.pays);
    }
    return a.region.localeCompare(b.region);
  });

  regionSelect.innerHTML = '';
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'Toutes les régions';
  regionSelect.appendChild(defaultOption);

  // si un pays est choisi, pas de regroupement
  if (paysFilter) {
    entries.forEach(item => {
      const opt = document.createElement('option');
      opt.value = item.region;
      opt.textContent = item.region;
      regionSelect.appendChild(opt);
    });
    return;
  }

  // sinon, regroupement par continent/pays
  const groups = [];
  let currentGroupKey = null;
  let currentGroup = null;

  entries.forEach(item => {
    const groupKey = `${item.continent}||${item.pays}`;
    if (groupKey !== currentGroupKey) {
      if (currentGroup) groups.push(currentGroup);
      currentGroupKey = groupKey;
      currentGroup = {
        continent: item.continent,
        pays: item.pays,
        regions: []
      };
    }
    currentGroup.regions.push(item.region);
  });
  if (currentGroup) groups.push(currentGroup);

  groups.forEach(group => {
    const label = `${group.continent} / ${group.pays}`;
    const optgroup = document.createElement('optgroup');
    optgroup.label = label;

    group.regions.forEach(region => {
      const opt = document.createElement('option');
      opt.value = region;
      opt.textContent = region;
      optgroup.appendChild(opt);
    });

    regionSelect.appendChild(optgroup);
  });
}

function populateCategorieFilter() {
  const categories = new Set();
  allMedias.forEach(m => {
    const c = safeText(m.categorie);
    if (c) categories.add(c);
  });

  const sorted = Array.from(categories).sort((a, b) => a.localeCompare(b));

  categorieSelect.innerHTML = '<option value="">Toutes les catégories</option>';
  sorted.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    categorieSelect.appendChild(opt);
  });
}

function populateLangueFilter() {
  const langues = new Set();
  allMedias.forEach(m => {
    const l = safeText(m.langue);
    if (l) langues.add(l);
  });

  const sorted = Array.from(langues).sort((a, b) => a.localeCompare(b));

  langueSelect.innerHTML = '<option value="">Toutes les langues</option>';
  sorted.forEach(langue => {
    const opt = document.createElement('option');
    opt.value = langue;
    opt.textContent = langue;
    langueSelect.appendChild(opt);
  });
}

// Réinitialisation globale des filtres

function resetAllFilters(keepSearch = false, keepFavOnly = false) {
  currentFilters.continent = '';
  currentFilters.pays = '';
  currentFilters.region = '';
  currentFilters.categorie = '';
  currentFilters.langue = '';

  if (!keepSearch) {
    currentFilters.search = '';
    if (searchInput) searchInput.value = '';
    if (searchActiveCheckbox) searchActiveCheckbox.checked = false;
  }

  if (!keepFavOnly) {
    currentFilters.onlyFavorites = false;
    if (favOnlyCheckbox) favOnlyCheckbox.checked = false;
  }

  if (continentSelect) continentSelect.value = '';
  if (paysSelect) paysSelect.value = '';
  if (regionSelect) regionSelect.value = '';
  if (categorieSelect) categorieSelect.value = '';
  if (langueSelect) langueSelect.value = '';
}

// Filtrage

function getFilteredMedias(medias, filters) {
  return medias.filter(m => {
    const continent = safeText(m.continent);
    const pays = safeText(m.pays);
    const region = safeText(m.region);
    const categorie = safeText(m.categorie);
    const langue = safeText(m.langue);
    const nom = safeText(m.nom);

    if (filters.continent && continent !== filters.continent) return false;
    if (filters.pays && pays !== filters.pays) return false;
    if (filters.region && region !== filters.region) return false;
    if (filters.categorie && categorie !== filters.categorie) return false;
    if (filters.langue && langue !== filters.langue) return false;

    if (filters.onlyFavorites && !isFavorite(m)) return false;

    if (filters.search) {
      const q = filters.search.toLowerCase();
      const haystack = `${nom} ${pays}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    return true;
  });
}

// Rendu

function renderMedias() {
  const filtered = getFilteredMedias(allMedias, currentFilters);
  const total = filtered.length;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const pageItems = filtered.slice(start, end);

  mediasContainer.innerHTML = '';

  if (pageItems.length === 0) {
    mediasContainer.innerHTML = '<p>Aucun média trouvé.</p>';
    return;
  }

  pageItems.forEach(m => {
    const nom = safeText(m.nom);
    const pays = safeText(m.pays);
    const region = safeText(m.region);
    const categorie = safeText(m.categorie);
    const langue = safeText(m.langue);
    const url = safeText(m.url);
    const codePays = safeText(m.code_pays).toLowerCase();

    const card = document.createElement('a');
    card.className = 'media-card';
    card.href = url || '#';
    card.target = '_blank';
    card.rel = 'noopener noreferrer';

    const header = document.createElement('div');
    header.className = 'media-card-header';

    if (codePays) {
      const flagSpan = document.createElement('span');
      flagSpan.className = `fi fi-${codePays}`;
      header.appendChild(flagSpan);
    }

    const title = document.createElement('h3');
    title.textContent = nom;
    header.appendChild(title);

    card.appendChild(header);

    const meta = document.createElement('p');
    meta.className = 'media-meta';
    const parts = [];
    if (pays) parts.push(pays);
    if (region) parts.push(region);
    if (categorie) parts.push(categorie);
    if (langue) parts.push(`Langue : ${langue}`);
    meta.textContent = parts.join(' · ');
    card.appendChild(meta);

    const favBtn = document.createElement('span');
    favBtn.className = 'favorite-toggle';
    if (isFavorite(m)) {
      favBtn.classList.add('is-favorite');
      favBtn.textContent = '★';
    } else {
      favBtn.textContent = '☆';
    }

    favBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();

      toggleFavorite(m);
      if (isFavorite(m)) {
        favBtn.classList.add('is-favorite');
        favBtn.textContent = '★';
      } else {
        favBtn.classList.remove('is-favorite');
        favBtn.textContent = '☆';
      }

      if (currentFilters.onlyFavorites) {
        updateUI();
      }
    });

    card.appendChild(favBtn);

    mediasContainer.appendChild(card);
  });
}

function renderPagination() {
  const filtered = getFilteredMedias(allMedias, currentFilters);
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  paginationEl.innerHTML = '';

  if (totalPages <= 1) return;

  const prevBtn = document.createElement('button');
  prevBtn.textContent = 'Précédent';
  prevBtn.disabled = currentPage === 1;
  prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      updateUI();
    }
  });

  const nextBtn = document.createElement('button');
  nextBtn.textContent = 'Suivant';
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      updateUI();
    }
  });

  const info = document.createElement('span');
  info.textContent = `Page ${currentPage} / ${totalPages}`;

  paginationEl.appendChild(prevBtn);
  paginationEl.appendChild(info);
  paginationEl.appendChild(nextBtn);
}

function updateUI() {
  renderMedias();
  renderPagination();
}

// Démarrage

document.addEventListener('DOMContentLoaded', () => {
  loadFavorites();
  loadMedias();

  if (continentSelect) {
    continentSelect.addEventListener('change', () => {
      currentFilters.continent = continentSelect.value;
      currentFilters.pays = '';
      currentFilters.region = '';
      populatePaysFilter(currentFilters.continent);
      populateRegionFilter(currentFilters.continent, '');
      paysSelect.value = '';
      regionSelect.value = '';
      currentPage = 1;
      updateUI();
    });
  }

  if (paysSelect) {
    paysSelect.addEventListener('change', () => {
      currentFilters.pays = paysSelect.value;
      currentFilters.region = '';
      populateRegionFilter(currentFilters.continent, currentFilters.pays);
      regionSelect.value = '';
      currentPage = 1;
      updateUI();
    });
  }

  if (regionSelect) {
    regionSelect.addEventListener('change', () => {
      currentFilters.region = regionSelect.value;
      currentPage = 1;
      updateUI();
    });
  }

  if (categorieSelect) {
    categorieSelect.addEventListener('change', () => {
      currentFilters.categorie = categorieSelect.value;
      currentPage = 1;
      updateUI();
    });
  }

  if (langueSelect) {
    langueSelect.addEventListener('change', () => {
      currentFilters.langue = langueSelect.value;
      currentPage = 1;
      updateUI();
    });
  }

  // RECHERCHE : texte + case d'activation

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const value = searchInput.value.trim();
      currentFilters.search = value;
      if (searchActiveCheckbox) {
        searchActiveCheckbox.checked = value.length > 0;
      }
      currentPage = 1;
      updateUI();
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (searchInput.value.trim().length > 0 && searchActiveCheckbox) {
          searchActiveCheckbox.checked = true;
        }
        searchInput.blur();
      }
    });
  }

  if (searchActiveCheckbox) {
    searchActiveCheckbox.addEventListener('change', () => {
      if (!searchActiveCheckbox.checked) {
        currentFilters.search = '';
        if (searchInput) searchInput.value = '';
      } else {
        currentFilters.search = searchInput ? searchInput.value.trim() : '';
      }
      currentPage = 1;
      updateUI();
    });
  }

  // FAVORIS SEULEMENT

  if (favOnlyCheckbox) {
    favOnlyCheckbox.addEventListener('change', () => {
      currentFilters.onlyFavorites = favOnlyCheckbox.checked;
      resetAllFilters(false, true);
      currentPage = 1;
      updateUI();
    });
  }
});
