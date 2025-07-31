import crypto from 'crypto';

const hashString = (string: string) => {
  return crypto.createHmac('sha256', string).digest('hex');
};

export default hashString;
