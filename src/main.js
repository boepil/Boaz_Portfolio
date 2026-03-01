// Load paintings from JSON
let paintings = [];

async function loadPaintings() {
    try {
        const response = await fetch('./paintings.json');
        paintings = await response.json();
        renderGallery(currentTheme);
    } catch (error) {
        console.error('Error loading paintings:', error);
    }
}

const gallery = document.getElementById('gallery');
const navLinks = document.querySelectorAll('nav a');
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const captionText = document.getElementById('caption');
const closeBtn = document.querySelector('.close');

let currentTheme = 'Watercolor';
let filteredImages = [];
let currentIndex = 0;

function renderGallery(filter = 'Watercolor') {
    // Clear gallery
    gallery.innerHTML = '';

    // Ensure class is correct (CSS handles the flex/gap)
    gallery.className = 'gallery';

    filteredImages = filter === 'all'
        ? paintings
        : paintings.filter(p => p.theme === filter);

    // Initial load: if nothing filtered (e.g. invalid or empty), default to Watercolor if possible
    if (filteredImages.length === 0 && filter === 'Watercolor') {
        filteredImages = paintings.filter(p => p.theme === 'Watercolor');
    }

    // Sort by Date (Newest First)
    filteredImages.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Determine column count based on available MAIN width, not just window width
    // Sidebar takes ~280px on desktop.
    // effectiveWidth = window.innerWidth - (window.innerWidth > 900 ? 280 : 0);

    let columnCount = 3;
    const effectiveWidth = window.innerWidth; // Keep simple for now, adjust breakpoints

    if (effectiveWidth <= 768) columnCount = 1;
    else if (effectiveWidth <= 1200) columnCount = 2;
    // else 3 columns

    // Create columns
    const columns = [];
    for (let i = 0; i < columnCount; i++) {
        const col = document.createElement('div');
        col.className = 'gallery-column';
        columns.push(col);
        gallery.appendChild(col);
    }

    // Distribute items (Round-Robin: Left -> Right)
    filteredImages.forEach((p, index) => {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        // Note: No text displayed in grid, only image
        item.innerHTML = `
            <img src="${p.path}" alt="${p.filename}" loading="lazy">
            <div class="info">
                <div class="title">${p.title}</div>
            </div>
        `;
        item.onclick = () => openLightbox(index);

        // Append to specific column
        columns[index % columnCount].appendChild(item);

        // Trigger reflow/opacity fade-in if needed (handled by CSS hover mostly, but let's ensure it's visible)
        // item.style.opacity = 0;
        // setTimeout(() => item.style.opacity = 1, 50 * index); 
    });
}

// Re-render on resize to adjust columns
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        renderGallery(currentTheme);
    }, 100);
});

function openLightbox(index) {
    currentIndex = index;
    const p = filteredImages[currentIndex];
    lightbox.style.display = 'flex';
    lightboxImg.src = p.path;

    // Formatting Date
    const dateObj = new Date(p.date);
    const dateStr = !isNaN(dateObj) ? dateObj.getFullYear() : '';

    captionText.innerHTML = `<strong>${p.title}</strong><small>${p.theme} ${dateStr ? '• ' + dateStr : ''}</small>`;
    document.body.style.overflow = 'hidden';
}

function navigateCarousel(direction) {
    currentIndex += direction;
    if (currentIndex < 0) currentIndex = filteredImages.length - 1;
    if (currentIndex >= filteredImages.length) currentIndex = 0;

    const p = filteredImages[currentIndex];

    // Smooth transition effect
    lightboxImg.style.opacity = 0;
    setTimeout(() => {
        lightboxImg.src = p.path;

        const dateObj = new Date(p.date);
        const dateStr = !isNaN(dateObj) ? dateObj.getFullYear() : '';
        captionText.innerHTML = `<strong>${p.title}</strong><small>${p.theme} ${dateStr ? '• ' + dateStr : ''}</small>`;

        lightboxImg.style.opacity = 1;
    }, 200);
}

document.querySelector('.prev').onclick = (e) => {
    e.stopPropagation();
    navigateCarousel(-1);
};
document.querySelector('.next').onclick = (e) => {
    e.stopPropagation();
    navigateCarousel(1);
};

// Keyboard navigation
document.addEventListener('keydown', (e) => {
    if (lightbox.style.display === 'flex') {
        if (e.key === 'ArrowLeft') navigateCarousel(-1);
        if (e.key === 'ArrowRight') navigateCarousel(1);
        if (e.key === 'Escape') closeBtn.onclick();
    }
});

closeBtn.onclick = () => {
    lightbox.style.display = 'none';
    document.body.style.overflow = 'auto';
};

lightbox.onclick = (e) => {
    if (e.target === lightbox) {
        lightbox.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
};

navLinks.forEach(link => {
    link.onclick = (e) => {
        e.preventDefault();
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        currentTheme = link.getAttribute('data-theme');
        renderGallery(currentTheme);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
});

// Load paintings on page load
loadPaintings();
