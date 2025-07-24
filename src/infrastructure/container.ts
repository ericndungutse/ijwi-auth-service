const AccountRepoModule = require('../repository/AccountRepository');
const AccountServiceModule = require('../services/impl/AccountService');
const Account = require('../models/account/account.model');
const AccountControllerModule = require('../controllers/AccountController');

const AccountRepositoryClass = AccountRepoModule.AccountRepository;
const AccountServiceClass = AccountServiceModule.AccountService;
const AccountControllerClass = AccountControllerModule.AccountController;

const accountRepository = new AccountRepositoryClass(Account);
const accountService = new AccountServiceClass(accountRepository);
const accountController = new AccountControllerClass(accountService);

const serviceContainer = {
  accountController: accountController,
};

module.exports = { container: serviceContainer };
