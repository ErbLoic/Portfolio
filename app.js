// Configuration de l'API
const API_BASE_URL = 'https://portfolio-mlb3.onrender.com/api'; // URL de l'API Laravel

// Clé de cache localStorage
const CACHE_KEY = 'portfolio_data_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 heures en millisecondes

// Cache des données
let portfolioData = null;

// Pagination state
let projectsPage = 0;
let realisationsPage = 0;
let allProjects = [];
let allRealisations = [];
const ITEMS_PER_PAGE = 2;

// Messages carousel state
let messagesIndex = 0;
let allMessages = [];
let messagesAutoSlide = null;

// ========================================
// Système de cache localStorage
// ========================================

function getCachedData() {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached) return null;
        
        const { data, timestamp } = JSON.parse(cached);
        const isExpired = Date.now() - timestamp > CACHE_DURATION;
        
        if (isExpired) {
            localStorage.removeItem(CACHE_KEY);
            return null;
        }
        
        console.log('Données chargées depuis le cache');
        return data;
    } catch (error) {
        console.warn('Erreur lors de la lecture du cache:', error);
        return null;
    }
}

function setCachedData(data) {
    try {
        const cacheEntry = {
            data: data,
            timestamp: Date.now()
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheEntry));
        console.log('Données mises en cache');
    } catch (error) {
        console.warn('Erreur lors de la mise en cache:', error);
    }
}

function clearCache() {
    localStorage.removeItem(CACHE_KEY);
    console.log('Cache vidé');
}

// ========================================
// Système de chargement amélioré
// ========================================

const loadingMessages = [
    { status: "Connexion au serveur...", tip: "Le serveur se réveille, cela peut prendre quelques secondes" },
    { status: "Réveil du serveur...", tip: "Les serveurs gratuits s'endorment après 15 min d'inactivité" },
    { status: "Établissement de la connexion...", tip: "Première visite ? Le chargement initial est plus long" },
    { status: "Chargement des données...", tip: "Merci de patienter, c'est bientôt prêt !" },
    { status: "Presque terminé...", tip: "Les prochaines visites seront plus rapides" },
    { status: "Finalisation...", tip: "Le serveur est maintenant actif" }
];

let loadingInterval = null;
let progressInterval = null;
let currentMessageIndex = 0;
let currentProgress = 0;

function updateLoadingMessage() {
    const statusEl = document.getElementById('loader-status');
    const tipEl = document.getElementById('loader-tip');
    
    if (statusEl && tipEl && currentMessageIndex < loadingMessages.length) {
        const msg = loadingMessages[currentMessageIndex];
        statusEl.style.animation = 'none';
        tipEl.style.animation = 'none';
        
        // Force reflow
        void statusEl.offsetHeight;
        void tipEl.offsetHeight;
        
        statusEl.textContent = msg.status;
        tipEl.textContent = msg.tip;
        
        statusEl.style.animation = 'fade-text 0.5s ease-out';
        tipEl.style.animation = 'fade-text 0.5s ease-out';
        
        currentMessageIndex++;
    }
}

function updateProgress(targetProgress) {
    const progressBar = document.getElementById('loader-progress-bar');
    if (progressBar) {
        currentProgress = Math.min(targetProgress, 95); // Ne jamais dépasser 95% avant la fin
        progressBar.style.width = `${currentProgress}%`;
    }
}

function startLoadingAnimation() {
    currentMessageIndex = 0;
    currentProgress = 0;
    
    // Mettre à jour les messages toutes les 4 secondes
    updateLoadingMessage();
    loadingInterval = setInterval(() => {
        updateLoadingMessage();
    }, 4000);
    
    // Simuler une progression réaliste
    progressInterval = setInterval(() => {
        // Progression plus lente au début (cold start), plus rapide ensuite
        const increment = currentProgress < 30 ? 2 : currentProgress < 60 ? 4 : 3;
        updateProgress(currentProgress + increment);
    }, 500);
}

function stopLoadingAnimation() {
    clearInterval(loadingInterval);
    clearInterval(progressInterval);
    updateProgress(100);
}

// ========================================
// Fonctions utilitaires
// ========================================

async function fetchAPI(endpoint, timeout = 60000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Timeout: le serveur met trop de temps à répondre');
        }
        console.error(`Erreur lors de la récupération de ${endpoint}:`, error);
        throw error;
    }
}

// Ping initial pour réveiller le serveur
async function warmupServer() {
    try {
        const startTime = Date.now();
        await fetch(`${API_BASE_URL}/ping`, { 
            method: 'GET',
            mode: 'cors'
        });
        const duration = Date.now() - startTime;
        console.log(`Serveur réveillé en ${duration}ms`);
        return true;
    } catch (error) {
        console.warn('Ping échoué, tentative de chargement direct...', error);
        return false;
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const months = [
        'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
        'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
    ];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

// ========================================
// Ping pour garder le serveur éveillé
// ========================================

function startPingInterval() {
    // Ping toutes les 5 minutes pour garder le serveur éveillé
    setInterval(async () => {
        try {
            await fetch(`${API_BASE_URL}/ping`);
            console.log('Ping envoyé au serveur');
        } catch (error) {
            console.error('Erreur ping:', error);
        }
    }, 5 * 60 * 1000); // 5 minutes
}

// ========================================
// Chargement des données
// ========================================

async function loadAllData(useCache = true) {
    // Essayer de charger depuis le cache d'abord
    if (useCache) {
        const cachedData = getCachedData();
        if (cachedData) {
            portfolioData = cachedData;
            return cachedData;
        }
    }
    
    // Sinon charger depuis l'API
    try {
        portfolioData = await fetchAPI('/all');
        
        // Mettre en cache les nouvelles données
        if (portfolioData) {
            setCachedData(portfolioData);
        }
        
        return portfolioData;
    } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        
        // En cas d'erreur, essayer de retourner les données du cache même expirées
        const fallbackCache = localStorage.getItem(CACHE_KEY);
        if (fallbackCache) {
            try {
                const { data } = JSON.parse(fallbackCache);
                console.log('Utilisation du cache de secours');
                return data;
            } catch (e) {
                return null;
            }
        }
        return null;
    }
}

// Rafraîchir les données en arrière-plan ET mettre à jour l'UI en temps réel
async function refreshDataInBackground() {
    try {
        console.log('Rafraîchissement des données en arrière-plan...');
        const freshData = await fetchAPI('/all');
        if (freshData) {
            // Vérifier si les données ont changé avant de re-render
            const oldCache = localStorage.getItem(CACHE_KEY);
            const oldData = oldCache ? JSON.parse(oldCache).data : null;
            
            // Mettre à jour le cache
            setCachedData(freshData);
            
            // Mettre à jour l'UI en temps réel si les données ont changé
            if (JSON.stringify(freshData) !== JSON.stringify(oldData)) {
                console.log('Nouvelles données détectées, mise à jour de l\'interface...');
                renderAllSections(freshData);
            } else {
                console.log('Données identiques, pas de mise à jour nécessaire');
            }
        }
    } catch (error) {
        console.warn('Rafraîchissement en arrière-plan échoué:', error);
    }
}

// ========================================
// Rendu des sections
// ========================================

function renderPortfolio(data) {
    if (!data || !data.portfolio) return;

    const portfolio = data.portfolio;

    // Hero
    document.getElementById('first-name').textContent = portfolio.first_name || 'Prénom';
    document.getElementById('last-name').textContent = portfolio.last_name || 'Nom';
    document.title = `Portfolio - ${portfolio.first_name} ${portfolio.last_name}`;

    // Profil
    if (portfolio.photo_url) {
        document.getElementById('profil-photo').src = portfolio.photo_url;
    }
    document.getElementById('profil-bio').textContent = portfolio.bio || '';
    document.getElementById('promo-years').textContent = `${portfolio.year_start} — ${portfolio.year_end}`;

    // Stats
    document.getElementById('stat-competences').textContent = data.competences?.length || 0;
    document.getElementById('stat-projects').textContent = data.projects?.length || 0;
    document.getElementById('stat-stages').textContent = data.stages?.length || 0;

    // Contact
    document.getElementById('contact-message').textContent = portfolio.contact_message || '';
    document.getElementById('contact-email').textContent = portfolio.email || '';
    document.getElementById('email-cta').href = `mailto:${portfolio.email}`;

    if (portfolio.linkedin_url) {
        document.getElementById('contact-linkedin').href = portfolio.linkedin_url;
    }
    if (portfolio.github_url) {
        document.getElementById('contact-github').href = portfolio.github_url;
    }

    // Footer
    document.getElementById('footer-name').textContent = `Portfolio BTS SIO SLAM — ${portfolio.first_name} ${portfolio.last_name}`;
    document.getElementById('footer-years').textContent = `© ${portfolio.year_start} — ${portfolio.year_end}`;
}

function renderCompetences(competences) {
    if (!competences || !competences.length) return;

    const container = document.getElementById('competences-grid');
    container.innerHTML = '';

    // Grouper par bloc
    const blocs = {};
    competences.forEach(comp => {
        if (!blocs[comp.bloc]) {
            blocs[comp.bloc] = [];
        }
        blocs[comp.bloc].push(comp);
    });

    // Générer le HTML pour chaque bloc
    Object.keys(blocs).sort().forEach(bloc => {
        const blocClass = bloc.toLowerCase();
        const comps = blocs[bloc];

        const blocHtml = `
            <div class="competence-bloc ${blocClass}">
                <div class="bloc-header">
                    <div class="bloc-icon">${bloc}</div>
                    <h3 class="bloc-title">Bloc ${bloc}</h3>
                </div>
                <div class="competences-list">
                    ${comps.map(comp => `
                        <div class="competence-item">
                            <span class="competence-code">${comp.code}</span>
                            <p class="competence-label">${comp.label}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        container.innerHTML += blocHtml;
    });
}

function renderStages(stages) {
    if (!stages || !stages.length) {
        document.querySelector('.stages-section')?.classList.add('hidden');
        return;
    }

    document.querySelector('.stages-section')?.classList.remove('hidden');
    const container = document.getElementById('stages-timeline');
    container.innerHTML = '';

    stages.forEach((stage, index) => {
        const isRight = index % 2 === 1;
        const hasCompetences = stage.competences && stage.competences.length > 0;

        const stageHtml = `
            <div class="timeline-item ${isRight ? 'right' : ''}">
                <div class="timeline-dot"></div>
                <div class="stage-card" ${isRight ? 'style="grid-column: 2;"' : ''}>
                    <div class="stage-header">
                        <div>
                            <p class="stage-dates">${formatDate(stage.start_date)} — ${formatDate(stage.end_date)}</p>
                            <h4 class="stage-company">${stage.company?.name || 'Entreprise'}</h4>
                            <p class="stage-meta">${stage.company?.sector || ''} — ${stage.role || ''}</p>
                        </div>
                        <span class="stage-duration">${stage.duration || ''}</span>
                    </div>
                    <p class="stage-description">${stage.description || ''}</p>
                    ${hasCompetences ? `
                        <div class="stage-competences">
                            <span class="competences-label">COMPÉTENCES:</span>
                            ${stage.competences.map(comp => `
                                <span class="competence-tag">${comp.code}</span>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
                ${isRight ? '' : '<div></div>'}
            </div>
        `;

        container.innerHTML += stageHtml;
    });
}

function renderFormations(formations) {
    if (!formations || !formations.length) {
        document.querySelector('.formations-section')?.classList.add('hidden');
        return;
    }

    document.querySelector('.formations-section')?.classList.remove('hidden');
    const container = document.getElementById('formations-timeline');
    container.innerHTML = '';

    formations.forEach((formation, index) => {
        const isRight = index % 2 === 1;
        const period = formation.period || `${formatDate(formation.start_date)} — ${formation.is_current ? 'En cours' : formatDate(formation.end_date)}`;

        const formationHtml = `
            <div class="timeline-item ${isRight ? 'right' : ''}">
                <div class="timeline-dot"></div>
                <div class="stage-card formation-card" ${isRight ? 'style="grid-column: 2;"' : ''}>
                    <div class="stage-header">
                        <div>
                            <p class="stage-dates">${period}</p>
                            <h4 class="stage-company">${formation.title || 'Formation'}</h4>
                            <p class="stage-meta">${formation.school || ''} ${formation.location ? '— ' + formation.location : ''}</p>
                        </div>
                        ${formation.degree_type ? `<span class="stage-duration">${formation.degree_type}</span>` : ''}
                    </div>
                    ${formation.description ? `<p class="stage-description">${formation.description}</p>` : ''}
                    ${formation.logo_url ? `
                        <div class="formation-logo">
                            <img src="${formation.logo_url}" alt="${formation.school}" />
                        </div>
                    ` : ''}
                </div>
                ${isRight ? '' : '<div></div>'}
            </div>
        `;

        container.innerHTML += formationHtml;
    });
}

function renderRealisations(data) {
    if (!data || !data.realisations || !data.companies) return;

    const container = document.getElementById('realisations-by-company');
    container.innerHTML = '';

    const realisationsByCompany = data.realisationsByCompany || {};
    
    // Collecte toutes les réalisations dans un tableau aplati
    allRealisations = [];
    data.companies.forEach(company => {
        const companyRealisations = realisationsByCompany[company.id];
        if (companyRealisations && companyRealisations.length) {
            companyRealisations.forEach(real => {
                allRealisations.push({ ...real, company });
            });
        }
    });

    // Reset la page et affiche
    realisationsPage = 0;
    renderRealisationsPage();
    initRealisationsPagination();
}

function renderRealisationsPage() {
    const container = document.getElementById('realisations-by-company');
    container.innerHTML = '';
    
    const start = realisationsPage * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const pageItems = allRealisations.slice(start, end);
    
    pageItems.forEach(real => {
        const realHtml = `
            <a href="realisation/page.html?id=${real.id}" class="realisation-card-link">
                <div class="realisation-card">
                    <div class="realisation-card-header">
                        ${real.company?.photo_url ? `<img src="${real.company.photo_url}" alt="${real.company.name}" class="realisation-company-logo" />` : ''}
                        <span class="realisation-company-name">${real.company?.name || ''}</span>
                    </div>
                    <span class="realisation-type">${real.type === 'stage' ? 'Stage' : 'Projet'}</span>
                    <h4 class="realisation-title">${real.title}</h4>
                    <p class="realisation-description">${real.description || ''}</p>
                    ${real.tags && real.tags.length ? `
                        <div class="realisation-tags">
                            ${real.tags.map(tag => `<span class="tag">${tag.tag}</span>`).join('')}
                        </div>
                    ` : ''}
                    <span class="card-arrow">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                    </span>
                </div>
            </a>
        `;
        container.innerHTML += realHtml;
    });
    
    updateRealisationsDots();
    updateRealisationsArrows();
}

function initRealisationsPagination() {
    const prevBtn = document.getElementById('realisations-prev');
    const nextBtn = document.getElementById('realisations-next');
    const dotsContainer = document.getElementById('realisations-dots');
    
    const totalPages = Math.ceil(allRealisations.length / ITEMS_PER_PAGE);
    
    // Créer les dots
    dotsContainer.innerHTML = '';
    for (let i = 0; i < totalPages; i++) {
        const dot = document.createElement('button');
        dot.className = `pagination-dot ${i === 0 ? 'active' : ''}`;
        dot.setAttribute('aria-label', `Page ${i + 1}`);
        dot.addEventListener('click', () => {
            realisationsPage = i;
            renderRealisationsPage();
        });
        dotsContainer.appendChild(dot);
    }
    
    // Event listeners pour les flèches
    prevBtn.onclick = () => {
        if (realisationsPage > 0) {
            realisationsPage--;
            renderRealisationsPage();
        }
    };
    
    nextBtn.onclick = () => {
        if (realisationsPage < totalPages - 1) {
            realisationsPage++;
            renderRealisationsPage();
        }
    };
    
    updateRealisationsArrows();
}

function updateRealisationsDots() {
    const dots = document.querySelectorAll('#realisations-dots .pagination-dot');
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === realisationsPage);
    });
}

function updateRealisationsArrows() {
    const prevBtn = document.getElementById('realisations-prev');
    const nextBtn = document.getElementById('realisations-next');
    const totalPages = Math.ceil(allRealisations.length / ITEMS_PER_PAGE);
    
    prevBtn.disabled = realisationsPage === 0;
    nextBtn.disabled = realisationsPage >= totalPages - 1;
    
    // Masquer si une seule page
    const container = document.querySelector('#realisations-by-company').closest('.paginated-container');
    const dotsContainer = document.getElementById('realisations-dots');
    if (totalPages <= 1) {
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
        dotsContainer.style.display = 'none';
    } else {
        prevBtn.style.display = '';
        nextBtn.style.display = '';
        dotsContainer.style.display = '';
    }
}

function renderProjects(projects) {
    if (!projects || !projects.length) return;

    allProjects = projects;
    projectsPage = 0;
    renderProjectsPage();
    initProjectsPagination();
}

function renderProjectsPage() {
    const container = document.getElementById('projects-grid');
    container.innerHTML = '';

    const typeColors = {
        'Application Web': '#000DFF',
        'Application Mobile': '#6B73FF',
        'Script & Automatisation': '#3b44d1',
        'Base de données': '#8b92ff',
    };

    const start = projectsPage * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const pageItems = allProjects.slice(start, end);

    pageItems.forEach(projet => {
        const color = typeColors[projet.type] || '#6B73FF';

        const projectHtml = `
            <a href="projet/page.html?id=${projet.id}" class="project-card-link">
                <div class="project-card">
                    <div class="project-image" style="background: linear-gradient(135deg, ${color}15, ${color}05);">
                        <div class="project-decoration-1" style="background: ${color};"></div>
                        <div class="project-decoration-2" style="background: ${color};"></div>
                        <div class="project-icon" style="background: ${color}; box-shadow: 0 8px 24px ${color}40;">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                                <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3M3 16v3a2 2 0 002 2h3m8 0h3a2 2 0 002-2v-3" stroke="white" stroke-width="2" stroke-linecap="round" />
                            </svg>
                        </div>
                        <span class="project-year" style="color: ${color};">${projet.year}</span>
                    </div>
                    <div class="project-content">
                        <span class="project-type" style="color: ${color}; background: ${color}12; border: 1px solid ${color}25;">${projet.type}</span>
                        <h3 class="project-title">${projet.title}</h3>
                        <p class="project-description">${projet.description || ''}</p>
                        ${projet.tags && projet.tags.length ? `
                            <div class="project-tags">
                                ${projet.tags.map(tag => `<span class="tag">${tag.tag}</span>`).join('')}
                            </div>
                        ` : ''}
                    </div>
                    <span class="card-arrow">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                    </span>
                </div>
            </a>
        `;

        container.innerHTML += projectHtml;
    });
    
    updateProjectsDots();
    updateProjectsArrows();
}

function initProjectsPagination() {
    const prevBtn = document.getElementById('projects-prev');
    const nextBtn = document.getElementById('projects-next');
    const dotsContainer = document.getElementById('projects-dots');
    
    const totalPages = Math.ceil(allProjects.length / ITEMS_PER_PAGE);
    
    // Créer les dots
    dotsContainer.innerHTML = '';
    for (let i = 0; i < totalPages; i++) {
        const dot = document.createElement('button');
        dot.className = `pagination-dot ${i === 0 ? 'active' : ''}`;
        dot.setAttribute('aria-label', `Page ${i + 1}`);
        dot.addEventListener('click', () => {
            projectsPage = i;
            renderProjectsPage();
        });
        dotsContainer.appendChild(dot);
    }
    
    // Event listeners pour les flèches
    prevBtn.onclick = () => {
        if (projectsPage > 0) {
            projectsPage--;
            renderProjectsPage();
        }
    };
    
    nextBtn.onclick = () => {
        const totalPages = Math.ceil(allProjects.length / ITEMS_PER_PAGE);
        if (projectsPage < totalPages - 1) {
            projectsPage++;
            renderProjectsPage();
        }
    };
    
    updateProjectsArrows();
}

function updateProjectsDots() {
    const dots = document.querySelectorAll('#projects-dots .pagination-dot');
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === projectsPage);
    });
}

function updateProjectsArrows() {
    const prevBtn = document.getElementById('projects-prev');
    const nextBtn = document.getElementById('projects-next');
    const totalPages = Math.ceil(allProjects.length / ITEMS_PER_PAGE);
    
    prevBtn.disabled = projectsPage === 0;
    nextBtn.disabled = projectsPage >= totalPages - 1;
    
    // Masquer si une seule page
    const dotsContainer = document.getElementById('projects-dots');
    if (totalPages <= 1) {
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
        dotsContainer.style.display = 'none';
    } else {
        prevBtn.style.display = '';
        nextBtn.style.display = '';
        dotsContainer.style.display = '';
    }
}

// ========================================
// Navigation
// ========================================

function initNavbar() {
    const navbar = document.getElementById('navbar');
    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobile-menu');

    // Gestion du scroll
    window.addEventListener('scroll', () => {
        if (window.scrollY > 40) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Gestion du menu mobile
    hamburger.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
    });

    // Fermer le menu mobile au clic sur un lien
    document.querySelectorAll('.nav-mobile-link').forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.add('hidden');
        });
    });
}

// ========================================
// Initialisation
// ========================================

async function renderAllSections(data) {
    if (!data) return false;
    
    renderPortfolio(data);
    renderStages(data.stages);
    renderRealisations(data);
    renderProjects(data.projects);
    
    // Charger les formations (peut être dans /all ou séparément)
    if (data.formations) {
        renderFormations(data.formations);
    } else {
        try {
            const response = await fetchAPI('/formations');
            const formations = response?.data || response;
            renderFormations(formations);
        } catch (error) {
            console.warn('Erreur lors du chargement des formations:', error);
        }
    }
    
    // Charger les messages séparément (endpoint différent)
    try {
        const response = await fetchAPI('/messages');
        const messages = response?.data || response;
        renderMessages(messages);
    } catch (error) {
        console.warn('Erreur lors du chargement des messages:', error);
    }
    
    return true;
}

// ========================================
// Messages Carousel
// ========================================

function renderMessages(messages) {
    const section = document.getElementById('messages-section');
    const carousel = document.getElementById('messages-carousel');
    const nav = document.getElementById('messages-nav');
    
    if (!messages || !messages.length) {
        section.classList.add('hidden');
        return;
    }
    
    // Filtrer les messages actifs (l'API peut déjà le faire, mais double vérification)
    allMessages = messages.filter(msg => msg.is_active);
    
    if (!allMessages.length) {
        section.classList.add('hidden');
        return;
    }
    
    section.classList.remove('hidden');
    carousel.innerHTML = '';
    
    // Icônes disponibles
    const icons = {
        'briefcase': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>',
        'search': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>',
        'star': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
        'info': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
        'alert': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
        'calendar': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
        'default': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>'
    };
    
    // Types avec couleurs
    const typeClasses = {
        'urgent': 'message-urgent',
        'warning': 'message-warning',
        'success': 'message-success',
        'info': 'message-info'
    };
    
    allMessages.forEach((msg, index) => {
        const typeClass = typeClasses[msg.type] || 'message-info';
        const icon = icons[msg.icon] || icons['default'];
        
        const messageHtml = `
            <div class="message-slide ${index === 0 ? 'active' : ''}" data-index="${index}">
                <div class="message-card ${typeClass}">
                    <div class="message-icon">${icon}</div>
                    <div class="message-content">
                        ${msg.title ? `<h4 class="message-title">${msg.title}</h4>` : ''}
                        <p class="message-text">${msg.message}</p>
                        ${msg.link_url ? `
                            <a href="${msg.link_url}" class="message-link" target="_blank" rel="noopener">
                                ${msg.link_text || 'En savoir plus'}
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M5 12h14M12 5l7 7-7 7"/>
                                </svg>
                            </a>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        carousel.innerHTML += messageHtml;
    });
    
    // Navigation
    if (allMessages.length > 1) {
        nav.classList.remove('hidden');
        initMessagesCarousel();
    } else {
        nav.classList.add('hidden');
    }
}

function initMessagesCarousel() {
    const prevBtn = document.getElementById('messages-prev');
    const nextBtn = document.getElementById('messages-next');
    const dotsContainer = document.getElementById('messages-dots');
    
    // Créer les dots
    dotsContainer.innerHTML = '';
    allMessages.forEach((_, index) => {
        const dot = document.createElement('button');
        dot.className = `message-dot ${index === 0 ? 'active' : ''}`;
        dot.setAttribute('aria-label', `Message ${index + 1}`);
        dot.addEventListener('click', () => goToMessage(index));
        dotsContainer.appendChild(dot);
    });
    
    // Event listeners
    prevBtn.onclick = () => navigateMessages(-1);
    nextBtn.onclick = () => navigateMessages(1);
    
    // Auto-slide toutes les 5 secondes
    startMessagesAutoSlide();
    
    // Pause on hover
    const carousel = document.getElementById('messages-carousel');
    carousel.addEventListener('mouseenter', stopMessagesAutoSlide);
    carousel.addEventListener('mouseleave', startMessagesAutoSlide);
}

function navigateMessages(direction) {
    messagesIndex += direction;
    
    if (messagesIndex < 0) messagesIndex = allMessages.length - 1;
    if (messagesIndex >= allMessages.length) messagesIndex = 0;
    
    updateMessagesSlide();
}

function goToMessage(index) {
    messagesIndex = index;
    updateMessagesSlide();
}

function updateMessagesSlide() {
    const slides = document.querySelectorAll('.message-slide');
    const dots = document.querySelectorAll('.message-dot');
    
    slides.forEach((slide, i) => {
        slide.classList.toggle('active', i === messagesIndex);
    });
    
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === messagesIndex);
    });
}

function startMessagesAutoSlide() {
    stopMessagesAutoSlide();
    if (allMessages.length > 1) {
        messagesAutoSlide = setInterval(() => navigateMessages(1), 5000);
    }
}

function stopMessagesAutoSlide() {
    if (messagesAutoSlide) {
        clearInterval(messagesAutoSlide);
        messagesAutoSlide = null;
    }
}

function hideLoadingOverlay() {
    stopLoadingAnimation();
    setTimeout(() => {
        const loadingOverlay = document.getElementById('loading-overlay');
        loadingOverlay.classList.add('fade-out');
        setTimeout(() => {
            loadingOverlay.style.display = 'none';
        }, 500);
    }, 300);
}

async function init() {
    // Initialiser la navigation
    initNavbar();

    // Vérifier si on a des données en cache
    const cachedData = getCachedData();
    
    if (cachedData) {
        // Affichage instantané depuis le cache !
        console.log('Affichage instantané depuis le cache');
        document.getElementById('loader-status').textContent = "Chargement instantané...";
        document.getElementById('loader-tip').textContent = "Données locales disponibles";
        updateProgress(100);
        
        renderAllSections(cachedData);
        hideLoadingOverlay();
        
        // Rafraîchir les données en arrière-plan pour la prochaine visite
        startPingInterval();
        refreshDataInBackground();
        return;
    }

    // Pas de cache : chargement complet avec animation
    startLoadingAnimation();
    startPingInterval();

    try {
        // D'abord réveiller le serveur avec un ping
        await warmupServer();
        
        // Mettre à jour le message
        document.getElementById('loader-status').textContent = "Chargement des données...";
        updateProgress(50);
        
        // Charger toutes les données (sans cache car on sait qu'il n'y en a pas)
        const data = await loadAllData(false);

        if (data) {
            updateProgress(80);
            renderAllSections(data);
            updateProgress(100);
        } else {
            throw new Error('Aucune donnée reçue');
        }
    } catch (error) {
        console.error('Erreur lors de l\'initialisation:', error);
        document.getElementById('loader-status').textContent = "Oops, une erreur s'est produite";
        document.getElementById('loader-tip').textContent = "Veuillez rafraîchir la page pour réessayer";
    } finally {
        hideLoadingOverlay();
    }
}

// Lancer l'initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', init);
