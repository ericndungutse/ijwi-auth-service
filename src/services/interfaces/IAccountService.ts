import { ApiResponse } from '../../dto/ApiResponse';
import { IAccountCreateResponseDto } from '../../models';

export interface IUserService {
  createUser(userDto: IAccountCreateResponseDto): Promise<ApiResponse<void>>;
}
