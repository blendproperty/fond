import {currentAdmin} from '@/lib/admin-request';
import {validRequestOrigin} from '@/lib/request-origin';
import {approvalNotificationStatus,queueTestApprovalAlerts,processApprovalAlerts} from '@/lib/loyalty-approval-alerts';
import {getDb} from '@/lib/db';
const headers={'Cache-Control':'no-store'};
export async function GET(request:Request){
 if(!await currentAdmin())return Response.json({message:'Manager access required.'},{status:403,headers});
 if(new URL(request.url).searchParams.has('count'))return Response.json({pending:Number(getDb().prepare("SELECT count(*) n FROM coupon_candidates WHERE status='pending'").get()?.n??0)},{headers});
 return Response.json(approvalNotificationStatus(),{headers});
}
export async function POST(request:Request){
 const who=await currentAdmin();if(who?.role!=='super-admin')return Response.json({message:'Super admin access required for notification tests.'},{status:403,headers});
 if(!validRequestOrigin(request))return Response.json({message:'Invalid origin.'},{status:403,headers});
 try{const b=await request.json();if(b?.action!=='test-alerts')throw new Error('Choose a notification test.');
  const eventKey=queueTestApprovalAlerts(request.headers.get('Idempotency-Key')??'',who.actor);await processApprovalAlerts();return Response.json({eventKey,...approvalNotificationStatus()},{headers});
 }catch(e){return Response.json({message:e instanceof Error?e.message:'Could not test approval alerts.'},{status:400,headers});}
}
