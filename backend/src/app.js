import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config/index.js';
import routes from './routes/index.js';
import * as seoController from './controllers/seo.controller.js';
import { errorHandler, notFound } from './middlewares/error.middleware.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(
  cors({
    origin: [config.clientUrl, config.adminUrl],
    credentials: true,
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

app.use(notFound);
app.use(errorHandler);

export default app;
