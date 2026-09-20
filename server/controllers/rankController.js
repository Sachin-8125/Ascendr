
//add a keyword to track
export const addKeyword = async (params) => {
    try {
        const { keyword, url } = req.body;

        if (!keyword || !url) {
            return res.status(400).json({
                success: false,
                message: "Keyword and URL are required"
            })
        }

        //extract domain from URL
        let domain;
        try {
            const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
            domain = urlObj.hostname.replace("www.", "");
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: "Invalid URL"
            })
        }

        //check if keyword already exists for user
        const existing = await KeywordTracking.findOne({
            userId: req.userId,
            keyword: keyword.toLowerCase().trim(),
            domain
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: "Keyword already tracked"
            })
        }

        //create tracking entry
        const tracking = await KeywordTracking.create({
            userId: req.userId,
            keyword: keyword.toLowerCase().trim(),
            url: url.startsWith('http') ? url : `https://${url}`,
            domain,
            status: "checking"
        });

        res.status(201).json({
            success: true,
            message: "keyword tracking started",
            tracking
        });

    } catch (error) {
        console.log("error in addKeyword", error);
        res.status(500).json({
            success: false,
            message: "Error starting keyword tracking"
        })
    }
};

//get all tracked keywords for user
export const getKeywords = async (req, res) => {

};

//get single keyword with full history
export const getKeyword = async (req, res) => {

};

//manually refresh a keyword ranking
export const refreshKeyword = async (req, res) => {

};

//delete a keyword
export const deleteKeyword = async (req, res) => {

};

//toggle tracking active/inactive
export const toggleTracking = async (req, res) => {

};