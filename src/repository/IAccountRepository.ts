import { IAccountCreateResponseDto, IAccountDocument } from '../models';

export interface IAccountRepository {
  createAccount(accountData: IAccountCreateResponseDto): Promise<IAccountDocument>;
}
