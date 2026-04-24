import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

const TTS_STORAGE = path.resolve(
  'C:/Users/aflorescu/MyCode/narrFlow/narrFlow/services/audio-renderer-service/tts-storage'
);

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: true,
    allowedHosts: true,
  },
  plugins: [
    react(),
    {
      name: 'serve-tts-audio',
      configureServer(server) {
        server.middlewares.use('/audio', (req, res, next) => {
          const filePath = path.join(TTS_STORAGE, req.url ?? '');
          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Accept-Ranges', 'bytes');
            fs.createReadStream(filePath).pipe(res);
          } else {
            next();
          }
        });
      },
    },
  ],
});
