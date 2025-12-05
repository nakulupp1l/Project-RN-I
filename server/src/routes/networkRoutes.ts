import express from 'express';
import { 
    sendConnectionRequest, 
    getMyNetwork, 
    respondToRequest,
    getAllColleges 
} from '../controllers/networkController';

const router = express.Router();

router.post('/connect', sendConnectionRequest);
router.get('/requests/:userId', getMyNetwork);
router.put('/respond', respondToRequest);
router.get('/search-colleges', getAllColleges);

export default router;