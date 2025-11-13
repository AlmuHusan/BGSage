from flask import Flask, jsonify, request

app = Flask(__name__)

# Sample data
books = [
    {"id": 1, "title": "Concept of Physics", "author": "H.C Verma"},
    {"id": 2, "title": "Gunahon ka Devta", "author": "Dharamvir Bharti"},
    {"id": 3, "title": "Problems in General Physsics", "author": "I.E Irodov"}
]

# Get all books
@app.route('/books', methods=['GET'])
def get_books():
    return jsonify(books)
# Get all books
@app.route('/books', methods=['GET'])
def get_books():
    return jsonify(books)
# Get a single book by ID
@app.route('/books/<int:book_id>', methods=['GET'])
def get_book(book_id):
    book = next((book for book in books if book["id"] == book_id), None)
    return jsonify(book) if book else (jsonify({"error": "Book not found"}), 404)

# Add a new book
@app.route('/books', methods=['POST'])
def add_book():
    new_book = request.json
    books.append(new_book)
    return jsonify(new_book), 201

# Update a book
@app.route('/books/<int:book_id>', methods=['PUT'])
def update_book(book_id):
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
    app.run(debug=True)