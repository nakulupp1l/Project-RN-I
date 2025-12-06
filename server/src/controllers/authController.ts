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
  const { name, email, password, role, collegeId } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    // FIX: Only add collegeId if it is a REAL string (not empty)
    const userData: any = { name, email, password, role };
    if (collegeId && typeof collegeId === 'string' && collegeId.trim() !== "") {
        userData.collegeId = collegeId;
    }

    // Use new User().save() to avoid TypeScript errors
    const user = new User(userData);
    await user.save();

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
    console.error("Registration Error:", error);
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
      // Determine which College Dashboard to load
      // If Admin: use their own ID. If Staff: use the ID of the college they belong to.
      const targetCollegeId = user.role === 'college' ? user._id : user.collegeId;

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        collegeId: targetCollegeId, 
        isFirstLogin: user.isFirstLogin,
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

// @desc    Bulk Add Students via Excel
// @route   POST /api/auth/add-students-bulk
export const addStudentsBulk = async (req: Request, res: Response): Promise<void> => {
  const { students, collegeId } = req.body;

  try {
    let successCount = 0;
    let failedCount = 0;

    for (const rawStudent of students) {
      const student: any = {};
      Object.keys(rawStudent).forEach((key) => {
        student[key.toLowerCase().trim()] = rawStudent[key];
      });

      const { name, email, branch, cgpa, phone } = student;

      if (!email || !name) {
         failedCount++;
         continue; 
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
          branch: branch || "", 
          cgpa: typeof cgpa === 'number' ? cgpa.toString() : (cgpa || ""),
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
        collegeId: updatedUser.role === 'college' ? updatedUser._id : updatedUser.collegeId,
        token: req.headers.authorization?.split(" ")[1] 
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

// @desc    Add a College Staff Member
// @route   POST /api/auth/add-staff
export const addCollegeStaff = async (req: Request, res: Response): Promise<void> => {
  const { name, email, collegeId } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400).json({ message: 'Email already in use' });
      return;
    }

    const user = await User.create({
      name,
      email,
      password: 'staff123',
      role: 'college_member',
      collegeId,
      isFirstLogin: true
    });

    res.status(201).json({ message: "Staff member added", user });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Team Members
// @route   GET /api/auth/team/:collegeId
export const getTeamMembers = async (req: Request, res: Response): Promise<void> => {
    try {
        const team = await User.find({ 
            collegeId: req.params.collegeId, 
            role: 'college_member' 
        }).select('-password');
        res.json(team);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
}