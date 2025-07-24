import { IAccountCreateResponseDto, IAccountDocument } from '../../models/account/account.types';

export interface IAccountService {
  createUser(userDto: IAccountCreateResponseDto): Promise<IAccountDocument>;
}
