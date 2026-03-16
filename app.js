// Configuration de l'API
const API_BASE_URL = 'https://portfolio-mlb3.onrender.com/api'; // URL de l'API Laravel
const BASE_URL = 'https://portfolio-mlb3.onrender.com';

// Clé de cache localStorage
const CACHE_KEY = 'portfolio_data_cache';
const MESSAGES_CACHE_KEY = 'portfolio_messages_cache';
const FORMATIONS_CACHE_KEY = 'portfolio_formations_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 heures en millisecondes
const MESSAGES_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes pour les messages (changent souvent)

// Cache des données
let portfolioData = null;

// ========================================
// Helper pour les images (Cloudflare R2) - Nouvelle API
// ========================================

function getImageUrl(img) {
    if (!img) return '';
    // Si c'est une string, c'est déjà l'URL
    if (typeof img === 'string') {
        if (img.startsWith('http')) return img;
        return `${img.startsWith('/') ? '' : '/'}${img}`;
    }
    // Chercher les propriétés communes pour l'URL
    const url = img.url || img.image_url || img.path || img.src || img.file || img.photo_url || '';
    if (!url) return '';
    // Si l'URL est déjà absolue (Cloudflare R2 ou autre)
    if (url.startsWith('http')) return url;
    // Sinon, ajouter le base URL
    return `${url.startsWith('/') ? '' : '/'}${url}`;
}

function getImageAlt(img, fallback) {
    if (!img) return fallback;
    if (typeof img === 'string') return fallback;
    return img.alt || img.caption || img.title || img.description || fallback;
}

// ========================================
// Gestion des erreurs API robuste
// ========================================

function handleApiError(error, context = 'API') {
    const errorMsg = error.message || 'Une erreur est survenue';
    console.error(`[${context}] Erreur:`, error);
    
    // Afficher notification discrète si possible
    if (context !== 'Photo Profil') { // Éviter le spam pour les petits éléments
        showNotification(errorMsg, 'error', 5000);
    }
    
    // Déterminer le type d'erreur
    if (error.statusCode === 404 || errorMsg.includes('404')) {
        console.warn(`[${context}] Ressource non trouvée`);
    } else if (error.statusCode === 422 || errorMsg.includes('422')) {
        console.warn(`[${context}] Données invalides`);
    } else {
        console.error(`[${context}] Erreur serveur (${error.statusCode || 500})`);
    }
}

function parseApiResponse(response) {
    // Structure API: { success: boolean, message?: string, data: any } ou { error: string }
    // Les requêtes GET retournent directement les données ou { success, message, data }
    
    // Si la réponse a un champ success explicite
    if (response && typeof response === 'object' && 'success' in response) {
        if (!response.success) {
            const error = new Error(response.error || response.message || 'Erreur API');
            error.statusCode = response.statusCode || 500;
            throw error;
        }
        return response.data;
    }
    
    // Si la réponse a un champ error
    if (response && typeof response === 'object' && 'error' in response) {
        throw new Error(response.error);
    }
    
    // Sinon, retourner directement (GET routes retournent les données directement)
    return response;
}

// ========================================
// Notifications visuelles
// ========================================

function showNotification(message, type = 'info', duration = 5000) {
    try {
        // Créer conteneur de notifications s'il n'existe pas
        let notificationContainer = document.getElementById('notification-container');
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.id = 'notification-container';
            notificationContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 10px;
                max-width: 400px;
            `;
            document.body.appendChild(notificationContainer);
        }

        // Créer notification
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            padding: 16px 20px;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
            animation: slideIn 0.3s ease-out;
            display: flex;
            align-items: center;
            gap: 12px;
        `;

        // Styles basés sur le type
        const styles = {
            'error': {
                bg: '#FFE8E8',
                text: '#C41E3A',
                icon: '⚠️'
            },
            'success': {
                bg: '#E8F5E9',
                text: '#2E7D32',
                icon: '✅'
            },
            'info': {
                bg: '#E3F2FD',
                text: '#1565C0',
                icon: 'ℹ️'
            },
            'warning': {
                bg: '#FFF3E0',
                text: '#E65100',
                icon: '⚡'
            }
        };

        const style = styles[type] || styles['info'];
        notification.style.backgroundColor = style.bg;
        notification.style.color = style.text;
        notification.style.border = `1px solid ${style.text}30`;

        // Contenu
        notification.innerHTML = `
            <span style="font-size: 18px; flex-shrink: 0;">${style.icon}</span>
            <span style="flex: 1; font-size: 0.95rem; line-height: 1.4;">${message}</span>
            <button style="
                background: none;
                border: none;
                color: inherit;
                cursor: pointer;
                font-size: 20px;
                padding: 0;
                flex-shrink: 0;
            " onclick="this.parentElement.remove();">✕</button>
        `;

        notificationContainer.appendChild(notification);

        // Auto-remove
        if (duration > 0) {
            setTimeout(() => {
                notification.style.animation = 'slideOut 0.3s ease-out forwards';
                setTimeout(() => notification.remove(), 300);
            }, duration);
        }
    } catch (e) {
        console.warn('Erreur affichage notification:', e);
    }
}

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
    localStorage.removeItem(MESSAGES_CACHE_KEY);
    localStorage.removeItem(FORMATIONS_CACHE_KEY);
    console.log('Cache vidé');
}

// Fonctions génériques pour cache avec durée personnalisée
function getCachedItem(key) {
    try {
        const cached = localStorage.getItem(key);
        if (!cached) return null;
        
        const { data, timestamp, duration } = JSON.parse(cached);
        const maxDuration = duration || CACHE_DURATION;
        const isExpired = Date.now() - timestamp > maxDuration;
        
        if (isExpired) {
            localStorage.removeItem(key);
            return null;
        }
        
        return data;
    } catch (error) {
        return null;
    }
}

function setCachedItem(key, data, duration = CACHE_DURATION) {
    try {
        const cacheEntry = {
            data: data,
            timestamp: Date.now(),
            duration: duration
        };
        localStorage.setItem(key, JSON.stringify(cacheEntry));
    } catch (error) {
        console.warn('Erreur lors de la mise en cache:', error);
    }
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
    { status: "Finalisation...", tip: "Le serveur est maintenant actif" },
    { status: "C'est parti !", tip: "Merci pour votre patience, profitez du portfolio !" ,
    }

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
            method: 'GET',
            mode: 'cors',
            credentials: 'omit',
            signal: controller.signal
            // GET sans body - pas de headers pour requête SIMPLE (sans preflight)
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return parseApiResponse(data);
    } catch (error) {
        clearTimeout(timeoutId);
        
        // Détection des erreurs CORS
        if (error.message.includes('Failed to fetch') || 
            error.name === 'TypeError') {
            console.error(`❌ Erreur CORS sur ${endpoint}`);
            const corsError = new Error(`Erreur rapport au serveur: ${endpoint}`);
            corsError.isCorsError = true;
            throw corsError;
        }
        
        if (error.name === 'AbortError') {
            throw new Error('⏱️ Timeout: le serveur met trop de temps à répondre');
        }
        
        console.error(`Erreur lors de la récupération de ${endpoint}:`, error);
        throw error;
    }
}

// Ping initial pour réveiller le serveur
async function warmupServer() {
    try {
        const startTime = Date.now();
        const response = await fetch(`${API_BASE_URL}/ping`, { 
            method: 'GET',
            mode: 'cors',
            credentials: 'omit'
            // GET sans body - pas de headers pour requête SIMPLE
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const duration = Date.now() - startTime;
        console.log(`✅ Serveur réveillé en ${duration}ms`);
        return true;
    } catch (error) {
        if (error.message.includes('Failed to fetch')) {
            console.warn('⚠️ Problème CORS au démarrage - Utilisation du cache');
        } else {
            console.warn('⚠️ Ping échoué, tentative de chargement direct...', error.message);
        }
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
            const response = await fetch(`${API_BASE_URL}/ping`, {
                method: 'GET',
                mode: 'cors',
                credentials: 'omit'
                // GET sans body - pas de headers pour requête SIMPLE
            });
            
            if (response.ok) {
                console.log('✅ Ping envoyé au serveur');
            }
        } catch (error) {
            console.debug('⚠️ Erreur ping en arrière-plan (non critique)');
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
            console.log('✅ Données chargées depuis le cache local');
            return cachedData;
        }
    }
    
    // Sinon charger depuis l'API
    try {
        console.log('🔄 Chargement depuis l\'API...');
        const response = await fetchAPI('/all');
        portfolioData = response;
        
        // Mettre en cache les nouvelles données
        if (portfolioData) {
            setCachedData(portfolioData);
            console.log('✅ Données chargées depuis l\'API et mises en cache');
        }
        
        return portfolioData;
    } catch (error) {
        console.error('❌ Erreur lors du chargement depuis l\'API:', error.message);
        
        // Afficher un message d'erreur clair
        if (error.isCorsError) {
            console.error('⚠️ Problème CORS détecté - Le serveur n\'a pas configuré les en-têtes CORS');
            showNotification(
                'Impossible de charger les données du serveur. Utilisation du cache local.',
                'warning',
                6000
            );
        } else {
            handleApiError(error, 'Chargement principal');
            showNotification(
                error.message || 'Erreur lors du chargement des données',
                'error',
                6000
            );
        }
        
        // En cas d'erreur, essayer de retourner les données du cache même expirées
        const fallbackCache = localStorage.getItem(CACHE_KEY);
        if (fallbackCache) {
            try {
                const { data } = JSON.parse(fallbackCache);
                console.warn('⚠️ Utilisation du cache de secours (données possiblement anciennes)');
                return data;
            } catch (e) {
                console.error('❌ Cache de secours invalide:', e);
                return null;
            }
        }
        
        console.error('❌ Aucune donnée disponible (pas de cache)');
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
            
            // Mettre à jour le cache principal
            setCachedData(freshData);
            
            // Mettre à jour le cache des formations si présentes dans /all
            if (freshData.formations) {
                setCachedItem(FORMATIONS_CACHE_KEY, freshData.formations, CACHE_DURATION);
            }
            
            // Mettre à jour l'UI en temps réel si les données ont changé
            if (JSON.stringify(freshData) !== JSON.stringify(oldData)) {
                console.log('Nouvelles données détectées, mise à jour de l\'interface...');
                renderAllSections(freshData);
            } else {
                console.log('Données identiques, pas de mise à jour nécessaire');
                // Quand même rafraîchir les messages (changent souvent)
                refreshMessagesInBackground();
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
        try {
            const photoProfil = document.getElementById('profil-photo');
            const imgUrl = getImageUrl(portfolio.photo_url);
            photoProfil.src = imgUrl;
            photoProfil.alt = `${portfolio.first_name || 'Profil'} ${portfolio.last_name || ''}`;
            photoProfil.loading = 'lazy';
            photoProfil.style.objectFit = 'cover';
            photoProfil.onerror = () => {
                console.warn('Erreur chargement photo profil:', imgUrl);
                photoProfil.style.opacity = '0.5';
            };
        } catch (error) {
            handleApiError(error, 'Photo Profil');
        }
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

    // Trier les stages par date de fin (le plus récent en premier)
    const sortedStages = [...stages].sort((a, b) => {
        const dateA = new Date(a.end_date || a.start_date);
        const dateB = new Date(b.end_date || b.start_date);
        return dateB - dateA;
    });

    sortedStages.forEach((stage, index) => {
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

    // Trier les formations par date de fin (le plus récent en premier)
    const sortedFormations = [...formations].sort((a, b) => {
        const dateA = new Date(a.end_date || a.start_date);
        const dateB = new Date(b.end_date || b.start_date);
        return dateB - dateA;
    });

    sortedFormations.forEach((formation, index) => {
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
                            <img src="${getImageUrl(formation.logo_url)}" 
                                 alt="${formation.school}" 
                                 loading="lazy" 
                                 onerror="this.style.display='none'; this.parentElement.style.display='none';" />
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

    // Trier les réalisations par date de fin (le plus récent en premier)
    allRealisations.sort((a, b) => {
        const dateA = new Date(a.end_date || a.start_date);
        const dateB = new Date(b.end_date || b.start_date);
        return dateB - dateA;
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
    
    const typeColors = {
        'stage': '#000DFF',
        'projet': '#6B73FF',
    };
    
    pageItems.forEach(real => {
        const companyColor = real.company?.id ? parseInt(real.company.id.toString()) % 4 : 0;
        const colors = ['#FF6B6B', '#FFA726', '#29B6F6', '#66BB6A'];
        const bgColor = colors[companyColor % 4];
        
        const realHtml = `
            <a href="realisation/page.html?id=${real.id}" class="realisation-card-link">
                <div class="realisation-card">
                    <div class="realisation-image" style="background: linear-gradient(135deg, ${bgColor}15, ${bgColor}05);">
                        ${real.company?.photo_url ? `
                            <img src="${getImageUrl(real.company.photo_url)}" 
                                 alt="${real.company.name}" 
                                 class="realisation-image-logo" 
                                 loading="lazy"
                                 onerror="this.style.display='none'; this.closest('.realisation-image').querySelector('.realisation-image-placeholder').style.display='flex';" />
                        ` : ''}
                        <div class="realisation-image-placeholder" style="background: ${bgColor}; ${real.company?.photo_url ? 'display: none;' : ''}">
                            <span>${real.company?.name?.charAt(0) || '?'}</span>
                        </div>
                        <div class="realisation-company-label" style="background: ${bgColor};">
                            ${real.company?.name || 'Entreprise'}
                        </div>
                    </div>
                    <div class="realisation-content">
                        <span class="realisation-type" style="color: ${bgColor}; background: ${bgColor}12;">${real.type === 'stage' ? 'Stage' : 'Réalisation'}</span>
                        <h4 class="realisation-title">${real.title}</h4>
                        <p class="realisation-description">${real.description || ''}</p>
                        ${real.tags && real.tags.length ? `
                            <div class="realisation-tags">
                                ${real.tags.map(tag => `<span class="tag">${tag.tag}</span>`).join('')}
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

    // Trier les projets par année (le plus récent en premier)
    allProjects = [...projects].sort((a, b) => {
        const yearA = parseInt(a.year) || 0;
        const yearB = parseInt(b.year) || 0;
        return yearB - yearA;
    });
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
        // Essayer le cache d'abord
        const cachedFormations = getCachedItem(FORMATIONS_CACHE_KEY);
        if (cachedFormations) {
            renderFormations(cachedFormations);
        } else {
            try {
                const response = await fetchAPI('/formations');
                const formations = response?.data || response;
                setCachedItem(FORMATIONS_CACHE_KEY, formations, CACHE_DURATION);
                renderFormations(formations);
            } catch (error) {
                console.warn('Erreur lors du chargement des formations:', error);
            }
        }
    }
    
    // Charger les messages (cache court car changent souvent)
    const cachedMessages = getCachedItem(MESSAGES_CACHE_KEY);
    if (cachedMessages) {
        renderMessages(cachedMessages);
        // Rafraîchir en arrière-plan quand même
        refreshMessagesInBackground();
    } else {
        try {
            const response = await fetchAPI('/messages');
            const messages = response?.data || response;
            setCachedItem(MESSAGES_CACHE_KEY, messages, MESSAGES_CACHE_DURATION);
            renderMessages(messages);
        } catch (error) {
            console.warn('Erreur lors du chargement des messages:', error);
        }
    }
    
    return true;
}

// Rafraîchir les messages en arrière-plan
async function refreshMessagesInBackground() {
    try {
        const response = await fetchAPI('/messages');
        const messages = response?.data || response;
        const oldMessages = getCachedItem(MESSAGES_CACHE_KEY);
        
        if (JSON.stringify(messages) !== JSON.stringify(oldMessages)) {
            console.log('Nouveaux messages détectés, mise à jour...');
            setCachedItem(MESSAGES_CACHE_KEY, messages, MESSAGES_CACHE_DURATION);
            renderMessages(messages);
        }
    } catch (error) {
        // Silencieux en arrière-plan
    }
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
    
    // Icône par défaut selon le type si pas d'icône spécifiée
    const defaultIcons = {
        'urgent': 'exclamation-triangle-fill',
        'warning': 'exclamation-circle-fill',
        'success': 'check-circle-fill',
        'info': 'info-circle-fill'
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
        // Utiliser l'icône Bootstrap spécifiée ou l'icône par défaut du type
        const iconName = msg.icon || defaultIcons[msg.type] || 'info-circle';
        
        const messageHtml = `
            <div class="message-slide ${index === 0 ? 'active' : ''}" data-index="${index}">
                <div class="message-card ${typeClass}">
                    <div class="message-icon"><i class="bi bi-${iconName}"></i></div>
                    <div class="message-content">
                        ${msg.title ? `<h4 class="message-title">${msg.title}</h4>` : ''}
                        <p class="message-text">${msg.message}</p>
                        ${msg.link_url ? `
                            <a href="${msg.link_url}" class="message-link" target="_blank" rel="noopener">
                                ${msg.link_text || 'En savoir plus'}
                                <i class="bi bi-arrow-right"></i>
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
        console.log('✅ Affichage instantané depuis le cache');
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
        console.log('⏳ Tentative de connexion au serveur...');
        await warmupServer();
        
        // Mettre à jour le message
        document.getElementById('loader-status').textContent = "Chargement des données...";
        updateProgress(50);
        
        // Charger toutes les données (accepte aussi le cache de secours en cas d'erreur)
        const data = await loadAllData(true);

        if (data && Object.keys(data).length > 0) {
            console.log('✅ Données chargées avec succès');
            updateProgress(80);
            renderAllSections(data);
            updateProgress(100);
        } else {
            throw new Error('❌ Aucune donnée disponible - Vérifiez votre connexion internet');
        }
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation:', error.message || error);
        
        // Afficher le message d'erreur spécifique
        let errorMessage = "Impossible de charger les données";
        let errorTip = "Veuillez vérifier votre connexion internet et rafraîchir la page";
        
        if (error.isCorsError) {
            errorMessage = "Problème de connexion au serveur";
            errorTip = "Le serveur API n'est pas correctement configuré. Utilisation du cache si disponible.";
        } else if (error.message.includes('Timeout')) {
            errorMessage = "Le serveur met trop de temps à répondre";
            errorTip = "Veuillez rafraîchir la page pour réessayer";
        }
        
        document.getElementById('loader-status').textContent = errorMessage;
        document.getElementById('loader-tip').textContent = errorTip;
        
        // Afficher notification
        showNotification(
            `${errorMessage}. ${errorTip}`,
            'error',
            10000
        );
    } finally {
        hideLoadingOverlay();
    }
}

// Lancer l'initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', init);

// ----------------------------------------
// Enable clickable contact cards (robust + accessible)
// ----------------------------------------
function enableContactCardsInteractions() {
    const cards = document.querySelectorAll('.contact-card');
    if (!cards || !cards.length) return;

    cards.forEach((card, idx) => {
        // Make focusable and keyboard-usable
        card.style.cursor = 'pointer';
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');

        // Prevent clicks on internal anchors from bubbling to the card
        card.querySelectorAll('a').forEach(a => a.addEventListener('click', e => e.stopPropagation()));

        // Determine action per card position (matches current HTML ordering)
        let handler = null;
        if (idx === 0) {
            const emailEl = document.getElementById('contact-email');
            if (emailEl) handler = () => { const em = emailEl.textContent.trim(); if (em) window.location.href = `mailto:${em}`; };
        } else if (idx === 1) {
            const ln = document.getElementById('contact-linkedin');
            if (ln) handler = () => { const href = ln.href; if (href && href !== '#') window.open(href, '_blank'); };
        } else if (idx === 2) {
            const gh = document.getElementById('contact-github');
            if (gh) handler = () => { const href = gh.href; if (href && href !== '#') window.open(href, '_blank'); };
        } else {
            // Fallback: open first internal link
            const a = card.querySelector('a');
            if (a && a.href) handler = () => { window.open(a.href, '_blank'); };
        }

        if (handler) {
            card.onclick = handler;
            card.onkeydown = (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(); }
            };
        }
    });
}

// Run once initially and re-run when contact cards change
document.addEventListener('DOMContentLoaded', () => {
    enableContactCardsInteractions();
    const container = document.querySelector('.contact-cards');
    if (container) {
        const mo = new MutationObserver(() => enableContactCardsInteractions());
        mo.observe(container, { childList: true, subtree: true });
    }
});
