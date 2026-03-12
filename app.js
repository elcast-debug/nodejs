
/*
const express = require('express');
const path = require('path');
const indexRouter = require('./routes/index');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware: log request method and url
app.use((req, res, next) => {
  console.info(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Static files
app.use(express.static(path.resolve(__dirname, 'public')));

// Main routes
app.use('/', indexRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).sendFile(path.resolve(__dirname, 'views', '404.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Internal Server Error');
});

app.listen(PORT, () => {
  console.log(`Server listening: http://localhost:${PORT}`);
});
*/

const express = require('express');
const axios   = require('axios');
const app     = express();

app.get('/search', async (req, res) => {
    const query = (req.query.q || '').trim();
    if (!query) return res.status(400).send('Missing ?q=');

    try {
        const { data: html } = await axios.get('https://www.youtube.com/results', {
            params: { search_query: query },
            headers: {
                'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Accept-Language': 'en-US,en;q=0.9'
            },
            timeout: 8000
        });

        // YouTube embeds all search data as a JS variable in the HTML
        const match = html.match(/var ytInitialData\s*=\s*(\{.+?\});\s*<\/script>/s);
        if (!match) return res.status(500).send('Could not parse YouTube response');

        const yt       = JSON.parse(match[1]);
        const contents = yt?.contents
            ?.twoColumnSearchResultsRenderer
            ?.primaryContents
            ?.sectionListRenderer
            ?.contents?.[0]
            ?.itemSectionRenderer
            ?.contents ?? [];

        const lines = [];
        for (const item of contents) {
            const v = item?.videoRenderer;
            if (!v?.videoId) continue;
            const id    = v.videoId;
            const title = (v.title?.runs?.[0]?.text ?? 'Unknown').replace(/[|\n]/g, ' ');
            lines.push(`${id}|${title}`);
            if (lines.length >= 10) break;
        }

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.send(lines.join('\n'));

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Scrape error: ' + err.message);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Search proxy on :${PORT}`));
