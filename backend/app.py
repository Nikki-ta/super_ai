from flask import Flask, request, jsonify
from flask_cors import CORS
import cohere
import duckdb
import re
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
UPLOAD_FOLDER = './uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)  # Ensure the upload directory exists

# Set your Cohere API key
cohere_api_key = "OdSSZqT5w8rVlCeUe8f7I78LdNFRFzwMjOvZwiQt"
cohere_client = cohere.Client(cohere_api_key)  # Initialize Cohere client

def natural_language_to_sql(natural_query, table_name):
    # Improved and simplified prompt for the nightly model
    prompt = f"""
    You are an expert SQL assistant. Convert the following natural language query into a valid SQL query for the table '{table_name}'.
    
    Query: "{natural_query}"

    Table: {table_name}
    The table has these columns: id, name, age, city, salary.
    
    Please provide a well-formed SQL query based on this information. The query should be a valid SQL SELECT statement or any other valid query type.
    """

    response = cohere_client.generate(
        model="command-xlarge-nightly",  # Use the nightly model for generating SQL queries
        prompt=prompt,
        max_tokens=150,
        temperature=0.0  # Lower temperature to ensure more deterministic output
    )

    # Extract the generated text and clean it up
    sql_text = response.generations[0].text.strip()  # Strip leading/trailing whitespace
    

    # Regex to match the SQL block in markdown format (```sql ...```)
    match = re.match(r"```sql\n([\s\S]*?)```", sql_text)
    
    if not match or not match[1]:
        raise ValueError(f"SQL query not found in response. Output: {sql_text}")

    # Extract the SQL query from the match group
    sql_query = match[1].strip()

    # Remove any leading 'sql' keyword (if it exists)
    sql_query = re.sub(r"^\s*sql\s*", "", sql_query)

    # Clean up any additional spaces or unwanted characters
    sql_query = re.sub(r"\s+", " ", sql_query)  # Replace multiple spaces with a single space
    sql_query = sql_query.strip()  # Remove leading/trailing spaces
    sql_query = re.sub(r"(\b\w+\b)\s*=\s*'(.*?)'", lambda m: f"LOWER({m.group(1)}) = LOWER('{m.group(2)}')", sql_query)

    return sql_query

@app.route('/query', methods=['POST'])
def query():
    try:
        # Retrieve uploaded files and query from the request
        uploaded_files = request.files.getlist("files")
        query = request.form.get("query")

        if not uploaded_files:
            return jsonify({"error": "No files uploaded"}), 400
        if not query:
            return jsonify({"error": "No query provided"}), 400

        # Save uploaded files to the designated directory
        file_paths = []
        for file in uploaded_files:
            file_path = os.path.join(UPLOAD_FOLDER, file.filename)
            file.save(file_path)
            file_paths.append(file_path)

        # Connect to DuckDB
        con = duckdb.connect(database=':memory:')
        table_names = []

        # Load each CSV into DuckDB as a separate table
        for file_path in file_paths:
            table_name = os.path.splitext(os.path.basename(file_path))[0]
            con.execute(f"CREATE TABLE {table_name} AS SELECT * FROM read_csv_auto('{file_path}')")
            table_names.append(table_name)

        # Generate the SQL query using the natural language to SQL converter
        # Assuming `natural_language_to_sql` takes the query and table names as input
        sql_query = natural_language_to_sql(query, table_names)
        print(f"Generated SQL: {sql_query}")  # Debugging the generated SQL query

        # Execute the SQL query on DuckDB
        cursor = con.execute(sql_query)
        result = cursor.fetchall()  # Fetch all rows of the result
        column_names = [desc[0] for desc in cursor.description]  # Extract column names

        # Return the results as JSON
        return jsonify({"results": result, "columns": column_names})

    except duckdb.Error as db_err:
        return jsonify({"error": f"DuckDB Error: {str(db_err)}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
