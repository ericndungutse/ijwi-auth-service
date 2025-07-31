// Load environment variables first
require('dotenv').config();

import { IAccountRepository } from '../repository/IAccountRepository';
import { IAccountService } from '../services/interfaces/IAccountService';
import { IEmailService } from '../services/interfaces/IEmailService';
import { ISessionService } from '../services/interfaces/ISessionService';

import { EmailService } from './../services/impl/EmailService';
import { AccountService } from '../services/impl/AccountService';
import { RedisSessionService } from '../services/impl/RedisSessionService';
import { AccountRepository } from '../repository/AccountRepository';
import { AccountController } from '../controllers/AccountController';
import { Account } from '../models/account/account.model';

const accountRepository: IAccountRepository = new AccountRepository(Account);

const emailServiceInstance: IEmailService = new EmailService();

const redisSessionService: ISessionService = new RedisSessionService();

const accountService: IAccountService = new AccountService(
  accountRepository,
  emailServiceInstance,
  redisSessionService
);

const accountController: AccountController = new AccountController(accountService);

const serviceContainer = {
  accountController: accountController,
};

module.exports = { container: serviceContainer };
