import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config/index.js';
import routes from './routes/index.js';
import * as seoController from './controllers/seo.controller.js';
import { resolveSeoForPath } from './services/seoResolve.service.js';
import { injectSeoIntoHtml } from './utils/htmlSeo.js';
import { errorHandler, notFound } from './middlewares/error.middleware.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.set('trust proxy', 1);

/** Browser Origin is scheme+host+port only — never includes path like /admin. */
const toOrigin = (value) => {
  if (!value) return null;
  try {
    const raw = String(value).trim();
    if (!raw) return null;
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    return new URL(withProtocol).origin;
  } catch {
    return null;
  }
};

/** localhost ↔ 127.0.0.1 and apex ↔ www are interchangeable for CORS. */
const withHostAliases = (origin) => {
  if (!origin) return [];
  const aliases = [origin];
  try {
    const url = new URL(origin);
    if (url.hostname === 'localhost') {
      aliases.push(`${url.protocol}//127.0.0.1${url.port ? `:${url.port}` : ''}`);
    }
    if (url.hostname === '127.0.0.1') {
      aliases.push(`${url.protocol}//localhost${url.port ? `:${url.port}` : ''}`);
    }
    if (url.hostname.startsWith('www.')) {
      aliases.push(`${url.protocol}//${url.hostname.slice(4)}${url.port ? `:${url.port}` : ''}`);
    } else if (url.hostname.includes('.')) {
      aliases.push(`${url.protocol}//www.${url.hostname}${url.port ? `:${url.port}` : ''}`);
    }
  } catch {
    /* ignore */
  }
  return aliases;
};

const allowedOrigins = new Set(
  [config.clientUrl, config.adminUrl, config.serverUrl, ...(config.corsOrigins || [])]
    .map(toOrigin)
    .filter(Boolean)
    .flatMap(withHostAliases)
);

if (config.env !== 'production') {
  ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174']
    .forEach((o) => allowedOrigins.add(o));
}

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(
  cors({
    origin(origin, callback) {
      // Non-browser / same-origin proxied requests have no Origin header
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }
      console.warn(`[cors] blocked origin: ${origin}`);
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);
app.use(morgan(config.env === 'development' ? 'dev' : 'combined'));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (config.rateLimit.enabled) {
  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later' },
  });
  app.use('/api', limiter);
}

app.use(
  `/api/${config.apiVersion}/uploads`,
  (req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
  },
  express.static(path.join(__dirname, '../uploads'), { maxAge: config.env === 'production' ? '7d' : 0 })
);

app.get('/robots.txt', seoController.robotsTxt);
app.get('/sitemap.xml', seoController.sitemapXml);

app.use(`/api/${config.apiVersion}`, routes);

/** Serve storefront build with per-path SEO injection so crawlers see admin meta without JS. */
if (config.frontendDist) {
  const distPath = path.resolve(config.frontendDist);
  const indexPath = path.join(distPath, 'index.html');
  const assetsPath = path.join(distPath, 'assets');
  if (fs.existsSync(indexPath)) {
    // Hashed Vite assets can be cached forever; index.html must never be stale.
    if (fs.existsSync(assetsPath)) {
      app.use(
        '/assets',
        express.static(assetsPath, {
          maxAge: config.env === 'production' ? '1y' : 0,
          immutable: config.env === 'production',
          etag: true,
          lastModified: true,
        })
      );
    }

    app.use(
      express.static(distPath, {
        index: false,
        maxAge: 0,
        etag: true,
        lastModified: true,
        setHeaders(res, filePath) {
          if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          }
        },
      })
    );

    app.get('*', async (req, res, next) => {
      try {
        if (req.method !== 'GET' && req.method !== 'HEAD') return next();
        if (req.path.startsWith('/api')) return next();
        if (/\.[a-zA-Z0-9]+$/.test(req.path) && !req.path.endsWith('.html')) return next();

        const html = await fs.promises.readFile(indexPath, 'utf8');
        const meta = await resolveSeoForPath(req.path);
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.type('html').send(injectSeoIntoHtml(html, meta));
      } catch (err) {
        next(err);
      }
    });
  } else {
    console.warn(`[seo] FRONTEND_DIST set but index.html not found at ${indexPath}`);
  }
}

app.use(notFound);
app.use(errorHandler);

export default app;
