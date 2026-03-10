import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import type { UserTier } from "@/types";

interface AuthUser {
  id: number;
  email: string;
  name: string | null;
  tier: UserTier;
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const user = session.user as any;
  return {
    id: Number(user.id),
    email: user.email,
    name: user.name || null,
    tier: (user.tier as UserTier) || "free",
  };
}
