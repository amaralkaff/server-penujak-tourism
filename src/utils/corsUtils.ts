// utils/corsUtils.ts

import cors from 'cors';

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://penujak-tourism.vercel.app",
  "https://103.127.132.14",
  "https://amangly.penujaktourism.online"
];

export const corsOptions = cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg =
        "The CORS policy for this site does not allow access from the specified Origin.";
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
});