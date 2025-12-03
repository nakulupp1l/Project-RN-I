import { Request, Response } from 'express';
import User from '../models/User';
import jwt from 'jsonwebtoken';

const generateToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
export const registerUser = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, role } = req.body;

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
    });

    if (user) {
      // FIX: Changed 21 to 201 (Created)
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken((user._id as unknown) as string),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
export const loginUser = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isFirstLogin: user.isFirstLogin,
        token: generateToken((user._id as unknown) as string),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    College adds a student manually
// @route   POST /api/auth/add-student
export const addStudentByCollege = async (req: Request, res: Response): Promise<void> => {
  const { name, email, branch, cgpa, collegeId } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400).json({ message: 'Student email already exists' });
      return;
    }

    // Create User with DEFAULT PASSWORD 'welcome123'
    const user = await User.create({
      name,
      email,
      password: 'welcome123', // <--- Default Password
      role: 'student',
      collegeId,
      isFirstLogin: true // <--- Force them to change it later
    });

    // OPTIONAL: You could also create the StudentProfile here with CGPA/Branch data
    // For MVP, we just create the User account.

    res.status(201).json({ message: "Student added successfully", user });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Change Password (for First Time Login)
// @route   PUT /api/auth/change-password
export const changePassword = async (req: Request, res: Response): Promise<void> => {
    const { email, newPassword } = req.body;
    try {
        const user = await User.findOne({ email });
        if(!user) {
             res.status(404).json({ message: "User not found" });
             return;
        }
        
        user.password = newPassword;
        user.isFirstLogin = false; // <--- Mark as active
        await user.save();
        
        res.json({ message: "Password updated successfully. Please login." });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
}
// @desc    Bulk Add Students
// @route   POST /api/auth/add-students-bulk
export const addStudentsBulk = async (req: Request, res: Response): Promise<void> => {
  const { students, collegeId } = req.body; // Expecting an Array of students

  try {
    let successCount = 0;
    let failedCount = 0;

    // Loop through each student and try to add them
    for (const student of students) {
      const { name, email, branch, cgpa } = student;

      // Check if user exists
      const userExists = await User.findOne({ email });
      if (!userExists) {
        await User.create({
          name,
          email,
          password: 'welcome123', // Default Password
          role: 'student',
          collegeId,
          isFirstLogin: true,
          // You could save branch/cgpa to a StudentProfile model here if needed
        });
        successCount++;
      } else {
        failedCount++;
      }
    }

    res.status(201).json({ 
      message: `Process Complete. Added: ${successCount}, Skipped (Duplicate): ${failedCount}` 
    });

  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};