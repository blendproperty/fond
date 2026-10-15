const input=$input.first().json, body=input.body??input;
const fail=(message)=>[{json:{status:'incomplete',message:'Your enquiry has not been sent. '+message+' Please choose Plan an event to review your details.'}}];
if(!body||typeof body!=='object'||Array.isArray(body)||JSON.stringify(body).length>20000)return fail('Invalid enquiry details.');
const text=(key,max=300)=>typeof body[key]==='string'&&body[key].trim().length<=max?body[key].trim():'';
const session=text('session',40), date=text('date',20), style=text('style',40), name=text('contactPerson',120), email=text('email',254), consent=text('consent',30), choice=text('phoneChoice',30);
if(consent==='Cancel enquiry')return [{json:{status:'cancelled',message:'Your enquiry has been cancelled and has not been emailed. Type MENU to start again.'}}];
if(!/^\d{16}$/.test(session)||consent!=='Send to Michelle')return fail('Submission consent or enquiry reference is missing.');
const today=new Date(Date.now()+7200000).toISOString().slice(0,10), time=Date.parse(date+'T12:00:00Z');
if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(time)||new Date(time).toISOString().slice(0,10)!==date||date<today||time>Date.now()+2*366*86400000)return fail('Choose an event date from today within two years.');
if(!['Buffet','Seated dinner','Canapés','Family style','Picnic','Braai'].includes(style))return fail('Choose your catering style.');
const guests=Number(body.guests);
if(!Number.isInteger(guests)||guests<1||guests>10000)return fail('Enter a valid guest count.');
if(!name||!/^\S+@\S+\.\S+$/.test(email))return fail('Contact name or email is missing.');
const phone=(value)=>{let result=String(value??'').replace(/[\s()+-]/g,'');if(/^0\d{9}$/.test(result))result='27'+result.slice(1);return /^[1-9]\d{7,14}$/.test(result)?'+'+result:'';};
const senderPhone=phone(body.senderPhone), alternative=phone(body.alternativePhone), replyPhone=choice==='Use this number'?senderPhone:choice==='Use another number'?alternative:'';
if(!senderPhone||!replyPhone)return fail('Choose this WhatsApp number or enter a valid alternative.');
let budget=text('budget',30),basis=text('budgetBasis',30);
if(!budget||/^not sure$/i.test(budget)){budget='Not provided';basis='Not specified';}
else{const amount=Number(budget.replace(/^[Rr]\s*/,'').replace(/,/g,''));if(!Number.isFinite(amount)||amount<=0||amount>100000000)return fail('Enter a valid budget in rand, or choose Not sure.');budget='R '+amount.toFixed(2);if(!['Total budget','Per person'].includes(basis))return fail('Choose total or per-person budget.');}
const company=text('company',160)||'Private function',occasion=text('occasion',300)||'Not specified';
const clean=(value)=>String(value).replace(/[\r\n\t]+/g,' ').replace(/\|/g,'/').replace(/`/g,"'").trim();
const rows=[['Reference',session],['Date',date],['Catering',style],['Guests',guests],['Contact',name],['Reply number',replyPhone],['Email',email],['Company',company],['Budget',budget],['Budget basis',basis],['Occasion',occasion]];
const table='\`\`\`\nField         | Details\n'+rows.map(([label,value])=>label.padEnd(13)+' | '+clean(value)).join('\n')+'\n\`\`\`';
return [{json:{status:'ready',message:'Your enquiry details are ready to submit.',table,session,senderPhone,replyPhone,payload:{reference:session,date,style,guests:String(guests),contactPerson:clean(name),replyPhone,email:clean(email),company:clean(company),budget:clean(budget),budgetBasis:clean(basis),occasion:clean(occasion)}}}];
