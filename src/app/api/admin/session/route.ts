import {cookies} from 'next/headers';
import {ADMIN_COOKIE,adminRole} from '@/lib/admin-auth';
export async function GET(){const role=adminRole((await cookies()).get(ADMIN_COOKIE)?.value);return Response.json({role},{headers:{'Cache-Control':'no-store'}});}
