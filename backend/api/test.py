import os
from dotenv import load_dotenv
from pymongo import MongoClient
from langchain_mongodb import MongoDBAtlasVectorSearch
from langchain_openai import OpenAIEmbeddings

# Load environment variables
load_dotenv()


def test_vector_search():
    try:
        # Connect to MongoDB
        mongodb_url = os.getenv("MONGODB_URL")
        database_name = os.getenv("DATABASE_NAME")
        
        if not mongodb_url or not database_name:
            print("Error: MongoDB connection details not found in environment variables")
            return
        
        # Initialize MongoDB client
        client = MongoClient(mongodb_url)
        db = client[database_name]
        vectors_collection = db.evaluations_vectors
        
        # Print collection info
        print(f"Collection name: {vectors_collection.name}")
        print(f"Document count: {vectors_collection.count_documents({})}")
        
        # List indexes
        print("\nAvailable indexes:")
        for index in vectors_collection.list_search_indexes():
            print(f"Index: {index['name']}")
        
        # Set up vector search
        vector_store = MongoDBAtlasVectorSearch(
            embedding=OpenAIEmbeddings(disallowed_special=()),
            collection=vectors_collection,
            index_name="evaluations_index"
        )
        
        test_query = "Instructor should have kept quizzes"
        print(f"\nExecuting vector search with query: '{test_query}'")
        
        embeddings = OpenAIEmbeddings(disallowed_special=())
        query_embedding = embeddings.embed_query(test_query)
        print(f"Generated embedding dimensions: {len(query_embedding)}")
        
        # Use similarity_search_with_score instead of retriever
        results = vector_store.similarity_search_with_score(test_query, k=5)
        
        print(f"\nSearch results:")
        for res, score in results:
            print(f"* [SIM={score:.3f}] {res.page_content[:200]}... [{res.metadata}]")
        
    except Exception as e:
        print(f"Error during vector search test: {str(e)}")
        import traceback
        print(traceback.format_exc())
    finally:
        client.close()

if __name__ == "__main__":
    test_vector_search()