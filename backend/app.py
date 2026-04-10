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

app = Flask(__name__)
CORS(app, origins=['*'])
client = Groq(
    api_key=os.environ.get("llmAPIKey"),
)

#Ask the LLM a question
@app.route('/askBGSage', methods=['POST'])
def askBGSage():
    try:
        print(request.json)
        query=request.json["query"]
        contextList=request.json["context"]
        context=""
        for c in contextList:
            context=c+"\n"
        print("DING")
        chat_completion = client.chat.completions.create(

            messages=[
                {
                    "role": "system",
                    "content": """You are a board game expert with the task of helping people learn board games.
                    You will be provided a collection of context that is based on the board game the user is playing.
                     Please help them!"""
                },
                {
                    "role": "user",
                    "content": context+" "+query,
                }
            ],
            model="llama-3.3-70b-versatile",
            include_reasoning=True,
            reasoning_format="raw"
        )
        print(chat_completion)
        return jsonify(chat_completion.choices[0].message.content) , 200
    except Exception as e:
        print("Failed")
        print(e)
        return jsonify("Internal Server Error"),500
# Get a list of all books uploaded
@app.route('/books', methods=['POST'])
def get_books():
    try:
        data = index.search(
            namespace="__default__",
            query={
                "inputs": {"text": "the"},
                "top_k": 1000
            }
        )
        # print(data["result"]["hits"])
        resX = data["result"]["hits"]
        print(resX)
        bookList=[]
        for r in resX:
            bookList.append(r["fields"]["source"])
        bookList=list(set(bookList))
        return jsonify(bookList) , 200
    except Exception as e:
        print("Failed")
        print(e)
        return jsonify("Internal Server Error"),500
# Insert data from a new book
@app.route('/insertRows', methods=['POST'])
def insertRows():
    try:
        print(request.json)
        pages=request.json["pages"]
        print("DING")
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

# Search for relevant passages
@app.route('/vectorSearch', methods=['POST'])
async def vectorSearch():
    try:
        data = index.search(
            namespace="__default__",
            query={
                "inputs": {"text": request.json["queryString"]},
                "top_k": 5
            }
        )
        # print(data["result"]["hits"])
        resX = data["result"]["hits"]
        print(resX)
        results = []
        for r in resX:
            results.append(r["fields"]["text"])
        return jsonify(results), 200
    except Exception as e:
        print("Failed")
        print(e)
        return jsonify("Internal Server Error"),500


if __name__ == '__main__':
    app.run(debug=True,port=10001)