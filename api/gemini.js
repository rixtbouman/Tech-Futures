export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse body if needed
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { prompt, image, type } = body || {};

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error('GEMINI_API_KEY not found in environment');
      return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    }

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Build the request to Gemini
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const parts = [{ text: prompt }];

    // Add image if provided (for vision tasks)
    if (image) {
      parts.push({
        inline_data: {
          mime_type: "image/jpeg",
          data: image
        }
      });
    }

    const requestBody = {
      contents: [{
        parts: parts
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096
      }
    };

    console.log('Calling Gemini API...');

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (data.error) {
      console.error('Gemini API error:', JSON.stringify(data.error));
      return res.status(500).json({
        error: data.error.message || 'Gemini API error',
        details: data.error
      });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!text) {
      console.error('No text in Gemini response:', JSON.stringify(data));
      return res.status(500).json({
        error: 'No response from Gemini',
        details: data
      });
    }

    console.log('Gemini response received, length:', text.length);

    return res.status(200).json({
      result: text,
      type: type || 'text'
    });

  } catch (error) {
    console.error('Server error:', error.message, error.stack);
    return res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
}
