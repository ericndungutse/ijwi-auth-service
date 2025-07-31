import { Request } from 'express';

export interface DeviceInfo {
  type: 'mobile' | 'web' | 'unknown';
  userAgent: string;
  deviceString: string;
}

export function extractDeviceInfo(req: Request): DeviceInfo {
  const clientType = req.headers['x-client-type'] as 'mobile' | 'web' | undefined;
  const userAgent = req.headers['user-agent'] || 'unknown';

  const type = clientType || 'web';
  const deviceString = `${type}-${userAgent.substring(0, 50)}`;

  return {
    type,
    userAgent,
    deviceString,
  };
}
