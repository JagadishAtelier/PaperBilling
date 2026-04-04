import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import { responseHelper } from './middleware/index.js';
import userRoutes from './user/routes/index.js';
import productRoutes from './product/routes/index.js';
import stockRoutes from './stock/routes/index.js';
import inwardRoutes from './inward/routes/index.js';
import billingRoutes from './billing/routes/index.js';
import dashboardRoutes from './dashboard/routes/index.js';
import marketingRoutes from './marketing/routes/index.js';
// import razerpayRoutes from './razerpay/routes/index.js'

// Import model associations to ensure they're loaded
import './inward/models/index.js';
import './billing/models/associations.js';
import './user/models/associations.js';
import './marketing/models/index.js';

const app = express();

// ---------- Middleware ----------
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Debug middleware to check body parsing
app.use((req, res, next) => {
  if (req.method === 'POST' && req.path.includes('/login')) {
    console.log('\n=== BODY PARSING CHECK ===');
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Body exists:', !!req.body);
    console.log('Body keys:', Object.keys(req.body || {}));
    console.log('Body:', req.body);
    console.log('==========================\n');
  }
  next();
});

// ---------- CORS ----------
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

// Handle preflight requests
// app.options("/*", cors());

app.use(morgan('dev'));
app.use(helmet());
app.use(responseHelper);

// Response logger
app.use((req, res, next) => {
  const originalSend = res.send;
  res.send = function (data) {
    console.log(`\n=== OUTGOING RESPONSE ===`);
    console.log(`Status: ${res.statusCode}`);
    console.log(`Path: ${req.path}`);
    console.log(`Data:`, data);
    console.log(`=========================\n`);
    originalSend.call(this, data);
  };
  next();
});

// ---------- Test Routes ----------
app.get('/', (req, res) => {
  res.status(200).send("Hello World!!");
});

app.get('/api/data', (req, res) => {
  res.sendSuccess({ value: 42 }, 'Data fetched successfully');
});

app.get('/api/error', (req, res) => {
  res.sendError('Something went wrong', 422, [
    { field: 'email', message: 'Invalid' }
  ]);
});

// ---------- Main Routes ----------
app.use('/api/v1', (req, res, next) => {
  console.log(`\n=== INCOMING REQUEST ===`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Method: ${req.method}`);
  console.log(`Path: ${req.path}`);
  console.log(`Full URL: ${req.originalUrl}`);
  console.log(`Body:`, JSON.stringify(req.body, null, 2));
  console.log(`Headers:`, JSON.stringify(req.headers, null, 2));
  console.log(`========================\n`);
  next();
});

app.use('/api/v1', userRoutes);
app.use('/api/v1', productRoutes);
app.use('/api/v1', stockRoutes);
app.use('/api/v1', inwardRoutes);
app.use('/api/v1', billingRoutes);
app.use('/api/v1', dashboardRoutes);
app.use('/api/v1', marketingRoutes);
// app.use('/api/v1', razerpayRoutes);

// ---------- 404 Handler ----------
app.use((req, res) => {
  return res.sendError('Route not found', 404);
});

// ---------- Global Error Handler ----------
app.use((err, req, res, next) => {
  console.error("🔥 Global Error:", err.stack);
  return res.sendError(err.message || 'Internal Server Error', err.status || 500);
});

export default app;
