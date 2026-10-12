import {after} from 'next/server';
import {beginTeamPasswordReset,completeTeamPasswordReset} from '@/lib/team-recovery';
import {validRequestOrigin} from '@/lib/request-origin';
const headers={'Cache-Control':'no-store'};
export async function POST(request:Request){
 if(!validRequestOrigin(request))return Response.json({message:'Invalid origin.'},{status:403,headers});
 const b=await request.json().catch(()=>null);
 if(typeof b?.username!=='string'||!/^[a-zA-Z0-9._@-]{3,100}$/.test(b.username.trim()))return Response.json({message:'Enter your team username.'},{status:400,headers});
 try{return Response.json(await beginTeamPasswordReset(b.username,work=>after(work)),{headers});}catch(e){return Response.json({message:e instanceof Error?e.message:'Recovery unavailable.'},{status:400,headers});}
}
export async function PATCH(request:Request){
 if(!validRequestOrigin(request))return Response.json({message:'Invalid origin.'},{status:403,headers});
 const b=await request.json().catch(()=>null);
 if(typeof b?.challenge!=='string'||!/^[a-f0-9]{64}$/.test(b.challenge)||typeof b.code!=='string'||!/^\d{6}$/.test(b.code)||typeof b.password!=='string'||b.password.length>128)return Response.json({message:'Enter your reset code and new password.'},{status:400,headers});
 try{completeTeamPasswordReset(b.challenge,b.code,b.password);return Response.json({message:'Password updated. Sign in with your new password. Your authenticator settings are unchanged.'},{headers});}catch(e){return Response.json({message:e instanceof Error?e.message:'Recovery unavailable.'},{status:400,headers});}
}
