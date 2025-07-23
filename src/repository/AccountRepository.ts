import mongoose from 'mongoose';
import { IAccountCreateResponseDto, IAccountDocument } from '../models';
import { IAccountRepository } from './IAccountRepository';

export class AccountRepository implements IAccountRepository {
  private Account: mongoose.Model<IAccountDocument>;

  constructor(Account: mongoose.Model<IAccountDocument>) {
    this.Account = Account;
  }

  async createAccount(accountData: IAccountCreateResponseDto): Promise<IAccountDocument> {
    return await this.Account.create(accountData);
  }
}
