import fetch from "node-fetch";

export async function runWebsiteAnalysis(analysisDoc) {
    try {
        analysisDoc.status = "scanning";
        await analysisDoc.save();

        const startTime = Date.now();
        const targetUrl = analysisDoc.url.startsWith("http") ? analysisDoc.url : `https://${analysisDoc.url}`;
        
        let htmlText = "";
        let responseSize = 0;
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            
            const res = await fetch(targetUrl, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 AscendrBot/1.0"
                },
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            htmlText = await res.text();
            responseSize = Math.round(Buffer.byteLength(htmlText, 'utf8') / 1024); // KB
        } catch (fetchErr) {
            console.error("Fetch HTML error, continuing with fallback analysis:", fetchErr.message);
        }

        const endTime = Date.now();
        const loadTimeMs = Math.max(120, endTime - startTime);

        analysisDoc.status = "analyzing";
        await analysisDoc.save();

        // Extract metadata using Regex
        const getMetaTag = (name) => {
            const match = htmlText.match(new RegExp(`<meta[^>]*?(?:name|property)=["']${name}["'][^>]*?content=["']([^"']*)["']`, 'i')) ||
                          htmlText.match(new RegExp(`<meta[^>]*?content=["']([^"']*)["'][^>]*?(?:name|property)=["']${name}["']`, 'i'));
            return match ? match[1] : "";
        };

        const titleMatch = htmlText.match(/<title[^>]*>([^<]*)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : "";
        const description = getMetaTag("description");
        const canonicalMatch = htmlText.match(/<link[^>]*?rel=["']canonical["'][^>]*?href=["']([^"']*)["']/i);
        const canonical = canonicalMatch ? canonicalMatch[1] : "";
        const robots = getMetaTag("robots");
        const ogTitle = getMetaTag("og:title");
        const ogDescription = getMetaTag("og:description");
        const ogImage = getMetaTag("og:image");
        const twitterCard = getMetaTag("twitter:card");
        const viewport = getMetaTag("viewport");

        // Headings
        const h1Matches = Array.from(htmlText.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)).map(m => m[1].replace(/<[^>]+>/g, '').trim());
        const h2Count = (htmlText.match(/<h2[^>]*>/gi) || []).length;
        const h3Count = (htmlText.match(/<h3[^>]*>/gi) || []).length;
        const h4Count = (htmlText.match(/<h4[^>]*>/gi) || []).length;

        // Links
        const allHrefMatches = Array.from(htmlText.matchAll(/href=["']([^"']*)["']/gi)).map(m => m[1]);
        let internalLinks = 0;
        let externalLinks = 0;
        allHrefMatches.forEach(href => {
            if (href.startsWith("http") && !href.includes(analysisDoc.domain)) {
                externalLinks++;
            } else if (href.startsWith("/") || href.includes(analysisDoc.domain)) {
                internalLinks++;
            }
        });

        // Images & ALT
        const imgTags = Array.from(htmlText.matchAll(/<img[^>]*>/gi)).map(m => m[0]);
        let missingAlt = 0;
        let withAlt = 0;
        imgTags.forEach(tag => {
            if (/alt=["']\s*["']/i.test(tag) || !/alt=/i.test(tag)) {
                missingAlt++;
            } else {
                withAlt++;
            }
        });

        // Words & Keywords
        const cleanText = htmlText.replace(/<script[\s\S]*?<\/script>/gi, '')
                                  .replace(/<style[\s\S]*?<\/style>/gi, '')
                                  .replace(/<[^>]+>/g, ' ')
                                  .replace(/\s+/g, ' ');
        const words = cleanText.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
        const wordCount = words.length;

        const freq = {};
        words.forEach(w => freq[w] = (freq[w] || 0) + 1);
        const sortedKeywords = Object.entries(freq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([word, count]) => ({
                word,
                count,
                density: Math.round((count / Math.max(wordCount, 1)) * 1000) / 10
            }));

        // Scoring & Issues calculation
        const issues = [];
        let seoScore = 100;
        let perfScore = 100;
        let accScore = 100;
        let bestScore = 100;

        if (!title) {
            seoScore -= 20;
            issues.push({ severity: "critical", category: "SEO", message: "Missing Title Tag", recommendation: "Add a concise, descriptive title tag (50-60 characters)." });
        } else if (title.length < 30 || title.length > 60) {
            seoScore -= 10;
            issues.push({ severity: "warning", category: "SEO", message: "Title length suboptimal", recommendation: "Keep title length between 50 and 60 characters." });
        }

        if (!description) {
            seoScore -= 20;
            issues.push({ severity: "critical", category: "SEO", message: "Missing Meta Description", recommendation: "Add a compelling meta description (150-160 characters)." });
        }

        if (h1Matches.length === 0) {
            seoScore -= 15;
            issues.push({ severity: "critical", category: "SEO", message: "Missing H1 Heading", recommendation: "Ensure the page contains exactly one primary H1 heading." });
        } else if (h1Matches.length > 1) {
            seoScore -= 10;
            issues.push({ severity: "warning", category: "SEO", message: "Multiple H1 Headings", recommendation: "Use only one H1 tag per page for clean semantic hierarchy." });
        }

        if (missingAlt > 0) {
            accScore -= Math.min(30, missingAlt * 5);
            issues.push({ severity: "warning", category: "Accessibility", message: `${missingAlt} image(s) missing alt attributes`, recommendation: "Add descriptive alt tags to all informative images." });
        }

        if (!viewport) {
            perfScore -= 20;
            bestScore -= 20;
            issues.push({ severity: "critical", category: "Performance", message: "Missing Viewport Meta Tag", recommendation: "Add <meta name='viewport' content='width=device-width, initial-scale=1'>." });
        }

        if (loadTimeMs > 2000) {
            perfScore -= 15;
            issues.push({ severity: "warning", category: "Performance", message: "Slow Response Time", recommendation: "Optimize server response time and enable caching." });
        }

        seoScore = Math.max(20, seoScore);
        perfScore = Math.max(30, perfScore);
        accScore = Math.max(30, accScore);
        bestScore = Math.max(40, bestScore);
        const overallScore = Math.round((seoScore + perfScore + accScore + bestScore) / 4);

        // Update Document
        analysisDoc.loadTime = loadTimeMs;
        analysisDoc.pageSize = responseSize || Math.round(wordCount * 0.5);
        analysisDoc.wordCount = wordCount;
        analysisDoc.overallScore = overallScore;
        analysisDoc.categories = { seo: seoScore, performance: perfScore, accessibility: accScore, bestPractices: bestScore };
        analysisDoc.metaData = { title, description, canonical, robots, ogTitle, ogDescription, ogImage, twitterCard, viewport };
        analysisDoc.headings = { h1: h1Matches.length, h2: h2Count, h3: h3Count, h4: h4Count, h5: 0, h6: 0, h1Texts: h1Matches };
        analysisDoc.links = { internal: internalLinks, external: externalLinks, total: allHrefMatches.length };
        analysisDoc.images = { total: imgTags.length, missingAlt, withAlt };
        analysisDoc.keywords = sortedKeywords;
        analysisDoc.issues = issues;
        analysisDoc.status = "completed";

        await analysisDoc.save();
        return analysisDoc;
    } catch (error) {
        console.error("Error in runWebsiteAnalysis:", error);
        analysisDoc.status = "failed";
        await analysisDoc.save().catch(() => {});
        return analysisDoc;
    }
}
