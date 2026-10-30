import sys,os,json
sys.path.insert(0,os.path.dirname(__file__))
from paper import call
F="01M670VKT086F47YAWD3J5E8FZ"
ids=sys.argv[1:]
for i in ids:
    o=call("get_jsx",{"fileId":F,"nodeId":i,"includeNodeIds":False})
    texts=[c.get('text','') for c in o['result']['content'] if c.get('type')=='text']
    open(os.path.join(os.path.dirname(__file__),'jsx',i+'.jsx'),'w').write(texts[-1])
    print(i,len(texts[-1]))
