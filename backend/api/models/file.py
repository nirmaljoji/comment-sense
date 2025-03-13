from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class FileModel(BaseModel):
    filename: str
    mime_type: str
    size: int
    user_id: Optional[str] = None
    file_id: str
    chat_id: str
    file_path: str
    created_at: datetime = datetime.utcnow()

    class Config:
        from_attributes = True