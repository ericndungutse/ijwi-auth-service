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

accountRouter.patch('/reset-password', (req: Request, res: Response, next: NextFunction) =>
  container.accountController.resetPassword(req, res, next)
);

accountRouter.get('/logout', authenticate, (req: Request, res: Response, next: NextFunction) =>
  container.accountController.logout(req, res, next)
);

accountRouter.get('/me', authenticate, (req: Request, res: Response, next: NextFunction) =>
  container.accountController.getCurrentUser(req, res, next)
);

accountRouter.patch('/update-password', authenticate, (req: Request, res: Response, next: NextFunction) =>
  container.accountController.updatePassword(req, res, next)
);

accountRouter.delete('/delete-account', authenticate, (req: Request, res: Response, next: NextFunction) =>
  container.accountController.deleteAccount(req, res, next)
);

module.exports = accountRouter;
