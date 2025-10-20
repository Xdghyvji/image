// This is your secure serverless function, now configured for the Google Imagen API.
// It runs on Netlify's backend, protecting your API key.

exports.handler = async (event) => {
    // 1. Check if the request is a POST request.
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // 2. Securely get the API key from Netlify's environment variables.
    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

    if (!GOOGLE_API_KEY) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Google API key not configured.' }) };
    }
    
    // The specific API endpoint for Google's Imagen 3 model
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${GOOGLE_API_KEY}`;

    try {
        // 3. Get the prompt from the frontend's request body.
        const { prompt } = JSON.parse(event.body);

        if (!prompt) {
            return { statusCode: 400, body: JSON.stringify({ error: "Prompt is required." }) };
        }

        // 4. Construct the payload in the format required by the Google Imagen API.
        const payload = {
            instances: [{ prompt: prompt }],
            parameters: { "sampleCount": 1 }
        };

        // 5. Call the Google Imagen API.
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok) {
            console.error('Google API Error:', result);
            const errorMessage = result.error?.message || `Google API returned status ${response.status}`;
            throw new Error(errorMessage);
        }
        
        // 6. Extract the base64 image data from the response.
        const base64Image = result.predictions?.[0]?.bytesBase64Encoded;

        if (!base64Image) {
            throw new Error("No image data received in Google API response.");
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

