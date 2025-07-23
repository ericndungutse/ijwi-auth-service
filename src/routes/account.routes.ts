import express from 'express';
import { container } from '../infrastructure/container';

const accountRouter = express.Router();

accountRouter.post('/register', container.accountController.createUser);
export default accountRouter;
