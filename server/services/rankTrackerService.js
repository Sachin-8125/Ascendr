import { chromium } from "playwright-core";
import Browserbase from "@browserbasehq/sdk";

const bb = new Browserbase({
    apiKey: process.env.BROWSERBASE_API_KEY,
});

// search google for a keyword and extract ranking results for a target domain
export async function rankTracker(keyword, targetDomain) {
    let browser;
    try {
        // initialize session and connect playwright
        const session = await bb.sessions.create({ browserSettings: { blockAds: true } });
        browser = await chromium.connectOverCDP(session.connectUrl);
        const page = browser.contexts()[0].pages()[0];
        page.setDefaultNavigationTimeout(45000);

        // initial google visit and consent handling
        await page.goto("https://www.google.com", { waitUntil: "networkidle" });
        try {
            const btn = await page.$('button[id="L2AGLb"], form[action*="consent"] button');
            if (btn) {
                await btn.click();
                await page.waitForTimeout(1500);
            }
        } catch (error) {
            // ignore consent handling errors
        }

        let found = null;
        const allResults = [];
        const cleanTarget = targetDomain.replace("www.", "").toLowerCase();

        // search loop: iterate up to 5 pages
        for (let gPage = 0; gPage < 5; gPage++) {
            await page.goto(
                `https://www.google.com/search?q=${encodeURIComponent(keyword)}&start=${gPage * 10}&num=10&hl=en&gl=us`,
                { waitUntil: "networkidle" }
            );

            // page extraction
            let pageResults = [];
            for (let retry = 0; retry < 3; retry++) {
                try {
                    await page.waitForSelector('h3', { timeout: 8000 });
                    await page.waitForTimeout(1500);
                    pageResults = await page.evaluate(() => {
                        return Array.from(document.querySelectorAll('h3')).map((h3) => {
                            let a = h3.closest('a');
                            if (!a) {
                                let p = h3.parentElement;
                                for (let j = 0; p && j < 5; j++, p = p.parentElement) {
                                    if (p.tagName === 'A') {
                                        a = p;
                                        break;
                                    }
                                    const sub = p.querySelector("a[href]");
                                    if (sub && sub.contains(h3)) {
                                        a = sub;
                                        break;
                                    }
                                }
                            }
                            if (!a || !a.href || !a.href.startsWith('http') || a.href.includes('google.com')) return null;

                            let s = "";
                            let c = a.parentElement;
                            for (let j = 0; c && j < 6; j++, c = c.parentElement) {
                                const txt = c.innerText || "";
                                if (txt.length > h3.innerText.length + 50) {
                                    s = (txt.split("\n").find((l) => l.length > 30 && !l.includes(h3.innerText.substring(0, 20))) || "").trim().substring(0, 300);
                                    if (s) break;
                                }
                            }

                            let domain = "";
                            try {
                                domain = new URL(a.href).hostname.replace("www.", "").toLowerCase();
                            } catch (e) {
                                domain = "";
                            }

                            return {
                                url: a.href,
                                domain,
                                title: h3.innerText.trim(),
                                snippet: s
                            };
                        }).filter(Boolean);
                    });

                    if (pageResults && pageResults.length > 0) break;
                    await page.reload({ waitUntil: "networkidle" });
                } catch (error) {
                    if (retry === 2) break;
                    await page.reload({ waitUntil: "networkidle" });
                }
            }

            // process extracted results
            if (!pageResults || !pageResults.length) break;

            for (const res of pageResults) {
                res.position = allResults.length + 1;
                allResults.push(res);

                if (!found && (res.domain.toLowerCase().includes(cleanTarget) || cleanTarget.includes(res.domain.toLowerCase()))) {
                    found = { ...res, page: gPage + 1 }
                }
            }
            if (found) break;
            await page.waitForTimeout(2000 + Math.random() * 2000);
        }

        //finalize: close browser and extract competitors
        await browser.close();
        const competitors = allResults.filter((res) => !res.domain.toLowerCase().includes(cleanTarget) && !cleanTarget.includes(res.domain.toLowerCase())).slice(0, 10);
        return {
            success: true,
            data: {
                keyword,
                targetDomain,
                position: found?.position || null,
                page: found?.page || null,
                title: found?.title || "",
                snippet: found?.snippet || "",
                competitors,
                totalResultsScanned: allResults.length
            }
        }
    } catch (error) {
        console.error("Error in rankTracker service:", error);
        if (browser) {
            await browser.close().catch(() => {
                return {
                    success: false,
                    error: error.message || "browser closed"
                }
            })
        }
    }
}
