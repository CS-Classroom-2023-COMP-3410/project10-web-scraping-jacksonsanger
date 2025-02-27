const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs-extra');

const URL = 'https://bulletin.du.edu/undergraduate/majorsminorscoursedescriptions/traditionalbachelorsprogrammajorandminors/computerscience/#coursedescriptionstext';
const OUTPUT_FILE = 'results/bulletin.json';

async function scrapeBulletin() {
    try {
        // Fetch the HTML content of the page
        const { data } = await axios.get(URL);
        const $ = cheerio.load(data);
        const courses = [];

        // Select all course blocks
        $('.courseblock').each((index, element) => {
            const titleElement = $(element).find('.courseblocktitle strong');
            const descElement = $(element).find('.courseblockdesc');
            
            if (titleElement.length) {
                const titleText = titleElement.text().trim();
                const match = titleText.match(/COMP\s*(\d{4})/);

                if (match) {
                    const courseNumber = parseInt(match[1], 10);
                    
                    // Check if it's an upper-division course (3000-level or higher)
                    if (courseNumber >= 3000) {
                        // Check if it has prerequisites by searching for "Prerequisite:" or "Prerequisites:" in the description
                        if (!descElement.text().toLowerCase().includes('prerequisite') && !descElement.text().toLowerCase().includes('prerequisites')) {
                            courses.push({
                                course: `COMP-${courseNumber}`,
                                title: titleText.replace(/COMP\s*\d{4}/, '').trim()
                            });
                        }
                    }
                }
            }
        });

        // Save the extracted courses to a JSON file
        await fs.outputJson(OUTPUT_FILE, { courses }, { spaces: 2 });
        console.log(`Data successfully saved to ${OUTPUT_FILE}`);
    } catch (error) {
        console.error('Error scraping DU Bulletin:', error.message);
    }
}

scrapeBulletin();
