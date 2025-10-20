// This is your secure serverless function, now configured for the OpenRouter API.
// It runs on Netlify's backend, protecting your API key.

exports.handler = async (event) => {
    // 1. Check if the request is a POST request.
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // 2. Securely get the API key from Netlify's environment variables.
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    if (!OPENROUTER_API_KEY) {
        return { statusCode: 500, body: JSON.stringify({ error: 'OpenRouter API key not configured.' }) };
    }
    
    // FIX: Use the correct CHAT endpoint as specified in the new documentation.
    const apiUrl = `https://openrouter.ai/api/v1/chat/completions`;

    if (!event.body) {
        return { statusCode: 400, body: JSON.stringify({ error: "Request body is missing." }) };
    }

    try {
        // 3. Get the prompt from the frontend's request body.
        const { prompt } = JSON.parse(event.body);
        if (!prompt) {
            return { statusCode: 400, body: JSON.stringify({ error: "Prompt is required." }) };
        }

        // 4. Construct the payload in the CHAT format required by the model's documentation.
        const payload = {
            model: "google/gemini-2.5-flash-image",
            messages: [
                { role: "user", content: prompt }
            ],
            // Add extra parameters to hint that we want an image back.
            // This is an educated guess as the docs don't specify text-to-image response format.
            extra_body: {
                image_config: {
                    width: 1024,
                    height: 1024
                },
                response_format: { type: "b64_json" }
            }
        };

        // 5. Call the OpenRouter API.
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': 'https://your-app-name.netlify.app',
                'X-Title': 'Image Generation Agent'
            },
            body: JSON.stringify(payload)
        });

        const responseText = await response.text();
        if (!responseText) {
            throw new Error("Received an empty response from the OpenRouter API.");
        }
        const result = JSON.parse(responseText);

        if (!response.ok) {
            console.error('OpenRouter API Error:', result);
            const errorMessage = result.error?.message || `OpenRouter API returned status ${response.status}`;
            throw new Error(errorMessage);
        }
        
        // 6. Extract the image data. Since it's a chat endpoint, the image data
        // might be in the 'content' of the first choice. We will need to see the
        // actual response structure to confirm this is correct.
        // This is a likely path, but may need adjustment based on live results.
        const base64Image = result.choices?.[0]?.message?.content;

        if (!base64Image) {
            console.error("Unexpected Response Structure:", result);
            throw new Error("No image data found in the expected format from OpenRouter.");
        }

        // 7. Send the image data back to the frontend.
        return {
            statusCode: 200,
            body: JSON.stringify({ base64Image: base64Image.replace(/^data:image\/\w+;base64,/, '') }) // Clean prefix if it exists
        };

    } catch (error) {
        console.error('Error in serverless function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};

