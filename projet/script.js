// Configuration de l'API
const API_BASE_URL = 'https://portfolio-mlb3.onrender.com/api';

// Clé de cache localStorage
const CACHE_KEY = 'portfolio_data_cache';
const PROJECT_CACHE_PREFIX = 'project_detail_';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 heures

// ========================================
// Système de cache
// ========================================

function getCachedProject(id) {
    try {
        const cached = localStorage.getItem(PROJECT_CACHE_PREFIX + id);
        if (!cached) return null;
        
        const { data, timestamp } = JSON.parse(cached);
        const isExpired = Date.now() - timestamp > CACHE_DURATION;
        
        if (isExpired) {
            localStorage.removeItem(PROJECT_CACHE_PREFIX + id);
            return null;
        }
        
        return data;
    } catch (error) {
        return null;
    }
}

function setCachedProject(id, data) {
    try {
        const cacheEntry = { data, timestamp: Date.now() };
        localStorage.setItem(PROJECT_CACHE_PREFIX + id, JSON.stringify(cacheEntry));
    } catch (error) {
        console.warn('Erreur cache:', error);
    }
}

// Essayer de trouver le projet dans le cache global
function getProjectFromGlobalCache(id) {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached) return null;
        
        const { data } = JSON.parse(cached);
        if (data && data.projects) {
            return data.projects.find(p => p.id == id) || null;
        }
        return null;
    } catch (error) {
        return null;
    }
}

// ========================================
// Système de chargement
// ========================================

let progressInterval = null;
let currentProgress = 0;

function updateProgress(targetProgress) {
    const progressBar = document.getElementById('loader-progress-bar');
    if (progressBar) {
        currentProgress = Math.min(targetProgress, 95);
        progressBar.style.width = `${currentProgress}%`;
    }
}

function startLoadingAnimation() {
    currentProgress = 0;
    progressInterval = setInterval(() => {
        const increment = currentProgress < 30 ? 3 : currentProgress < 60 ? 5 : 2;
        updateProgress(currentProgress + increment);
    }, 300);
}

function stopLoadingAnimation() {
    clearInterval(progressInterval);
    updateProgress(100);
}

function hideLoadingOverlay() {
    stopLoadingAnimation();
    setTimeout(() => {
        const overlay = document.getElementById('loading-overlay');
        overlay.classList.add('fade-out');
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 500);
    }, 200);
}

// ========================================
// Fetch API
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
        throw error;
    }
}

// ========================================
// Rendu du projet
// ========================================

function renderProject(project) {
    const container = document.getElementById('project-content');
    
    // Mettre à jour le titre de la page
    document.title = `${project.title} - Portfolio BTS SIO`;
    
    const typeColors = {
        'Application Web': '#000DFF',
        'Application Mobile': '#6B73FF',
        'Script & Automatisation': '#3b44d1',
        'Base de données': '#8b92ff',
    };
    
    const color = typeColors[project.type] || '#6B73FF';
    
    let html = `
        <div class="detail-header" style="background: linear-gradient(135deg, ${color} 0%, ${color}cc 100%);">
            <span class="detail-type">${project.type || 'Projet'}</span>
            <h1 class="detail-title">${project.title}</h1>
            <p class="detail-year">${project.year || ''}</p>
        </div>
        <div class="detail-body">
    `;
    
    // Description
    if (project.description) {
        html += `
            <div class="detail-section">
                <h2 class="section-title">Description</h2>
                <p class="detail-description">${project.description}</p>
            </div>
        `;
    }
    
    // Contenu détaillé (si disponible depuis l'API détail)
    if (project.content) {
        html += `
            <div class="detail-section">
                <h2 class="section-title">Détails du projet</h2>
                <div class="detail-description">${project.content}</div>
            </div>
        `;
    }
    
    // Technologies / Tags
    if (project.tags && project.tags.length) {
        html += `
            <div class="detail-section">
                <h2 class="section-title">Technologies utilisées</h2>
                <div class="detail-tags">
                    ${project.tags.map(tag => `
                        <span class="detail-tag">${tag.tag || tag}</span>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // Compétences
    if (project.competences && project.competences.length) {
        html += `
            <div class="detail-section">
                <h2 class="section-title">Compétences mobilisées</h2>
                <div class="detail-competences">
                    ${project.competences.map(comp => `
                        <div class="competence-item">
                            <span class="competence-code">${comp.code}</span>
                            <span class="competence-label">${comp.label}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // Liens
    if (project.github_url || project.demo_url || project.url) {
        html += `
            <div class="detail-section">
                <h2 class="section-title">Liens</h2>
                <div class="detail-links">
        `;
        
        if (project.github_url) {
            html += `
                <a href="${project.github_url}" target="_blank" rel="noopener" class="detail-link secondary">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                    </svg>
                    Code source
                </a>
            `;
        }
        
        if (project.demo_url || project.url) {
            html += `
                <a href="${project.demo_url || project.url}" target="_blank" rel="noopener" class="detail-link primary">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
                    </svg>
                    Voir le projet
                </a>
            `;
        }
        
        html += `
                </div>
            </div>
        `;
    }
    
    html += `</div>`;
    
    container.innerHTML = html;
}

function renderError() {
    const container = document.getElementById('project-content');
    container.innerHTML = `
        <div class="error-message">
            <div class="error-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 8v4M12 16h.01"/>
                </svg>
            </div>
            <h2 class="error-title">Projet introuvable</h2>
            <p class="error-text">Ce projet n'existe pas ou a été supprimé.</p>
            <a href="../index.html#realisations" class="detail-link primary">
                Retour aux projets
            </a>
        </div>
    `;
}

// ========================================
// Navigation
// ========================================

function initNavbar() {
    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobile-menu');

    if (hamburger && mobileMenu) {
        hamburger.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });

        document.querySelectorAll('.nav-mobile-link').forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.add('hidden');
            });
        });
    }
}

// ========================================
// Initialisation
// ========================================

async function init() {
    initNavbar();
    
    // Récupérer l'ID du projet depuis l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');
    
    if (!projectId) {
        renderError();
        hideLoadingOverlay();
        return;
    }
    
    // Vérifier le cache spécifique du projet
    let cachedProject = getCachedProject(projectId);
    
    // Si pas de cache spécifique, chercher dans le cache global
    if (!cachedProject) {
        cachedProject = getProjectFromGlobalCache(projectId);
    }
    
    if (cachedProject) {
        // Affichage instantané depuis le cache
        console.log('Affichage depuis le cache');
        document.getElementById('loader-status').textContent = "Chargement instantané...";
        updateProgress(100);
        renderProject(cachedProject);
        hideLoadingOverlay();
        
        // Rafraîchir en arrière-plan
        refreshProjectInBackground(projectId);
        return;
    }

    // Pas de cache, chargement complet
    startLoadingAnimation();
    
    try {
        document.getElementById('loader-status').textContent = "Chargement du projet...";
        
        const project = await fetchAPI(`/projects/${projectId}`);
        
        if (project) {
            setCachedProject(projectId, project);
            renderProject(project);
        } else {
            renderError();
        }
    } catch (error) {
        console.error('Erreur:', error);
        renderError();
    } finally {
        hideLoadingOverlay();
    }
}

async function refreshProjectInBackground(projectId) {
    try {
        const freshData = await fetchAPI(`/projects/${projectId}`);
        if (freshData) {
            setCachedProject(projectId, freshData);
            // Mettre à jour l'UI si les données ont changé
            renderProject(freshData);
        }
    } catch (error) {
        console.warn('Rafraîchissement en arrière-plan échoué:', error);
    }
}

document.addEventListener('DOMContentLoaded', init);

