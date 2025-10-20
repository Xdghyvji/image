// This is your secure serverless function, now configured for the OpenRouter API.
// It runs on Netlify's backend, protecting your API key.

exports.handler = async (event) => {
    // 1. Check if the request is a POST request.
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // 2. Securely get the API key from Netlify's environment variables.
    // IMPORTANT: You must change this variable in your Netlify settings.
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

    if (!OPENROUTER_API_KEY) {
        return { statusCode: 500, body: JSON.stringify({ error: 'OpenRouter API key not configured.' }) };
    }
    
    // The specific API endpoint for OpenRouter's image generation
    const apiUrl = `https://openrouter.ai/api/v1/images/generations`;

    try {
        // 3. Get the prompt from the frontend's request body.
        const { prompt } = JSON.parse(event.body);

        if (!prompt) {
            return { statusCode: 400, body: JSON.stringify({ error: "Prompt is required." }) };
        }

        // 4. Construct the payload in the format required by the OpenRouter API.
        const payload = {
            // This is a common identifier for Google's Imagen model on OpenRouter.
            // You can change this to any image model OpenRouter supports.
            model: "google/imagen-3.0", 
            prompt: prompt,
            n: 1 // Generate one image
        };

        // 5. Call the OpenRouter API.
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // OpenRouter uses a Bearer token for authentication.
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                // Recommended headers for OpenRouter to identify your app.
                'HTTP-Referer': 'https://your-app-name.netlify.app', // Replace with your site URL
                'X-Title': 'Image Generation Agent' // Replace with your app name
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok) {
            console.error('OpenRouter API Error:', result);
            const errorMessage = result.error?.message || `OpenRouter API returned status ${response.status}`;
            throw new Error(errorMessage);
        }
        
        // 6. Extract the base64 image data from the response (OpenAI format).
        const base64Image = result.data?.[0]?.b64_json;

        if (!base64Image) {
            throw new Error("No image data received in OpenRouter API response.");
        }

        // 7. Send the image data back to the frontend.
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

