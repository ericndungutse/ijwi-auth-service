import { EmailService } from './../services/impl/EmailService';
import { Model } from 'mongoose';
import { IAccountDocument } from '../models/account/account.types';
import { IAccountRepository } from './IAccountRepository';
import { ICreateAccountDto } from '../dto/accountDtos';

export class AccountRepository implements IAccountRepository {
  private Account: Model<IAccountDocument>;

  constructor(Account: Model<IAccountDocument>) {
    this.Account = Account;
  }

  getVerificationCode(user: IAccountDocument): number {
    // Implement your code creation logic here
    return user.emailVerification.code ?? 0;
  }

  async createAccount(accountData: ICreateAccountDto): Promise<IAccountDocument> {
    return await this.Account.create(accountData);
  }

  async findByEmail(email: string): Promise<IAccountDocument | null> {
    return await this.Account.findOne({ email });
  }
}
