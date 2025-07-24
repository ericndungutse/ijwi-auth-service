import { IAccountService } from './../interfaces/IAccountService';
import { IAccountCreateResponseDto, IAccountDocument } from '../../models/account/account.types';
import { IAccountRepository } from '../../repository/IAccountRepository';

class AccountService implements IAccountService {
  private accountRepository: IAccountRepository;
  constructor(accountRepository: IAccountRepository) {
    this.accountRepository = accountRepository;
  }
  async createUser(userDto: IAccountCreateResponseDto): Promise<IAccountDocument> {
    return await this.accountRepository.createAccount(userDto);
  }
}

module.exports = { AccountService };
