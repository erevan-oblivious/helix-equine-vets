import { defineMiddleware } from 'astro:middleware';

const IS_MAINTENANCE = false; // Set to false when ready to launch

export const onRequest = defineMiddleware((context, next) => {
  if (IS_MAINTENANCE) {
    return new Response(
      `<!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Helix Equine Vets | Coming Soon</title>
          <style>
            body { font-family: system-ui, sans-serif; display: grid; place-content: center; min-height: 100vh; margin: 0; background: #0B2240; color: #FAF9F6; text-align: center; padding: 1rem; }
            h1 { font-size: 2.25rem; margin-bottom: 0.5rem; }
            p { color: #A0AEC0; }
          </style>
        </head>
        <body>
          <h1>Helix Equine Vets</h1>
          <p>Our updated website is currently undergoing scheduled maintenance and will be live shortly.</p>
        </body>
      </html>`,
      { headers: { 'content-type': 'text/html; charset=utf-8' } }
    );
  }
  return next();
});