import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import config from './config/index.js';
import routes from './routes/index.js';
import { errorHandler, notFound } from './middlewares/error.middleware.js';

const app = express();

app.set('trust proxy', 1);

app.use(helmet());
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

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: 'Too many requests, please try again later' },
});
app.use('/api', limiter);

app.use(`/api/${config.apiVersion}`, routes);

app.use(notFound);
app.use(errorHandler);

export default app;
