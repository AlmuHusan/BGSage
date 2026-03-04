from flask import Flask, jsonify, request
import os
from flask_cors import CORS
from groq import Groq
import requests
import os
import json
import time
url=os.environ.get("databricksURL")
url = 'https://'+url+'.cloud.databricks.com/api/2.0/sql/statements'
wid=os.environ.get("databricksWID")
apiKey=os.environ.get("databricksAPI")
embJobKey=os.environ.get("databricksEmbJobID")
app = Flask(__name__)
CORS(app, origins=['*'])
client = Groq(
    api_key=os.environ.get("llmAPIKey"),
)
# Sample data
books = [
    {"id": 1, "title": "Concept of Physics", "author": "H.C Verma"},
    {"id": 2, "title": "Gunahon ka Devta", "author": "Dharamvir Bharti"},
    {"id": 3, "title": "Problems in General Physsics", "author": "I.E Irodov"}
]

# Get all books
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
# Get a single book by ID
@app.route('/books/<int:book_id>', methods=['GET'])
def get_book(book_id):
    book = next((book for book in books if book["id"] == book_id), None)
    return jsonify(book) if book else (jsonify({"error": "Book not found"}), 404)

# Add a new book
@app.route('/insertRows', methods=['POST'])
def insertRows():
    try:
        print(request.json)
        pages=request.json["pages"]
        print("DING")
        for p in range(len(pages)):
            if pages[p]!='':
                statement="INSERT into bgsage (text_content,page_number,document_source) VALUES (\"{}\",{},\"{}\")".format(str(pages[p]),p,request.json["document"])
                print(statement)
                myobj = {
                    "warehouse_id": wid,
                    "catalog": "bgsage",
                    "schema": "default",
                    "statement": statement
                }
                x = requests.post(url, json=myobj, headers={"Authorization": "Bearer " + apiKey})
                resX = json.loads(x.text)
                print(resX)
        print(pages)
        return jsonify("Upload Successfull") , 200
    except Exception as e:
        print("Failed")
        print(e)
        return jsonify("Internal Server Error"),500

# Update a book
@app.route('/vectorSearch', methods=['POST'])
def vectorSearch(book_id):
    embedJobParam={
        "job_id": embJobKey,
        "job_parameters": {
            "property1": "string",
            "property2": "string"
        },
    }
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
    book = next((book for book in books if book["id"] == book_id), None)
    if not book:
        return jsonify({"error": "Book not found"}), 404

    data = request.json
    book.update(data)
    return jsonify(book)

# Delete a book
@app.route('/books/<int:book_id>', methods=['DELETE'])
def delete_book(book_id):
    global books
    books = [book for book in books if book["id"] != book_id]
    return jsonify({"message": "Book deleted"})

if __name__ == '__main__':
    app.run(debug=True,port=10001)