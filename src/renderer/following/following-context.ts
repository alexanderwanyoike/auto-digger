import { createContext } from 'react';
import type { useFollowing } from './use-following';

export const FollowingContext = createContext<ReturnType<typeof useFollowing> | null>(null);
