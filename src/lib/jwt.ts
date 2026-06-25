import { SignJWT, jwtVerify } from "jose";

export type TokenPayload = {
  _id: string;
  email: string;
  role: "admin" | "vendor";
  status: string;
  businessName?: string;
};

const getSecret = () => new TextEncoder().encode(process.env.JWT_SECRET!);

export const generateToken = (payload: TokenPayload): Promise<string> =>
  new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(getSecret());

export const verifyToken = async (token: string): Promise<TokenPayload | null> => {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
};
