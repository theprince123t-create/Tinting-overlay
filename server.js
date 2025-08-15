import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cheerio from "cheerio";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 8080;
const MATCH_ID = process.env.MATCH_ID;

app.use(express.static("public"));

app.get("/api/score", async (req, res) => {
    try {
        const url = `https://cricheroes.com/scorecard/${MATCH_ID}`;
        const response = await fetch(url);
        const html = await response.text();

        const $ = cheerio.load(html);

        // Simple parsing example (can improve based on CricHeroes HTML)
        const batsman1 = $(".batsman:nth-child(1)").text().trim() || "Batsman 1";
        const batsman2 = $(".batsman:nth-child(2)").text().trim() || "Batsman 2";
        const score = $(".score").first().text().trim() || "0-0 (0.0)";
        const bowler = $(".bowler").first().text().trim() || "Bowler";
        
        // Dummy recent balls (you can parse real ones)
        const balls = ["dot", "dot", "run", "wicket", "run", "dot"];

        res.json({
            batsman1,
            batsman2,
            score,
            bowler,
            balls
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch data" });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
