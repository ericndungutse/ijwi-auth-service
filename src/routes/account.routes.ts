import { NextFunction, Request, Response } from 'express';

const express = require('express');
const { container } = require('../infrastructure/container');
const { authenticate } = require('../middleware/authenticate');

const accountRouter = express.Router();

accountRouter.post('/register', (req: Request, res: Response, next: NextFunction) =>
  container.accountController.createUser(req, res, next)
);
accountRouter.post('/signin', (req: Request, res: Response, next: NextFunction) =>
  container.accountController.signIn(req, res, next)
);

accountRouter.patch('/verify-email', (req: Request, res: Response, next: NextFunction) =>
  container.accountController.verifyEmail(req, res, next)
);

accountRouter.post('/forgot-password', (req: Request, res: Response, next: NextFunction) =>
  container.accountController.forgotPassword(req, res, next)
);

accountRouter.get('/logout', authenticate, (req: Request, res: Response, next: NextFunction) =>
  container.accountController.logout(req, res, next)
);

module.exports = accountRouter;
