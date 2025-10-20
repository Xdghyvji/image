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
                { role: "user", content: `Generate an image of: ${prompt}` }
            ],
            extra_body: {
                image_config: {
                    width: 1024,
                    height: 1024
                }
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
        
        // 6. THE DEFINITIVE FIX: Parse the exact nested structure revealed by the debug log.
        const message = result.choices?.[0]?.message;
        let base64Image = null;

        // The debug log showed the image data is at: message -> content (array) -> [0] -> image_url -> url
        if (message && Array.isArray(message.content) && message.content.length > 0) {
            const imagePart = message.content[0];
            if (imagePart.type === 'image_url' && imagePart.image_url && imagePart.image_url.url) {
                base64Image = imagePart.image_url.url;
            }
        }

        if (!base64Image) {
            // This error will now only trigger if the API changes its structure again.
            console.error("Unexpected Response Structure (Full Response):", JSON.stringify(result, null, 2));
            throw new Error("No image data found in the expected format from OpenRouter.");
        }

        // 7. Send the image data back to the frontend, removing the data URI prefix.
        return {
            statusCode: 200,
            body: JSON.stringify({ base64Image: base64Image.replace(/^data:image\/\w+;base64,/, '') })
        };

    } catch (error) {
        console.error('Error in serverless function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};

