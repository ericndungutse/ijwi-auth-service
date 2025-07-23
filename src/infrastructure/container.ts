import { AccountController } from './../controllers';
import Account from '../models/account/account.model';
import { AccountRepository } from '../repository';
import { AccountService } from '../services/impl/AccountService';

const accountRepository: AccountRepository = new AccountRepository(Account);
const accountService: AccountService = new AccountService(accountRepository);
const accountController: AccountController = new AccountController(accountService);

export const container = {
  accountController: accountController,
};
