import { cookies } from 'next/headers';
import { ADMIN_COOKIE,isValidAdminToken } from '@/lib/admin-auth';
import { analytics,saDate } from '@/lib/analytics';
import { csv } from '@/lib/business-data';
export async function GET(request:Request){
 const headers={'Cache-Control':'no-store'};
 if(!isValidAdminToken((await cookies()).get(ADMIN_COOKIE)?.value))return Response.json({message:'Admin access required.'},{status:401,headers});
 try{const u=new URL(request.url),to=u.searchParams.get('to')??saDate(),from=u.searchParams.get('from')??saDate(new Date(Date.now()-29*86400000));const data=analytics(from,to,u.searchParams.get('fulfillment')??'all');
 if(u.searchParams.get('export')==='items')return new Response(csv(data.products),{headers:{...headers,'Content-Type':'text/csv','Content-Disposition':'attachment; filename="fond-item-performance.csv"'}});
 return Response.json(data,{headers});}catch(e){return Response.json({message:e instanceof Error?e.message:'Could not load report.'},{status:400,headers});}
}
