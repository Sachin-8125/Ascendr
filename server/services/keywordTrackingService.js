import { rankTracker } from "./rankTrackerService";

export async function keywordTracking(tracking) {
    try {
        let result;

        //try upto two times for reliability
        for (let attempt = 1; attempt <= 2; attempt++) {
            result = await rankTracker(tracking.keyword, tracking.domain);

            if (result.success && result.data) break;

            //wait before retry
            if (attempt < 2) {
                await new Promise(resolve => setTimeout(resolve, result.success ? 3000 : 5000));
            }
        }

        //update tracking entry
        if (result.success) {
            const prev = tracking.currentPosition;
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            tracking.currentPosition = result.data.position;
            tracking.currentPage = result.data.page;
            tracking.competitors = result.data.competitors;
            tracking.lastChecked = new Date();
            tracking.status = "completed";

            //update stats
            tracking.positionChange = prev && result.data.position ? prev - result.data.position : 0;
            if (result.data.position && (!tracking.bestPosition || result.data.position < tracking.bestPosition)) {
                tracking.bestPosition = result.data.position;
            }

            //update history
            const historyEntry = {
                date: today,
                position: result.data.position,
                page: result.data.page,
                snippet: result.data.snippet
            }

            const idx = tracking.rankHistory.findIndex((h) => h.date.toDateString() === today.toDateString());
            if (idx >= 0) tracking.rankHistory[idx] = historyEntry;
            else tracking.rankHistory.push(historyEntry);
        } else {
            tracking.status = "failed";
        }
        await tracking.save();
        return result;

    } catch (error) {
        console.error("Error in keywordTracking service", error);
        tracking.status = "error";
        await tracking.save().catch(() => { });
        return { success: false, error: error.message }
    }
}