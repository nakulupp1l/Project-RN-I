import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db';
import authRoutes from './routes/authRoutes';
// Load the "secrets" from .env file
dotenv.config();

// Connect to Database
connectDB();

const app = express();

// Middleware (Allows the frontend to talk to us)
app.use(express.json());
app.use(cors());
app.use('/api/auth', authRoutes);
// A simple test route to check if server is alive
app.get('/', (req, res) => {
  res.send('API is running...');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});