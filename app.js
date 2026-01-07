let allMedias = [];
let currentFilters = {
  continent: '',
  pays: '',
  region: '',
  categorie: '',
  search: '',
  onlyFavorites: false
};

let pageSize = 40;      // nombre de médias par page
let currentPage = 1;    // page courante

let favoriteSet = new Set(); // IDs/URLs favoris

// Normalisation texte : minuscules + suppression des accents
function normalizeText(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// Nettoyage pour éviter d'afficher "null" ou "undefined"
function safeText(value) {
  if (value === null || value === undefined) return '';
  return String(value);
}

// ID stable pour un média (ici basé sur l'URL, ou nom+pays si besoin)
function getMediaId(media) {
  const url = safeText(media.url);
  if (url) return `url:${url}`;
  return `id:${safeText(media.nom)}|${safeText(media.pays)}`;
}

// Chargement des favoris depuis localStorage
function loadFavorites() {
  try {
    const raw = localStorage.getItem('medias_favorites');
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
    favoriteSet = new Set();
  }
}

// Sauvegarde des favoris dans localStorage
function saveFavorites() {
  try {
    const arr = Array.from(favoriteSet);
    localStorage.setItem('medias_favorites', JSON.stringify(arr));
  } catch (e) {
    // Ignorer en cas de quota dépassé
  }
}

// Comparateur de tri personnalisé : Europe / France / région vide d'abord
function compareMedias(a, b) {
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

  // 1) Europe d'abord
  const priorityContinent = (c) => (c === 'Europe' ? 0 : 1);
  const pcA = priorityContinent(continentA);
  const pcB = priorityContinent(continentB);
  if (pcA !== pcB) return pcA - pcB;

  // 2) France d'abord pour les pays
  const priorityPays = (p) => (p === 'France' ? 0 : 1);
  const ppA = priorityPays(paysA);
  const ppB = priorityPays(paysB);
  if (ppA !== ppB) return ppA - ppB;

  // 3) Région vide d'abord
  const priorityRegion = (r) => (r === '' ? 0 : 1);
  const prA = priorityRegion(regionA);
  const prB = priorityRegion(regionB);
  if (prA !== prB) return prA - prB;

  // 4) Tri alphabétique standard : continent → pays → région → catégorie → nom
  const cComp = continentA.localeCompare(continentB, 'fr');
  if (cComp !== 0) return cComp;

  const pComp = paysA.localeCompare(paysB, 'fr');
  if (pComp !== 0) return pComp;

  const rComp = regionA.localeCompare(regionB, 'fr');
  if (rComp !== 0) return rComp;

  const catComp = categorieA.localeCompare(categorieB, 'fr');
  if (catComp !== 0) return catComp;

  return nomA.localeCompare(nomB, 'fr');
}

// Chargement du JSON au démarrage
async function loadMedias() {
  try {
    const response = await fetch('medias.json');
    const data = await response.json();
    allMedias = (data.medias || []).slice();

    // Tri initial global selon nos règles
    allMedias.sort(compareMedias);

    loadFavorites();
    setupFilterListeners();
    updateUI(); // calcule options + affiche les médias
  } catch (e) {
    console.error('Erreur chargement medias.json', e);
    const container = document.getElementById('media-list');
    container.textContent = 'Erreur de chargement des données.';
  }
}

// Mise en place des listeners sur les filtres
function setupFilterListeners() {
  document.getElementById('filter-continent').addEventListener('change', e => {
    currentFilters.continent = e.target.value;
    currentFilters.pays = '';
    currentFilters.region = '';
    currentPage = 1;
    updateUI();
  });

  document.getElementById('filter-pays').addEventListener('change', e => {
    currentFilters.pays = e.target.value;
    currentFilters.region = '';
    currentPage = 1;
    updateUI();
  });

  document.getElementById('filter-region').addEventListener('change', e => {
    currentFilters.region = e.target.value;
    currentPage = 1;
    updateUI();
  });

  document.getElementById('filter-categorie').addEventListener('change', e => {
    currentFilters.categorie = e.target.value;
    currentPage = 1;
    updateUI();
  });

  const searchInput = document.getElementById('search-nom');
  searchInput.addEventListener('input', e => {
    currentFilters.search = normalizeText(e.target.value);
    currentPage = 1;
    updateUI();
  });

  const pageSizeSelect = document.getElementById('page-size-select');
  pageSizeSelect.addEventListener('change', e => {
    pageSize = parseInt(e.target.value, 10) || 40;
    currentPage = 1;
    updateUI();
  });

  const favorisCheckbox = document.getElementById('filter-favoris');
  favorisCheckbox.addEventListener('change', e => {
    currentFilters.onlyFavorites = e.target.checked;
    currentPage = 1;
    updateUI();
  });
}

// Fonction centrale : recalcule filtres + pagination + résultats
function updateUI() {
  // On filtre sur le tableau déjà trié
  const filtered = getFilteredMedias(allMedias, currentFilters);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  if (currentPage > totalPages) {
    currentPage = totalPages;
  }

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const pageItems = filtered.slice(startIndex, endIndex);

  updateFilterOptions(allMedias, currentFilters);
  renderMedias(pageItems, filtered.length, totalPages);
}

// Applique tous les filtres aux médias (affichage)
function getFilteredMedias(medias, filters) {
  return medias.filter(m => {
    if (filters.continent && m.continent !== filters.continent) return false;
    if (filters.pays && m.pays !== filters.pays) return false;
    if (filters.region && m.region !== filters.region) return false;
    if (filters.categorie && m.categorie !== filters.categorie) return false;

    if (filters.search) {
      const nomNormalise = normalizeText(m.nom);
      if (!nomNormalise.includes(filters.search)) return false;
    }

    if (filters.onlyFavorites) {
      const id = getMediaId(m);
      if (!favoriteSet.has(id)) return false;
    }

    return true;
  });
}

// Met à jour les options des selects en fonction d'un filtrage progressif
function updateFilterOptions(medias, filters) {
  const continentSelect = document.getElementById('filter-continent');
  const paysSelect      = document.getElementById('filter-pays');
  const regionSelect    = document.getElementById('filter-region');
  const categorieSelect = document.getElementById('filter-categorie');

  // 1) Continent : basé sur tous les médias
  const continents = getUniqueValues(medias, 'continent');
  refillSelect(
    continentSelect,
    continents,
    filters.continent,
    'Tous les continents'
  );

  // 2) Pays : basé sur les médias filtrés uniquement par continent
  const mediasForPays = medias.filter(m => {
    if (filters.continent && m.continent !== filters.continent) return false;
    return true;
  });
  const pays = getUniqueValues(mediasForPays, 'pays');
  refillSelect(
    paysSelect,
    pays,
    filters.pays,
    'Tous les pays'
  );

  // 3) Région : basé sur les médias filtrés par continent + pays
  const mediasForRegion = medias.filter(m => {
    if (filters.continent && m.continent !== filters.continent) return false;
    if (filters.pays && m.pays !== filters.pays) return false;
    return true;
  });
  const regions = getUniqueValues(mediasForRegion, 'region');
  refillSelect(
    regionSelect,
    regions,
    filters.region,
    'Toutes les régions'
  );

  // 4) Catégorie : basé sur les médias filtrés par continent + pays + région
  const mediasForCategorie = medias.filter(m => {
    if (filters.continent && m.continent !== filters.continent) return false;
    if (filters.pays && m.pays !== filters.pays) return false;
    if (filters.region && m.region !== filters.region) return false;
    return true;
  });
  const categories = getUniqueValues(mediasForCategorie, 'categorie');
  refillSelect(
    categorieSelect,
    categories,
    filters.categorie,
    'Toutes les catégories'
  );
}

// Renvoie les valeurs uniques triées pour un champ donné
function getUniqueValues(medias, key) {
  const values = medias.map(m => m[key]).filter(Boolean);
  return [...new Set(values)].sort();
}

// Re-remplit un <select> avec une option "tous" + les valeurs
function refillSelect(select, values, currentValue, defaultLabel) {
  const previousValue = currentValue || '';

  select.innerHTML = '';

  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = defaultLabel;
  select.appendChild(defaultOption);

  values.forEach(v => {
    const option = document.createElement('option');
    option.value = v;
    option.textContent = v;
    select.appendChild(option);
  });

  if (previousValue && values.includes(previousValue)) {
    select.value = previousValue;
  } else {
    select.value = '';
  }
}

// Affichage des cartes + pagination (carte cliquable + favoris)
function renderMedias(medias, totalCount, totalPages) {
  const container = document.getElementById('media-list');
  const countEl = document.getElementById('media-count');
  const paginationEl = document.getElementById('pagination');

  container.innerHTML = '';
  paginationEl.innerHTML = '';

  countEl.textContent = `(${totalCount} trouvés)`;

  if (totalCount === 0) {
    container.textContent = 'Aucun média trouvé.';
    return;
  }

  medias.forEach(m => {
    const codePays = (m.code_pays || '').toLowerCase();
    const pays = safeText(m.pays);
    const region = safeText(m.region);
    const categorie = safeText(m.categorie);
    const langue = safeText(m.langue);
    const nom = safeText(m.nom);
    const url = safeText(m.url);
    const id = getMediaId(m);
    const isFavorite = favoriteSet.has(id);

    const localisation = [pays, region].filter(Boolean).join(' - ');

    const link = document.createElement('a');
    link.className = 'media-card-link';
    link.href = url || '#';
    link.target = url ? '_blank' : '_self';
    link.rel = 'noopener noreferrer';

    const card = document.createElement('div');
    card.className = 'media-card';
    card.innerHTML = `
      <h3>${nom}</h3>
      <p class="media-location">
        ${codePays
          ? `<span class="fi fi-${codePays} media-flag" aria-hidden="true"></span>`
          : ''
        }
        <span>${localisation}</span>
      </p>
      <p>${categorie}${categorie && langue ? ' • ' : ''}${langue}</p>
    `;

    // Icône favoris
    const fav = document.createElement('span');
    fav.className = 'media-favorite-toggle' + (isFavorite ? ' is-favorite' : '');
    fav.textContent = isFavorite ? '★' : '☆';
    fav.title = isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris';

    // Gestion du clic sur l'étoile (ne pas suivre le lien)
    fav.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (favoriteSet.has(id)) {
        favoriteSet.delete(id);
      } else {
        favoriteSet.add(id);
      }
      saveFavorites();
      updateUI();
    });

    card.appendChild(fav);
    link.appendChild(card);
    container.appendChild(link);
  });

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

// Démarrage
document.addEventListener('DOMContentLoaded', loadMedias);
