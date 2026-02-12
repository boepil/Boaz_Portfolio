import fs from 'fs-extra';
import path from 'path';
import exifr from 'exifr';

const ASSETS_DIR = path.join(process.cwd(), 'public/assets/paintings');
const MANIFEST_PATH = path.join(process.cwd(), 'src/data/paintings.js');

async function processAssets() {
    const themes = await fs.readdir(ASSETS_DIR);
    const manifest = [];

    // Ensure manifest directory exists
    await fs.ensureDir(path.dirname(MANIFEST_PATH));

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
                path: `./assets/paintings/${theme}/${file}`,
                title: displayTitle,
                date: dateStr
            });
        }
    }

    // Write manifest as JS file for window object
    const jsContent = `window.paintingsDataset = ${JSON.stringify(manifest, null, 2)};`;
    await fs.writeFile(MANIFEST_PATH, jsContent);
    console.log(`Manifest (JS) generated with ${manifest.length} items.`);
}

processAssets().catch(console.error);
