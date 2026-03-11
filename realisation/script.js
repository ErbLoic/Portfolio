// Configuration de l'API
const API_BASE_URL = 'https://portfolio-mlb3.onrender.com/api';
const BASE_URL = 'https://portfolio-mlb3.onrender.com';

// Clé de cache localStorage
const CACHE_KEY = 'portfolio_data_cache';
const REALISATION_CACHE_PREFIX = 'realisation_detail_';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 heures

// ========================================
// Helper pour les images
// ========================================

function getImageUrl(img) {
    if (!img) return '';
    // Si c'est une string, c'est déjà l'URL
    if (typeof img === 'string') {
        if (img.startsWith('http')) return img;
        return `${BASE_URL}${img.startsWith('/') ? '' : '/'}${img}`;
    }
    // Chercher les propriétés communes pour l'URL
    const url = img.url || img.image_url || img.path || img.src || img.file || '';
    if (!url) return '';
    // Si l'URL est déjà absolue
    if (url.startsWith('http')) return url;
    // Sinon, ajouter le base URL
    return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

function getImageAlt(img, fallback) {
    if (!img) return fallback;
    if (typeof img === 'string') return fallback;
    return img.alt || img.caption || img.title || img.description || fallback;
}

// ========================================
// Système de cache
// ========================================

function getCachedRealisation(id) {
    try {
        const cached = localStorage.getItem(REALISATION_CACHE_PREFIX + id);
        if (!cached) return null;
        
        const { data, timestamp } = JSON.parse(cached);
        const isExpired = Date.now() - timestamp > CACHE_DURATION;
        
        if (isExpired) {
            localStorage.removeItem(REALISATION_CACHE_PREFIX + id);
            return null;
        }
        
        return data;
    } catch (error) {
        return null;
    }
}

function setCachedRealisation(id, data) {
    try {
        const cacheEntry = { data, timestamp: Date.now() };
        localStorage.setItem(REALISATION_CACHE_PREFIX + id, JSON.stringify(cacheEntry));
    } catch (error) {
        console.warn('Erreur cache:', error);
    }
}

// Essayer de trouver la réalisation dans le cache global
function getRealisationFromGlobalCache(id) {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached) return null;
        
        const { data } = JSON.parse(cached);
        if (data && data.realisations) {
            return data.realisations.find(r => r.id == id) || null;
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
// Rendu de la réalisation
// ========================================

function renderRealisation(realisation) {
    const container = document.getElementById('realisation-content');
    
    // Mettre à jour le titre de la page
    document.title = `${realisation.title} - Portfolio BTS SIO`;
    
    const isStage = realisation.type === 'stage';
    const color = isStage ? '#000DFF' : '#6B73FF';
    
    let html = `
        <div class="detail-header" style="background: linear-gradient(135deg, ${color} 0%, ${color}cc 100%);">
            <span class="detail-type">${isStage ? 'Stage' : 'Projet'}</span>
            <h1 class="detail-title">${realisation.title}</h1>
            ${realisation.company ? `<p class="detail-year">${realisation.company.name}</p>` : ''}
        </div>
        <div class="detail-body">
    `;
    
    // Description
    if (realisation.description) {
        html += `
            <div class="detail-section">
                <h2 class="section-title">Description</h2>
                <p class="detail-description">${realisation.description}</p>
            </div>
        `;
    }
    
    // Description détaillée (long_description)
    if (realisation.long_description) {
        html += `
            <div class="detail-section">
                <h2 class="section-title">Détails</h2>
                <div class="detail-description markdown-content">${marked.parse(realisation.long_description)}</div>
            </div>
        `;
    }
    
    // Technologies / Tags
    if (realisation.tags && realisation.tags.length) {
        html += `
            <div class="detail-section">
                <h2 class="section-title">Technologies utilisées</h2>
                <div class="detail-tags">
                    ${realisation.tags.map(tag => `
                        <span class="detail-tag">${tag.tag || tag}</span>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // Compétences
    if (realisation.competences && realisation.competences.length) {
        html += `
            <div class="detail-section">
                <h2 class="section-title">Compétences mobilisées</h2>
                <div class="detail-competences">
                    ${realisation.competences.map(comp => `
                        <div class="competence-item">
                            <span class="competence-code">${comp.code}</span>
                            <span class="competence-label">${comp.label}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // Entreprise (pour les stages)
    if (realisation.company) {
        const company = realisation.company;
        const companyLogoUrl = company.photo_url 
            ? (company.photo_url.startsWith('http') ? company.photo_url : `${BASE_URL}/storage/companies/${company.photo_url}`)
            : '';
        html += `
            <div class="detail-section">
                <h2 class="section-title">Entreprise</h2>
                <div class="company-card">
                    ${companyLogoUrl ? `
                        <div class="company-logo">
                            <img src="../${company.photo_url}" alt="${company.name}" loading="lazy">
                        </div>
                    ` : ''}
                    <div class="company-info">
                        <h3 class="company-name">${company.name}</h3>
                        ${company.sector ? `<span class="company-sector">${company.sector}</span>` : ''}
                        ${company.location ? `
                            <p class="company-location">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                                    <circle cx="12" cy="10" r="3"/>
                                </svg>
                                ${company.location}
                            </p>
                        ` : ''}
                        ${company.description ? `<p class="company-description">${company.description}</p>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    // Images / Galerie
    if (realisation.images && realisation.images.length > 0) {
        html += `
            <div class="detail-section">
                <h2 class="section-title">Captures d'écran</h2>
                <div class="image-gallery-enhanced">
                    ${realisation.images.map((img, index) => `
                        <div class="gallery-card" onclick="openLightbox(${index})">
                            <div class="gallery-card-image">
                                <img src="${getImageUrl(img)}" alt="${getImageAlt(img, realisation.title + ' - Image ' + (index + 1))}" loading="lazy">
                                <div class="gallery-overlay">
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <circle cx="11" cy="11" r="8"/>
                                        <path d="M21 21l-4.35-4.35M11 8v6M8 11h6"/>
                                    </svg>
                                    <span>Agrandir</span>
                                </div>
                            </div>
                            <div class="gallery-card-info">
                                <h4 class="gallery-card-title">${img.caption || 'Image ' + (index + 1)}</h4>
                                ${img.description ? `<p class="gallery-card-description">${img.description}</p>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Liens
    if (realisation.github_url || realisation.demo_url || realisation.url) {
        html += `
            <div class="detail-section">
                <h2 class="section-title">Liens</h2>
                <div class="detail-links">
        `;
        
        if (realisation.github_url) {
            html += `
                <a href="${realisation.github_url}" target="_blank" rel="noopener" class="detail-link secondary">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                    </svg>
                    Code source
                </a>
            `;
        }
        
        if (realisation.demo_url || realisation.url) {
            html += `
                <a href="${realisation.demo_url || realisation.url}" target="_blank" rel="noopener" class="detail-link primary">
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
    
    // Ajouter le lightbox au body si images présentes
    if (realisation.images && realisation.images.length > 0) {
        addLightboxToDOM(realisation.images, realisation.title);
    }
    
    container.innerHTML = html;
}

function renderError() {
    const container = document.getElementById('realisation-content');
    container.innerHTML = `
        <div class="error-message">
            <div class="error-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 8v4M12 16h.01"/>
                </svg>
            </div>
            <h2 class="error-title">Réalisation introuvable</h2>
            <p class="error-text">Cette réalisation n'existe pas ou a été supprimée.</p>
            <a href="../index.html#realisations" class="detail-link primary">
                Retour aux réalisations
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
    
    // Récupérer l'ID depuis l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const realisationId = urlParams.get('id');
    
    if (!realisationId) {
        renderError();
        hideLoadingOverlay();
        return;
    }
    
    // Vérifier le cache spécifique
    let cachedRealisation = getCachedRealisation(realisationId);
    
    // Si pas de cache spécifique, chercher dans le cache global
    if (!cachedRealisation) {
        cachedRealisation = getRealisationFromGlobalCache(realisationId);
    }
    
    if (cachedRealisation) {
        // Affichage instantané depuis le cache
        console.log('Affichage depuis le cache');
        document.getElementById('loader-status').textContent = "Chargement instantané...";
        updateProgress(100);
        renderRealisation(cachedRealisation);
        hideLoadingOverlay();
        
        // Rafraîchir en arrière-plan
        refreshRealisationInBackground(realisationId);
        return;
    }
    
    // Pas de cache, chargement complet
    startLoadingAnimation();
    
    try {
        document.getElementById('loader-status').textContent = "Chargement de la réalisation...";
        
        const realisation = await fetchAPI(`/realisations/${realisationId}`);
        
        if (realisation) {
            setCachedRealisation(realisationId, realisation);
            renderRealisation(realisation);
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

async function refreshRealisationInBackground(realisationId) {
    try {
        const freshData = await fetchAPI(`/realisations/${realisationId}`);
        if (freshData) {
            setCachedRealisation(realisationId, freshData);
            renderRealisation(freshData);
        }
    } catch (error) {
        console.warn('Rafraîchissement en arrière-plan échoué:', error);
    }
}

// ========================================
// Lightbox / Galerie d'images
// ========================================

let currentImageIndex = 0;
let galleryImages = [];

function addLightboxToDOM(images, title) {
    galleryImages = images;
    
    // Supprimer ancien lightbox si existe
    const existingLightbox = document.getElementById('lightbox');
    if (existingLightbox) existingLightbox.remove();
    
    const lightboxHTML = `
        <div id="lightbox" class="lightbox" onclick="closeLightbox(event)">
            <button class="lightbox-close" onclick="closeLightbox(event)" aria-label="Fermer">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
            </button>
            <button class="lightbox-nav lightbox-prev" onclick="navigateLightbox(-1, event)" aria-label="Image précédente">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M15 18l-6-6 6-6"/>
                </svg>
            </button>
            <div class="lightbox-main" onclick="event.stopPropagation()">
                <div class="lightbox-image-container">
                    <div class="lightbox-image-wrapper" id="lightbox-image-wrapper">
                        <img id="lightbox-image" src="" alt="">
                    </div>
                    <div class="lightbox-zoom-controls">
                        <button class="zoom-btn" onclick="zoomImage(-0.25, event)" aria-label="Dézoomer">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="11" cy="11" r="8"/>
                                <path d="M21 21l-4.35-4.35M8 11h6"/>
                            </svg>
                        </button>
                        <span id="zoom-level">100%</span>
                        <button class="zoom-btn" onclick="zoomImage(0.25, event)" aria-label="Zoomer">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="11" cy="11" r="8"/>
                                <path d="M21 21l-4.35-4.35M11 8v6M8 11h6"/>
                            </svg>
                        </button>
                        <button class="zoom-btn" onclick="resetZoom(event)" aria-label="Réinitialiser">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                                <path d="M3 3v5h5"/>
                            </svg>
                        </button>
                    </div>
                    <div class="lightbox-hint" id="lightbox-hint">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M12 16v-4M12 8h.01"/>
                        </svg>
                        Scroll pour naviguer • Double-clic pour zoomer
                    </div>
                </div>
                <div class="lightbox-sidebar">
                    <div class="lightbox-info">
                        <h3 id="lightbox-title"></h3>
                        <p id="lightbox-description"></p>
                    </div>
                    <div class="lightbox-counter-container">
                        <span id="lightbox-counter"></span>
                    </div>
                </div>
            </div>
            <button class="lightbox-nav lightbox-next" onclick="navigateLightbox(1, event)" aria-label="Image suivante">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 18l6-6-6-6"/>
                </svg>
            </button>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', lightboxHTML);
    
    // Initialiser le zoom
    initZoom();
    
    // Keyboard navigation
    document.addEventListener('keydown', handleLightboxKeyboard);
}

function openLightbox(index) {
    currentImageIndex = index;
    const lightbox = document.getElementById('lightbox');
    if (!lightbox) return;
    
    updateLightboxImage();
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLightbox(event) {
    if (event) event.stopPropagation();
    const lightbox = document.getElementById('lightbox');
    if (lightbox) {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function navigateLightbox(direction, event) {
    if (event) event.stopPropagation();
    currentImageIndex += direction;
    
    if (currentImageIndex < 0) currentImageIndex = galleryImages.length - 1;
    if (currentImageIndex >= galleryImages.length) currentImageIndex = 0;
    
    updateLightboxImage();
}

function updateLightboxImage() {
    const img = galleryImages[currentImageIndex];
    const lightboxImg = document.getElementById('lightbox-image');
    const lightboxTitle = document.getElementById('lightbox-title');
    const lightboxDescription = document.getElementById('lightbox-description');
    const lightboxCounter = document.getElementById('lightbox-counter');
    
    // Réinitialiser le zoom à chaque changement d'image
    resetZoom();
    
    if (lightboxImg) {
        lightboxImg.src = getImageUrl(img);
        lightboxImg.alt = getImageAlt(img, 'Image ' + (currentImageIndex + 1));
    }
    if (lightboxTitle) {
        lightboxTitle.textContent = img.caption || getImageAlt(img, 'Image ' + (currentImageIndex + 1));
    }
    if (lightboxDescription) {
        lightboxDescription.textContent = img.description || '';
        lightboxDescription.style.display = img.description ? 'block' : 'none';
    }
    if (lightboxCounter) {
        lightboxCounter.textContent = `${currentImageIndex + 1} / ${galleryImages.length}`;
    }
    
    // Masquer les boutons nav si une seule image
    const prevBtn = document.querySelector('.lightbox-prev');
    const nextBtn = document.querySelector('.lightbox-next');
    if (prevBtn && nextBtn) {
        const display = galleryImages.length > 1 ? 'flex' : 'none';
        prevBtn.style.display = display;
        nextBtn.style.display = display;
    }
}

// ========================================
// Système de Zoom pour Lightbox
// ========================================

let currentZoom = 1;
let isDragging = false;
let startX, startY, translateX = 0, translateY = 0;

function initZoom() {
    const wrapper = document.getElementById('lightbox-image-wrapper');
    const lightboxImg = document.getElementById('lightbox-image');
    
    if (!wrapper || !lightboxImg) return;
    
    // Zoom avec la molette
    wrapper.addEventListener('wheel', handleWheelZoom, { passive: false });
    
    // Double-clic pour zoomer/dézoomer
    lightboxImg.addEventListener('dblclick', handleDoubleClickZoom);
    
    // Drag pour déplacer l'image zoomée
    lightboxImg.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', endDrag);
    
    // Touch support
    lightboxImg.addEventListener('touchstart', handleTouchStart, { passive: false });
    lightboxImg.addEventListener('touchmove', handleTouchMove, { passive: false });
    lightboxImg.addEventListener('touchend', handleTouchEnd);
}

function handleWheelZoom(e) {
    e.preventDefault();
    
    // Si pas zoomé, naviguer entre les images
    if (currentZoom <= 1 && galleryImages.length > 1) {
        // Utiliser deltaY pour navigation verticale ou deltaX pour horizontale
        const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
        if (delta > 30) {
            navigateLightbox(1);
        } else if (delta < -30) {
            navigateLightbox(-1);
        }
        return;
    }
    
    // Si zoomé, utiliser le scroll pour zoomer/dézoomer
    const zoomDelta = e.deltaY > 0 ? -0.15 : 0.15;
    zoomImage(zoomDelta);
}

function handleDoubleClickZoom(e) {
    e.stopPropagation();
    if (currentZoom > 1) {
        resetZoom();
    } else {
        zoomImage(1); // Zoom à 200%
    }
}

function zoomImage(delta, event) {
    if (event) event.stopPropagation();
    
    const newZoom = Math.max(0.5, Math.min(4, currentZoom + delta));
    currentZoom = newZoom;
    
    // Si on dézoome en dessous de 1, réinitialiser la position
    if (currentZoom <= 1) {
        translateX = 0;
        translateY = 0;
    }
    
    applyZoom();
    updateZoomLevel();
    updateCursor();
    hideHint();
}

function resetZoom(event) {
    if (event) event.stopPropagation();
    currentZoom = 1;
    translateX = 0;
    translateY = 0;
    applyZoom();
    updateZoomLevel();
    updateCursor();
}

function applyZoom() {
    const wrapper = document.getElementById('lightbox-image-wrapper');
    if (wrapper) {
        wrapper.style.transform = `scale(${currentZoom}) translate(${translateX}px, ${translateY}px)`;
    }
}

function updateZoomLevel() {
    const zoomLevel = document.getElementById('zoom-level');
    if (zoomLevel) {
        zoomLevel.textContent = Math.round(currentZoom * 100) + '%';
    }
}

function updateCursor() {
    const lightboxImg = document.getElementById('lightbox-image');
    if (lightboxImg) {
        lightboxImg.style.cursor = currentZoom > 1 ? 'grab' : 'zoom-in';
    }
}

function hideHint() {
    const hint = document.getElementById('lightbox-hint');
    if (hint) {
        hint.style.opacity = '0';
        setTimeout(() => {
            hint.style.display = 'none';
        }, 300);
    }
}

// Drag functionality
function startDrag(e) {
    if (currentZoom <= 1) return;
    
    isDragging = true;
    startX = e.clientX - translateX;
    startY = e.clientY - translateY;
    
    const lightboxImg = document.getElementById('lightbox-image');
    if (lightboxImg) {
        lightboxImg.style.cursor = 'grabbing';
    }
    e.preventDefault();
}

function drag(e) {
    if (!isDragging) return;
    
    translateX = e.clientX - startX;
    translateY = e.clientY - startY;
    
    // Limiter le déplacement
    const maxTranslate = (currentZoom - 1) * 200;
    translateX = Math.max(-maxTranslate, Math.min(maxTranslate, translateX));
    translateY = Math.max(-maxTranslate, Math.min(maxTranslate, translateY));
    
    applyZoom();
}

function endDrag() {
    isDragging = false;
    updateCursor();
}

// Touch support
let lastTouchDistance = 0;
let touchStartX = 0;
let touchStartY = 0;
let touchMoved = false;

function handleTouchStart(e) {
    if (e.touches.length === 2) {
        lastTouchDistance = getTouchDistance(e.touches);
    } else if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchMoved = false;
        
        if (currentZoom > 1) {
            isDragging = true;
            startX = e.touches[0].clientX - translateX;
            startY = e.touches[0].clientY - translateY;
        }
    }
}

function handleTouchMove(e) {
    if (e.touches.length === 2) {
        e.preventDefault();
        const distance = getTouchDistance(e.touches);
        const delta = (distance - lastTouchDistance) * 0.01;
        zoomImage(delta);
        lastTouchDistance = distance;
    } else if (e.touches.length === 1) {
        const deltaX = e.touches[0].clientX - touchStartX;
        const deltaY = e.touches[0].clientY - touchStartY;
        
        if (currentZoom > 1 && isDragging) {
            e.preventDefault();
            translateX = e.touches[0].clientX - startX;
            translateY = e.touches[0].clientY - startY;
            
            const maxTranslate = (currentZoom - 1) * 200;
            translateX = Math.max(-maxTranslate, Math.min(maxTranslate, translateX));
            translateY = Math.max(-maxTranslate, Math.min(maxTranslate, translateY));
            
            applyZoom();
        } else if (currentZoom <= 1 && Math.abs(deltaX) > 10) {
            touchMoved = true;
        }
    }
}

function handleTouchEnd(e) {
    // Swipe pour naviguer entre images (seulement si pas zoomé)
    if (currentZoom <= 1 && touchMoved && galleryImages.length > 1) {
        const deltaX = e.changedTouches[0].clientX - touchStartX;
        
        if (deltaX > 50) {
            navigateLightbox(-1); // Swipe droite = image précédente
        } else if (deltaX < -50) {
            navigateLightbox(1); // Swipe gauche = image suivante
        }
    }
    
    isDragging = false;
    lastTouchDistance = 0;
    touchMoved = false;
}

function getTouchDistance(touches) {
    return Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY
    );
}

function handleLightboxKeyboard(e) {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox || !lightbox.classList.contains('active')) return;
    
    switch(e.key) {
        case 'Escape':
            closeLightbox();
            break;
        case 'ArrowLeft':
            navigateLightbox(-1);
            break;
        case 'ArrowRight':
            navigateLightbox(1);
            break;
        case '+':
        case '=':
            zoomImage(0.25);
            break;
        case '-':
            zoomImage(-0.25);
            break;
        case '0':
            resetZoom();
            break;
    }
}

document.addEventListener('DOMContentLoaded', init);
