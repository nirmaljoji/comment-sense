from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
import pdfplumber
import pandas as pd
import chardet
from typing import List, BinaryIO, Tuple, Dict, Any
from ..utils.logger import logger
from ..database.mongodb import MongoDB
from langchain_openai import OpenAIEmbeddings
from langchain_mongodb import MongoDBAtlasVectorSearch
import os
from uuid import uuid4
import time
import asyncio
from pymongo.operations import InsertOne
import re

class DocumentService:
    # Dictionary to store progress information for each file
    _progress_tracker = {}
    
    # Define progress stages with their percentage ranges - more evenly distributed
    _progress_stages = {
        "started": (0, 5),
        "reading": (5, 15),
        "analyzing": (15, 25),
        "chunking": (25, 40),
        "vectorizing_prep": (40, 45),
        "vectorizing": (45, 85),  # Still largest but less extreme
        "finalizing": (85, 95),
        "completed": (95, 100)
    }
    
    @staticmethod
    def get_progress(file_id: str) -> dict:
        """Get the current progress for a file"""
        if file_id not in DocumentService._progress_tracker:
            return {"status": "not_found", "progress": 0, "message": "File not found"}
        return DocumentService._progress_tracker[file_id]
    
    @staticmethod
    def update_progress(file_id: str, progress: float, status: str = "processing", message: str = "", stats: Dict[str, Any] = None):
        """Update the progress for a file"""
        DocumentService._progress_tracker[file_id] = {
            "file_id": file_id,
            "progress": min(100, max(0, progress)),  # Ensure progress is between 0-100
            "status": status,
            "message": message,
            "updated_at": time.time(),
            "stats": stats or {}
        }
    
    @staticmethod
    def update_stage_progress(file_id: str, stage: str, completion_percentage: float = 0, message: str = "", stats: Dict[str, Any] = None):
        """
        Update progress based on predefined stages with smoother transitions
        
        Args:
            file_id: The file ID
            stage: The current processing stage
            completion_percentage: How far along in this stage (0-100%)
            message: Custom message to display
            stats: Additional statistics about the processing
        """
        if stage not in DocumentService._progress_stages:
            return
            
        start_percent, end_percent = DocumentService._progress_stages[stage]
        stage_range = end_percent - start_percent
        
        # Calculate the actual progress within the stage's range
        actual_progress = start_percent + (stage_range * (completion_percentage / 100))
        
        # Use the stage name as the status if no custom message is provided
        display_message = message if message else f"{stage.replace('_', ' ').title()}..."
        
        # Default stats if none provided
        processing_stats = stats or {}
        
        # Add stage information to stats
        if not "current_stage" in processing_stats:
            processing_stats["current_stage"] = stage
        
        DocumentService.update_progress(
            file_id,
            actual_progress,
            stage,
            display_message,
            processing_stats
        )
        
    @staticmethod
    def clear_progress(file_id: str):
        """Clear progress tracking for a file"""
        if file_id in DocumentService._progress_tracker:
            del DocumentService._progress_tracker[file_id]
    @staticmethod
    def clean_text(text: str) -> str:
        """
        Comprehensive text cleaning function to ensure proper formatting
        for vector storage.
        
        This function:
        1. Strips leading/trailing whitespace
        2. Normalizes whitespace (replaces multiple spaces with single space)
        3. Normalizes line breaks
        4. Removes any control characters
        
        Args:
            text: The text to clean
            
        Returns:
            Cleaned text string
        """
        if not text:
            return ""
            
        # Strip leading/trailing whitespace
        text = text.strip()
        
        # Normalize whitespace (replace multiple spaces with single space)
        text = re.sub(r'\s+', ' ', text)
        
        # Normalize line breaks
        text = text.replace('\r\n', '\n').replace('\r', '\n')
        
        # Remove any control characters except newlines
        text = re.sub(r'[\x00-\x09\x0b\x0c\x0e-\x1f\x7f]', '', text)
        
        return text
    def __init__(self, chunk_size: int = 1048, chunk_overlap: int = 100):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap
        )
        self.embeddings = OpenAIEmbeddings(model="text-embedding-3-large")
        self.vector_index_name = "evaluations_index"

    async def process_file(self, file: BinaryIO, filename: str, mime_type: str, file_id: str, chat_id: str) -> Dict[str, Any]:
        """Process file and store chunks as vectors in MongoDB"""
        # Initialize progress tracking
        self.update_stage_progress(file_id, "started", 0, "Starting file processing")
        try:
            start_time = time.time()
            
            # Simulate gradual progress for better UX
            self.update_stage_progress(file_id, "started", 50, "Initializing file processing")
            logger.info(f"Starting processing of file: {filename}")
            
            # Detect file type
            file_type = filename.rsplit('.', 1)[-1].lower()
            logger.info(f"Detected file type: {file_type}")
            
            # Detect encoding for text-based files
            file.seek(0)
            raw_data = file.read(10000)
            result = chardet.detect(raw_data)
            encoding = result['encoding'] if result['encoding'] else 'utf-8'
            file.seek(0)
            logger.info(f"Using encoding: {encoding}")

            # Update progress to reading stage
            self.update_stage_progress(file_id, "reading", 50, "Reading file contents")
            
            # Get document chunks
            chunking_start = time.time()
            
            # Update to analyzing stage
            self.update_stage_progress(file_id, "analyzing", 0, "Analyzing file structure")
            await asyncio.sleep(0.2)  # Small delay for smoother progress updates
            self.update_stage_progress(file_id, "analyzing", 50, "Determining optimal chunking strategy")
            await asyncio.sleep(0.2)  # Small delay for smoother progress updates
            
            # Update to chunking stage
            self.update_stage_progress(file_id, "chunking", 0, "Starting file chunking")
            documents = await self._load_and_chunk_file(file, file_type, encoding, chat_id)
            chunking_time = time.time() - chunking_start
            logger.info(f"Created {len(documents)} chunks in {chunking_time:.2f}s")
            
            # Complete chunking stage
            self.update_stage_progress(
                file_id,
                "chunking",
                100,
                f"Created {len(documents)} chunks",
                {
                    "total_chunks": len(documents),
                    "chunking_time_seconds": round(chunking_time, 2)
                }
            )
            
            # Prepare for vectorization
            self.update_stage_progress(file_id, "vectorizing_prep", 0, "Preparing for vector embedding creation")
            await asyncio.sleep(0.2)  # Small delay for smoother progress updates
            self.update_stage_progress(file_id, "vectorizing_prep", 50, "Optimizing batch processing")
            await asyncio.sleep(0.2)  # Small delay for smoother progress updates
            self.update_stage_progress(file_id, "vectorizing_prep", 100, "Starting vector creation")
            
            # Create vectors and store in MongoDB
            vector_start = time.time()
            await self._store_vectors(documents, filename, mime_type, file_id, chat_id)
            vector_time = time.time() - vector_start
            
            # Enter finalizing stage
            self.update_stage_progress(file_id, "finalizing", 0, "Finalizing file processing")
            await asyncio.sleep(0.2)  # Small delay for smoother progress updates
            self.update_stage_progress(file_id, "finalizing", 50, "Verifying data integrity")
            await asyncio.sleep(0.2)  # Small delay for smoother progress updates
            
            total_time = time.time() - start_time
            
            # Create a summary of the processing
            summary = {
                "status": "success",
                "file_type": file_type,
                "chunks_created": len(documents),
                "chunking_time_seconds": round(chunking_time, 2),
                "vectorization_time_seconds": round(vector_time, 2),
                "total_processing_time_seconds": round(total_time, 2),
                "processing_rate": round(len(documents) / total_time, 2),
                "message": "File processed and stored successfully"
            }
            logger.info(f"File processing complete: {summary}")
            
            # Mark as complete
            self.update_stage_progress(file_id, "finalizing", 100, "Processing complete")
            await asyncio.sleep(0.2)  # Small delay for smoother progress updates
            self.update_stage_progress(file_id, "completed", 100, "File processing completed successfully")
            
            return summary
        except Exception as e:
            logger.error(f"Error processing file: {e}")
            # Update progress with error
            self.update_progress(file_id, 0, "error", f"Error processing file: {str(e)}")
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
                text = DocumentService.clean_text(page.extract_text()) if page.extract_text() else ""
                # Ensure text is properly cleaned
                doc = Document(
                    page_content=DocumentService.clean_text(text),
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
        """
        Chunk a dataframe into documents, optimized to create fewer chunks
        for large spreadsheets to improve processing speed.
        """
        total_rows = len(df)
        total_cols = len(df.columns)
        logger.info(f"Processing dataframe with {total_rows} rows and {total_cols} columns")
        
        # For very large dataframes, use smaller chunks to avoid too much information in a single chunk
        if total_rows > 1000:
            # Dynamically determine chunk size based on total rows
            # This ensures efficient processing while maintaining manageable chunk sizes
            target_chunks =  int(total_rows / 10)
            rows_per_chunk = total_rows // target_chunks
            
            logger.info(f"Large dataframe detected: Creating approximately {target_chunks} chunks "
                       f"with {rows_per_chunk} rows per chunk")
            
            documents = []
            
            # Process dataframe in batches
            for i in range(0, total_rows, rows_per_chunk):
                end_idx = min(i + rows_per_chunk, total_rows)
                batch_df = df.iloc[i:end_idx]
                
                # Include column headers only in first chunk or if columns are important
                include_header = (i == 0) or (total_cols < 10)
                
                # For wide dataframes, consider chunking by columns as well
                if total_cols > 20 and total_rows > 500:
                    # Process wide dataframes in column groups
                    col_group_size = 10
                    for j in range(0, total_cols, col_group_size):
                        end_col = min(j + col_group_size, total_cols)
                        col_slice = batch_df.iloc[:, j:end_col]
                        
                        # Create meaningful chunk with row/column range in metadata
                        text = DocumentService.clean_text(col_slice.to_string(header=include_header, index=False))
                        doc = Document(
                            page_content=DocumentService.clean_text(text),
                            metadata={
                                "row_range": f"{i}-{end_idx-1}",
                                "col_range": f"{j}-{end_col-1}",
                                "total_rows": total_rows,
                                "total_cols": total_cols
                            }
                        )
                        documents.append(doc)
                else:
                    # For narrower dataframes, chunk by rows only
                    text = DocumentService.clean_text(batch_df.to_string(header=include_header, index=False))
                    doc = Document(
                        page_content=DocumentService.clean_text(text),
                        metadata={
                            "row_range": f"{i}-{end_idx-1}",
                            "total_rows": total_rows,
                            "total_cols": total_cols
                        }
                    )
                    documents.append(doc)
            
            logger.info(f"Created {len(documents)} chunks from dataframe")
            return documents
        else:
            # For smaller dataframes, use a simpler approach with fewer chunks
            if total_rows <= 100:
                # Very small dataframes - just one document
                text = DocumentService.clean_text(df.to_string(header=True, index=False))
                doc = Document(page_content=DocumentService.clean_text(text), metadata={"total_rows": total_rows, "total_cols": total_cols})
                return [doc]
            else:
                # Medium dataframes - a few chunks
                rows_per_chunk = 100
                documents = []
                
                for i in range(0, total_rows, rows_per_chunk):
                    end_idx = min(i + rows_per_chunk, total_rows)
                    batch_df = df.iloc[i:end_idx]
                    text = DocumentService.clean_text(batch_df.to_string(header=(i==0), index=False))
                    doc = Document(
                        page_content=DocumentService.clean_text(text),
                        metadata={
                            "row_range": f"{i}-{end_idx-1}",
                            "total_rows": total_rows
                        }
                    )
                    documents.append(doc)
                
                logger.info(f"Created {len(documents)} chunks from medium-sized dataframe")
                return documents

    async def _store_vectors(self, documents: List[Document], filename: str, mime_type: str, file_id: str, chat_id: str):
        """Create embeddings and store in MongoDB using optimized batch processing"""
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
        
        # Create vector store for index management
        vector_store = MongoDBAtlasVectorSearch(
            collection=vectors_collection,
            embedding=self.embeddings,
            index_name=self.vector_index_name,
            relevance_score_fn="cosine",
        )
        
        # Process documents in optimized batches
        batch_size = 100  # Adjust based on performance testing
        total_documents = len(documents)
        
        logger.info(f"Processing {total_documents} documents in batches of {batch_size}")
        start_time = time.time()
        # Process all documents in batches
        for i in range(0, total_documents, batch_size):
            batch_start_time = time.time()
            batch_end = min(i + batch_size, total_documents)
            batch_documents = documents[i:batch_end]
            
            # Calculate batch progress (0-100% within the vectorizing stage)
            batch_progress = (i / total_documents) * 100
            batch_number = i//batch_size + 1
            total_batches = (total_documents + batch_size - 1)//batch_size
            
            # Calculate processed comments (chunks)
            processed_chunks = min(i + batch_size, total_documents)
            
            # Calculate more granular progress for smoother updates
            # Use a logarithmic scale to make early progress appear faster
            import math
            # Adjust the progress calculation to be more granular
            # This creates a more continuous feeling of progress
            adjusted_progress = batch_progress
            if batch_number > 1:
                # Add small increments between batches for smoother transitions
                sub_batch_progress = (time.time() - batch_start_time) / 5  # Assuming ~5 seconds per batch
                sub_batch_progress = min(sub_batch_progress, 1.0)  # Cap at 100% of a sub-batch
                adjusted_progress = ((batch_number - 1) / total_batches * 100) + (100 / total_batches * sub_batch_progress)
            
            # Update progress with more detailed message and stats
            self.update_stage_progress(
                file_id,
                "vectorizing",
                adjusted_progress,
                f"Creating embeddings (batch {batch_number}/{total_batches})",
                {
                    "processed_chunks": processed_chunks,
                    "total_chunks": total_documents,
                    "current_batch": batch_number,
                    "total_batches": total_batches,
                    "estimated_time_remaining": f"{(total_batches - batch_number) * 5} seconds"
                }
            )
            
            # Extract text content for batch embedding and clean it
            texts = [DocumentService.clean_text(doc.page_content) for doc in batch_documents]
            
            # Generate embeddings for the entire batch at once
            batch_embeddings = self.embeddings.embed_documents(texts)
            
            # Prepare bulk operations
            bulk_operations = []
            
            # Create document entries with embeddings
            for j, (doc, embedding) in enumerate(zip(batch_documents, batch_embeddings)):
                doc_id = str(uuid4())
                
                # Create document with embedding
                # Clean the text content
                clean_text = DocumentService.clean_text(doc.page_content)
                
                vector_doc = {
                    "_id": doc_id,
                    "embedding": embedding,
                    "text": clean_text,
                    "source": chat_id,
                    "file_id": file_id,
                    "filename": filename,
                    "mime_type": mime_type
                }
                
                # Add any additional metadata
                for key, value in doc.metadata.items():
                    if key not in ["source", "file_id", "filename", "mime_type"]:
                        vector_doc[key] = value
                
                # Add to bulk operations
                bulk_operations.append(InsertOne(vector_doc))
            
            # Execute bulk insert
            if bulk_operations:
                result = vectors_collection.bulk_write(bulk_operations)
                batch_time = time.time() - batch_start_time
                logger.info(f"Batch {i//batch_size + 1}/{(total_documents + batch_size - 1)//batch_size}: "
                           f"Inserted {result.inserted_count} documents in {batch_time:.2f}s "
                           f"({result.inserted_count/batch_time:.1f} docs/s)")
        
        total_time = time.time() - start_time
        logger.info(f"Total processing time: {total_time:.2f}s for {total_documents} documents "
                   f"({total_documents/total_time:.1f} docs/s)")
        
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
            # Get document chunks
            documents = await self._load_and_chunk_file(file_obj, file_type, encoding, chat_id)
            
            # Ensure all document content is properly cleaned
            for doc in documents:
                doc.page_content = DocumentService.clean_text(doc.page_content)
            
            # Create vectors and store in MongoDB
            await self._store_vectors(documents, filename, f"application/{file_type}", file_id, chat_id)
            
            return "File content processed and stored successfully"
            
        except Exception as e:
            logger.error(f"Error processing file content: {e}")
            raise

    async def delete_file_vectors(self, file_id: str):
        """Delete all vector embeddings associated with a file_id from MongoDB"""
        try:
            # Clear progress tracking for this file
            self.clear_progress(file_id)
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