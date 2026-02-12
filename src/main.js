// Load paintings from JSON
let paintings = [];

async function loadPaintings() {
    try {
        const response = await fetch('./paintings.json');
        paintings = await response.json();
        renderGallery();
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

let currentTheme = 'all';
let filteredImages = [];
let currentIndex = 0;

function renderGallery(filter = 'all') {
    // Clear gallery
    gallery.innerHTML = '';
    gallery.className = 'gallery masonry';

    filteredImages = filter === 'all'
        ? paintings
        : paintings.filter(p => p.theme === filter);

    // Sort by Date (Newest First) just to be safe
    filteredImages.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Determine column count
    let columnCount = 3;
    if (window.innerWidth <= 600) columnCount = 1;
    else if (window.innerWidth <= 1100) columnCount = 2;

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
        item.innerHTML = `
            <img src="${p.path}" alt="${p.filename}" loading="lazy">
            <div class="info">
                <div class="title">${p.title}</div>
                <div class="date">${p.date}</div>
            </div>
        `;
        item.onclick = () => openLightbox(index);

        // Append to specific column
        columns[index % columnCount].appendChild(item);
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
    captionText.innerHTML = `<strong>${p.filename}</strong><br><small>${p.theme}</small>`;
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
        captionText.innerHTML = `<strong>${p.filename}</strong><br><small>${p.theme}</small>`;
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
