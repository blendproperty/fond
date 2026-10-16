"""Build an inactive WhatChimp support-menu draft from the saved Midpoint export.

No network, provider writes, messages, or credentials. Fresh provider readback is
required before activating or updating the live main menu.
"""
import copy
import hashlib
import json
from pathlib import Path
from urllib.parse import urlencode, urlparse, parse_qs

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
BASE = ROOT / 'docs/midpoint-interactive-menu.txt'
base = json.loads(BASE.read_text(encoding='utf-8-sig'))
original = base['nodes']
TRIGGERS = [
    'human', 'help', 'support', 'assistance', 'agent', 'real person',
    'speak to someone', 'speak to somebody', 'talk to someone',
    'talk to somebody', 'speak to staff', 'talk to staff',
    'chat with someone', 'need assistance', 'need help', 'help me',
    'can you help', 'please help', 'assist me', 'customer service',
    'contact the team', 'speak to a member', 'team', 'complaint',
    'complaints', 'cancel my order', 'change my order', 'order help',
]
ROUTES = [
    ('Padel', 'Courts, bookings and padel enquiries', 'Alistair', '27827465401'),
    ('Accounts', 'Billing and account enquiries', 'Alistair', '27827465401'),
    ('FOND', 'Food, coffee and order enquiries', 'Ray', '27662205519'),
    ('Functions', 'Catering, functions and events', 'Michelle', '27704179160'),
    ('Gym', 'Membership, classes and gym enquiries', 'Christine', '27716896343'),
    ('Sales', 'Sales and new business enquiries', 'Christine', '27716896343'),
    ('Complaints', 'Raise a concern with Alistair', 'Alistair', '27827465401'),
    ('Other', 'Help with something else', None, None),
]

def uid(label):
    return hashlib.sha256(('midpoint-support-20261016:' + label).encode()).hexdigest()[:16]

def node(template, ident):
    item = copy.deepcopy(original[str(template)])
    item['id'] = ident
    for port in [*item.get('inputs', {}).values(), *item.get('outputs', {}).values()]:
        port['connections'] = []
    for key in ['uniqueId', 'postbackId', 'xitFbpostbackId']:
        if key in item['data']:
            item['data'][key] = uid(str(ident) + key)
    if 'conversationUserId' in item['data']:
        item['data']['conversationUserId'] = ''
    if 'conversationUserText' in item['data']:
        item['data']['conversationUserText'] = 'Select Team Member'
    return item

def connect(nodes, source, output, target, input_name):
    nodes[str(source)]['outputs'][output]['connections'].append({'node': target, 'input': input_name, 'data': []})
    nodes[str(target)]['inputs'][input_name]['connections'].append({'node': source, 'output': output, 'data': []})

nodes = {}
for ident, template in [(1,1),(5,5),(6,6),(7,7)]:
    nodes[str(ident)] = node(template,ident)
nodes['1']['data'].update(title='Midpoint Hub - Support enquiry routing DRAFT',triggerKeyword='midpointsupportpreview20261016',triggerMatchingType='exact')
nodes['5']['data'].update(headerText='How can we help?',textMessage='Choose what your enquiry is about, and we will connect you with the right person.',footerText='Choose a topic below. Type MENU for the main menu.')
nodes['6']['data']['buttonText'] = 'Choose enquiry'
nodes['7']['data']['title'] = 'Choose your enquiry'
connect(nodes,1,'referenceOutput',5,'interactiveInput')
connect(nodes,5,'interactiveOutputListMessage',6,'quickReplyInput')
connect(nodes,6,'quickReplyOutput',7,'sectionInput')
manifest = []
for index,(topic,description,person,phone) in enumerate(ROUTES):
    rid = 100 + index
    row = node(8,rid)
    row['data'].update(title=topic,description=description)
    row['position'] = [1100,index*220]
    nodes[str(rid)] = row
    connect(nodes,7,'sectionOutputRows',rid,'rowInput')
    if phone:
        tid = 200 + index
        text = node(20,tid)
        message = f'Hi {person}, I came from Midpoint Hub and need help with {topic}.'
        url = 'https://wa.me/' + phone + '?' + urlencode({'text':message})
        text['data']['textMessage'] = f'{person} can help with your {topic} enquiry.\n\nTap the link below to open a direct WhatsApp chat, then tap Send:\n{url}\n\nThis opens a separate conversation. Your Midpoint chat history is not transferred.\n\nType MENU to return to Midpoint Hub.'
        text['position'] = [1480,index*220]
        nodes[str(tid)] = text
        connect(nodes,rid,'rowOutput',tid,'textInput')
        manifest.append(dict(topic=topic,person=person,phone=phone,url=url,prefilledMessage=message))
    else:
        # Preserve the saved existing handoff, including its existing assignee.
        # Confirm these nodes against a fresh live export before publication.
        row['data']['conversationUserId'] = original['15']['data']['conversationUserId']
        row['data']['conversationUserText'] = original['15']['data']['conversationUserText']
        for legacy in ['34','35']:
            nodes[legacy] = copy.deepcopy(original[legacy])
        nodes['34']['inputs']['interactiveInput']['connections'] = []
        connect(nodes,rid,'rowOutput',34,'interactiveInput')
        manifest.append(dict(topic=topic,mode='preserve-existing-handoff',savedAssignee=original['15']['data']['conversationUserText'],savedAssigneeId=original['15']['data']['conversationUserId'],liveVerificationRequired=True))
flow = {'id':base['id'],'nodes':nodes}
(OUT/'provider-import-draft.json').write_text(json.dumps(flow,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
plan = dict(status='DRAFT_NOT_PUBLISHED',date='2026-10-16',botId='474865',previewTrigger='midpointsupportpreview20261016',activationTriggers=TRIGGERS,activationMatching='string',menuText=nodes['5']['data']['textMessage'],routes=manifest,sourceExport=str(BASE.relative_to(ROOT)),sourceSha256=hashlib.sha256(BASE.read_bytes()).hexdigest(),publicationGates=['Restore browser control and read back current live configuration','Backup live keyword, current main-menu and human-action flows','Verify Other preserves the existing live destination without guessing a number','Remove HELP from main-menu keywords to avoid trigger conflict','Replace existing team-contact keyword handling in place or remove overlapping triggers after backup; do not leave competing support flows','Ensure main-menu Talk to a human opens support submenu without preassigning or pausing','Activate only after provider import/save/reopen and all routes verified','Complete fresh handset tests and staff receipt/reply checks'])
(OUT/'routing-plan.json').write_text(json.dumps(plan,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')

# Local structural and link verification. This does not establish provider acceptance.
assert len(ROUTES)==8 and len({r[0] for r in ROUTES})==8
assert len(nodes['7']['outputs']['sectionOutputRows']['connections'])==8
assert nodes['1']['data']['triggerKeyword']=='midpointsupportpreview20261016'
assert nodes['1']['data']['conversationUserId']==''
assert len(nodes['7']['data']['title'])<=24
assert len(nodes['6']['data']['buttonText'])<=20
seen=set()
pending=['1']
while pending:
    key=pending.pop()
    if key in seen: continue
    seen.add(key)
    pending.extend(str(edge['node']) for port in nodes[key].get('outputs',{}).values() for edge in port['connections'])
assert seen==set(nodes)
for route in manifest:
    if route.get('phone'):
        url=urlparse(route['url'])
        assert url.scheme=='https' and url.hostname=='wa.me' and url.path=='/'+route['phone']
        assert parse_qs(url.query)['text']==[route['prefilledMessage']]
        assert route['phone'] in ['27827465401','27662205519','27704179160','27716896343']
for key,item in nodes.items():
    assert str(item['id'])==key
    for output,port in item.get('outputs',{}).items():
        for edge in port['connections']:
            target=nodes[str(edge['node'])]
            assert edge['input'] in target['inputs']
            assert any(str(reverse['node'])==key and reverse['output']==output for reverse in target['inputs'][edge['input']]['connections'])
    if item['name']=='Rows':
        assert len(item['data']['title'])<=24 and len(item['data']['description'])<=72
        assert len(item['outputs']['rowOutput']['connections'])==1
assert nodes['34']=={**original['34'],'inputs':{'interactiveInput':{'connections':[{'node':107,'output':'rowOutput','data':[]}]}}}
assert nodes['35']==original['35']
print(json.dumps(dict(status='local-draft-validation-passed',nodes=len(nodes),rows=len(ROUTES),directLinks=7,other='existing saved handoff preserved; live readback required',published=False)))
