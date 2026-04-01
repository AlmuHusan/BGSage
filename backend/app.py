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
        print("DING")
        chat_completion = client.chat.completions.create(

            messages=[
                {
                    "role": "user",
                    "content": query,
                }
            ],
            model="llama-3.3-70b-versatile",
        )
        print(chat_completion.choices)
        return jsonify(chat_completion.choices[0].message.content) , 200
    except Exception as e:
        print("Failed")
        print(e)
        return jsonify("Internal Server Error"),500
# Get a list of all books uploaded
@app.route('/books', methods=['POST'])
def get_books():
    try:
        data=index.search(
            namespace="__default__",
            query={
            "inputs": {"text": "Disease prevention"},
            "top_k": 4
            }
        )
        print(data)
        resX = json.loads(data)
        print(resX)
        return jsonify(resX) , 200
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
        print(request.json)
        queryString = request.json["queryString"]
        embedJobParam={
            "job_id": embJobKey,
            "job_parameters": {
                "queryString": queryString
            }
        }
        while True:
            async with aiohttp.ClientSession() as session:
                async with session.post(jobURL+"/run-now", json=embedJobParam, headers={"Authorization": "Bearer " + apiKey}) as res:
                    result = await res.json()  # or response.text() for text
                    print(result)
                    state = result["status"]["state"]
                    if state == "SUCCEEDED":
                        break
                    elif state == "PENDING":
                        print(f"Status: {state}, waiting...")
                        await time.sleep(.25)  # Wait 2 seconds before checking again

                    else:
                        print("Operation failed!")
                        raise Exception(f"Operation failed: {state}")
        vectorSearchParam={
            "num_results": 3,
            "columns": [
                "embedding",
                "text_content"
            ],
            "query_vector": [

            ],
            "query_type": "HYBRID",
            "query_text": "Whats are pattern grids used for"
        }
        return jsonify(result)
    except Exception as e:
        print("Failed")
        print(e)
        return jsonify("Internal Server Error"),500


if __name__ == '__main__':
    app.run(debug=True,port=10001)