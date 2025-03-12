import os
from fastapi import UploadFile
from dotenv import load_dotenv
from ..database.mongodb import MongoDB
from ..models.file import FileModel
from ..utils.logger import logger
from .document_service import DocumentService
from typing import Optional

load_dotenv()

class FileService:
    @staticmethod
    async def save_file(file: UploadFile, file_id: str ,user_id: Optional[str] = None) -> FileModel:
        try:
            # Process document
            doc_service = DocumentService()
            await doc_service.process_file(
                file.file,
                file.filename,
                file.content_type,
                file_id
            )
            
            # Create file document
            file_doc = FileModel(
                filename=file.filename,
                mime_type=file.content_type,
                size=0,  # Size will be 0 as we're not storing the actual file
                user_id=user_id,
                file_id=file_id,
                file_path=f"/tmp/{file.filename}"  # Adding temporary file path
            )
            
            # Save file metadata to MongoDB
            db = MongoDB.get_db()
            db.files.insert_one(file_doc.dict())
            
            logger.info(f"File processed successfully: {file.filename}")
            return file_doc
            
        except Exception as e:
            logger.error(f"Error processing file: {e}")
            raise 

    @staticmethod
    async def delete_file(file_id: str):
        try:
            # Get MongoDB connection
            db = MongoDB.get_db()
            
            # Delete file metadata from MongoDB
            delete_result = db.files.delete_one({"file_id": file_id})
            
            if delete_result.deleted_count == 0:
                raise Exception(f"File with id {file_id} not found")
            
            # Delete vectors associated with the file
            doc_service = DocumentService()
            await doc_service.delete_file_vectors(file_id)
            
            logger.info(f"File and associated vectors deleted successfully: {file_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting file: {e}")
            raise 