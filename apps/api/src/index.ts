import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { config } from './config/env';
import { errorHandler } from './middleware/error-handler';
import { authRouter } from './routes/auth.routes';
import { tradingRouter } from './routes/trading.routes';
import { healthRouter } from './routes/health.routes';
import { marketRouter } from './routes/market.routes';
import { mt5Service } from './services/market';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize MT5 Market Service
mt5Service.connect().catch(console.error);

// Routes
app.use('/health', healthRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/trading', tradingRouter);
app.use('/api/v1/market', marketRouter);

// Error handling
app.use(errorHandler);

// Start server
const PORT = config.port;

app.listen(PORT, () => {
  console.log(`🚀 ForexOS API running on port ${PORT}`);
  console.log(`   Environment: ${config.nodeEnv}`);
});

export default app;
