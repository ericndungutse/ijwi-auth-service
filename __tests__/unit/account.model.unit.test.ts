import mongoose from 'mongoose';
import { Account } from '../../src/models/account/account.model';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

describe('Account Model', () => {
  describe('comparePassword', () => {
    it('should return true for correct password', async () => {
      const password = 'mypassword';
      const hash = await bcrypt.hash(password, 10);
      const user = new Account({
        userName: 'a',
        email: 'a@b.com',
        password: hash,
        confirmPassword: hash,
      });
      expect(await user.comparePassword(password)).toBe(true);
    });
    it('should return false for incorrect password', async () => {
      const password = 'mypassword';
      const hash = await bcrypt.hash(password, 10);
      const user = new Account({
        userName: 'a',
        email: 'a@b.com',
        password: hash,
        confirmPassword: hash,
      });
      expect(await user.comparePassword('wrong')).toBe(false);
    });
  });

  describe('generateJwt', () => {
    it('should return a valid JWT', () => {
      process.env.JWT_SECRET = 'testsecret';
      const user = new Account({
        _id: new mongoose.Types.ObjectId(),
        userName: 'a',
        email: 'a@b.com',
        password: 'pass',
        confirmPassword: 'pass',
        role: 'user',
      });
      const token = user.generateJwt();
      const decoded = jwt.verify(token, 'testsecret');
      expect(decoded).toHaveProperty('id');
      expect(decoded).toHaveProperty('email', 'a@b.com');
      expect(decoded).toHaveProperty('role', 'user');
    });
  });
});
