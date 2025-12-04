import express from 'express';
import { 
    registerUser, 
    loginUser, 
    addStudentByCollege, 
    changePassword, 
    addStudentsBulk ,
    getStudentsByCollege,
    deleteStudent
} from '../controllers/authController';
import User from '../models/User';
import { updateUserProfile } from '../controllers/authController'; // <--- Import this
import { addCollegeStaff, getTeamMembers } from '../controllers/authController';
// ... existing routes ...
// <--- Add this line
const router = express.Router();
router.get('/students/:collegeId', getStudentsByCollege);
router.delete('/student/:id', deleteStudent);
router.put('/update-profile', updateUserProfile); 
// --- PUBLIC AUTH ROUTES ---
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/add-staff', addCollegeStaff);
router.get('/team/:collegeId', getTeamMembers);
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