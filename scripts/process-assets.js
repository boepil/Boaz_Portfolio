import fs from 'fs-extra';
import path from 'path';
import exifr from 'exifr';

const ASSETS_DIR = path.join(process.cwd(), 'public/assets/paintings');
const MANIFEST_PATH_ROOT = path.join(process.cwd(), 'paintings.json');
const MANIFEST_PATH_PUBLIC = path.join(process.cwd(), 'public/paintings.json');

async function processAssets() {
    const themes = await fs.readdir(ASSETS_DIR);
    const manifest = [];

    // Ensure manifest directory exists
    await fs.ensureDir(path.dirname(MANIFEST_PATH_PUBLIC));

    for (const theme of themes) {
        const themeDir = path.join(ASSETS_DIR, theme);
        if (!(await fs.stat(themeDir)).isDirectory()) continue;

        const files = await fs.readdir(themeDir);

        console.log(`Processing theme: ${theme} (${files.length} files)`);

        for (const file of files) {
            if (!file.match(/\.(jpg|jpeg|png|webp|gif|bmp)$/i)) continue;

            const filePath = path.join(themeDir, file);
            let dateTaken = null;
            let metadataTitle = null;

            try {
                // Attempt to read EXIF date and title
                const metadata = await exifr.parse(filePath, {
                    ifd0: true,
                    exif: true,
                    gps: false,
                    iptc: true,
                    xmp: true
                });

                if (metadata) {
                    dateTaken = metadata.DateTimeOriginal || metadata.CreateDate;
                    metadataTitle = metadata.ImageDescription || metadata.Title || metadata.ObjectName;
                }
            } catch (e) {
                // Ignore errors
            }

            // Fallback to file creation time if no EXIF or invalid date
            if (!dateTaken || isNaN(new Date(dateTaken).getTime())) {
                const stats = await fs.stat(filePath);
                dateTaken = stats.birthtime;
            }

            // Ensure valid Date object
            dateTaken = new Date(dateTaken);

            // Format Date: YYYY-MM-DD
            const year = dateTaken.getFullYear();
            const month = String(dateTaken.getMonth() + 1).padStart(2, '0');
            const day = String(dateTaken.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            // Determine Title
            // Priority: Metadata Title -> Filename (without extension)
            // Cleanup filename: replace underscores/hyphens with spaces
            const rawFilename = path.parse(file).name;
            const cleanFilename = rawFilename.replace(/[_-]/g, ' ');

            const displayTitle = metadataTitle ? metadataTitle : cleanFilename;

            manifest.push({
                id: `${theme}-${file}`.replace(/[^a-zA-Z0-9]/g, '-'),
                filename: file,
                theme: theme,
                path: `./public/assets/paintings/${encodeURIComponent(theme)}/${encodeURIComponent(file).replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/#/g, '%23')}`,
                title: displayTitle,
                date: dateStr
            });
        }
    }

    // Sort manifest: Newest Date First
    manifest.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        if (dateB - dateA !== 0) {
            return dateB - dateA;
        }
        // Secondary sort: Filename descending for stable newest-first look
        return b.filename.localeCompare(a.filename);
    });

    // Write manifest to BOTH locations
    // 1. Root (for local http-server)
    await fs.writeFile(MANIFEST_PATH_ROOT, JSON.stringify(manifest, null, 2));

    // 2. Public (for Vite build -> dist)
    // NOTE: For the build, the path in JSON is tricky.
    // If served from dist root, path should be './assets/...' NOT './public/assets/...'.
    // BUT we are fixing the missing file first. 
    // If we use the SAME JSON for both, we need a path that works for both.
    // Local (Raw): Root index.html -> ./public/assets/... (Correct)
    // Prod (Dist): Root index.html -> assets are copied to ./assets/... (Vite behavior)
    // So usually in Dist, 'public' folder name is GONE.
    // So path should be './assets/...'.

    // Let's create a production-specific manifest for public/?
    // Or simpler: Use a path replace for the production one.

    const manifestProd = manifest.map(item => ({
        ...item,
        path: item.path.replace('./public/assets/', './assets/')
    }));

    await fs.writeFile(MANIFEST_PATH_PUBLIC, JSON.stringify(manifestProd, null, 2));

    console.log(`Manifests generated:`);
    console.log(`- Root (Local): ${manifest.length} items`);
    console.log(`- Public (Prod): ${manifestProd.length} items`);
}

processAssets().catch(console.error);
