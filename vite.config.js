import { defineConfig } from 'vite';
import { exec } from 'child_process';

const assetWatcher = () => ({
    name: 'asset-watcher',
    configureServer(server) {
        server.watcher.add('public/assets');
        server.watcher.on('change', (file) => {
            if (file.includes('public\\assets')) {
                console.log('Asset changed, regenerating manifest...');
                exec('npm run generate', (err, stdout, stderr) => {
                    if (err) console.error(err);
                    if (stdout) console.log(stdout);
                });
            }
        });
        server.watcher.on('add', (file) => {
            if (file.includes('public\\assets')) {
                console.log('Asset added, regenerating manifest...');
                exec('npm run generate', (err, stdout, stderr) => {
                    if (err) console.error(err);
                    if (stdout) console.log(stdout);
                });
            }
        });
        server.watcher.on('unlink', (file) => {
            if (file.includes('public\\assets')) {
                console.log('Asset removed, regenerating manifest...');
                exec('npm run generate', (err, stdout, stderr) => {
                    if (err) console.error(err);
                    if (stdout) console.log(stdout);
                });
            }
        });
    }
});

export default defineConfig({
    plugins: [assetWatcher()],
    base: './'
});
