// netlify/functions/chat.js
exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Get API key from environment variable
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  
  if (!GEMINI_API_KEY) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'API key not configured' })
    };
  }

  try {
    const { prompt, knowledge, personality } = JSON.parse(event.body);
    
    // Build the system prompt
    const systemPrompt = `You are Limbo, an alien pop star. 
    ${knowledge ? `Knowledge: ${knowledge}` : ''}
    ${personality ? `Personality: ${JSON.stringify(personality)}` : ''}
    
    Rules:
    - Always lowercase, no caps
    - Be sarcastic but helpful
    - Short responses
    - No emojis
    
    User: ${prompt}`;

    // Call Gemini API
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + GEMINI_API_KEY, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: systemPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 150,
        }
      })
    });

    const data = await response.json();
    
    // Extract the reply
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "something went wrong";

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ reply })
    };
    
  } catch (error) {
    console.error('Chat error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to process request' })
    };
  }
};