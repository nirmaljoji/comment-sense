from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import Document
import pdfplumber
import pandas as pd
import chardet
from typing import List, BinaryIO
from ..utils.logger import logger
from ..database.mongodb import MongoDB
from langchain_openai import OpenAIEmbeddings
import os

class DocumentService:
    def __init__(self, chunk_size: int = 1048, chunk_overlap: int = 100):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap
        )
        self.embeddings = OpenAIEmbeddings()

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
            documents = await self._load_and_chunk_file(file, file_type, encoding)
            
            # Create vectors and store in MongoDB
            await self._store_vectors(documents, filename, mime_type, file_id, chat_id)
            
            return "File processed and stored successfully"
        except Exception as e:
            logger.error(f"Error processing file: {e}")
            raise

    async def _load_and_chunk_file(self, file: BinaryIO, file_type: str, encoding: str) -> List[Document]:
        """Load and chunk file based on type"""
        if file_type == 'pdf':
            return await self._process_pdf(file)
        elif file_type == 'csv':
            return await self._process_csv(file, encoding)
        elif file_type in ['xlsx', 'xls']:
            return await self._process_excel(file, file_type)
        else:
            raise ValueError(f"Unsupported file type: {file_type}")

    async def _process_pdf(self, file: BinaryIO) -> List[Document]:
        documents = []
        with pdfplumber.open(file) as pdf:
            for page_num, page in enumerate(pdf.pages):
                text = page.extract_text() or ""
                doc = Document(
                    page_content=text,
                    metadata={"page_number": page_num + 1}
                )
                chunks = self.text_splitter.split_documents([doc])
                documents.extend(chunks)
        return documents

    async def _process_csv(self, file: BinaryIO, encoding: str) -> List[Document]:
        df = pd.read_csv(file, encoding=encoding)
        return self._chunk_dataframe(df)

    async def _process_excel(self, file: BinaryIO, file_type: str) -> List[Document]:
        if file_type == 'xlsx':
            df = pd.read_excel(file, engine='openpyxl')
        else:
            df = pd.read_excel(file, engine='xlrd')
        return self._chunk_dataframe(df)

    def _chunk_dataframe(self, df: pd.DataFrame) -> List[Document]:
        text = df.to_string(header=True, index=False)
        doc = Document(page_content=text)
        return self.text_splitter.split_documents([doc])

    async def _store_vectors(self, documents: List[Document], filename: str, mime_type: str, file_id: str, chat_id: str):
        """Create embeddings and store in MongoDB"""
        db = MongoDB.get_db()
        vectors_collection = db.evaluations_vectors

        # Process documents in batches to create embeddings
        for doc in documents:
            embedding = await self.embeddings.aembed_query(doc.page_content)
            
            vector_doc = {
                "content": doc.page_content,
                "embedding": embedding,
                "file_id": file_id,
                "chat_id": chat_id,
                "metadata": {
                    **doc.metadata,
                    "filename": filename,
                    "mime_type": mime_type
                }
            }
            
            vectors_collection.insert_one(vector_doc)

    async def process_file_content(self, content: bytes, filename: str):
        """
        Process file content directly without saving to disk
        """
        try:
            # Process the content based on file type
            # You'll need to implement the specific processing logic here
            # based on your requirements (e.g., text extraction, vector embedding, etc.)
            
            # Example processing:
            if filename.endswith('.pdf'):
                # Process PDF content
                vectors = self.process_pdf_content(content)
            elif filename.endswith(('.csv', '.xls', '.xlsx')):
                # Process spreadsheet content
                vectors = self.process_spreadsheet_content(content)
            else:
                raise ValueError(f"Unsupported file type: {filename}")
            
            return vectors
            
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
            delete_result = vectors_collection.delete_many({"chat_id": chat_id})
            
            return delete_result.deleted_count
            
        except Exception as e:
            logger.error(f"Error deleting vectors for chat {chat_id}: {e}")
            raise 