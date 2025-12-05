import express from 'express';
import { createJob, getJobsByCompany } from '../controllers/jobController';

const router = express.Router();

router.post('/create', createJob);
router.get('/company/:companyId', getJobsByCompany);

export default router;