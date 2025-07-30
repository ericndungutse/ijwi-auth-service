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

  async createAccount(accountData: ICreateAccountDto): Promise<IAccountDocument> {
    return await this.Account.create(accountData);
  }

  async findByEmail(email: string): Promise<IAccountDocument | null> {
    return await this.Account.findOne({ email });
  }

  async findById(id: string): Promise<IAccountDocument | null> {
    return await this.Account.findById(id);
  }

  async deleteAccount(userId: string): Promise<void> {
    const result = await this.Account.findByIdAndUpdate(
      userId,
      { isActive: false },
      { new: true }
    );
    
    if (!result) {
      throw new Error('User not found');
    }
  }
}
