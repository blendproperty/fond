import {getDb} from './db';
import {DEFAULT_MESSAGE_TEMPLATES,type MessageTemplateConfig,validateMessageTemplates} from './message-template-config';

export function publishedMessageTemplates():MessageTemplateConfig{
  const row=getDb().prepare('SELECT value FROM app_documents WHERE key=?').get('message-templates-published') as {value:string}|undefined;
  if(!row)return DEFAULT_MESSAGE_TEMPLATES;
  try{return validateMessageTemplates(JSON.parse(row.value));}catch{return DEFAULT_MESSAGE_TEMPLATES;}
}
