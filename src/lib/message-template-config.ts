export const EMAIL_MESSAGE_KEYS = ['received','accepted','readyCollection','readyDelivery','completed'] as const;
export const SMS_MESSAGE_KEYS = ['accepted','readyCollection','readyDelivery'] as const;
export type EmailMessageKey = typeof EMAIL_MESSAGE_KEYS[number];
export type SmsMessageKey = typeof SMS_MESSAGE_KEYS[number];
export type EditableEmailTemplate = {subject:string;title:string;status:string;intro:string};
export type EmailBanner = {enabled:boolean;imageUrl:string;imageAlt:string;eyebrow:string;title:string;body:string;buttonLabel:string;buttonUrl:string};
export type MessageTemplateConfig = {
  email:{templates:Record<EmailMessageKey,EditableEmailTemplate>;banner:EmailBanner;footer:string};
  sms:Record<SmsMessageKey,string>;
};

export const DEFAULT_MESSAGE_TEMPLATES:MessageTemplateConfig={
  email:{
    templates:{
      received:{subject:'FOND has received {reference}',title:'Order received by FOND Midpoint',status:'Estimated preparation time: {prepMinutes} min',intro:'Thanks, {customerName}. We have received your order and the team will review it shortly.'},
      accepted:{subject:'FOND accepted {reference}',title:'Order accepted by FOND Midpoint',status:'Estimated preparation time: {prepMinutes} min',intro:'Good news, {customerName}. The FOND team has accepted your order.'},
      readyCollection:{subject:'Your FOND order {reference} is ready',title:'Your FOND order is ready',status:'Ready for collection at Midpoint Hub',intro:'{customerName}, your order is ready to collect from FOND at Midpoint Hub.'},
      readyDelivery:{subject:'Your FOND order {reference} is ready',title:'Your FOND order is ready',status:'Ready for delivery',intro:'{customerName}, your order is ready and will be delivered shortly.'},
      completed:{subject:'Thank you for your FOND order {reference}',title:'Your FOND order is complete',status:'Thank you for ordering from FOND',intro:'{customerName}, your order has been completed. We hope you enjoy it.'},
    },
    banner:{enabled:true,imageUrl:'',imageAlt:'FOND food and coffee',eyebrow:'FOND · MIDPOINT HUB',title:'Good food. Everyday.',body:'Fresh breakfast, lunch, coffee and more — ready for collection or delivery.',buttonLabel:'Browse the FOND menu',buttonUrl:'/'},
    footer:'Keep this message for your records. Contact the FOND team if you need help with an order.',
  },
  sms:{
    accepted:'FOND: Your order {reference} has been accepted and is being prepared.',
    readyCollection:'FOND: Your order {reference} is ready for collection.',
    readyDelivery:'FOND: Your order {reference} is ready and will be delivered shortly.',
  },
};

export const SAMPLE_MESSAGE_VALUES={customerName:'Brett',reference:'FOND-123456',prepMinutes:'20',collectionTime:'As soon as possible',destination:'Midpoint Hub',total:'R 120,00'};
const ALLOWED_TOKENS=new Set(Object.keys(SAMPLE_MESSAGE_VALUES));
const tokenPattern=/\{([a-zA-Z]+)\}/g;

export function renderMessageText(template:string,values:Record<string,string|number|undefined>){
  return template.replace(tokenPattern,(_match,key:string)=>String(values[key]??''));
}

function cleanText(value:unknown,label:string,max:number,required=true){
  if(typeof value!=='string')throw new Error(`${label} is invalid.`);
  const result=value.trim();
  if(required&&!result)throw new Error(`${label} is required.`);
  if(result.length>max)throw new Error(`${label} is limited to ${max} characters.`);
  for(const match of result.matchAll(tokenPattern))if(!ALLOWED_TOKENS.has(match[1]))throw new Error(`${label} contains unsupported placeholder {${match[1]}}.`);
  return result;
}

function cleanLink(value:unknown){
  const link=cleanText(value,'Banner button link',500,false);
  if(link&&!/^\/(?!\/)|^https:\/\//i.test(link))throw new Error('Banner button link must be a secure https:// address or a FOND path beginning with /.');
  return link;
}

export function validateMessageTemplates(input:unknown):MessageTemplateConfig{
  const raw=input as Partial<MessageTemplateConfig>;
  if(!raw||typeof raw!=='object'||!raw.email||!raw.sms)throw new Error('Provide email and SMS templates.');
  const templates={} as Record<EmailMessageKey,EditableEmailTemplate>;
  for(const key of EMAIL_MESSAGE_KEYS){
    const item=raw.email.templates?.[key];
    if(!item)throw new Error(`Complete the ${key} email template.`);
    templates[key]={subject:cleanText(item.subject,`${key} email subject`,150),title:cleanText(item.title,`${key} email heading`,120),status:cleanText(item.status,`${key} email status line`,180),intro:cleanText(item.intro,`${key} email message`,600)};
    if(!templates[key].subject.includes('{reference}'))throw new Error(`${key} email subject must include {reference}.`);
  }
  const sourceBanner=raw.email.banner;
  if(!sourceBanner||typeof sourceBanner.enabled!=='boolean')throw new Error('Check the email banner settings.');
  const banner:EmailBanner={
    enabled:sourceBanner.enabled,
    imageUrl:cleanText(sourceBanner.imageUrl,'Banner image',120,false),
    imageAlt:cleanText(sourceBanner.imageAlt,'Banner image description',120,false),
    eyebrow:cleanText(sourceBanner.eyebrow,'Banner label',60,false),
    title:cleanText(sourceBanner.title,'Banner heading',100),
    body:cleanText(sourceBanner.body,'Banner message',400),
    buttonLabel:cleanText(sourceBanner.buttonLabel,'Banner button text',40,false),
    buttonUrl:cleanLink(sourceBanner.buttonUrl),
  };
  if(banner.imageUrl&&!/^\/api\/promotion-images\/[a-f0-9-]{36}$/.test(banner.imageUrl))throw new Error('Use an image uploaded through FOND.');
  if(banner.enabled&&banner.buttonLabel&&!banner.buttonUrl)throw new Error('Add a link for the banner button.');
  const sms={} as Record<SmsMessageKey,string>;
  for(const key of SMS_MESSAGE_KEYS){
    sms[key]=cleanText(raw.sms[key],`${key} SMS`,320);
    if(!sms[key].includes('{reference}'))throw new Error(`${key} SMS must include {reference}.`);
    if(renderMessageText(sms[key],SAMPLE_MESSAGE_VALUES).length>320)throw new Error(`${key} SMS is too long after its placeholders are filled.`);
  }
  return {email:{templates,banner,footer:cleanText(raw.email.footer,'Email footer',300)},sms};
}
