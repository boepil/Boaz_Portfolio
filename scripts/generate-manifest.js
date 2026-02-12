import fs from 'fs-extra';
import path from 'path';

const SRC_DIR = 'D:\\_PROJECTS\\iCloudDrive\\iCloud~md~obsidian\\Boaz_brain\\Assets\\Paintings';
const DEST_DIR = 'd:\\_PROJECTS\\My\\art_portfolio\\assets\\paintings';
const MANIFEST_PATH = 'd:\\_PROJECTS\\My\\art_portfolio\\src\\data\\paintings.js';

async function generate() {
    const themes = ['Ai', 'B&W', 'Portrate', 'Watercolor'];
    const manifest = [];

    // Ensure directories exist
    // Note: Moving assets out of 'public' for easier direct access if needed, 
    // but in a Vite project 'public' is served at root. 
    // However, for direct file opening, we want assets relative to index.html.
    await fs.ensureDir(DEST_DIR);
    await fs.ensureDir(path.dirname(MANIFEST_PATH));

    for (const theme of themes) {
        const themeSrc = path.join(SRC_DIR, theme);
        const themeDest = path.join(DEST_DIR, theme);

        if (await fs.pathExists(themeSrc)) {
            await fs.ensureDir(themeDest);
            const files = await fs.readdir(themeSrc);

            for (const file of files) {
                if (file.match(/\.(jpg|jpeg|png|webp|gif|bmp)$/i)) {
                    const srcPath = path.join(themeSrc, file);
                    const destPath = path.join(themeDest, file);

                    // Copy file
                    await fs.copy(srcPath, destPath);

                    // Add to manifest
                    manifest.push({
                        id: `${theme}-${file}`.replace(/[^a-zA-Z0-9]/g, '-'),
                        filename: file,
                        theme: theme,
                        path: `./assets/paintings/${theme}/${file}`
                    });
                }
            }
        }
    }

    const jsContent = `window.paintingsDataset = ${JSON.stringify(manifest, null, 2)};`;
    await fs.writeFile(MANIFEST_PATH, jsContent);
    console.log(`Manifest (JS) generated with ${manifest.length} images.`);
}

generate().catch(console.error);
