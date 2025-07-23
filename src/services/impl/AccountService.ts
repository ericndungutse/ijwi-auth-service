import { IAccountService } from './../interfaces/IAccountService';
import { IAccountCreateResponseDto, IAccountDocument } from '../../models';
import { IAccountRepository } from '../../repository/IAccountRepository';

export class AccountService implements IAccountService {
  private accountRepository: IAccountRepository;
  constructor(accountRepository: IAccountRepository) {
    this.accountRepository = accountRepository;
  }
  async createUser(userDto: IAccountCreateResponseDto): Promise<IAccountDocument> {
    return await this.accountRepository.createAccount(userDto);
  }
}
