from datetime import datetime
from typing import Optional, Dict, Any
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
    processing_metrics: Optional[Dict[str, Any]] = Field(default_factory=dict)

    class Config:
        from_attributes = True