import express from "express";
import auth from "../middleware/auth.js";
import { startAnalysis, getAnalysis, getRecentAnalyses, deleteAnalysis } from "../controllers/analysisController.js";

const analysisRouter = express.Router();

analysisRouter.post('/start', auth, startAnalysis);
analysisRouter.get('/recent', auth, getRecentAnalyses);
analysisRouter.get('/:id', auth, getAnalysis);
analysisRouter.delete('/:id', auth, deleteAnalysis);

export default analysisRouter;
