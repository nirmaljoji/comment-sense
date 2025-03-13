from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Depends
from ..services.file_service import FileService
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
        return {"message": "File uploaded successfully", "file": result}
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