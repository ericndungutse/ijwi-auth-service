// Load environment variables first
require('dotenv').config();

import { IAccountRepository } from '../repository/IAccountRepository';
import { IAccountService } from '../services/interfaces/IAccountService';
import { IEmailService } from '../services/interfaces/IEmailService';

import { EmailService } from './../services/impl/EmailService';
import { AccountService } from '../services/impl/AccountService';
import { AccountRepository } from '../repository/AccountRepository';
import { AccountController } from '../controllers/AccountController';
import { Account } from '../models/account/account.model';

const accountRepository: IAccountRepository = new AccountRepository(Account);

const emailServiceInstance: IEmailService = new EmailService();

const accountService: IAccountService = new AccountService(accountRepository, emailServiceInstance);

const accountController: AccountController = new AccountController(accountService);

const serviceContainer = {
  accountController: accountController,
};

module.exports = { container: serviceContainer };
