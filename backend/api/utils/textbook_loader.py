import os
import getpass
from typing import List, Optional
from uuid import uuid4
from datetime import datetime
from dotenv import load_dotenv
from pymongo import MongoClient
from langchain_core.documents import Document
from langchain_unstructured import UnstructuredLoader
from langchain_openai import OpenAIEmbeddings
from langchain_mongodb import MongoDBAtlasVectorSearch
from langchain.text_splitter import RecursiveCharacterTextSplitter
from api.database.mongodb import MongoDB
from api.utils.logger import logger
import pdfplumber
from tqdm import tqdm

load_dotenv()

def extract_text_from_page(page):
    text = page.extract_text() or ""  # Ensure text is a string
    tables = page.extract_tables() or []

    table_texts = []
    for table in tables:
        if table:
            table_text = "\n".join(["\t".join(cell or "" for cell in row) for row in table])
            table_texts.append(table_text)
    
    return text + "\n\n" + "\n\n".join(table_texts)

class TextbookLoader:
    """
    A utility class for loading textbooks, processing them with Langchain-unstructured,
    and storing them in MongoDB with vector search capabilities.
    """
    
    def __init__(self, 
                 chunk_size: int = 1000, 
                 chunk_overlap: int = 100,
                 collection_name: str = "teaching_materials"):
        """
        Initialize the TextbookLoader with configuration for text chunking and MongoDB.
        
        Args:
            chunk_size: Size of text chunks for embedding
            chunk_overlap: Overlap between chunks to maintain context
            collection_name: Name of the MongoDB collection to store teaching materials
        """
        self.collection_name = collection_name
        
        self.embeddings = OpenAIEmbeddings(model="text-embedding-3-large")
        
        if MongoDB.db is None:
            MongoDB.connect_db()
        
        self.db = MongoDB.get_db()
        self.collection = self.db[collection_name]
        
        self.vector_store = MongoDBAtlasVectorSearch(
            collection=self.collection,
            embedding=self.embeddings,
            index_name=f"{collection_name}_index",
            relevance_score_fn="cosine",
        )
        
        self._ensure_vector_index()
    
    def _ensure_vector_index(self):
        """Ensure vector index exists for similarity search"""
        try:

            if self.collection_name not in self.db.list_collection_names():
                self.db.create_collection(self.collection_name)
                logger.info(f"Created {self.collection_name} collection")
            
            indexes = list(self.collection.list_indexes())
            index_exists = any(index.get("name") == f"{self.collection_name}_index" for index in indexes)
            
            if not index_exists:

                self.vector_store.create_vector_search_index(dimensions=3072)
                logger.info(f"Created vector index '{self.collection_name}_index' in MongoDB")
            else:
                logger.info(f"Vector index '{self.collection_name}_index' already exists")
                
        except Exception as e:
            # If the error is about index already existing, log it as info instead of error
            if "Index already exists" in str(e) or "IndexAlreadyExists" in str(e):
                logger.info(f"Vector index already exists: {e}")
            else:
                logger.error(f"Failed to create vector index: {e}")
                raise
    
    def load_textbook(self, directory: str, file_name: str) -> List[Document]:
        """
        Load and process a textbook from a directory.
        
        Args:
            directory: Path to the directory containing the textbook
            
        Returns:
            List of processed Document objects
        """
        try:
            # Load the raw documents
            loader = UnstructuredLoader(
                file_path=[directory],
                api_key=os.getenv("UNSTRUCTURED_API_KEY"),
                partition_via_api=True,
                chunking_strategy="by_title"
            )
            
            raw_docs = loader.load()
            
            print (raw_docs[-1].page_content)
            print (raw_docs[-1].metadata)
            documents = [
                Document(
                    page_content=doc.page_content,
                    metadata={"source": file_name}
                ) for doc in raw_docs
            ]
            

            uuids = [str(uuid4()) for _ in range(len(documents))]
            self.vector_store.add_documents(documents=documents, ids=uuids)
            
            return documents

        except Exception as e:
            logger.error(f"Error processing textbook: {e}")
            raise
    
    def search_similar_content(self, query: str, limit: int = 5) -> List[Document]:
        """
        Search for similar content in the stored textbooks.
        
        Args:
            query: The search query
            limit: Maximum number of results to return
            
        Returns:
            List of Document objects that match the query
        """
        try:
            results = self.vector_store.similarity_search(query, k=limit)
            logger.info(f"Found {len(results)} similar documents for query: {query}")
            return results
        except Exception as e:
            logger.error(f"Error searching similar content: {e}")
            raise
    
    def delete_textbook(self, source_path: str) -> int:
        """
        Delete all vectors associated with a specific textbook.
        
        Args:
            source_path: Path of the textbook to delete
            
        Returns:
            Number of deleted documents
        """
        try:
            delete_result = self.collection.delete_many({"metadata.source": source_path})
            deleted_count = delete_result.deleted_count
            
            logger.info(f"Deleted {deleted_count} vectors for textbook {source_path}")
            return deleted_count
            
        except Exception as e:
            logger.error(f"Error deleting vectors for textbook {source_path}: {e}")
            raise

# Example usage
if __name__ == "__main__":
    # Initialize the loader
    loader = TextbookLoader()
    
    current_script_dir = os.path.dirname(os.path.abspath(__file__))
    base_dir = os.path.dirname(current_script_dir) # navigate to the parent directory
    pdf_directory = os.path.join(base_dir, 'utils/pdfData/teaching_at_its_best.pdf') # navigate to the pdfData directory
    
    
    # Process the textbook
    documents = loader.load_textbook(
        directory=pdf_directory,
        file_name="teaching_at_its_best.pdf"
    )
    
    print(f"Processed {len(documents)} document chunks")
    
