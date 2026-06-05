from flask import Flask, jsonify, request
import os
from flask_cors import CORS
from groq import Groq
import requests
import os
import json
import time
import aiohttp
from pinecone import Pinecone, ServerlessSpec
pineconeAPIKey=os.environ.get("PINECONE_API_KEY")
pineconeIndexName = os.environ.get("PINECONE_API_ENV")
pc = Pinecone(api_key=pineconeAPIKey)
index = pc.Index(pineconeIndexName)

url=os.environ.get("databricksURL")
url = 'https://'+url+'.cloud.databricks.com/api/2.0/sql/statements'
jobURL='https://'+url+'.cloud.databricks.com/api/2.2/jobs'
wid=os.environ.get("databricksWID")
apiKey=os.environ.get("databricksAPI")
embJobKey=os.environ.get("databricksEmbJobID")
dbAPiBody = {
            "warehouse_id": wid,
            "catalog": "bgsage",
            "schema": "default",
            "statement": ""
        }
app = Flask(__name__)
CORS(app, origins=['*'])
client = Groq(
    api_key=os.environ.get("llmAPIKey"),
)


@app.route('/askBGSage', methods=['POST'])
def askBGSage():
    try:
        print(request.json)
        query=request.json["query"]
        contextList=request.json["context"]
        sid=request.json["sid"]

        print(str(contextList))
        print("DING")

        statement = "INSERT into messages (chat_role,content,sid) VALUES (\"user\",\"{}\",{})".format( query, sid)
        print(statement)
        dbAPiBody["statement"] = statement
        x = requests.post(url, json=dbAPiBody, headers={"Authorization": "Bearer " + apiKey})
        resX = json.loads(x.text)
        print(resX)
        chat_completion = client.chat.completions.create(

            messages=[
                {
                    "role": "system",
                    "content": """You are a board game expert with the task of helping people learn board games.
                    You will be provided a collection of context that is based on the board game rules the user is playing.
                     Please help them and provide the sources and page numbers of where you are getting your information
                    from at the end of your statement in order of page number. For example if your sources are
                    rulebook_A pages 4,1,2 and rulebook_B pages 66, 21, 42 Then the output at the end of the output
                    should be Sources: rulebook_A Pages: 1,2,4 rulebook_B 21,42,66"""
                },
                {
                    "role": "user",
                    "content": str(contextList)+" "+query,
                }
            ],
            model="llama-3.3-70b-versatile",
        )
        print(chat_completion)
        statement = "INSERT into messages (chat_role,content,sid) VALUES (\"assistant\",\"{}\",{})".format(chat_completion.choices[0].message.content, sid)
        print(statement)
        dbAPiBody["statement"] = statement
        x = requests.post(url, json=dbAPiBody, headers={"Authorization": "Bearer " + apiKey})
        resX = json.loads(x.text)
        print(resX)
        return jsonify(chat_completion.choices[0].message.content) , 200
    except Exception as e:
        print("Failed")
        print(e)
        return jsonify("Internal Server Error"),500

@app.route('/documents', methods=['GET'])
def getDocuments():
    try:
        statement = "SELECT name from documents where uid = 1"
        print(statement)
        dbAPiBody["statement"] = statement
        x = requests.post(url, json=dbAPiBody, headers={"Authorization": "Bearer " + apiKey})
        resX = json.loads(x.text)
        print(resX)
        return jsonify(resX['result']["data_array"]), 200
    except Exception as e:
        print("Failed")
        print(e)
        return jsonify("Internal Server Error"),500
@app.route('/deleteDocument', methods=['POST'])
def deleteDocument():
    try:
        print(request.json)
        statement = "DELETE FROM documents WHERE name=\"{}\"".format(request.json["document"])
        dbAPiBody["statement"] = statement
        x = requests.post(url, json=dbAPiBody, headers={"Authorization": "Bearer " + apiKey})
        resX = json.loads(x.text)
        print(resX)
        index.delete(
            filter={
                "source": {"$eq": request.json["document"][0]}
            },
            namespace="__default__"
        )
        statement = "DELETE from documents WHERE name = {} AND uid=1".format(request.json["document"][0])
        print(statement)
        dbAPiBody["statement"] = statement
        sessionRes = requests.post(url, json=dbAPiBody, headers={"Authorization": "Bearer " + apiKey})
        sessionRes = json.loads(sessionRes.text)
        print(sessionRes)
        return jsonify("Document deleted!") , 200
    except Exception as e:
        print("Failed")
        print(e)
        return jsonify("Internal Server Error"),500
@app.route('/sessions', methods=['GET'])
def getSessions():
    try:
        sessionCollection=[]
        statement = "SELECT sid,name from sessions where uid = 1"
        print(statement)
        dbAPiBody["statement"]=statement
        sessionRes = requests.post(url, json=dbAPiBody, headers={"Authorization": "Bearer " + apiKey})
        sessionRes = json.loads(sessionRes.text)
        print(sessionRes)
        for s in sessionRes['result']["data_array"]:
            print("S")
            print(s)
            statement = "SELECT (mid,chat_role,content) from messages WHERE sid={} ORDER BY mid".format(s[0])
            print(statement)
            dbAPiBody["statement"] = statement
            messageRes = requests.post(url, json=dbAPiBody, headers={"Authorization": "Bearer " + apiKey})
            messageRes = json.loads(messageRes.text)
            print(messageRes['result'])
            messageData=[]
            if(messageRes['result']!= {}):
                for m in messageRes['result']["data_array"]:
                    print(m)
                    messageData.append(json.loads(m[0]))
                sessionCollection.append({
                    "id": int(s[0]),
                    "name": s[1],
                    "messages":messageData
                })
            else:
                sessionCollection.append({
                    "id": int(s[0]),
                    "name": s[1],
                    "messages": []
                })
        print(sessionCollection)
        return jsonify(sessionCollection , 200)
    except Exception as e:
        print("Failed")
        print(e)
        return jsonify(sessionCollection),500

@app.route('/createSession', methods=['POST'])
def createSession():
    try:
        print(request.json)
        name=request.json["name"]
        statement="INSERT into sessions (uid,name) VALUES (1,\"{}\")".format(name)
        dbAPiBody["statement"]=statement
        x = requests.post(url, json=dbAPiBody, headers={"Authorization": "Bearer " + apiKey})
        resX = json.loads(x.text)
        print(resX)

        return jsonify("Upload Successfull") , 200
    except Exception as e:
        print("Failed")
        print(e)
        return jsonify("Internal Server Error"),500
@app.route('/updateSessionName', methods=['POST'])
def updateSessionName():
    try:
        print(request.json)
        name=request.json["name"]
        sid = request.json["sid"]
        statement="UPDATE sessions SET name =\"{}\" WHERE sid = {}".format(name,sid)
        dbAPiBody["statement"]=statement
        x = requests.post(url, json=dbAPiBody, headers={"Authorization": "Bearer " + apiKey})
        resX = json.loads(x.text)
        print(resX)

        return jsonify("Upload Successfull") , 200
    except Exception as e:
        print("Failed")
        print(e)
        return jsonify("Internal Server Error"),500
@app.route('/deleteSession', methods=['POST'])
def deleteSession():
    try:
        print(request.json)
        sid = request.json["sid"]
        statement="DELETE from sessions WHERE sid = {}".format(sid)
        dbAPiBody["statement"]=statement
        x = requests.post(url, json=dbAPiBody, headers={"Authorization": "Bearer " + apiKey})
        resX = json.loads(x.text)
        print(resX)
        statement = "DELETE from messages WHERE sid = {}".format(sid)
        dbAPiBody["statement"] = statement
        x = requests.post(url, json=dbAPiBody, headers={"Authorization": "Bearer " + apiKey})
        resX = json.loads(x.text)
        print(resX)
        return jsonify("Delete Successfull") , 200
    except Exception as e:
        print("Failed")
        print(e)
        return jsonify("Internal Server Error"),500
@app.route('/updateSession', methods=['POST'])
def updateSession():
    try:
        print(request.json)
        role=request.json["role"]
        content=request.json["content"]
        sid = request.json["sid"]
        statement="INSERT into messages (chat_role,content,sid) VALUES (\"{}\",{},\"{}\")".format(role,content,sid)
        dbAPiBody["statement"]=statement
        x = requests.post(url, json=dbAPiBody, headers={"Authorization": "Bearer " + apiKey})
        resX = json.loads(x.text)
        print(resX)

        return jsonify("Upload Successfull") , 200
    except Exception as e:
        print("Failed")
        print(e)
        return jsonify("Internal Server Error"),500

@app.route('/insertDocument', methods=['POST'])
def insertDocument():
    try:
        print(request.json)
        pages=request.json["pages"]
        print("DING")
        statement="INSERT into documents (name,uid) VALUES (\"{}\",{})".format(request.json["document"],1)
        dbAPiBody["statement"]=statement
        x = requests.post(url, json=dbAPiBody, headers={"Authorization": "Bearer " + apiKey})
        resX = json.loads(x.text)
        print(resX)
        data = []
        id=index.describe_namespace(namespace='__default__')
        print(id)
        id=int(id["record_count"])+101
        print(id)
        for p in range(len(pages)):
            if pages[p]!='':
                data.append({"id":str(id),"text":str(pages[p]),"pageNumber":p,"source":request.json["document"]})
                id=id+1


        index.upsert_records(namespace="__default__",records=data)
        print(pages)
        return jsonify("Upload Successfull") , 200
    except Exception as e:
        print("Failed")
        print(e)
        return jsonify("Internal Server Error"),500


@app.route('/vectorSearch', methods=['POST'])
async def vectorSearch():
    try:
        print(request.json)
        data = index.search(
            namespace="__default__",
            query={
                "inputs": {"text": request.json["queryString"]},
                "top_k": 5,
                "filter":{"source":{"$in":request.json["filterDocuments"]}}
            }
        )
        resX = data["result"]["hits"]
        print(resX)
        results = []
        for r in resX:
            fieldData=r["fields"]
            fieldData["pageNumber"]=int(fieldData["pageNumber"])
            results.append(fieldData)
        return jsonify(results), 200
    except Exception as e:
        print("Failed")
        print(e)
        return jsonify("Internal Server Error"),500


if __name__ == '__main__':
    app.run(debug=True,port=10001)