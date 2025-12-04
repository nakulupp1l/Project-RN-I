import { Request, Response } from 'express';
import User from '../models/User';
import jwt from 'jsonwebtoken';

const generateToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
    expiresIn: '30d',
  });
};

// @desc    Register a new user (Self Registration)
// @route   POST /api/auth/register
export const registerUser = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, role, collegeId } = req.body;

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
      collegeId // Save college association if provided
    });

    if (user) {
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
        // Send extra profile data to frontend
        branch: user.branch,
        cgpa: user.cgpa,
        phone: user.phone,
        skills: user.skills,
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
  const { name, email, branch, cgpa, phone, collegeId } = req.body;

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
      password: 'welcome123', // Default Password
      role: 'student',
      collegeId,
      isFirstLogin: true,
      // Save profile details
      branch: branch || "",
      cgpa: cgpa || "",
      phone: phone || ""
    });

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
        user.isFirstLogin = false; // Mark as active
        await user.save();
        
        res.json({ message: "Password updated successfully. Please login." });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
}

// @desc    Bulk Add Students via Excel (Case Insensitive)
// @route   POST /api/auth/add-students-bulk
export const addStudentsBulk = async (req: Request, res: Response): Promise<void> => {
  const { students, collegeId } = req.body;

  try {
    let successCount = 0;
    let failedCount = 0;

    for (const rawStudent of students) {
      // 1. Normalize Keys: Convert "Branch" -> "branch", "Email" -> "email"
      const student: any = {};
      Object.keys(rawStudent).forEach((key) => {
        student[key.toLowerCase().trim()] = rawStudent[key];
      });

      // 2. Destructure (Now it works even if Excel had "Branch" or "CGPA")
      const { name, email, branch, cgpa, phone } = student;

      if (!email || !name) {
         failedCount++;
         continue; // Skip invalid rows
      }

      const userExists = await User.findOne({ email });
      if (!userExists) {
        await User.create({
          name,
          email,
          password: 'welcome123',
          role: 'student',
          collegeId,
          isFirstLogin: true,
          // Save normalized data
          branch: branch || "", 
          cgpa: typeof cgpa === 'number' ? cgpa.toString() : (cgpa || ""), // Handle number/string differences
          phone: phone || ""
        });
        successCount++;
      } else {
        failedCount++;
      }
    }

    res.status(201).json({ 
      message: `Process Complete. Added: ${successCount}, Skipped/Failed: ${failedCount}` 
    });

  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
// @desc    Update User Profile
// @route   PUT /api/auth/update-profile
export const updateUserProfile = async (req: Request, res: Response): Promise<void> => {
  const { email, name, phone, branch, cgpa, skills } = req.body;

  try {
    const user = await User.findOne({ email });

    if (user) {
      user.name = name || user.name;
      user.phone = phone || user.phone;
      user.branch = branch || user.branch;
      user.cgpa = cgpa || user.cgpa;
      user.skills = skills || user.skills;

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        branch: updatedUser.branch,
        cgpa: updatedUser.cgpa,
        phone: updatedUser.phone,
        skills: updatedUser.skills,
        token: req.headers.authorization?.split(" ")[1] // Keep existing token
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
// @desc    Get all students for a specific college
// @route   GET /api/auth/students/:collegeId
export const getStudentsByCollege = async (req: Request, res: Response): Promise<void> => {
  const { collegeId } = req.params;
  try {
    // Find users who have this collegeId AND are students
    const students = await User.find({ collegeId, role: 'student' }).select('-password');
    res.json(students);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a student
// @route   DELETE /api/auth/student/:id
export const deleteStudent = async (req: Request, res: Response): Promise<void> => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: "Student removed" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
}