import express from 'express';
import { registerUser, loginUser } from '../controllers/authController';
import User from '../models/User'; // Import User model

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);

// NEW ROUTE: Get all users who are 'colleges'
router.get('/colleges', async (req, res) => {
  try {
    // Find all users where role is 'college'
    // We only need their _id and name for the dropdown
    const colleges = await User.find({ role: 'college' }).select('name _id');
    res.json(colleges);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching colleges' });
  }
});

export default router;