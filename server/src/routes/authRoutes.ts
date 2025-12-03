import express from 'express';
import { 
    registerUser, 
    loginUser, 
    addStudentByCollege, 
    changePassword, 
    addStudentsBulk 
} from '../controllers/authController';
import User from '../models/User';

const router = express.Router();

// --- PUBLIC AUTH ROUTES ---
router.post('/register', registerUser);
router.post('/login', loginUser);

// --- UTILITY ROUTES ---
// Get list of colleges for the dropdown
router.get('/colleges', async (req, res) => {
  try {
    const colleges = await User.find({ role: 'college' }).select('name _id');
    res.json(colleges);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching colleges' });
  }
});

// --- ONBOARDING ROUTES ---
router.post('/add-student', addStudentByCollege);       // Manual Add
router.post('/add-students-bulk', addStudentsBulk);     // Bulk Excel Add
router.put('/change-password', changePassword);         // Force Password Change

export default router;