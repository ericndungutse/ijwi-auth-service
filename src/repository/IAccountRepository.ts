import { IAccountCreateResponseDto, IAccountDocument } from '../models/account/account.types';

export interface IAccountRepository {
  createAccount(accountData: IAccountCreateResponseDto): Promise<IAccountDocument>;
}
