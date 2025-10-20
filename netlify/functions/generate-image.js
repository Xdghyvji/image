// This is your secure serverless function.
// It runs on Netlify's backend, protecting your API key.
// No 'node-fetch' is needed, as we use the native fetch API available in Node.js 18+

exports.handler = async (event) => {
    // 1. Check if the request is a POST request.
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // 2. Securely get the API key from Netlify's environment variables.
    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

    if (!DEEPSEEK_API_KEY) {
        return { statusCode: 500, body: JSON.stringify({ error: 'API key not configured.' }) };
    }
    
    try {
        // 3. Get the prompt from the frontend's request body.
        const { prompt } = JSON.parse(event.body);

        if (!prompt) {
            return { statusCode: 400, body: JSON.stringify({ error: "Prompt is required." }) };
        }

        // 4. Call the actual DeepSeek API using the native fetch.
        const response = await fetch('https://api.deepseek.com/v1/images/generations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
                prompt: prompt,
                n: 1,
                size: "1024x1024",
                model: "deepseek-v2"
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            console.error('DeepSeek API Error:', data);
            throw new Error(data.error.message || `DeepSeek API returned status ${response.status}`);
        }
        
        // 5. Send the image data back to the frontend.
        const base64Image = data.data[0].b64_json;
        return {
            statusCode: 200,
            body: JSON.stringify({ base64Image })
        };

    } catch (error) {
        console.error('Error in serverless function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};

