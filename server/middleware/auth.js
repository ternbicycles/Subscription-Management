// Middleware to check API Key
const apiKeyAuth = (req, res, next) => {
    const apiKey = req.get('X-API-KEY');
    const serverApiKey = process.env.API_KEY;

    if (!serverApiKey) {
        // This is a server configuration error
        console.error('API_KEY not found in .env file. Server is not secured.');
        return res.status(500).json({ message: 'API Key not configured on the server.' });
    }

    if (apiKey && apiKey === serverApiKey) {
        next();
    } else {
        res.status(401).json({ message: 'Invalid or missing API Key' });
    }
};

module.exports = {
    apiKeyAuth
};
