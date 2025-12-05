import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db';

// Import Routes
import authRoutes from './routes/authRoutes';
import networkRoutes from './routes/networkRoutes'; 
import jobRoutes from './routes/jobRoutes';         // <--- NEW

dotenv.config();
connectDB();

const app = express();
app.use(express.json());
app.use(cors());

// --- ROUTES ---
app.use('/api/auth', authRoutes);       
app.use('/api/network', networkRoutes); 
app.use('/api/jobs', jobRoutes);        // <--- NEW

app.get('/', (req, res) => {
  res.send('API is running...');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});