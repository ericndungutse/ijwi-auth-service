const express = require('express');
const { container } = require('../infrastructure/container');

const accountRouter = express.Router();

accountRouter.post('/register', container.accountController.createUser);

module.exports = accountRouter;
