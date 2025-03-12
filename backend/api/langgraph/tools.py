from langchain_core.tools import tool
from datetime import datetime, timezone
from ..database.mongodb import MongoDB
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import PromptTemplate
from langchain_mongodb import MongoDBAtlasVectorSearch
from langchain_openai import OpenAIEmbeddings
import traceback

@tool
def get_evaluations_context(query: str):
    """Only to Retrieve relevant context from evaluations using vector search. Do not use if question is not related to Course Evalutation"""
    try:
        print(f"get_evaluations_context received query: '{query}'")
        
        if not query or not isinstance(query, str):
            return f"Error: Invalid query parameter. Received: {type(query)}: {query}"
            
        db = MongoDB.get_db()
        vectors_collection = db.evaluations_vectors

        vector_store = MongoDBAtlasVectorSearch(
            embedding=OpenAIEmbeddings(disallowed_special=()),
            collection=vectors_collection,
            index_name="evaluations_index"
        )
        
        print(f"Executing vector search with query: '{query}'")
        results = vector_store.similarity_search_with_score(query )
        
        contexts = []
        for doc, score in results:
            print(f"* [SIM={score:.3f}] {doc.page_content[:200]}...")
            contexts.append({
                "content": doc.page_content,
                "similarity_score": score
            })
        
        print(f"Retrieved {len(contexts)} context items")
        
        return {"contexts": contexts}
        
    except Exception as e:
        error_details = traceback.format_exc()
        print(f"Error in get_evaluations_context: {str(e)}\n{error_details}")
        return f"Error retrieving context: {str(e)}"
    
@tool
def get_teaching_material_context(query: str):
    """Used to add extra information to help improve professors and their teaching habits, based on the information provided from the course evaluations"""
    try:
        print(f"get_teaching_material_context received query: '{query}'")
        
        if not query or not isinstance(query, str):
            return f"Error: Invalid query parameter. Received: {type(query)}: {query}"
        
        db = MongoDB.get_db()
        teaching_materials_collection = db.teaching_materials
        
        # Use vector search to find relevant teaching materials
        vector_store = MongoDBAtlasVectorSearch(
            embedding=OpenAIEmbeddings(disallowed_special=()),
            collection=teaching_materials_collection,
            index_name="teaching_materials_index"
        )
        
        print(f"Executing teaching materials vector search with query: '{query}'")
        results = vector_store.similarity_search_with_score(query, k=5)
        
        materials = []
        for doc, score in results:
            print(f"* [SIM={score:.3f}] {doc.page_content[:200]}...")
            materials.append({
                "content": doc.page_content,
                "similarity_score": score,
            })
        
        print(f"Retrieved {len(materials)} teaching material items")
        
        return {
            "materials": materials
        }
        
    except Exception as e:
        error_details = traceback.format_exc()
        print(f"Error in get_teaching_material_context: {str(e)}\n{error_details}")
        return f"Error retrieving teaching materials: {str(e)}"
    
tools = [get_evaluations_context, get_teaching_material_context]