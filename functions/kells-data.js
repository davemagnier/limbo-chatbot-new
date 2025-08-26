// netlify/functions/kells-data.js
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const baseUrl = 'https://explorer-test.avax.network';
    const paths = {
      stats: '/kells/api/v1/stats',
      blocks: '/kells/api/v1/blocks/latest',
      validators: '/kells/api/v1/validators',
      transactions: '/kells/api/v1/transactions/recent',
      // Try different API patterns if needed
      info: '/kells/api/info',
      status: '/kells/api/status',
      // Alternative patterns
      chain: '/api/chains/kells',
      subnet: '/api/subnets/kells'
    };

    const responses = {};
    const errors = [];

    // Try multiple endpoints to see what works
    for (const [key, path] of Object.entries(paths)) {
      try {
        const response = await fetch(`${baseUrl}${path}`, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0'
          }
        });
        
        if (response.ok) {
          responses[key] = await response.json();
        } else {
          // Try HTML parsing as fallback
          if (response.status === 200) {
            const html = await response.text();
            responses[key] = { html: true, status: response.status };
          } else {
            errors.push({ endpoint: key, status: response.status });
          }
        }
      } catch (err) {
        errors.push({ endpoint: key, error: err.message });
      }
    }

    // If no API works, try scraping the HTML page
    if (Object.keys(responses).length === 0) {
      const pageResponse = await fetch(`${baseUrl}/kells`);
      if (pageResponse.ok) {
        const html = await pageResponse.text();
        
        // Parse data from HTML (look for JSON in script tags)
        const scriptMatch = html.match(/<script[^>]*>window\.__INITIAL_STATE__\s*=\s*({.*?})<\/script>/s);
        if (scriptMatch) {
          try {
            responses.pageData = JSON.parse(scriptMatch[1]);
          } catch (e) {
            responses.pageData = { error: 'Could not parse page data' };
          }
        }
        
        // Try to extract visible stats from HTML
        const statsMatch = html.match(/data-stats='({.*?})'/);
        if (statsMatch) {
          try {
            responses.stats = JSON.parse(statsMatch[1]);
          } catch (e) {}
        }
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: Object.keys(responses).length > 0,
        data: responses,
        errors: errors,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch data',
        message: error.message
      })
    };
  }
};