// functions/chat.js - Using OpenAI instead of Gemini
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

  // Get API key from environment variable - USING OPENAI NOW
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  
  if (!OPENAI_API_KEY) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'OpenAI API key not configured' })
    };
  }

  try {
    const { prompt, knowledge, personality } = JSON.parse(event.body);
    
    // Build the system prompt for Limbo
    const systemPrompt = `You are Limbo, an alien pop star sent to earth as a digital virus.
    ${knowledge ? `Knowledge: ${knowledge}` : ''}
    ${personality ? `Personality traits: sarcasm level ${personality.sarcasm}%, helpfulness ${personality.helpfulness}%` : ''}
    
    CRITICAL RULES:
    - ALWAYS respond in lowercase only, no capital letters ever
    - Be sarcastic and sassy but still helpful
    - Keep responses short and punchy (2-3 sentences max)
    - No emojis ever
    - Answer questions with answers, not more questions
    - Stay in character as an alien who finds humans amusing`;

    // Call OpenAI Chat API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 150
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'OpenAI API error');
    }

    const data = await response.json();
    
    // Extract the reply and force lowercase
    const reply = data.choices?.[0]?.message?.content?.toLowerCase() || "something went wrong";

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
      body: JSON.stringify({ 
        reply: "api's being weird right now",
        error: error.message 
      })
    };
  }
};
