import Analysis from "../models/Analysis.js";
import { runWebsiteAnalysis } from "../services/analysisService.js";

// Start a new website SEO analysis
export const startAnalysis = async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ success: false, message: "URL is required" });
        }

        let domain = "";
        try {
            const urlObj = new URL(url.startsWith("http") ? url : `https://${url}`);
            domain = urlObj.hostname.replace("www.", "");
        } catch (err) {
            return res.status(400).json({ success: false, message: "Invalid URL provided" });
        }

        const analysis = await Analysis.create({
            userId: req.userId,
            url: url.startsWith("http") ? url : `https://${url}`,
            domain,
            status: "pending"
        });

        res.status(201).json({
            success: true,
            analysisId: analysis._id,
            status: analysis.status
        });

        // Run analysis in background
        runWebsiteAnalysis(analysis);
    } catch (error) {
        console.error("Start analysis error:", error);
        res.status(500).json({ success: false, message: "Error starting website analysis" });
    }
};

// Get single analysis by ID (used for polling & report view)
export const getAnalysis = async (req, res) => {
    try {
        const analysis = await Analysis.findOne({ _id: req.params.id, userId: req.userId });
        if (!analysis) {
            return res.status(404).json({ success: false, message: "Analysis report not found" });
        }

        res.json({ success: true, analysis });
    } catch (error) {
        console.error("Get analysis error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// Get recent analyses for logged-in user
export const getRecentAnalyses = async (req, res) => {
    try {
        const analyses = await Analysis.find({ userId: req.userId })
            .sort({ createdAt: -1 })
            .limit(20)
            .select("url domain overallScore status createdAt categories");

        res.json({ success: true, analyses });
    } catch (error) {
        console.error("Get recent analyses error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// Delete analysis report
export const deleteAnalysis = async (req, res) => {
    try {
        const analysis = await Analysis.findOneAndDelete({ _id: req.params.id, userId: req.userId });
        if (!analysis) {
            return res.status(404).json({ success: false, message: "Analysis report not found" });
        }
        res.json({ success: true, message: "Analysis report deleted" });
    } catch (error) {
        console.error("Delete analysis error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
