// Type declaration (you can move this to a separate .d.ts file if preferred)
declare module 'rate-limit-redis' {
    import { Store } from 'express-rate-limit';
    
    export interface RedisStoreOptions {
      sendCommand?: (...args: string[]) => Promise<unknown>;
    }
  
    export default class RedisStore implements Store {
      constructor(options: RedisStoreOptions);
    }
}
