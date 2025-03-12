from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from ..services.file_service import FileService
from ..utils.logger import logger

router = APIRouter()

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    file_id: str = Form(...)  # Add file_id as a form field
):
    try:
        result = await FileService.save_file(file, file_id)  # Pass file_id to service
        return {"message": "File uploaded successfully", "file": result}
    except Exception as e:
        logger.error(f"Error in upload_file endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{file_id}")
async def delete_file(file_id: str):
    try:
        result = await FileService.delete_file(file_id)
        return {"message": "File deleted successfully", "file_id": file_id}
    except Exception as e:
        logger.error(f"Error in delete_file endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e)) 