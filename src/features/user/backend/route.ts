import { Hono } from 'hono';
import { AppEnv, getSupabase } from '@/backend/hono/context';
import { respond, success } from '@/backend/http/response';
import { getUserRole } from './service';

const app = new Hono<AppEnv>();

/**
 * 현재 로그인한 사용자의 역할을 반환하는 엔드포인트
 */
app.get('/users/me/role', async (c) => {
  const supabase = getSupabase(c);

  return c.json({ error: 'Not implemented yet' }, 501);
});

export { app as userRoutes };