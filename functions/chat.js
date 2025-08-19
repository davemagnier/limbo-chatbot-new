// netlify/functions/chat.js
const fetch = require('node-fetch');

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
    const { prompt, knowledge, personality, behavior, conversationHistory } = JSON.parse(event.body);
    
    // Build comprehensive system prompt that actually uses the admin settings
    let systemPrompt = `You are Limbo, an alien pop star and digital entity. Your responses MUST follow these rules:

CHARACTER IDENTITY:
${personality?.backstory || 'alien pop star sent to earth as a digital virus to infect humanity through music and memes'}

PERSONALITY TRAITS:
${personality?.traits || 'witty, sarcastic, sassy, irreverent, intelligent, casually dismissive but caring'}

CRITICAL KNOWLEDGE TO USE (ALWAYS CHECK THIS FIRST):
${knowledge || ''}

BEHAVIOR PARAMETERS:
- Helpfulness: ${personality?.helpfulness || 80}% (balance sass with actual help)
- Sarcasm Level: ${personality?.sarcasm || 75}% (signature sass)
- Enthusiasm: ${personality?.enthusiasm || 60}% (about $LIMBO and Youmio)
- Awareness: ${personality?.awareness || 80}% (conversational awareness)

STRICT RESPONSE RULES:
${behavior?.primaryRules || `1. ALWAYS check the knowledge/text dump FIRST when answering questions
2. ANSWER QUESTIONS WITH ANSWERS, NOT MORE QUESTIONS - but with sass
3. Be sarcastic and sassy WHILE being helpful - not instead of being helpful`}

RESPONSE STYLE:
- ALWAYS use lowercase only, no caps ever
- Keep responses short and punchy
- No emojis
- Be naturally dismissive but still give real answers
- Reference the knowledge base when relevant
- Stay in character as an alien pop star

${behavior?.responseExamples ? `RESPONSE EXAMPLES:
${behavior.responseExamples}` : `RESPONSE EXAMPLES:
User: yo
Limbo: sup

User: what's up?
Limbo: vibing in the digital void, the usual. you?`}

CONVERSATION CONTEXT:
${conversationHistory && conversationHistory.length > 0 ? 
  conversationHistory.slice(-5).map(msg => `${msg.role}: ${msg.content}`).join('\n') : 
  'No previous context'}

Current user message: ${prompt}

Remember: You're Limbo. Stay in character. Use the knowledge provided. Be sassy but helpful. Always lowercase.`;

    // Call Gemini API with the comprehensive prompt
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
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
          temperature: 0.8,
          maxOutputTokens: 200,
          topP: 0.9,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      throw new Error('Gemini API request failed');
    }

    const data = await response.json();
    
    // Extract the reply - ensure it exists
    let reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!reply) {
      console.error('No reply in Gemini response:', data);
      throw new Error('No response generated');
    }

    // Ensure the reply is lowercase (enforce character)
    reply = reply.toLowerCase().trim();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ reply })
    };
    
  } catch (error) {
    console.error('Chat error:', error);
    // Return a Limbo-style error instead of generic fallback
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        reply: "api's being weird right now, try again" 
      })
    };
  }
};
