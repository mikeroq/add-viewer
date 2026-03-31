const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname));

app.get('/proxy', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send('Missing url parameter');

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });

    const contentType = response.headers.get('content-type') || 'text/html';

    // Pass through non-HTML content as-is (images, CSS, JS, etc.)
    if (!contentType.includes('text/html')) {
      res.set('Content-Type', contentType);
      const buffer = Buffer.from(await response.arrayBuffer());
      return res.send(buffer);
    }

    let html = await response.text();

    // Inject a <base> tag so relative URLs resolve against the original site
    const baseUrl = new URL(url);
    const baseTag = `<base href="${baseUrl.origin}/">`;

    if (html.includes('<head>')) {
      html = html.replace('<head>', `<head>${baseTag}`);
    } else if (html.includes('<HEAD>')) {
      html = html.replace('<HEAD>', `<HEAD>${baseTag}`);
    } else {
      html = baseTag + html;
    }

    // Strip X-Frame-Options and CSP by simply not forwarding them
    // Set permissive headers
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.set('Access-Control-Allow-Origin', '*');
    res.send(html);
  } catch (err) {
    res.status(500).send(`Failed to load: ${err.message}`);
  }
});

app.listen(PORT, () => {
  console.log(`ADD Viewer running at http://localhost:${PORT}`);
});
