import { Model } from 'mongoose';
import { IAccountCreateResponseDto, IAccountDocument } from '../models/account/account.types';
import { IAccountRepository } from './IAccountRepository';

class AccountRepository implements IAccountRepository {
  private Account: Model<IAccountDocument>;

  constructor(Account: Model<IAccountDocument>) {
    this.Account = Account;
  }

  async createAccount(accountData: IAccountCreateResponseDto): Promise<IAccountDocument> {
    return await this.Account.create(accountData);
  }
}

module.exports = { AccountRepository };
