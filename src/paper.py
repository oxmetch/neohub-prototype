import json, sys, urllib.request
URL="http://127.0.0.1:29979/mcp"
H={'Content-Type':'application/json','Accept':'application/json, text/event-stream'}
def post(body, sid=None):
    h=dict(H)
    if sid: h['mcp-session-id']=sid
    r=urllib.request.urlopen(urllib.request.Request(URL,json.dumps(body).encode(),h),timeout=120)
    sid2=r.headers.get('mcp-session-id')
    txt=r.read().decode()
    out=None
    for line in txt.splitlines():
        if line.startswith('data: '): out=json.loads(line[6:])
    return sid2,out
sid,_=post({"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"x","version":"1"}}})
post({"jsonrpc":"2.0","method":"notifications/initialized"},sid)
_n=[1]
def call(name,args):
    _n[0]+=1
    _,o=post({"jsonrpc":"2.0","id":_n[0],"method":"tools/call","params":{"name":name,"arguments":args}},sid)
    return o
