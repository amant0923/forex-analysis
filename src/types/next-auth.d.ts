import type { UserTier } from "@/types";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      tier: UserTier;
    };
  }
  interface User {
    tier?: UserTier;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    tier: UserTier;
  }
}
