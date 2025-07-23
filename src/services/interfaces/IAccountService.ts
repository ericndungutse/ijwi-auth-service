import { IAccountCreateResponseDto, IAccountDocument } from '../../models';

export interface IAccountService {
  createUser(userDto: IAccountCreateResponseDto): Promise<IAccountDocument>;
}
