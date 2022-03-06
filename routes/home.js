const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.send(`Welcome to Ady's social media app.`);
});

module.exports = router;

