const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs-extra');
const path = require('path');

const BASE_URL = 'https://www.du.edu/calendar';
const OUTPUT_FILE = path.join(__dirname, 'results/calendar_events.json');

const MONTHS = [
    { start: '2025-01-01', end: '2025-02-01' },
    { start: '2025-02-01', end: '2025-03-01' },
    { start: '2025-03-01', end: '2025-04-01' },
    { start: '2025-04-01', end: '2025-05-01' },
    { start: '2025-05-01', end: '2025-06-01' },
    { start: '2025-06-01', end: '2025-07-01' },
    { start: '2025-07-01', end: '2025-08-01' },
    { start: '2025-08-01', end: '2025-09-01' },
    { start: '2025-09-01', end: '2025-10-01' },
    { start: '2025-10-01', end: '2025-11-01' },
    { start: '2025-11-01', end: '2025-12-01' },
    { start: '2025-12-01', end: '2026-01-01' }
];

async function fetchPage(url) {
    const { data } = await axios.get(url);
    return cheerio.load(data);
}

async function scrapeMonth(start, end) {
    const url = `${BASE_URL}?search=&start_date=${start}&end_date=${end}#events-listing-date-filter-anchor`;
    const $ = await fetchPage(url);
    let events = [];
    
    $('.events-listing__item').each((i, el) => {
        const eventEl = $(el);
        let href = eventEl.find('a.event-card').attr('href');
        if (!href) return;

        const event = {
            title: eventEl.find('h3').text().trim(),
            date: parseDate(eventEl.find('p').first().text().trim(), start),
            time: eventEl.find('.icon-du-clock').parent().text().trim() || undefined,
            url: href.startsWith('http') ? href : `https://www.du.edu${href}`
        };

        events.push(event);
    });

    return events;
}

function parseDate(text, monthStart) {
    const [monthName, day] = text.split(' ');
    const month = MONTHS.find(m => monthStart.startsWith(m.start)).start.slice(5, 7);
    return `2025-${month}-${day.padStart(2, '0')}`;
}

async function scrapeEventDetails(event) {
    const $ = await fetchPage(event.url);
    const description = $('.description[itemprop="description"]').html()?.trim().replace(/\n/g, ' ') || undefined;

    // Clean up HTML to plain text if needed
    event.description = description ? cheerio.load(description).text().trim() : undefined;
}

async function scrapeAllEvents() {
    let allEvents = [];

    for (let { start, end } of MONTHS) {
        console.log(`Scraping events for ${start} - ${end}`);
        const monthEvents = await scrapeMonth(start, end);
        allEvents = allEvents.concat(monthEvents);
    }

    console.log(`Found ${allEvents.length} events. Fetching details...`);

    for (const event of allEvents) {
        await scrapeEventDetails(event);
    }

    // Map to the final format (drop "url", conditionally include "time" and "description")
    const formattedEvents = allEvents.map(({ title, date, time, description }) => {
        const event = { title, date };
        if (time) event.time = time;
        if (description) event.description = description;
        return event;
    });

    await fs.ensureDir('results');
    await fs.writeJson(OUTPUT_FILE, { events: formattedEvents }, { spaces: 2 });

    console.log(`✅ Saved to ${OUTPUT_FILE}`);
}

scrapeAllEvents().catch(console.error);
