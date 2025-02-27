const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs-extra');

const OUTPUT_FILE = 'results/athletic_events.json';

// Function to extract the JSON object from a script string
const extractJSON = (string) => {
    try {
        const cleanedString = string.replace(/};[\s\S]*$/, "}"); // Remove everything after final }
        const jsonMatch = cleanedString.match(/\{[\s\S]*\}/);
        
        if (!jsonMatch) {
            throw new Error("No JSON object found in script");
        }

        return JSON.parse(jsonMatch[0]);
    } catch (error) {
        console.error("Error extracting JSON:", error);
        return null;
    }
};

// Function to format date as YYYY-MM-DD
const formatDate = (isoString) => {
    return isoString.split('T')[0]; // Extract YYYY-MM-DD directly
};

// Fetch match data and write to file
async function fetchMatchData() {
    try {
        const url = 'https://denverpioneers.com/index.aspx'; // URL to fetch from
        const { data: html } = await axios.get(url);
        const $ = cheerio.load(html);

        // Extract the first script inside the main tag with class "main-content-placeholder"
        let scriptContent = $('main.main-content-placeholder script').first().html();

        if (!scriptContent) {
            console.error("Script tag containing JSON data not found.");
            return;
        }

        // Extract JSON object
        const obj = extractJSON(scriptContent);
        if (!obj || !obj.data) {
            console.error("Extracted JSON is invalid or missing 'data' field.");
            return;
        }

        // Transform match data into the desired format
        const events = obj.data.map(match => ({
            duTeam: match.sport.short_title,
            opponent: match.opponent?.name || "Unknown Opponent",
            date: formatDate(match.date),
        }));

        // Ensure results directory exists
        await fs.ensureDir('results');

        // Write to file
        await fs.writeJson(OUTPUT_FILE, { events }, { spaces: 2 });

        console.log(`Successfully written to ${OUTPUT_FILE}`);

    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

// Run the function
fetchMatchData();
