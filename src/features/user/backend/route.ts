import { Hono } from 'hono';
import { AppEnv } from '@/backend/hono/context';
import { success } from '@/backend/http/response';
import { getUserRole } from './service';

const app = new Hono<AppEnv>();

/**
 * 현재 로그인한 사용자의 역할을 반환하는 엔드포인트
 */
app.get('/users/me/role', async (c) => {
  const supabase = c.var.supabase;
  const user = c.var.user;

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const result = await getUserRole(supabase, user.id);
  return success(c, result);
});

export { app as userRoutes };