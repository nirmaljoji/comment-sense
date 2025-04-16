from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Depends, Request
from fastapi.responses import StreamingResponse, JSONResponse
from ..services.file_service import FileService
from ..services.document_service import DocumentService
import asyncio
import json
from ..utils.logger import logger
from ..services.auth_service import AuthService
from ..models.user import UserInDB
from ..utils.deps import get_current_user

router = APIRouter()
@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    file_id: str = Form(...),
    current_user: UserInDB = Depends(get_current_user)
):
    try:
        if not current_user:
            raise HTTPException(status_code=401, detail="Authentication required")
            
        if not current_user.active_chat_id:
            raise HTTPException(status_code=400, detail="No active chat session")
            
        result = await FileService.save_file(file, file_id, current_user=current_user)
        
        # Include processing metrics in the response
        response = {
            "message": "File uploaded successfully",
            "file": result,
        }
        
        # Add processing metrics if available
        if hasattr(result, 'processing_metrics') and result.processing_metrics:
            response["processing_metrics"] = result.processing_metrics
            
        return response
    except Exception as e:
        logger.error(f"Error in upload_file endpoint: {e}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{file_id}")
async def delete_file(file_id: str):
    try:
        result = await FileService.delete_file(file_id)
        return {"message": "File deleted successfully", "file_id": file_id}
    except Exception as e:
        logger.error(f"Error in delete_file endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/progress/{file_id}")
async def get_file_progress(file_id: str):
    """Get the current progress of a file being processed"""
    try:
        progress_data = DocumentService.get_progress(file_id)
        
        # Ensure status and current_stage are consistent
        if "stats" in progress_data and "current_stage" in progress_data["stats"]:
            # Make sure the status field matches the current_stage for consistency
            progress_data["status"] = progress_data["stats"]["current_stage"]
            
            # Don't show "completed" until progress is actually 100%
            if progress_data["status"] == "completed" and progress_data["progress"] < 95:
                progress_data["status"] = "finalizing"
                
        return JSONResponse(content=progress_data)
    except Exception as e:
        logger.error(f"Error getting file progress: {e}")
        raise HTTPException(status_code=500, detail=str(e))