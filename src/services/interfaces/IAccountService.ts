import { ICreateAccountDto } from '../../dto/accountDtos';
import { IAccountDocument } from '../../models/account/account.types';

export interface IAccountService {
  createUser(userDto: ICreateAccountDto): Promise<IAccountDocument>;
}
