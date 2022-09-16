const express = require('express');

const router = express.Router();

router.use('/', express.static(`${process.cwd()}/integration/public`));

module.exports = router;
