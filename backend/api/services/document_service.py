from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
import pdfplumber
import pandas as pd
import chardet
from typing import List, BinaryIO, Tuple
from ..utils.logger import logger
from ..database.mongodb import MongoDB
from langchain_openai import OpenAIEmbeddings
from langchain_mongodb import MongoDBAtlasVectorSearch
import os
from uuid import uuid4

class DocumentService:
    def __init__(self, chunk_size: int = 1048, chunk_overlap: int = 100):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap
        )
        self.embeddings = OpenAIEmbeddings(model="text-embedding-3-large")
        self.vector_index_name = "evaluations_index"

    async def process_file(self, file: BinaryIO, filename: str, mime_type: str, file_id: str, chat_id: str) -> str:
        """Process file and store chunks as vectors in MongoDB"""
        try:
            # Detect file type
            file_type = filename.rsplit('.', 1)[-1].lower()
            
            # Detect encoding for text-based files
            file.seek(0)
            raw_data = file.read(10000)
            result = chardet.detect(raw_data)
            encoding = result['encoding'] if result['encoding'] else 'utf-8'
            file.seek(0)

            # Get document chunks
            documents = await self._load_and_chunk_file(file, file_type, encoding, chat_id)
            
            # Create vectors and store in MongoDB
            await self._store_vectors(documents, filename, mime_type, file_id, chat_id)
            
            return "File processed and stored successfully"
        except Exception as e:
            logger.error(f"Error processing file: {e}")
            raise

    async def _load_and_chunk_file(self, file: BinaryIO, file_type: str, encoding: str, chat_id: str) -> List[Document]:
        """Load and chunk file based on type"""
        if file_type == 'pdf':
            return await self._process_pdf(file, chat_id)
        elif file_type == 'csv':
            return await self._process_csv(file, encoding, chat_id)
        elif file_type in ['xlsx', 'xls']:
            return await self._process_excel(file, file_type, chat_id)
        else:
            raise ValueError(f"Unsupported file type: {file_type}")

    async def _process_pdf(self, file: BinaryIO, chat_id: str) -> List[Document]:
        documents = []
        with pdfplumber.open(file) as pdf:
            for page_num, page in enumerate(pdf.pages):
                text = page.extract_text() or ""
                doc = Document(
                    page_content=text,
                    metadata={"page": page_num}  # Only set page number here, chat_id will be set in _store_vectors
                )
                chunks = self.text_splitter.split_documents([doc])
                documents.extend(chunks)
        return documents

    async def _process_csv(self, file: BinaryIO, encoding: str, chat_id: str) -> List[Document]:
        df = pd.read_csv(file, encoding=encoding)
        return self._chunk_dataframe(df)

    async def _process_excel(self, file: BinaryIO, file_type: str, chat_id: str) -> List[Document]:
        if file_type == 'xlsx':
            df = pd.read_excel(file, engine='openpyxl')
        else:
            df = pd.read_excel(file, engine='xlrd')
        return self._chunk_dataframe(df)

    def _chunk_dataframe(self, df: pd.DataFrame, chat_id: str = None) -> List[Document]:
        text = df.to_string(header=True, index=False)
        doc = Document(page_content=text, metadata={})  # Empty metadata, will be set in _store_vectors
        return self.text_splitter.split_documents([doc])

    async def _store_vectors(self, documents: List[Document], filename: str, mime_type: str, file_id: str, chat_id: str):
        """Create embeddings and store in MongoDB using MongoDBAtlasVectorSearch"""
        db = MongoDB.get_db()
        vectors_collection = db.evaluations_vectors
        
        # Ensure each document has the correct metadata
        for doc in documents:
            # Set all necessary metadata fields
            doc.metadata["source"] = chat_id
            doc.metadata["file_id"] = file_id
            doc.metadata["filename"] = filename
            doc.metadata["mime_type"] = mime_type
            # Keep any existing metadata like page numbers
        
        # Create vector store
        vector_store = MongoDBAtlasVectorSearch(
            collection=vectors_collection,
            embedding=self.embeddings,
            index_name=self.vector_index_name,
            relevance_score_fn="cosine",
        )
        
        # Generate UUIDs for each document
        uuids = [str(uuid4()) for _ in range(len(documents))]
        
        # Add documents to vector store
        vector_store.add_documents(documents=documents, ids=uuids)
        
        # Ensure vector search index exists
        try:
            vector_store.create_vector_search_index(
                dimensions=3072,  # For text-embedding-3-large
                filters=[{"type": "filter", "path": "source"}],
                update=True
            )
        except Exception as e:
            logger.warning(f"Vector index creation warning (may already exist): {e}")

    async def process_file_content(self, content: bytes, filename: str, chat_id: str):
        """
        Process file content directly without saving to disk
        """
        try:
            import io
            file_obj = io.BytesIO(content)
            file_type = filename.rsplit('.', 1)[-1].lower()
            file_id = str(uuid4())
            
            # Detect encoding for text-based files
            raw_data = content[:10000]
            result = chardet.detect(raw_data)
            encoding = result['encoding'] if result['encoding'] else 'utf-8'
            
            # Get document chunks
            documents = await self._load_and_chunk_file(file_obj, file_type, encoding, chat_id)
            
            # Create vectors and store in MongoDB
            await self._store_vectors(documents, filename, f"application/{file_type}", file_id, chat_id)
            
            return "File content processed and stored successfully"
            
        except Exception as e:
            logger.error(f"Error processing file content: {e}")
            raise

    async def delete_file_vectors(self, file_id: str):
        """Delete all vector embeddings associated with a file_id from MongoDB"""
        try:
            db = MongoDB.get_db()
            vectors_collection = db.evaluations_vectors
            
            # Delete all vectors with matching file_id
            delete_result = vectors_collection.delete_many({"file_id": file_id})
            
            logger.info(f"Deleted {delete_result.deleted_count} vectors for file {file_id}")
            return delete_result.deleted_count
            
        except Exception as e:
            logger.error(f"Error deleting vectors for file {file_id}: {e}")
            raise

    async def delete_vectors_by_chat_id(self, chat_id: str):
        """Delete all vector embeddings associated with a chat_id from MongoDB"""
        try:
            db = MongoDB.get_db()
            vectors_collection = db.evaluations_vectors
            
            # Delete all vectors with matching chat_id
            delete_result = vectors_collection.delete_many({"source": chat_id})
            
            return delete_result.deleted_count
            
        except Exception as e:
            logger.error(f"Error deleting vectors for chat {chat_id}: {e}")
            raise 