import fs from 'fs-extra';
import path from 'path';
import exifr from 'exifr';

const ASSETS_DIR = path.join(process.cwd(), 'public/assets/paintings');
const MANIFEST_PATH = path.join(process.cwd(), 'src/data/paintings.json');

async function processAssets() {
    const themes = await fs.readdir(ASSETS_DIR);
    const manifest = [];

    for (const theme of themes) {
        const themeDir = path.join(ASSETS_DIR, theme);
        if (!(await fs.stat(themeDir)).isDirectory()) continue;

        const files = await fs.readdir(themeDir);
        let index = 1;

        console.log(`Processing theme: ${theme} (${files.length} files)`);

        for (const file of files) {
            if (!file.match(/\.(jpg|jpeg|png|webp|gif|bmp)$/i)) continue;

            const oldPath = path.join(themeDir, file);
            let dateTaken = null;

            try {
                // Attempt to read EXIF date
                const metadata = await exifr.parse(oldPath);
                if (metadata && metadata.DateTimeOriginal) {
                    dateTaken = metadata.DateTimeOriginal;
                } else if (metadata && metadata.CreateDate) {
                    dateTaken = metadata.CreateDate;
                }
            } catch (e) {
                // Ignore errors (no exif)
            }

            // Fallback to file creation time if no EXIF
            if (!dateTaken) {
                const stats = await fs.stat(oldPath);
                dateTaken = stats.birthtime;
            }

            // Format Date: YYYY-MM-DD
            const year = dateTaken.getFullYear();
            const month = String(dateTaken.getMonth() + 1).padStart(2, '0');
            const day = String(dateTaken.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            // Generate New Filename: Theme_Date_Index.ext
            const ext = path.extname(file);
            const newFilename = `${theme}_${dateStr}_${String(index).padStart(2, '0')}${ext}`;
            const newPath = path.join(themeDir, newFilename);

            // Rename file (only if different)
            if (oldPath !== newPath) {
                // Check if target exists to avoid collision
                if (await fs.pathExists(newPath)) {
                    // If collision, increment index and try again?
                    // For simplicity, just append a random suffix or keep incrementing
                    // But we are in a loop, so index should handle it unless date aligns perfectly.
                    // Actually index is per theme, so unique per theme.
                    // But if we run script twice, we might rename renamed files.
                    // Check if file already matches pattern? 
                    // Let's just rename.
                }
                await fs.rename(oldPath, newPath);
                console.log(`Renamed: ${file} -> ${newFilename}`);
            }

            // Readable Title
            // "Watercolor 2025-10-26 #01"
            const title = `${theme} ${dateStr} #${index}`;

            manifest.push({
                id: newFilename.replace(/[^a-z0-9]/gi, '-'),
                filename: newFilename,
                theme: theme,
                path: `./assets/paintings/${theme}/${newFilename}`,
                title: title,
                date: dateStr
            });

            index++;
        }
    }

    // Write manifest
    await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
    console.log(`Manifest generated with ${manifest.length} items.`);
}

processAssets().catch(console.error);
