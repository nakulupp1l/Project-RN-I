import { Request, Response } from 'express';
import mongoose from 'mongoose'; // <--- Import Mongoose
import Job from '../models/Job';
import Partnership from '../models/Partnership';

// @desc    Create a new Job Drive
// @route   POST /api/jobs/create
export const createJob = async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId, collegeId, title, ctc, deadline, minCgpa, branches, rounds, description, location } = req.body;

    console.log("Creating Job for College:", collegeId);

    // 1. Security Check
    const isPartner = await Partnership.findOne({
      requesterId: { $in: [companyId, collegeId] },
      recipientId: { $in: [companyId, collegeId] },
      status: 'Active'
    });

    if (!isPartner) {
      res.status(403).json({ message: "You must be connected with this college to post jobs." });
      return;
    }

    // 2. Create Job
    const job = new Job({
      companyId,
      collegeId, // This saves as an ObjectId automatically
      title,
      description,
      location,
      ctc,
      deadline,
      criteria: {
        minCgpa: Number(minCgpa),
        branches: branches 
      },
      rounds
    });

    await job.save();
    console.log("Job Created ID:", job._id);

    res.status(201).json(job);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Jobs posted by a Company
// @route   GET /api/jobs/company/:companyId
export const getJobsByCompany = async (req: Request, res: Response): Promise<void> => {
  try {
    const jobs = await Job.find({ companyId: req.params.companyId })
      .populate('collegeId', 'name')
      .sort({ createdAt: -1 });
    res.json(jobs);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Jobs for a Student/College
// @route   GET /api/jobs/feed/:collegeId
export const getJobsForCollege = async (req: Request, res: Response): Promise<void> => {
  try {
    const { collegeId } = req.params;
    
    // --- DEBUG LOGS ---
    console.log("\n--- FETCHING JOBS ---");
    console.log("Requested College ID:", collegeId);

    // 1. Validate ID Format
    if (!mongoose.Types.ObjectId.isValid(collegeId)) {
        console.log("❌ Invalid College ID format");
        res.status(400).json({ message: "Invalid College ID" });
        return;
    }

    // 2. Query with Explicit ObjectId
    const objectId = new mongoose.Types.ObjectId(collegeId);
    
    const jobs = await Job.find({ 
        collegeId: objectId, // Force strict match
        status: 'Open' 
    })
    .populate('companyId', 'name email')
    .sort({ createdAt: -1 });
    
    console.log(`✅ Jobs Found: ${jobs.length}`);
    // ------------------

    res.json(jobs);
  } catch (error: any) {
    console.error("Error fetching jobs:", error.message);
    res.status(500).json({ message: error.message });
  }
};