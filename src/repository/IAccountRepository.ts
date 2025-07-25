import { ICreateAccountDto } from '../dto/accountDtos';
import { IAccountDocument } from '../models/account/account.types';

export interface IAccountRepository {
  createAccount(accountData: ICreateAccountDto): Promise<IAccountDocument>;
  findByEmail(email: string): Promise<IAccountDocument | null>;
}
