// app.js

const mediasContainer = document.getElementById('medias');
const continentSelect = document.getElementById('continentSelect');
const paysSelect = document.getElementById('paysSelect');
const regionSelect = document.getElementById('regionSelect');
const categorieSelect = document.getElementById('categorieSelect');
const langueSelect = document.getElementById('langueSelect');
const searchInput = document.getElementById('searchInput');
const paginationEl = document.getElementById('pagination');

let allMedias = [];
let currentPage = 1;
const pageSize = 24;

const currentFilters = {
  continent: '',
  pays: '',
  region: '',
  categorie: '',
  langue: '',
  search: ''
};

// Utilitaire pour éviter d'afficher null / undefined
function safeText(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
}

// Comparateur global pour les cartes
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

  if (continentA !== continentB) {
    return continentA.localeCompare(continentB);
  }
  if (paysA !== paysB) {
    return paysA.localeCompare(paysB);
  }

  const isRegionEmptyA = regionA === '' ? 0 : 1;
  const isRegionEmptyB = regionB === '' ? 0 : 1;
  if (isRegionEmptyA !== isRegionEmptyB) {
    return isRegionEmptyA - isRegionEmptyB;
  }
  if (regionA !== regionB) {
    return regionA.localeCompare(regionB);
  }

  if (categorieA !== categorieB) {
    return categorieA.localeCompare(categorieB);
  }

  return nomA.localeCompare(nomB);
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

// Remplissage des filtres
function populateFilters() {
  populateContinentFilter();
  populatePaysFilter();
  populateRegionFilter();
  populateCategorieFilter();
  populateLangueFilter();
}

// Continent simple (Europe d'abord)
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

// Pays simple (France d'abord)
function populatePaysFilter() {
  const paysSet = new Set();
  allMedias.forEach(m => {
    const p = safeText(m.pays);
    if (p) paysSet.add(p);
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

// Région avec regroupement Continent / Pays (optgroup)
function populateRegionFilter() {
  const map = new Map();

  allMedias.forEach(m => {
    const continent = safeText(m.continent);
    const pays = safeText(m.pays);
    const region = safeText(m.region);

    if (!region) return;

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

  regionSelect.innerHTML = '';
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'Toutes les régions';
  regionSelect.appendChild(defaultOption);

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

// Catégorie
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

// Langue
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

// Application des filtres
function getFilteredMedias(medias, filters) {
  return medias.filter(m => {
    const continent = safeText(m.continent);
    const pays = safeText(m.pays);
    const region = safeText(m.region);
    const categorie = safeText(m.categorie);
    const langue = safeText(m.langue);
    const nom = safeText(m.nom);
    const url = safeText(m.url);

    if (filters.continent && continent !== filters.continent) return false;
    if (filters.pays && pays !== filters.pays) return false;
    if (filters.region && region !== filters.region) return false;
    if (filters.categorie && categorie !== filters.categorie) return false;
    if (filters.langue && langue !== filters.langue) return false;

    if (filters.search) {
      const q = filters.search.toLowerCase();
      const haystack = `${nom} ${url} ${pays} ${region} ${categorie} ${langue}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    return true;
  });
}

// Rendu des cartes
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
    const parts = [];
    if (pays) parts.push(pays);
    if (region) parts.push(region);
    if (categorie) parts.push(categorie);
    if (langue) parts.push(`Langue : ${langue}`);
    meta.textContent = parts.join(' · ');
    card.appendChild(meta);

    mediasContainer.appendChild(card);
  });
}

// Pagination
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

// Tout brancher une fois le DOM prêt
document.addEventListener('DOMContentLoaded', () => {
  loadMedias();

  if (continentSelect) {
    continentSelect.addEventListener('change', () => {
      currentFilters.continent = continentSelect.value;
      currentPage = 1;
      updateUI();
    });
  }

  if (paysSelect) {
    paysSelect.addEventListener('change', () => {
      currentFilters.pays = paysSelect.value;
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

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      currentFilters.search = searchInput.value.trim();
      currentPage = 1;
      updateUI();
    });
  }
});
